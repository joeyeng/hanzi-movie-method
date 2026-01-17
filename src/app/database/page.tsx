'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useActors, useRooms, useSets, useProps, useCharacters, useCompounds, useComponents } from '@/hooks/useLocalStorage';
import { exampleActors, exampleRooms, exampleSets, exampleProps } from '@/lib/seedData';
import { parseCharacterFileWithComponentsAsync, extractCharactersFromText, checkHanziPyServer, extractCompoundWords, lookupCompoundWordsAPI, CompoundWordResult, HanziComponent } from '@/lib/hanzipy';
import * as storage from '@/lib/storage';
import type { Actor, Room, Set, Character } from '@/types';

// Preview data type
interface PreviewCharacter {
    hanzi: string;
    pinyin: string | null;
    definition: string | null;
    found: boolean;
    all_definitions?: { pinyin: string; definition: string }[];
    components?: HanziComponent[];
}

// Parse pinyin to extract initial, final, and tone using Hanzi Movie Method system
// HMM Finals: -a, -ai, -ao, -an, -ang, -o, -ong, -ou, -e, -ei, -(e)n, -(e)ng
// HMM Initials: 
//   Male: b-, p-, m-, f-, d-, t-, n-, l-, g-, k-, h-, zh-, ch-, sh-, r-, z-, c-, s-, Ø (null)
//   Female: y-, bi-, pi-, mi-, di-, ti-, ji-, qi-, xi-, ni-, li-
//   Fictional: w-, bu-, pu-, mu-, fu-, du-, tu-, nu-, lu-, zu-, cu-, su-, zhu-, chu-, shu-, ru-, ku-, hu-, gu-
//   Basketball Players: yu-, nü-, lü-, ju-, qu-, xu-
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

    // HMM uses specific initials based on sound categories
    // Order matters - check longer initials first, then shorter ones
    // Basketball Players (ü sounds): yu-, nü-, lü-, ju-, qu-, xu-
    // Fictional (u sounds): zhu-, chu-, shu-, bu-, pu-, mu-, fu-, du-, tu-, nu-, lu-, zu-, cu-, su-, ru-, ku-, hu-, gu-, w-
    // Female (i sounds): bi-, pi-, mi-, di-, ti-, ji-, qi-, xi-, ni-, li-, y-
    // Male (basic): zh-, ch-, sh-, b-, p-, m-, f-, d-, t-, n-, l-, g-, k-, h-, r-, z-, c-, s-, Ø

    const hmmInitials = [
        // Basketball Players (ü initials) - must check first
        'yu', 'nü', 'lü', 'ju', 'qu', 'xu',
        // Fictional (u initials) 
        'zhu', 'chu', 'shu', 'bu', 'pu', 'mu', 'fu', 'du', 'tu', 'nu', 'lu', 'zu', 'cu', 'su', 'ru', 'ku', 'hu', 'gu',
        // Female (i initials)
        'bi', 'pi', 'mi', 'di', 'ti', 'ji', 'qi', 'xi', 'ni', 'li',
        // Male (basic initials) - checked last
        'zh', 'ch', 'sh',
        'w', 'y',
        'b', 'p', 'm', 'f',
        'd', 't', 'n', 'l',
        'g', 'k', 'h',
        'r', 'z', 'c', 's'
    ];

    let initial = '';
    let final = normalized;

    // Find the HMM initial
    for (const init of hmmInitials) {
        if (normalized.startsWith(init)) {
            initial = init;
            final = normalized.slice(init.length);
            break;
        }
    }

    // If no initial found and starts with vowel, it's a null initial (Ø)
    if (!initial && /^[aeiouü]/.test(normalized)) {
        initial = 'Ø';
        final = normalized;
    }

    // Map the final to HMM finals: -a, -ai, -ao, -an, -ang, -o, -ong, -ou, -e, -ei, -(e)n, -(e)ng
    // The final extracted needs to be mapped to the HMM system
    const hmmFinal = mapToHmmFinal(final);

    return { initial: initial + '-', final: hmmFinal, tone };
}

// Map pinyin final to HMM final system
function mapToHmmFinal(final: string): string {
    // Direct mappings for HMM finals
    // -a, -ai, -ao, -an, -ang, -o, -ong, -ou, -e, -ei, -(e)n, -(e)ng

    // Handle compound finals that map to HMM finals
    const mappings: Record<string, string> = {
        // -a family
        'a': '-a',
        'ia': '-a',    // jia -> j- + -a
        'ua': '-a',    // hua -> hu- + -a

        // -ai family  
        'ai': '-ai',
        'uai': '-ai',  // kuai -> ku- + -ai

        // -ao family
        'ao': '-ao',
        'iao': '-ao',  // jiao -> ji- + -ao

        // -an family
        'an': '-an',
        'ian': '-an',  // tian -> ti- + -an (but HMM treats -ian differently)
        'uan': '-an',  // duan -> du- + -an
        'üan': '-an',  // yuan -> yu- + -an

        // -ang family
        'ang': '-ang',
        'iang': '-ang', // xiang -> xi- + -ang
        'uang': '-ang', // huang -> hu- + -ang

        // -o family
        'o': '-o',
        'uo': '-o',    // duo -> du- + -o

        // -ong family
        'ong': '-ong',
        'iong': '-ong', // xiong -> xi- + -ong

        // -ou family
        'ou': '-ou',
        'iu': '-ou',   // liu -> li- + -ou (iu is actually iou)

        // -e family
        'e': '-e',
        'ie': '-e',    // xie -> xi- + -e
        'üe': '-e',    // yue -> yu- + -e

        // -ei family
        'ei': '-ei',
        'ui': '-ei',   // hui -> hu- + -ei (ui is actually uei)

        // -(e)n family - 'en' after most consonants, 'n' after i/ü
        'en': '-(e)n',
        'in': '-(e)n',  // xin -> xi- + -(e)n
        'un': '-(e)n',  // dun -> du- + -(e)n
        'ün': '-(e)n',  // yun -> yu- + -(e)n

        // -(e)ng family - 'eng' after most consonants, 'ng' after i
        'eng': '-(e)ng',
        'ing': '-(e)ng', // ting -> t- + -(e)ng

        // Special cases
        'i': '-(e)n',   // zi, ci, si, zhi, chi, shi, ri have special 'i' that's more like schwa
        'u': '-o',      // bu, pu, mu, fu -> -o sound
        'ü': '-o',      // nü, lü -> -o sound
        'er': '-e',     // er special
    };

    // Check for exact match first
    if (mappings[final]) {
        return mappings[final];
    }

    // If no mapping found, try to find best match by checking endings
    for (const [ending, hmmFinal] of Object.entries(mappings)) {
        if (final.endsWith(ending) && ending.length > 1) {
            return hmmFinal;
        }
    }

    // Default fallback - try to match the ending vowel
    if (final.endsWith('ng')) return '-(e)ng';
    if (final.endsWith('n')) return '-(e)n';
    if (final.endsWith('a')) return '-a';
    if (final.endsWith('o')) return '-o';
    if (final.endsWith('e')) return '-e';
    if (final.endsWith('i')) return '-(e)n';
    if (final.endsWith('u')) return '-ou';

    return '-' + final; // Fallback with dash prefix
}

// Find actor by initial (HMM format with dash suffix like "b-", "ji-", "Ø-")
function findActorForInitial(initial: string, actors: Actor[]): Actor | undefined {
    if (!initial) return undefined;
    // Normalize both to compare: remove dashes
    const normalizedInitial = initial.toLowerCase().replace(/-$/, '');
    return actors.find(a => {
        const actorInitial = a.initial.toLowerCase().replace(/-$/, '');
        return actorInitial === normalizedInitial;
    });
}

// Find room by tone
function findRoomForTone(tone: number, rooms: Room[]): Room | undefined {
    return rooms.find(r => r.tone === tone);
}

// Find set by final (HMM format like "-a", "-ai", "-(e)n")
function findSetForFinal(final: string, sets: Set[]): Set | undefined {
    if (!final) return undefined;
    // Normalize both to compare: ensure dash prefix
    const normalizedFinal = final.toLowerCase().startsWith('-') ? final.toLowerCase() : '-' + final.toLowerCase();
    return sets.find(s => {
        const setFinal = s.final.toLowerCase().startsWith('-') ? s.final.toLowerCase() : '-' + s.final.toLowerCase();
        return setFinal === normalizedFinal;
    });
}

// Generate movie scene description (template is auto-prepended in CharacterCard)
function generateMovieScene(hanzi: string, meaning: string): string {
    return `They see a ${meaning.split(',')[0].trim()} (${hanzi}) and interact with it memorably.`;
}

export default function DatabasePage() {
    const { actors, add: addActor, update: updateActor } = useActors();
    const { rooms, add: addRoom, update: updateRoom } = useRooms();
    const { sets, add: addSet, update: updateSet } = useSets();
    const { props, add: addProp } = useProps();
    const { characters, add: addCharacter } = useCharacters();
    const { compounds, add: addCompound } = useCompounds();
    const { components, findOrCreate: findOrCreateComponent } = useComponents();

    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [importStatus, setImportStatus] = useState<string[]>([]);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: '' });
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
            setImportStatus(['Looking up characters, components, and compound words via HanziPy...']);

            try {
                // Use the async character file parser that calls the HanziPy API with components
                const parsed = await parseCharacterFileWithComponentsAsync(content);
                setPreviewData(parsed);

                // Also extract and look up compound words using jieba segmentation
                const compoundWords = await extractCompoundWords(content);
                const compoundResults = await lookupCompoundWordsAPI(compoundWords);
                setPreviewCompounds(compoundResults);

                const foundCount = parsed.filter(p => p.found).length;
                const notFoundCount = parsed.filter(p => !p.found).length;
                const compoundFoundCount = compoundResults.filter(c => c.found).length;
                const componentsCount = parsed.reduce((acc, p) => acc + (p.components?.length || 0), 0);

                setImportStatus([
                    `Parsed ${parsed.length} unique characters from file`,
                    foundCount > 0 ? `Found ${foundCount} characters in HanziPy` : '',
                    componentsCount > 0 ? `Found ${componentsCount} total components` : '',
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
        setImportStatus(['Looking up characters, components, and compound words via HanziPy...']);

        try {
            const parsed = await parseCharacterFileWithComponentsAsync(pasteText);
            setPreviewData(parsed);

            // Also extract and look up compound words using jieba segmentation
            const compoundWords = await extractCompoundWords(pasteText);
            const compoundResults = await lookupCompoundWordsAPI(compoundWords);
            setPreviewCompounds(compoundResults);

            const foundCount = parsed.filter(p => p.found).length;
            const notFoundCount = parsed.filter(p => !p.found).length;
            const compoundFoundCount = compoundResults.filter(c => c.found).length;
            const componentsCount = parsed.reduce((acc, p) => acc + (p.components?.length || 0), 0);

            setImportStatus([
                `Parsed ${parsed.length} unique characters from text`,
                foundCount > 0 ? `Found ${foundCount} characters in HanziPy` : '',
                componentsCount > 0 ? `Found ${componentsCount} total components` : '',
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
        // First, import default actors - update existing or add new
        const actorsByInitial = new Map(actors.map(a => [a.initial.toLowerCase(), a]));
        let actorCount = 0;

        exampleActors.forEach(actor => {
            const existingActor = actorsByInitial.get(actor.initial.toLowerCase());
            if (existingActor) {
                // Update existing actor
                updateActor(existingActor.id, {
                    name: actor.name,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: actor.description,
                });
                actorCount++;
            } else {
                addActor({
                    name: actor.name,
                    initial: actor.initial,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: actor.description,
                });
                actorCount++;
            }
        });

        // Import default rooms - update existing or add new
        const roomsByTone = new Map(rooms.map(r => [r.tone, r]));
        let roomCount = 0;

        exampleRooms.forEach(room => {
            const existingRoom = roomsByTone.get(room.tone);
            if (existingRoom) {
                // Update existing room
                updateRoom(existingRoom.id, {
                    name: room.name,
                    emoji: room.emoji,
                    description: room.description,
                });
                roomCount++;
            } else {
                addRoom({
                    name: room.name,
                    tone: room.tone,
                    emoji: room.emoji,
                    description: room.description,
                });
                roomCount++;
            }
        });

        // Import default sets - update existing or add new (by final only, no tone)
        const setsByFinal = new Map(sets.map(s => [s.final.toLowerCase(), s]));
        let setCount = 0;

        exampleSets.forEach(set => {
            const existingSet = setsByFinal.get(set.final.toLowerCase());
            if (existingSet) {
                // Update existing set
                updateSet(existingSet.id, {
                    name: set.name,
                    emoji: set.emoji,
                    description: set.description,
                });
                setCount++;
            } else {
                addSet({
                    name: set.name,
                    final: set.final,
                    emoji: set.emoji,
                    description: set.description,
                });
                setCount++;
            }
        });

        return { actorCount, roomCount, setCount };
    };

    const importCharactersFromPreview = async () => {
        if (previewData.length === 0 && previewCompounds.length === 0) return;

        setImporting(true);

        // First ensure we have actors, rooms, and sets
        setImportProgress({ current: 0, total: 100, phase: 'Setting up actors, rooms, and sets...' });
        const { actorCount, roomCount, setCount } = ensureActorsAndSets();

        // Read fresh data from storage (they now have proper IDs)
        const currentActors = storage.getActors();
        const currentRooms = storage.getRooms();
        const currentSets = storage.getSets();

        const existingHanzi = new globalThis.Set(characters.map(c => c.hanzi));

        // Calculate actual new items to import
        const newChars = previewData.filter(c => !existingHanzi.has(c.hanzi));
        const existingCompounds = new globalThis.Set(compounds.map(c => c.word));
        const newCompounds = previewCompounds.filter(c => !existingCompounds.has(c.word));
        const totalNewItems = newChars.length + newCompounds.length;

        let charCount = 0;
        let skipped = 0;
        let notFoundCount = 0;
        let processedNew = 0;

        setImportProgress({ current: 0, total: totalNewItems, phase: `Importing ${newChars.length} new characters...` });

        for (const char of previewData) {
            if (existingHanzi.has(char.hanzi)) {
                skipped++;
                continue;
            }

            // Skip characters without pinyin if user wants
            if (!char.pinyin) {
                notFoundCount++;
                // Still import but with placeholder data
                const movieScene = `Complete this movie scene for ${char.hanzi}...`;

                // Convert components to componentIds (deduplicated)
                const componentIds = char.components?.map(comp =>
                    findOrCreateComponent(comp.character, comp.pinyin, comp.definition, comp.all_definitions).id
                ) || [];

                addCharacter({
                    hanzi: char.hanzi,
                    pinyin: '',
                    meaning: char.definition || 'Unknown meaning',
                    allDefinitions: char.all_definitions,
                    componentIds,
                    actorId: undefined,
                    roomId: undefined,
                    setId: undefined,
                    movieScene,
                    props: [],
                });
                charCount++;
                processedNew++;
                if (processedNew % 10 === 0) {
                    setImportProgress({ current: processedNew, total: totalNewItems, phase: `Importing characters... (${charCount}/${newChars.length})` });
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                continue;
            }

            // Parse pinyin to get initial, final, tone
            const { initial, final, tone } = parsePinyin(char.pinyin);

            // Find matching actor, room (by tone), and set (by final)
            const actor = findActorForInitial(initial, currentActors as Actor[]);
            const room = findRoomForTone(tone, currentRooms as Room[]);
            const set = findSetForFinal(final, currentSets as Set[]);

            // Generate movie scene template
            const movieScene = generateMovieScene(char.hanzi, char.definition || 'meaning');

            // Convert components to componentIds (deduplicated)
            const componentIds = char.components?.map(comp =>
                findOrCreateComponent(comp.character, comp.pinyin, comp.definition, comp.all_definitions).id
            ) || [];

            addCharacter({
                hanzi: char.hanzi,
                pinyin: char.pinyin,
                meaning: char.definition || '',
                allDefinitions: char.all_definitions,
                componentIds,
                actorId: actor?.id,
                roomId: room?.id,
                setId: set?.id,
                movieScene,
                props: [],
            });

            charCount++;
            processedNew++;
            if (processedNew % 10 === 0) {
                setImportProgress({ current: processedNew, total: totalNewItems, phase: `Importing characters... (${charCount}/${newChars.length})` });
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Import compound words
        setImportProgress({ current: processedNew, total: totalNewItems, phase: `Importing ${newCompounds.length} new compound words...` });
        let compoundCount = 0;
        let compoundSkipped = 0;

        for (const compound of previewCompounds) {
            if (existingCompounds.has(compound.word)) {
                compoundSkipped++;
                continue;
            }

            addCompound({
                word: compound.word,
                characters: compound.characters,
                pinyin: compound.pinyin || '',
                definition: compound.definition || '',
            });

            compoundCount++;
            processedNew++;
            if (processedNew % 20 === 0) {
                setImportProgress({ current: processedNew, total: totalNewItems, phase: `Importing compound words... (${compoundCount}/${newCompounds.length})` });
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        setImportProgress({ current: totalNewItems, total: totalNewItems, phase: 'Complete!' });

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
        setImportProgress({ current: 0, total: 0, phase: '' });
        setImporting(false);
    };

    const importDefaultActors = () => {
        const actorsByInitial = new Map(actors.map(a => [a.initial.toLowerCase(), a]));
        let addedCount = 0;
        let updatedCount = 0;

        exampleActors.forEach(actor => {
            const existingActor = actorsByInitial.get(actor.initial.toLowerCase());
            if (existingActor) {
                // Update existing actor
                updateActor(existingActor.id, {
                    name: actor.name,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: actor.description,
                });
                updatedCount++;
            } else {
                addActor({
                    name: actor.name,
                    initial: actor.initial,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: actor.description,
                });
                addedCount++;
            }
        });

        const messages: string[] = [];
        if (addedCount > 0) messages.push(`Added ${addedCount} new actors`);
        if (updatedCount > 0) messages.push(`Updated ${updatedCount} existing actors`);
        setImportStatus(prev => [...prev, messages.join(', ') || 'No actor changes']);
    };

    const importDefaultRooms = () => {
        const roomsByTone = new Map(rooms.map(r => [r.tone, r]));
        let addedCount = 0;
        let updatedCount = 0;

        exampleRooms.forEach(room => {
            const existingRoom = roomsByTone.get(room.tone);
            if (existingRoom) {
                // Update existing room
                updateRoom(existingRoom.id, {
                    name: room.name,
                    emoji: room.emoji,
                    description: room.description,
                });
                updatedCount++;
            } else {
                addRoom({
                    name: room.name,
                    tone: room.tone,
                    emoji: room.emoji,
                    description: room.description,
                });
                addedCount++;
            }
        });

        const messages: string[] = [];
        if (addedCount > 0) messages.push(`Added ${addedCount} new rooms`);
        if (updatedCount > 0) messages.push(`Updated ${updatedCount} existing rooms`);
        setImportStatus(prev => [...prev, messages.join(', ') || 'No room changes']);
    };

    const importDefaultSets = () => {
        const setsByFinal = new Map(sets.map(s => [s.final.toLowerCase(), s]));
        let addedCount = 0;
        let updatedCount = 0;

        exampleSets.forEach(set => {
            const existingSet = setsByFinal.get(set.final.toLowerCase());
            if (existingSet) {
                // Update existing set
                updateSet(existingSet.id, {
                    name: set.name,
                    emoji: set.emoji,
                    description: set.description,
                });
                updatedCount++;
            } else {
                addSet({
                    name: set.name,
                    final: set.final,
                    emoji: set.emoji,
                    description: set.description,
                });
                addedCount++;
            }
        });

        const messages: string[] = [];
        if (addedCount > 0) messages.push(`Added ${addedCount} new sets`);
        if (updatedCount > 0) messages.push(`Updated ${updatedCount} existing sets`);
        setImportStatus(prev => [...prev, messages.join(', ') || 'No set changes']);
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

    const exportBackup = () => {
        const characters = storage.getCharacters();
        const learnedCount = characters.filter(c => c.learned).length;
        const unlearnedCount = characters.filter(c => !c.learned).length;

        const backup = {
            version: 2,
            exportedAt: new Date().toISOString(),
            data: {
                actors: storage.getActors(),
                rooms: storage.getRooms(),
                sets: storage.getSets(),
                props: storage.getProps(),
                characters: characters,
                compounds: storage.getCompounds(),
                components: storage.getComponents(),
            }
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hanzi-movie-method-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setImportStatus(prev => [...prev, `Backup exported successfully! (${learnedCount} learned, ${unlearnedCount} unlearned characters)`]);
    }; const importBackup = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target?.result as string);

                if (!backup.data) {
                    setImportStatus(['Error: Invalid backup file format']);
                    return;
                }

                if (confirm('This will replace ALL current data with the backup. Continue?')) {
                    const { actors: backupActors, rooms: backupRooms, sets: backupSets, props: backupProps, characters: backupCharacters, compounds: backupCompounds, components: backupComponents } = backup.data;

                    if (backupActors) storage.saveActors(backupActors);
                    if (backupRooms) storage.saveRooms(backupRooms);
                    if (backupSets) storage.saveSets(backupSets);
                    if (backupProps) storage.saveProps(backupProps);
                    if (backupCharacters) storage.saveCharacters(backupCharacters);
                    if (backupCompounds) storage.saveCompounds(backupCompounds);
                    if (backupComponents) storage.saveComponents(backupComponents);

                    const learnedCount = backupCharacters?.filter((c: Character) => c.learned).length || 0;
                    const unlearnedCount = backupCharacters?.filter((c: Character) => !c.learned).length || 0;

                    setImportStatus([
                        'Backup restored successfully!',
                        `Restored ${backupActors?.length || 0} actors`,
                        `Restored ${backupRooms?.length || 0} rooms`,
                        `Restored ${backupSets?.length || 0} sets`,
                        `Restored ${backupProps?.length || 0} props`,
                        `Restored ${backupCharacters?.length || 0} characters (${learnedCount} learned, ${unlearnedCount} unlearned)`,
                        `Restored ${backupCompounds?.length || 0} compounds`,
                        `Restored ${backupComponents?.length || 0} components`,
                    ]);

                    // Reload page to refresh all data
                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (error) {
                setImportStatus(['Error: Could not parse backup file', error instanceof Error ? error.message : 'Unknown error']);
            }
        };
        reader.readAsText(file);
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
                <h1 className="text-3xl font-bold text-amber-400 mb-2">Database</h1>
                <p className="text-slate-400">Import characters, manage data, and backup your database</p>
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

            {/* Current Stats */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Current Database</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                    <div>
                        <div className="text-3xl font-bold text-amber-400">{characters.length}</div>
                        <div className="text-slate-400 text-sm">Characters</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-cyan-400">{compounds.length}</div>
                        <div className="text-slate-400 text-sm">Compounds</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-pink-400">{components.length}</div>
                        <div className="text-slate-400 text-sm">Components</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-blue-400">{actors.length}</div>
                        <div className="text-slate-400 text-sm">Actors</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-400">{sets.length}</div>
                        <div className="text-slate-400 text-sm">Sets</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-orange-400">{rooms.length}</div>
                        <div className="text-slate-400 text-sm">Rooms</div>
                    </div>
                </div>
            </div>

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
            {previewData.length > 0 && (() => {
                const existingHanziSet = new globalThis.Set(characters.map(c => c.hanzi));
                const newChars = previewData.filter(c => !existingHanziSet.has(c.hanzi));
                const existingChars = previewData.filter(c => existingHanziSet.has(c.hanzi));
                return (
                    <div className="bg-slate-800 rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">
                                Preview ({newChars.length} new{existingChars.length > 0 && <span className="text-slate-500">, {existingChars.length} existing</span>})
                            </h2>
                            <button
                                onClick={importCharactersFromPreview}
                                disabled={importing || newChars.length === 0}
                                className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                            >
                                {importing ? 'Importing...' : 'Import All Characters'}
                            </button>
                        </div>

                        {/* Import Progress */}
                        {importing && importProgress.total > 0 && (
                            <div className="mb-4 bg-slate-700/50 rounded-lg p-4">
                                <div className="flex justify-between text-sm text-slate-400 mb-2">
                                    <span>{importProgress.phase}</span>
                                    <span>{importProgress.current} / {importProgress.total}</span>
                                </div>
                                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-150"
                                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-500 mt-2 text-center">
                                    {Math.round((importProgress.current / importProgress.total) * 100)}% complete
                                </div>
                            </div>
                        )}

                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="text-slate-400 border-b border-slate-700 sticky top-0 bg-slate-800">
                                    <tr>
                                        <th className="text-left py-2 px-2">Character</th>
                                        <th className="text-left py-2 px-2">Pinyin</th>
                                        <th className="text-left py-2 px-2">Definition</th>
                                        <th className="text-left py-2 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 50).map((char, i) => {
                                        const isExisting = existingHanziSet.has(char.hanzi);
                                        return (
                                            <tr key={i} className={`border-b border-slate-700/50 ${isExisting ? 'opacity-50' : ''}`}>
                                                <td className="py-2 px-2">
                                                    <span className="text-2xl text-amber-400">{char.hanzi}</span>
                                                </td>
                                                <td className="py-2 px-2 text-slate-300">
                                                    {char.pinyin || <span className="text-slate-500">—</span>}
                                                </td>
                                                <td className="py-2 px-2 text-slate-400 max-w-xs">
                                                    {char.definition || <span className="text-slate-500">—</span>}
                                                </td>
                                                <td className="py-2 px-2">
                                                    {isExisting ? (
                                                        <span className="text-slate-500 text-xs">Already imported</span>
                                                    ) : char.found ? (
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
                            💡 Characters will be automatically assigned actors (initial), rooms (tone), and sets (final) on import.
                        </p>
                    </div>
                );
            })()}

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
                <h2 className="text-xl font-semibold mb-4">Setup Default Actors, Rooms & Sets</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Before importing characters, set up your actors, rooms, and sets. These will be automatically matched to characters based on pinyin. Components are created automatically during character import.
                </p>
                <div className="grid grid-cols-3 gap-4">
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

            {/* Backup & Restore */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Export your entire database as a JSON file for backup, or restore from a previous backup.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={exportBackup}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-500 transition-colors"
                    >
                        📤 Export Backup
                    </button>
                    <label className="flex-1">
                        <input
                            type="file"
                            accept=".json"
                            onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
                            className="hidden"
                        />
                        <span className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors text-center cursor-pointer">
                            📥 Restore from Backup
                        </span>
                    </label>
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
