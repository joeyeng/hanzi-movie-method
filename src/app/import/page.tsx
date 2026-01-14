'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useActors, useRooms, useSets, useProps, useCharacters, useCompounds } from '@/hooks/useLocalStorage';
import { exampleActors, exampleRooms, exampleSets, exampleProps } from '@/lib/seedData';
import { parseCharacterFileAsync, extractCharactersFromText, checkHanziPyServer, extractCompoundWords, lookupCompoundWordsAPI, CompoundWordResult } from '@/lib/hanzipy';
import * as storage from '@/lib/storage';
import type { Actor, Room, Set } from '@/types';

// Preview data type
interface PreviewCharacter {
    hanzi: string;
    pinyin: string | null;
    definition: string | null;
    found: boolean;
}

// Parse pinyin to extract initial, final, and tone
function parsePinyin(pinyin: string): { initial: string; final: string; tone: number } {
    if (!pinyin) return { initial: '', final: '', tone: 5 };

    // Normalize pinyin - take first syllable if multiple
    const syllable = pinyin.split(/[,\s]/)[0].toLowerCase().trim();

    // Detect tone from tone marks
    const toneMarks: Record<string, number> = {
        'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
        'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
        'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
        'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
        'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
        'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
    };

    let tone = 5; // Default neutral tone
    let normalized = syllable;

    // Find tone from tone marks
    for (const char of syllable) {
        if (toneMarks[char]) {
            tone = toneMarks[char];
            // Remove tone mark by replacing with base vowel
            const baseVowels: Record<string, string> = {
                'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
                'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
                'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
                'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
                'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
                'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü',
            };
            normalized = normalized.split('').map(c => baseVowels[c] || c).join('');
            break;
        }
    }

    // Common initials in Mandarin (longest first for proper matching)
    const initials = [
        'zh', 'ch', 'sh',
        'b', 'p', 'm', 'f',
        'd', 't', 'n', 'l',
        'g', 'k', 'h',
        'j', 'q', 'x',
        'z', 'c', 's',
        'r', 'y', 'w'
    ];

    let initial = '';
    let final = normalized;

    // Find the initial
    for (const init of initials) {
        if (normalized.startsWith(init)) {
            initial = init;
            final = normalized.slice(init.length);
            break;
        }
    }

    return { initial, final, tone };
}

// Find actor by initial
function findActorForInitial(initial: string, actors: Actor[]): Actor | undefined {
    if (!initial) return undefined;
    // Try matching with and without dash suffix (e.g., "j" matches "j-" or "j")
    return actors.find(a => {
        const actorInitial = a.initial.toLowerCase().replace(/-$/, '');
        return actorInitial === initial.toLowerCase();
    });
}

// Find room by tone
function findRoomForTone(tone: number, rooms: Room[]): Room | undefined {
    return rooms.find(r => r.tone === tone);
}

// Find set by final
function findSetForFinal(final: string, sets: Set[]): Set | undefined {
    if (!final) return undefined;
    // Try matching with and without dash prefix (e.g., "i" matches "-i" or "i")
    return sets.find(s => {
        const setFinal = s.final.toLowerCase().replace(/^-/, '');
        return setFinal === final.toLowerCase();
    });
}

// Generate movie scene template
function generateMovieScene(hanzi: string, meaning: string): string {
    return `{{ACTOR}} is in the {{ROOM}} at {{SET}}. They see a ${meaning.split(',')[0].trim()} (${hanzi}) and interact with it memorably.`;
}

export default function ImportPage() {
    const { actors, add: addActor } = useActors();
    const { rooms, add: addRoom } = useRooms();
    const { sets, add: addSet } = useSets();
    const { props, add: addProp } = useProps();
    const { characters, add: addCharacter } = useCharacters();
    const { compounds, add: addCompound } = useCompounds();

    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [importStatus, setImportStatus] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewCharacter[]>([]);
    const [previewCompounds, setPreviewCompounds] = useState<CompoundWordResult[]>([]);
    const [pasteText, setPasteText] = useState('');
    const [serverStatus, setServerStatus] = useState<{ available: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check HanziPy server status on mount
    useEffect(() => {
        checkHanziPyServer().then(setServerStatus);
    }, []);

    const handleFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            setParsing(true);
            setImportStatus(['Looking up characters and compound words via HanziPy...']);

            try {
                // Use the async character file parser that calls the HanziPy API
                const parsed = await parseCharacterFileAsync(content);
                setPreviewData(parsed);

                // Also extract and look up compound words
                const compoundWords = extractCompoundWords(content);
                const compoundResults = await lookupCompoundWordsAPI(compoundWords);
                setPreviewCompounds(compoundResults);

                const foundCount = parsed.filter(p => p.found).length;
                const notFoundCount = parsed.filter(p => !p.found).length;
                const compoundFoundCount = compoundResults.filter(c => c.found).length;

                setImportStatus([
                    `Parsed ${parsed.length} unique characters from file`,
                    foundCount > 0 ? `Found ${foundCount} characters in HanziPy` : '',
                    notFoundCount > 0 ? `${notFoundCount} characters not found (will import without pinyin)` : '',
                    compoundWords.length > 0 ? `Found ${compoundWords.length} compound words (${compoundFoundCount} with definitions)` : '',
                ].filter(Boolean));
            } catch (error) {
                setImportStatus([
                    'Error looking up characters',
                    error instanceof Error ? error.message : 'Unknown error',
                    'Make sure the HanziPy server is running: python hanzipy_server/server.py'
                ]);
            } finally {
                setParsing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handlePasteImport = async () => {
        if (!pasteText.trim()) return;
        setParsing(true);
        setImportStatus(['Looking up characters and compound words via HanziPy...']);

        try {
            const parsed = await parseCharacterFileAsync(pasteText);
            setPreviewData(parsed);

            // Also extract and look up compound words
            const compoundWords = extractCompoundWords(pasteText);
            const compoundResults = await lookupCompoundWordsAPI(compoundWords);
            setPreviewCompounds(compoundResults);

            const foundCount = parsed.filter(p => p.found).length;
            const notFoundCount = parsed.filter(p => !p.found).length;
            const compoundFoundCount = compoundResults.filter(c => c.found).length;

            setImportStatus([
                `Parsed ${parsed.length} unique characters from text`,
                foundCount > 0 ? `Found ${foundCount} characters in HanziPy` : '',
                notFoundCount > 0 ? `${notFoundCount} characters not found (will import without pinyin)` : '',
                compoundWords.length > 0 ? `Found ${compoundWords.length} compound words (${compoundFoundCount} with definitions)` : '',
            ].filter(Boolean));
        } catch (error) {
            setImportStatus([
                'Error looking up characters',
                error instanceof Error ? error.message : 'Unknown error',
                'Make sure the HanziPy server is running: python hanzipy_server/server.py'
            ]);
        } finally {
            setParsing(false);
        }
    };

    const ensureActorsAndSets = () => {
        // First, import default actors if needed
        const existingInitials = new globalThis.Set(actors.map(a => a.initial.toLowerCase()));
        let actorCount = 0;

        exampleActors.forEach(actor => {
            if (!existingInitials.has(actor.initial.toLowerCase())) {
                addActor({
                    name: actor.name,
                    initial: actor.initial,
                    description: actor.description,
                });
                actorCount++;
            }
        });

        // Import default rooms if needed
        const existingTones = new globalThis.Set(rooms.map(r => r.tone));
        let roomCount = 0;

        exampleRooms.forEach(room => {
            if (!existingTones.has(room.tone)) {
                addRoom({
                    name: room.name,
                    tone: room.tone,
                    description: room.description,
                });
                roomCount++;
            }
        });

        // Import default sets if needed (by final only, no tone)
        const existingFinals = new globalThis.Set(sets.map(s => s.final.toLowerCase()));
        let setCount = 0;

        exampleSets.forEach(set => {
            if (!existingFinals.has(set.final.toLowerCase())) {
                addSet({
                    name: set.name,
                    final: set.final,
                    description: set.description,
                });
                setCount++;
            }
        });

        return { actorCount, roomCount, setCount };
    };

    const importCharactersFromPreview = () => {
        if (previewData.length === 0 && previewCompounds.length === 0) return;

        setImporting(true);

        // First ensure we have actors, rooms, and sets
        const { actorCount, roomCount, setCount } = ensureActorsAndSets();

        // Read fresh data from storage (they now have proper IDs)
        const currentActors = storage.getActors();
        const currentRooms = storage.getRooms();
        const currentSets = storage.getSets();

        const existingHanzi = new globalThis.Set(characters.map(c => c.hanzi));
        let charCount = 0;
        let skipped = 0;
        let notFoundCount = 0;

        previewData.forEach(char => {
            if (existingHanzi.has(char.hanzi)) {
                skipped++;
                return;
            }

            // Skip characters without pinyin if user wants
            if (!char.pinyin) {
                notFoundCount++;
                // Still import but with placeholder data
                const movieScene = `Complete this movie scene for ${char.hanzi}...`;

                addCharacter({
                    hanzi: char.hanzi,
                    pinyin: '',
                    meaning: char.definition || 'Unknown meaning',
                    keyword: 'Unknown',
                    actorId: undefined,
                    roomId: undefined,
                    setId: undefined,
                    movieScene,
                    props: [],
                });
                charCount++;
                return;
            }

            // Parse pinyin to get initial, final, tone
            const { initial, final, tone } = parsePinyin(char.pinyin);

            // Find matching actor, room (by tone), and set (by final)
            const actor = findActorForInitial(initial, currentActors as Actor[]);
            const room = findRoomForTone(tone, currentRooms as Room[]);
            const set = findSetForFinal(final, currentSets as Set[]);

            // Generate movie scene template
            const movieScene = generateMovieScene(char.hanzi, char.definition || 'meaning');

            addCharacter({
                hanzi: char.hanzi,
                pinyin: char.pinyin,
                meaning: char.definition || '',
                keyword: (char.definition || '').split(',')[0].trim() || char.hanzi,
                actorId: actor?.id,
                roomId: room?.id,
                setId: set?.id,
                movieScene,
                props: [],
            });

            charCount++;
        });

        // Import compound words
        const existingCompoundWords = new globalThis.Set(compounds.map(c => c.word));
        let compoundCount = 0;
        let compoundSkipped = 0;

        previewCompounds.forEach(compound => {
            if (existingCompoundWords.has(compound.word)) {
                compoundSkipped++;
                return;
            }

            addCompound({
                word: compound.word,
                characters: compound.characters,
                pinyin: compound.pinyin || '',
                definition: compound.definition || '',
            });

            compoundCount++;
        });

        setImportStatus(prev => [
            ...prev,
            actorCount > 0 ? `Added ${actorCount} new actors` : '',
            roomCount > 0 ? `Added ${roomCount} new rooms` : '',
            setCount > 0 ? `Added ${setCount} new sets` : '',
            `Imported ${charCount} new characters`,
            skipped > 0 ? `Skipped ${skipped} existing characters` : '',
            notFoundCount > 0 ? `${notFoundCount} characters imported without dictionary data` : '',
            compoundCount > 0 ? `Imported ${compoundCount} new compound words` : '',
            compoundSkipped > 0 ? `Skipped ${compoundSkipped} existing compound words` : '',
        ].filter(Boolean));

        setPreviewData([]);
        setPreviewCompounds([]);
        setPasteText('');
        setImporting(false);
    };

    const importDefaultActors = () => {
        const existingInitials = new globalThis.Set(actors.map(a => a.initial.toLowerCase()));
        let count = 0;

        exampleActors.forEach(actor => {
            if (!existingInitials.has(actor.initial.toLowerCase())) {
                addActor({
                    name: actor.name,
                    initial: actor.initial,
                    description: actor.description,
                });
                count++;
            }
        });

        setImportStatus(prev => [...prev, `Imported ${count} new actors`]);
    };

    const importDefaultRooms = () => {
        const existingTones = new globalThis.Set(rooms.map(r => r.tone));
        let count = 0;

        exampleRooms.forEach(room => {
            if (!existingTones.has(room.tone)) {
                addRoom({
                    name: room.name,
                    tone: room.tone,
                    description: room.description,
                });
                count++;
            }
        });

        setImportStatus(prev => [...prev, `Imported ${count} new rooms`]);
    };

    const importDefaultSets = () => {
        const existingFinals = new globalThis.Set(sets.map(s => s.final.toLowerCase()));
        let count = 0;

        exampleSets.forEach(set => {
            if (!existingFinals.has(set.final.toLowerCase())) {
                addSet({
                    name: set.name,
                    final: set.final,
                    description: set.description,
                });
                count++;
            }
        });

        setImportStatus(prev => [...prev, `Imported ${count} new sets`]);
    };

    const importDefaultProps = () => {
        const existingComponents = new globalThis.Set(props.map(p => p.component));
        let count = 0;

        exampleProps.forEach(prop => {
            if (!existingComponents.has(prop.component)) {
                addProp({
                    name: prop.name,
                    component: prop.component,
                    description: prop.description,
                });
                count++;
            }
        });

        setImportStatus(prev => [...prev, `Imported ${count} new props`]);
    };

    const clearAll = () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            localStorage.removeItem('hmm-actors');
            localStorage.removeItem('hmm-rooms');
            localStorage.removeItem('hmm-sets');
            localStorage.removeItem('hmm-props');
            localStorage.removeItem('hmm-characters');
            localStorage.removeItem('hmm-compounds');
            window.location.reload();
        }
    };

    // Look up character info for preview
    const getPreviewInfo = (char: PreviewCharacter) => {
        if (!char.pinyin) {
            return { initial: '', final: '', tone: 5, actor: undefined, room: undefined, set: undefined };
        }

        const { initial, final, tone } = parsePinyin(char.pinyin);
        const actor = findActorForInitial(initial, actors);
        const room = findRoomForTone(tone, rooms);
        const set = findSetForFinal(final, sets);
        const defaultActor = exampleActors.find(a => a.initial.toLowerCase() === initial.toLowerCase());
        const defaultRoom = exampleRooms.find(r => r.tone === tone);
        const defaultSet = exampleSets.find(s => s.final.toLowerCase() === final.toLowerCase());

        return {
            initial,
            final,
            tone,
            actor: actor || defaultActor,
            room: room || defaultRoom,
            set: set || defaultSet,
            hasActor: !!actor,
            hasRoom: !!room,
            hasSet: !!set,
        };
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-amber-400 mb-2">Import Characters</h1>
                <p className="text-slate-400">Upload a text file with Chinese characters or paste them directly</p>
            </div>

            {/* HanziPy Server Status */}
            {serverStatus && (
                <div className={`mb-6 p-4 rounded-lg ${serverStatus.available ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${serverStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className={serverStatus.available ? 'text-green-400' : 'text-red-400'}>
                            {serverStatus.available ? 'HanziPy Server Connected' : 'HanziPy Server Not Available'}
                        </span>
                    </div>
                    {!serverStatus.available && (
                        <p className="text-slate-400 text-sm mt-2">
                            Start the server: <code className="bg-slate-800 px-2 py-1 rounded">python hanzipy_server/server.py</code>
                        </p>
                    )}
                </div>
            )}

            {/* File Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={`mb-6 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${parsing ? 'opacity-50 cursor-wait' :
                        dragActive
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={parsing}
                />
                <div className="text-5xl mb-4">{parsing ? '⏳' : '📄'}</div>
                <p className="text-lg text-slate-300 mb-2">
                    {parsing ? 'Looking up characters...' : 'Drop your file here or click to browse'}
                </p>
                <p className="text-sm text-slate-500">
                    Just a list of Chinese characters - one character or multiple per line
                </p>
            </div>

            {/* Direct Paste Area */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Or Paste Characters Directly</h2>
                <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="我你他她好..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 mb-4 h-32 resize-none"
                    disabled={parsing}
                />
                <button
                    onClick={handlePasteImport}
                    disabled={!pasteText.trim() || parsing}
                    className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {parsing ? 'Looking up...' : 'Parse Characters'}
                </button>
                <p className="text-slate-500 text-xs mt-2">
                    💡 Pinyin and definitions will be looked up automatically using HanziPy
                </p>
            </div>

            {/* Preview */}
            {previewData.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Preview ({previewData.length} characters)</h2>
                        <button
                            onClick={importCharactersFromPreview}
                            disabled={importing}
                            className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : 'Import All Characters'}
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-800">
                                <tr>
                                    <th className="text-left py-2 px-2">Character</th>
                                    <th className="text-left py-2 px-2">Pinyin</th>
                                    <th className="text-left py-2 px-2">Definition</th>
                                    <th className="text-left py-2 px-2">Actor</th>
                                    <th className="text-left py-2 px-2">Room</th>
                                    <th className="text-left py-2 px-2">Set</th>
                                    <th className="text-left py-2 px-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 50).map((char, i) => {
                                    const info = getPreviewInfo(char);

                                    return (
                                        <tr key={i} className="border-b border-slate-700/50">
                                            <td className="py-2 px-2">
                                                <span className="text-2xl text-amber-400">{char.hanzi}</span>
                                            </td>
                                            <td className="py-2 px-2 text-slate-300">
                                                {char.pinyin || <span className="text-slate-500">—</span>}
                                            </td>
                                            <td className="py-2 px-2 text-slate-400 truncate max-w-32">
                                                {char.definition || <span className="text-slate-500">—</span>}
                                            </td>
                                            <td className="py-2 px-2">
                                                {info.actor ? (
                                                    <span className={info.hasActor ? 'text-blue-400' : 'text-blue-400/50'}>
                                                        {info.actor.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2">
                                                {info.room ? (
                                                    <span className={info.hasRoom ? 'text-orange-400' : 'text-orange-400/50'}>
                                                        {info.room.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2">
                                                {info.set ? (
                                                    <span className={info.hasSet ? 'text-purple-400' : 'text-purple-400/50'}>
                                                        {info.set.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2">
                                                {char.found ? (
                                                    <span className="text-green-400 text-xs">✓ Found</span>
                                                ) : (
                                                    <span className="text-yellow-400 text-xs">⚠ Not in dict</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {previewData.length > 50 && (
                            <p className="text-slate-500 text-sm mt-2 text-center">
                                ...and {previewData.length - 50} more characters
                            </p>
                        )}
                    </div>
                    <p className="text-slate-500 text-xs mt-4">
                        💡 Characters will be automatically assigned actors (initial), rooms (tone), and sets (final).
                        Faded colors indicate defaults that will be imported.
                    </p>
                </div>
            )}

            {/* Compound Words Preview */}
            {previewCompounds.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Compound Words Preview ({previewCompounds.length} words)</h2>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-800">
                                <tr>
                                    <th className="text-left py-2 px-2">Word</th>
                                    <th className="text-left py-2 px-2">Characters</th>
                                    <th className="text-left py-2 px-2">Pinyin</th>
                                    <th className="text-left py-2 px-2">Definition</th>
                                    <th className="text-left py-2 px-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewCompounds.slice(0, 30).map((compound, i) => (
                                    <tr key={i} className="border-b border-slate-700/50">
                                        <td className="py-2 px-2">
                                            <span className="text-2xl text-amber-400">{compound.word}</span>
                                        </td>
                                        <td className="py-2 px-2 text-slate-300">
                                            {compound.characters.join(' ')}
                                        </td>
                                        <td className="py-2 px-2 text-slate-300">
                                            {compound.pinyin || <span className="text-slate-500">—</span>}
                                        </td>
                                        <td className="py-2 px-2 text-slate-400 truncate max-w-48">
                                            {compound.definition || <span className="text-slate-500">—</span>}
                                        </td>
                                        <td className="py-2 px-2">
                                            {compound.found ? (
                                                <span className="text-green-400 text-xs">✓ Found</span>
                                            ) : (
                                                <span className="text-yellow-400 text-xs">⚠ Not in dict</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewCompounds.length > 30 && (
                            <p className="text-slate-500 text-sm mt-2 text-center">
                                ...and {previewCompounds.length - 30} more compound words
                            </p>
                        )}
                    </div>
                    <p className="text-slate-500 text-xs mt-4">
                        💡 Compound words will be saved separately. Click on characters in the Compounds page to view individual character cards.
                    </p>
                </div>
            )}

            {/* Default Data Import */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Setup Default Actors, Rooms, Sets & Props</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Before importing characters, set up your actors, rooms, and sets. These will be automatically matched to characters based on pinyin.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <button
                            onClick={importDefaultActors}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors mb-2"
                        >
                            Import Actors
                        </button>
                        <p className="text-slate-500 text-xs text-center">{actors.length} in database</p>
                    </div>
                    <div>
                        <button
                            onClick={importDefaultRooms}
                            className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-400 transition-colors mb-2"
                        >
                            Import Rooms
                        </button>
                        <p className="text-slate-500 text-xs text-center">{rooms.length} in database</p>
                    </div>
                    <div>
                        <button
                            onClick={importDefaultSets}
                            className="w-full bg-purple-500 text-white py-2 rounded-lg font-medium hover:bg-purple-400 transition-colors mb-2"
                        >
                            Import Sets
                        </button>
                        <p className="text-slate-500 text-xs text-center">{sets.length} in database</p>
                    </div>
                    <div>
                        <button
                            onClick={importDefaultProps}
                            className="w-full bg-pink-500 text-white py-2 rounded-lg font-medium hover:bg-pink-400 transition-colors mb-2"
                        >
                            Import Props
                        </button>
                        <p className="text-slate-500 text-xs text-center">{props.length} in database</p>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            {importStatus.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-2">Import Status</h3>
                    <ul className="space-y-1">
                        {importStatus.map((status, i) => (
                            <li key={i} className="text-green-400 text-sm">✓ {status}</li>
                        ))}
                    </ul>
                    <button
                        onClick={() => setImportStatus([])}
                        className="mt-4 text-slate-500 text-sm hover:text-slate-400"
                    >
                        Clear status messages
                    </button>
                </div>
            )}

            {/* Current Stats */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Current Database</h2>
                <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                        <div className="text-3xl font-bold text-amber-400">{characters.length}</div>
                        <div className="text-slate-400 text-sm">Characters</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-blue-400">{actors.length}</div>
                        <div className="text-slate-400 text-sm">Actors</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-orange-400">{rooms.length}</div>
                        <div className="text-slate-400 text-sm">Rooms</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-400">{sets.length}</div>
                        <div className="text-slate-400 text-sm">Sets</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-pink-400">{props.length}</div>
                        <div className="text-slate-400 text-sm">Props</div>
                    </div>
                </div>
            </div>

            {/* Clear Data */}
            <div className="bg-slate-800 rounded-lg p-6 border border-red-500/30">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Danger Zone</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Clear all data from local storage. This cannot be undone!
                </p>
                <button
                    onClick={clearAll}
                    className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-500 transition-colors"
                >
                    Clear All Data
                </button>
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
                <Link href="/" className="text-amber-400 hover:text-amber-300">
                    ← Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
