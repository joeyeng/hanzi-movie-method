'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCharactersWithRelations, useCompounds, useActors, useRooms, useSets, useProps } from '@/hooks/useLocalStorage';
import { fetchExampleSentences, TatoebaExample } from '@/lib/hanzipy';
import { formatDefinition } from '@/lib/format';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { getWordHmm, setWordHmm, WordHmmData, getCorpusWordState, setCorpusWordLearned, setCorpusWordReviewed, markCorpusWordReviewed } from '@/lib/storage';
import { findHmmMatches, parseFirstSyllable } from '@/lib/pinyinParser';
import type { Actor, Room, Set, Prop } from '@/types';
import Link from 'next/link';

// Check if string looks like a UUID
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Build movie scene with auto-prepended template and resolved names
function resolveMovieScene(
    scene: string,
    actor?: { name: string },
    room?: { name: string },
    set?: { name: string }
): string {
    const actorName = actor?.name || '[Actor]';
    const roomName = room?.name || '[Room]';
    const setName = set?.name || '[Set]';

    // Strip any existing template prefix from the scene (for backwards compatibility)
    const cleanScene = scene.replace(/^\{\{ACTOR\}\} is in \{\{SET\}\} in a \{\{ROOM\}\}\.\s*/i, '');

    // Build the full scene with template prepended
    const template = `${actorName} is at ${setName} in the ${roomName}.`;

    return cleanScene ? `${template} ${cleanScene}` : template;
}

// Hook for corpus word learning state - uses the unified storage system
function useCorpusLearningState(word: string) {
    const [isLearned, setIsLearned] = useState(false);
    const [isReviewed, setIsReviewed] = useState(false);
    const [reviewCount, setReviewCount] = useState(0);

    useEffect(() => {
        const state = getCorpusWordState(word);
        if (state) {
            setIsLearned(state.learned);
            setIsReviewed(state.reviewed);
            setReviewCount(state.reviewCount);
        }
    }, [word]);

    const toggleLearned = useCallback(() => {
        const newState = setCorpusWordLearned(word, !isLearned);
        setIsLearned(newState.learned);
    }, [word, isLearned]);

    const toggleReviewed = useCallback(() => {
        const newState = setCorpusWordReviewed(word, !isReviewed);
        setIsReviewed(newState.reviewed);
    }, [word, isReviewed]);

    return { isLearned, isReviewed, reviewCount, toggleLearned, toggleReviewed };
}

// HMM Display component for showing saved scene data
function HmmDisplay({
    wordHmm,
    actors,
    rooms,
    sets,
    props,
}: {
    wordHmm: WordHmmData;
    actors: Actor[];
    rooms: Room[];
    sets: Set[];
    props: Prop[];
}) {
    const actor = actors.find(a => a.id === wordHmm.actorId);
    const room = rooms.find(r => r.id === wordHmm.roomId);
    const set = sets.find(s => s.id === wordHmm.setId);
    const selectedProps = props.filter(p => wordHmm.propIds?.includes(p.id));

    // Build scene description
    const actorName = actor?.name || '[No Actor]';
    const roomName = room?.name || '[No Room]';
    const setName = set?.name || '[No Set]';
    const template = `${actorName} is at ${setName} in the ${roomName}.`;
    const fullScene = wordHmm.movieScene ? `${template} ${wordHmm.movieScene}` : template;

    return (
        <div className="space-y-4">
            {/* Scene description */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-white italic">{fullScene}</p>
            </div>

            {/* Actor, Room, Set grid */}
            <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{actor?.emoji || '👤'}</div>
                    <div className="text-slate-400 text-xs">Actor</div>
                    <div className="text-white font-medium">{actor?.name || 'Not set'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{room?.emoji || '🏠'}</div>
                    <div className="text-slate-400 text-xs">Room</div>
                    <div className="text-white font-medium">{room?.name || 'Not set'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{set?.emoji || '📍'}</div>
                    <div className="text-slate-400 text-xs">Set</div>
                    <div className="text-white font-medium">{set?.name || 'Not set'}</div>
                </div>
            </div>

            {/* Props */}
            {selectedProps.length > 0 && (
                <div>
                    <div className="text-slate-400 text-xs mb-2">Props</div>
                    <div className="flex flex-wrap gap-2">
                        {selectedProps.map(prop => (
                            <span key={prop.id} className="bg-slate-800/50 px-2 py-1 rounded text-sm">
                                {prop.emoji || '🎭'} {prop.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            {wordHmm.notes && (
                <div>
                    <div className="text-slate-400 text-xs mb-1">Notes</div>
                    <p className="text-slate-300 text-sm">{wordHmm.notes}</p>
                </div>
            )}
        </div>
    );
}

// HMM Editor component for editing scene data
function HmmEditor({
    word,
    pinyin,
    wordHmm,
    actors,
    rooms,
    sets,
    props,
    onSave,
    onCancel,
}: {
    word: string;
    pinyin?: string;
    wordHmm?: WordHmmData;
    actors: Actor[];
    rooms: Room[];
    sets: Set[];
    props: Prop[];
    onSave: (updated: WordHmmData) => void;
    onCancel: () => void;
}) {
    // Auto-detect matches from pinyin
    const autoMatches = useMemo(() => {
        if (!pinyin) return { actorId: undefined, roomId: undefined, setId: undefined };
        return findHmmMatches(pinyin, actors, rooms, sets);
    }, [pinyin, actors, rooms, sets]);

    // Use saved values, falling back to auto-detected
    const [actorId, setActorId] = useState(wordHmm?.actorId || autoMatches.actorId || '');
    const [roomId, setRoomId] = useState(wordHmm?.roomId || autoMatches.roomId || '');
    const [setId, setSetId] = useState(wordHmm?.setId || autoMatches.setId || '');
    const [propIds, setPropIds] = useState<string[]>(wordHmm?.propIds || []);
    const [movieScene, setMovieScene] = useState(wordHmm?.movieScene || '');
    const [notes, setNotes] = useState(wordHmm?.notes || '');

    // Update state when auto-matches change (if no existing wordHmm)
    useEffect(() => {
        if (!wordHmm) {
            if (autoMatches.actorId && !actorId) setActorId(autoMatches.actorId);
            if (autoMatches.roomId && !roomId) setRoomId(autoMatches.roomId);
            if (autoMatches.setId && !setId) setSetId(autoMatches.setId);
        }
    }, [autoMatches, wordHmm, actorId, roomId, setId]);

    const handleSave = () => {
        const updated = setWordHmm(word, {
            actorId: actorId || undefined,
            roomId: roomId || undefined,
            setId: setId || undefined,
            propIds: propIds.length > 0 ? propIds : undefined,
            movieScene: movieScene || undefined,
            notes: notes || undefined,
        });
        onSave(updated);
    };

    const toggleProp = (propId: string) => {
        setPropIds(prev =>
            prev.includes(propId)
                ? prev.filter(id => id !== propId)
                : [...prev, propId]
        );
    };

    return (
        <div className="space-y-4">
            {/* Movie scene textarea */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Scene Description</label>
                <textarea
                    value={movieScene}
                    onChange={(e) => setMovieScene(e.target.value)}
                    placeholder="Describe what happens in the scene..."
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-400 focus:outline-none min-h-[100px] resize-y"
                />
                <p className="text-slate-500 text-xs mt-1">
                    The scene will be prepended with: &quot;[Actor] is at [Set] in the [Room].&quot;
                </p>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Notes (optional)</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-amber-400 focus:outline-none min-h-[60px] resize-y"
                />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded font-medium hover:bg-amber-400 transition-colors"
                >
                    Save Scene
                </button>
            </div>
        </div>
    );
}

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const decodedId = decodeURIComponent(id);
    const isLegacyId = isUUID(decodedId);

    const router = useRouter();
    const { characters, loading, update, toggleLearned, toggleReviewed } = useCharactersWithRelations();
    const { compounds } = useCompounds();
    const { actors } = useActors();
    const { rooms } = useRooms();
    const { sets } = useSets();
    const { props } = useProps();
    const { isReady: dbReady, getWord } = useOfflineDb();

    const [isEditingScene, setIsEditingScene] = useState(false);
    const [editedScene, setEditedScene] = useState('');
    const [exampleSentences, setExampleSentences] = useState<TatoebaExample[]>([]);
    const [loadingExamples, setLoadingExamples] = useState(false);
    const [corpusWord, setCorpusWord] = useState<WordEntryWithPrimary | null>(null);
    const [corpusLoading, setCorpusLoading] = useState(!isLegacyId);

    // HMM data state for corpus words
    const [wordHmm, setWordHmmState] = useState<WordHmmData | undefined>(undefined);
    const [isEditingHmm, setIsEditingHmm] = useState(false);

    // For corpus words, use the learning state hook
    const corpusLearning = useCorpusLearningState(decodedId);

    // Find character from localStorage (for legacy UUIDs or HMM data)
    const character = isLegacyId
        ? characters.find(c => c.id === decodedId)
        : characters.find(c => c.hanzi === decodedId);

    // Load HMM data for corpus words
    useEffect(() => {
        if (!isLegacyId && corpusWord) {
            const hmm = getWordHmm(corpusWord.word);
            setWordHmmState(hmm);
        }
    }, [isLegacyId, corpusWord]);

    // Load corpus word from offline db
    useEffect(() => {
        if (isLegacyId || !dbReady) return;

        async function loadCorpusWord() {
            setCorpusLoading(true);
            try {
                const word = await getWord(decodedId);
                setCorpusWord(word);
            } catch (err) {
                console.error('Failed to load word from db:', err);
            } finally {
                setCorpusLoading(false);
            }
        }

        loadCorpusWord();
    }, [decodedId, isLegacyId, dbReady, getWord]);

    // Get the hanzi to use for fetching examples
    const hanzi = character?.hanzi || corpusWord?.word || decodedId;

    // Fetch example sentences when character loads
    useEffect(() => {
        if (hanzi) {
            setLoadingExamples(true);
            fetchExampleSentences(hanzi, 10)
                .then(setExampleSentences)
                .finally(() => setLoadingExamples(false));
        }
    }, [hanzi]);

    if (loading || corpusLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    // If we have neither HMM character nor corpus word, show not found
    if (!character && !corpusWord) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Character Not Found</h1>
                <p className="text-slate-400 mb-6">The character &quot;{decodedId}&quot; was not found.</p>
                <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
                    ← Back to Characters
                </button>
            </div>
        );
    }

    // If we have HMM character data, show full HMM view
    if (character) {
        const resolvedMovieScene = resolveMovieScene(character.movieScene, character.actor, character.room, character.set);
        const relatedCompounds = compounds.filter(c => c.characters.includes(character.hanzi));
        const hasMultipleDefinitions = character.allDefinitions && character.allDefinitions.length > 1;

        const handleSaveScene = () => {
            update(character.id, { movieScene: editedScene });
            setIsEditingScene(false);
        };

        const handleStartEditScene = () => {
            setEditedScene(character.movieScene);
            setIsEditingScene(true);
        };

        const handleSetDefaultDefinition = (pinyin: string, definition: string) => {
            update(character.id, { pinyin, meaning: definition });
        };

        // Get the template with resolved names for display
        const templatePrefix = `${character.actor?.name || '[Actor]'} is at ${character.set?.name || '[Set]'} in the ${character.room?.name || '[Room]'}.`;

        return (
            <div className="max-w-4xl mx-auto">
                {/* Back link */}
                <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                    ← Back
                </button>

                <div className="bg-slate-800 rounded-lg p-6">
                    {/* Status badges and Google Translate */}
                    <div className="flex items-center gap-2 mb-4">
                        {character.learned && (
                            <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                                ✓ Learned
                            </span>
                        )}
                        {character.reviewed && (
                            <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                                📚 In Review
                            </span>
                        )}
                        {character.reviewCount > 0 && (
                            <span className="text-sm bg-slate-700 text-slate-400 px-3 py-1 rounded-full">
                                Reviewed {character.reviewCount}x
                            </span>
                        )}
                        <div className="flex-1"></div>
                        <a
                            href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(character.hanzi)}&op=translate`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-400 transition-colors"
                            title="Google Translate"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                            </svg>
                        </a>
                    </div>

                    {/* Header with character and basic info */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start gap-4">
                            <span className="text-7xl font-bold text-amber-400">{character.hanzi}</span>
                            <div>
                                <p className="text-2xl text-white mb-1">{character.pinyin}</p>
                                <p className="text-lg text-slate-400">{formatDefinition(character.meaning)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Additional definitions */}
                    {hasMultipleDefinitions && (
                        <div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
                            <h3 className="text-sm font-medium text-slate-300 mb-2">All Definitions <span className="text-slate-500">(click to set as default)</span></h3>
                            <div className="space-y-2">
                                {character.allDefinitions!.map((def, index) => {
                                    const isDefault = def.pinyin === character.pinyin && def.definition === character.meaning;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleSetDefaultDefinition(def.pinyin, def.definition)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${isDefault
                                                ? 'bg-amber-500/20 border border-amber-500/50'
                                                : 'hover:bg-slate-600/50'
                                                }`}
                                        >
                                            <span className={isDefault ? 'text-amber-400' : 'text-slate-300'}>{def.pinyin}</span>
                                            <span className="text-slate-500 mx-2">—</span>
                                            <span className={isDefault ? 'text-amber-300' : 'text-slate-400'}>{formatDefinition(def.definition)}</span>
                                            {isDefault && <span className="ml-2 text-amber-500 text-xs">(default)</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Emojis for Actor, Set, Room */}
                    {(character.actor?.emoji || character.room?.emoji || character.set?.emoji) && (
                        <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                            <div className="flex justify-center items-center gap-8 text-5xl">
                                {character.actor?.emoji && (
                                    <span title={`Actor: ${character.actor.name}`} className="hover:scale-110 transition-transform cursor-default">{character.actor.emoji}</span>
                                )}
                                {character.set?.emoji && (
                                    <span title={`Set: ${character.set.name}`} className="hover:scale-110 transition-transform cursor-default">{character.set.emoji}</span>
                                )}
                                {character.room?.emoji && (
                                    <span title={`Room: ${character.room.name}`} className="hover:scale-110 transition-transform cursor-default">{character.room.emoji}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actor, Set, Room details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {character.actor && (
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <h3 className="text-slate-400 text-sm mb-1">Actor (Initial)</h3>
                                <p className="text-white text-lg">{character.actor.name}</p>
                                <p className="text-slate-500">{character.actor.initial}</p>
                                {character.actor.description && (
                                    <p className="text-slate-500 text-sm mt-2">{character.actor.description}</p>
                                )}
                            </div>
                        )}
                        {character.set && (
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <h3 className="text-slate-400 text-sm mb-1">Set (Final)</h3>
                                <p className="text-white text-lg">{character.set.name}</p>
                                <p className="text-slate-500">{character.set.final}</p>
                                {character.set.description && (
                                    <p className="text-slate-500 text-sm mt-2">{character.set.description}</p>
                                )}
                            </div>
                        )}
                        {character.room && (
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <h3 className="text-slate-400 text-sm mb-1">Room (Tone)</h3>
                                <p className="text-white text-lg">{character.room.name}</p>
                                <p className="text-slate-500">Tone {character.room.tone}</p>
                                {character.room.description && (
                                    <p className="text-slate-500 text-sm mt-2">{character.room.description}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Props */}
                    {character.props.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-slate-400 text-sm mb-2">Props (Components)</h3>
                            <div className="flex flex-wrap gap-2">
                                {character.props.map(prop => (
                                    <span key={prop.id} className="bg-slate-700 rounded px-3 py-1 text-slate-300">
                                        {prop.name} <span className="text-amber-400">({prop.component})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Character Components (Radicals) */}
                    {character.components && character.components.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-slate-400 text-sm mb-2">Props (Components)</h3>
                            <div className="flex flex-wrap gap-2">
                                {character.components.map((comp, index) => (
                                    <Link
                                        key={index}
                                        href={`/component?char=${encodeURIComponent(comp.character)}`}
                                        className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 text-slate-300 transition-colors group"
                                    >
                                        <span className="text-2xl text-amber-400 group-hover:text-amber-300">{comp.character}</span>
                                        {comp.pinyin && (
                                            <span className="ml-2 text-sm text-slate-400">{comp.pinyin}</span>
                                        )}
                                        {comp.definition && (
                                            <span className="ml-1 text-xs text-slate-500">({comp.definition.split(',')[0].split('/')[0].trim()})</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Movie Scene - Editable */}
                    <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-slate-400 text-sm">Movie Scene</h3>
                            {!isEditingScene && (
                                <button
                                    onClick={handleStartEditScene}
                                    className="text-xs text-amber-400 hover:text-amber-300"
                                >
                                    Edit Scene
                                </button>
                            )}
                        </div>
                        {isEditingScene ? (
                            <div>
                                <p className="text-slate-400 text-sm mb-2 italic">{templatePrefix}</p>
                                <textarea
                                    value={editedScene}
                                    onChange={(e) => setEditedScene(e.target.value)}
                                    className="w-full bg-slate-700 rounded p-3 text-slate-200 min-h-[100px]"
                                    placeholder="Describe the scene action..."
                                />
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={handleSaveScene}
                                        className="px-4 py-2 bg-amber-500 text-slate-900 rounded font-medium hover:bg-amber-400 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsEditingScene(false)}
                                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-200 italic text-lg">&quot;{resolvedMovieScene}&quot;</p>
                        )}
                    </div>

                    {/* Compound Words */}
                    {relatedCompounds.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-slate-400 text-sm mb-2">Compound Words</h3>
                            <div className="flex flex-wrap gap-2">
                                {relatedCompounds.map(compound => (
                                    <Link
                                        key={compound.id}
                                        href={`/compounds/${compound.id}`}
                                        className="bg-amber-500/20 hover:bg-amber-500/30 rounded px-3 py-1 text-amber-300 transition-colors"
                                    >
                                        {compound.word} <span className="text-slate-400">({compound.pinyin})</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Example Sentences */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-slate-400 text-sm">Example Sentences</h3>
                            <a
                                href={`https://tatoeba.org/en/sentences/search?from=cmn&to=eng&query=${encodeURIComponent(character.hanzi)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                View more on Tatoeba →
                            </a>
                        </div>
                        {loadingExamples ? (
                            <div className="text-slate-500 text-sm">Loading examples...</div>
                        ) : exampleSentences.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {exampleSentences.map((sentence, index) => (
                                    <div key={sentence.id || index} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors">
                                        <p className="text-xl text-amber-400 mb-2">{sentence.simplified}</p>
                                        <p className="text-sm text-slate-400 mb-2 italic">{sentence.pinyin}</p>
                                        <p className="text-slate-300 text-sm">{sentence.english}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No example sentences found</p>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-6 py-3 border-t border-slate-700">
                        <span>Created: {new Date(character.createdAt).toLocaleDateString()}</span>
                        {character.lastReviewed && (
                            <span>Last Reviewed: {new Date(character.lastReviewed).toLocaleDateString()}</span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            onClick={() => toggleLearned(character.id)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${character.learned
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {character.learned ? '✓ Learned' : 'Mark as Learned'}
                        </button>
                        <button
                            onClick={() => toggleReviewed(character.id)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${character.reviewed
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {character.reviewed ? '📚 In Review' : 'Add to Review'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Corpus-only view (no HMM data)
    const formattedRank = (corpusWord!.rank + 1).toLocaleString();

    // Auto-detect actor/room/set from pinyin
    const autoMatches = findHmmMatches(corpusWord!.pinyin, actors, rooms, sets);
    const autoActor = actors.find(a => a.id === autoMatches.actorId);
    const autoRoom = rooms.find(r => r.id === autoMatches.roomId);
    const autoSet = sets.find(s => s.id === autoMatches.setId);
    const pinyinComponents = parseFirstSyllable(corpusWord!.pinyin);

    // Build auto-generated scene template
    const autoActorName = autoActor?.name || '[Actor]';
    const autoRoomName = autoRoom?.name || '[Room]';
    const autoSetName = autoSet?.name || '[Set]';
    const autoTemplate = `${autoActorName} is at ${autoSetName} in the ${autoRoomName}.`;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back link */}
            <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                ← Back
            </button>

            <div className="bg-slate-800 rounded-lg p-6">
                {/* Status badges and Google Translate */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">
                        #{formattedRank} frequency
                    </span>
                    {corpusLearning.isLearned && (
                        <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                            ✓ Learned
                        </span>
                    )}
                    {corpusLearning.isReviewed && (
                        <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                            📚 In Review
                        </span>
                    )}
                    <div className="flex-1"></div>
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(corpusWord!.word)}&op=translate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Google Translate"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                    </a>
                </div>

                {/* Header with character and basic info */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start gap-4">
                        <span className="text-7xl font-bold text-amber-400">{corpusWord!.word}</span>
                        <div>
                            <p className="text-2xl text-white mb-1">{corpusWord!.pinyin}</p>
                            <p className="text-lg text-slate-400">{formatDefinition(corpusWord!.definition)}</p>
                        </div>
                    </div>
                </div>

                {/* HMM Movie Scene Section */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-amber-400 font-medium">🎬 Movie Scene</h3>
                        <button
                            onClick={() => setIsEditingHmm(!isEditingHmm)}
                            className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
                        >
                            {isEditingHmm ? 'Cancel' : (wordHmm ? 'Edit' : 'Create Scene')}
                        </button>
                    </div>

                    {/* Pinyin breakdown info */}
                    <div className="text-xs text-slate-500 mb-3 flex gap-4">
                        <span>Initial: <span className="text-amber-400">{pinyinComponents.initial}</span></span>
                        <span>Final: <span className="text-amber-400">{pinyinComponents.final}</span></span>
                        <span>Tone: <span className="text-amber-400">{pinyinComponents.tone}</span></span>
                    </div>

                    {isEditingHmm ? (
                        <HmmEditor
                            word={corpusWord!.word}
                            pinyin={corpusWord!.pinyin}
                            wordHmm={wordHmm}
                            actors={actors}
                            rooms={rooms}
                            sets={sets}
                            props={props}
                            onSave={(updated) => {
                                setWordHmmState(updated);
                                setIsEditingHmm(false);
                            }}
                            onCancel={() => setIsEditingHmm(false)}
                        />
                    ) : wordHmm ? (
                        <HmmDisplay
                            wordHmm={wordHmm}
                            actors={actors}
                            rooms={rooms}
                            sets={sets}
                            props={props}
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* Auto-generated template display */}
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <p className="text-white italic">{autoTemplate}</p>
                                {(!autoActor || !autoRoom || !autoSet) && (
                                    <p className="text-amber-500/70 text-xs mt-2">
                                        ⚠️ Some matches not found. Add actors/rooms/sets in the settings to complete.
                                    </p>
                                )}
                            </div>

                            {/* Auto-detected Actor, Room, Set cards */}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className={`bg-slate-800/50 rounded-lg p-4 text-center ${autoActor ? '' : 'border border-dashed border-slate-600'}`}>
                                    <div className="text-5xl mb-2">{autoActor?.emoji || '👤'}</div>
                                    <div className="text-slate-400 text-xs">Actor ({pinyinComponents.initial})</div>
                                    <div className={`font-medium ${autoActor ? 'text-white' : 'text-slate-500'}`}>{autoActor?.name || 'Not found'}</div>
                                </div>
                                <div className={`bg-slate-800/50 rounded-lg p-4 text-center ${autoSet ? '' : 'border border-dashed border-slate-600'}`}>
                                    <div className="text-5xl mb-2">{autoSet?.emoji || '📍'}</div>
                                    <div className="text-slate-400 text-xs">Set ({pinyinComponents.final})</div>
                                    <div className={`font-medium ${autoSet ? 'text-white' : 'text-slate-500'}`}>{autoSet?.name || 'Not found'}</div>
                                </div>
                                <div className={`bg-slate-800/50 rounded-lg p-4 text-center ${autoRoom ? '' : 'border border-dashed border-slate-600'}`}>
                                    <div className="text-5xl mb-2">{autoRoom?.emoji || '🏠'}</div>
                                    <div className="text-slate-400 text-xs">Room (Tone {pinyinComponents.tone})</div>
                                    <div className={`font-medium ${autoRoom ? 'text-white' : 'text-slate-500'}`}>{autoRoom?.name || 'Not found'}</div>
                                </div>
                            </div>

                            <p className="text-slate-500 text-sm text-center">
                                Click &quot;Create Scene&quot; to customize and add a scene description.
                            </p>
                        </div>
                    )}
                </div>

                {/* Example Sentences */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-400 text-sm">Example Sentences</h3>
                        <a
                            href={`https://tatoeba.org/en/sentences/search?from=cmn&to=eng&query=${encodeURIComponent(corpusWord!.word)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            View more on Tatoeba →
                        </a>
                    </div>
                    {loadingExamples ? (
                        <div className="text-slate-500 text-sm">Loading examples...</div>
                    ) : exampleSentences.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exampleSentences.map((sentence, index) => (
                                <div key={sentence.id || index} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors">
                                    <p className="text-xl text-amber-400 mb-2">{sentence.simplified}</p>
                                    <p className="text-sm text-slate-400 mb-2 italic">{sentence.pinyin}</p>
                                    <p className="text-slate-300 text-sm">{sentence.english}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No example sentences found</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        onClick={corpusLearning.toggleLearned}
                        className={`px-4 py-2 rounded font-medium transition-colors ${corpusLearning.isLearned
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {corpusLearning.isLearned ? '✓ Learned' : 'Mark as Learned'}
                    </button>
                    <button
                        onClick={corpusLearning.toggleReviewed}
                        className={`px-4 py-2 rounded font-medium transition-colors ${corpusLearning.isReviewed
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {corpusLearning.isReviewed ? '📚 In Review' : 'Add to Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}
