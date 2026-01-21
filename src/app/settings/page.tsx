'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useActors, useRooms, useSets, useProps, useCharacters, useCompounds, useComponents } from '@/hooks/useLocalStorage';
import { exampleActors, exampleRooms, exampleSets } from '@/lib/seedData';
import defaults from '@/lib/defaults.json';
import * as storage from '@/lib/storage';
import { clearDatabaseCache, isDatabaseDownloaded, useOfflineDb, getCharacterWordCount, getCompoundWordCount, getExampleCount } from '@/lib/offlineDb';
import type { Character } from '@/types';

// Offline Database Management Section
function OfflineDbSection() {
    const [isClient, setIsClient] = useState(false);
    const [dbDownloaded, setDbDownloaded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { isReady, isLoading, initialize } = useOfflineDb();

    useEffect(() => {
        setIsClient(true);
        setDbDownloaded(isDatabaseDownloaded());
    }, [isReady]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete the offline database?')) {
            setIsDeleting(true);
            clearDatabaseCache();
            setDbDownloaded(false);
            setIsDeleting(false);
        }
    };

    const handleDownload = async () => {
        await initialize();
        setDbDownloaded(isDatabaseDownloaded());
    };

    if (!isClient) {
        return null;
    }

    return (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 relative">
            {/* Status badge - top right */}
            <div className="absolute top-4 right-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${dbDownloaded
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {dbDownloaded ? '✓ Downloaded' : '○ Not Downloaded'}
                </span>
            </div>

            <h2 className="text-xl font-semibold text-amber-400 mb-2">Offline Database</h2>
            <p className="text-slate-400 text-sm mb-4">
                The offline database contains word frequencies from SUBTLEX-CH corpus, definitions from CC-CEDICT,
                and 63,000+ example sentences. It&apos;s cached locally for offline use.
                {isReady && <span className="text-slate-500"> (~26 MB)</span>}
            </p>

            <div className="flex gap-3">
                {!dbDownloaded ? (
                    <button
                        onClick={handleDownload}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Downloading...' : '📥 Download Database'}
                    </button>
                ) : (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : '🗑️ Delete Database'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { actors, add: addActor, update: updateActor } = useActors();
    const { rooms, add: addRoom, update: updateRoom } = useRooms();
    const { sets, add: addSet, update: updateSet } = useSets();
    const { props } = useProps();
    const { characters } = useCharacters();
    const { compounds } = useCompounds();
    const { components } = useComponents();

    const [importStatus, setImportStatus] = useState<string[]>([]);
    const [dbCharCount, setDbCharCount] = useState<number | null>(null);
    const [dbCompoundCount, setDbCompoundCount] = useState<number | null>(null);
    const [dbExampleCount, setDbExampleCount] = useState<number | null>(null);

    // Load database counts
    useEffect(() => {
        if (isDatabaseDownloaded()) {
            getCharacterWordCount().then(setDbCharCount).catch(() => setDbCharCount(null));
            getCompoundWordCount().then(setDbCompoundCount).catch(() => setDbCompoundCount(null));
            getExampleCount().then(setDbExampleCount).catch(() => setDbExampleCount(null));
        }
    }, []);

    const importDefaultActors = () => {
        const actorsByInitial = new Map(actors.map(a => [a.initial.toLowerCase(), a]));
        let addedCount = 0;
        let updatedCount = 0;

        exampleActors.forEach(actor => {
            const existingActor = actorsByInitial.get(actor.initial.toLowerCase());
            if (existingActor) {
                updateActor(existingActor.id, {
                    name: actor.name,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: defaults.actorDescriptions[actor.initial as keyof typeof defaults.actorDescriptions],
                });
                updatedCount++;
            } else {
                addActor({
                    name: actor.name,
                    initial: actor.initial,
                    category: actor.category as 'male' | 'female' | 'fictional' | 'basketball_players',
                    emoji: actor.emoji,
                    description: defaults.actorDescriptions[actor.initial as keyof typeof defaults.actorDescriptions],
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
                updateSet(existingSet.id, {
                    name: set.name,
                    emoji: set.emoji,
                    description: defaults.setDescriptions[set.final as keyof typeof defaults.setDescriptions],
                });
                updatedCount++;
            } else {
                addSet({
                    name: set.name,
                    final: set.final,
                    emoji: set.emoji,
                    description: defaults.setDescriptions[set.final as keyof typeof defaults.setDescriptions],
                });
                addedCount++;
            }
        });

        const messages: string[] = [];
        if (addedCount > 0) messages.push(`Added ${addedCount} new sets`);
        if (updatedCount > 0) messages.push(`Updated ${updatedCount} existing sets`);
        setImportStatus(prev => [...prev, messages.join(', ') || 'No set changes']);
    };

    const clearAll = () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            localStorage.removeItem('hmm-actors');
            localStorage.removeItem('hmm-rooms');
            localStorage.removeItem('hmm-sets');
            localStorage.removeItem('hmm-props');
            localStorage.removeItem('hmm-characters');
            localStorage.removeItem('hmm-compounds');
            localStorage.removeItem('hmm-corpus-learning');
            window.location.reload();
        }
    };

    const exportBackup = () => {
        const chars = storage.getCharacters();
        const learnedCount = chars.filter(c => c.learned).length;
        const unlearnedCount = chars.filter(c => !c.learned).length;

        // Get corpus learning data and convert Map to Object for JSON serialization
        const corpusLearningMap = storage.getCorpusLearningData();
        const corpusLearningObj = Object.fromEntries(corpusLearningMap);
        const corpusLearnedCount = Array.from(corpusLearningMap.values()).filter(s => s.learned).length;
        const corpusReviewedCount = Array.from(corpusLearningMap.values()).filter(s => s.reviewed).length;

        const backup = {
            version: 2,
            exportedAt: new Date().toISOString(),
            data: {
                actors: storage.getActors(),
                rooms: storage.getRooms(),
                sets: storage.getSets(),
                props: storage.getProps(),
                characters: chars,
                compounds: storage.getCompounds(),
                components: storage.getComponents(),
                corpusLearning: corpusLearningObj,
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

        const messages = [`Backup exported successfully!`];
        if (learnedCount > 0 || unlearnedCount > 0) {
            messages.push(`Legacy characters: ${learnedCount} learned, ${unlearnedCount} unlearned`);
        }
        if (corpusLearnedCount > 0 || corpusReviewedCount > 0) {
            messages.push(`Study progress: ${corpusLearnedCount} learned, ${corpusReviewedCount} in review`);
        }
        setImportStatus(prev => [...prev, messages.join(' | ')]);
    };

    const formatCompactNumber = (number: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1 // Limits decimal places to one
        }).format(number);
    };

    const importBackup = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target?.result as string);

                if (!backup.data) {
                    setImportStatus(['Error: Invalid backup file format']);
                    return;
                }

                if (confirm('This will replace ALL current data with the backup. Continue?')) {
                    const { actors: backupActors, rooms: backupRooms, sets: backupSets, props: backupProps, characters: backupCharacters, compounds: backupCompounds, components: backupComponents, corpusLearning: backupCorpusLearning } = backup.data;

                    if (backupActors) storage.saveActors(backupActors);
                    if (backupRooms) storage.saveRooms(backupRooms);
                    if (backupSets) storage.saveSets(backupSets);
                    if (backupProps) storage.saveProps(backupProps);
                    if (backupCharacters) storage.saveCharacters(backupCharacters);
                    if (backupCompounds) storage.saveCompounds(backupCompounds);
                    if (backupComponents) storage.saveComponents(backupComponents);

                    // Convert corpusLearning object back to Map for storage
                    if (backupCorpusLearning) {
                        const corpusMap = new Map(Object.entries(backupCorpusLearning)) as Map<string, storage.CorpusWordState>;
                        storage.saveCorpusLearningData(corpusMap);
                    }

                    const learnedCount = backupCharacters?.filter((c: Character) => c.learned).length || 0;
                    const unlearnedCount = backupCharacters?.filter((c: Character) => !c.learned).length || 0;
                    const corpusLearnedCount = backupCorpusLearning ? Object.values(backupCorpusLearning).filter((s: any) => s.learned).length : 0;
                    const corpusReviewedCount = backupCorpusLearning ? Object.values(backupCorpusLearning).filter((s: any) => s.reviewed).length : 0;

                    const messages = [
                        'Backup restored successfully!',
                        `Restored ${backupActors?.length || 0} actors`,
                        `Restored ${backupRooms?.length || 0} rooms`,
                        `Restored ${backupSets?.length || 0} sets`,
                        `Restored ${backupProps?.length || 0} props`,
                        `Restored ${backupCharacters?.length || 0} characters (${learnedCount} learned, ${unlearnedCount} unlearned)`,
                        `Restored ${backupCompounds?.length || 0} compounds`,
                        `Restored ${backupComponents?.length || 0} components`,
                    ];

                    if (corpusLearnedCount > 0 || corpusReviewedCount > 0) {
                        messages.push(`Restored study progress: ${corpusLearnedCount} learned, ${corpusReviewedCount} in review`);
                    }

                    setImportStatus(messages);

                    setTimeout(() => window.location.reload(), 1500);
                }
            } catch (error) {
                setImportStatus(['Error: Could not parse backup file', error instanceof Error ? error.message : 'Unknown error']);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-amber-400 mb-2">Settings</h1>
                <p className="text-slate-400">Manage your database, actors, rooms, sets, and backups</p>
            </div>

            {/* Current Stats */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Current Database</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                    <div>
                        <div className="text-3xl font-bold text-amber-400">{dbCharCount !== null ? formatCompactNumber(dbCharCount) : '—'}</div>
                        <div className="text-slate-400 text-sm">Characters</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-cyan-400">{dbCompoundCount !== null ? formatCompactNumber(dbCompoundCount) : '—'}</div>
                        <div className="text-slate-400 text-sm">Compounds</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-green-400">{dbExampleCount !== null ? formatCompactNumber(dbExampleCount) : '—'}</div>
                        <div className="text-slate-400 text-sm">Examples</div>
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

            {/* Offline Database Management */}
            <div className="mb-8">
                <OfflineDbSection />
            </div>

            {/* Default Data Import */}
            <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Setup Default Actors, Rooms & Sets</h2>
                <p className="text-slate-400 text-sm mb-4">
                    Set up your actors (initials), rooms (tones), and sets (finals) for the Hanzi Movie Method.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <h3 className="text-lg font-semibold mb-2">Status</h3>
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
