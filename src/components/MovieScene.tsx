'use client';

import { useState, useCallback, useEffect } from 'react';
import { Actor, Room, Set, Prop } from '@/types';
import { WordHmmData, getWordHmm, setWordHmm } from '@/lib/storage';
import { parseFirstSyllable, findHmmMatches } from '@/lib/pinyinParser';

// Component to display saved HMM data
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
    const usedProps = props.filter(p => wordHmm.propIds?.includes(p.id));

    // Build scene text
    const actorName = actor?.name || '[Actor]';
    const roomName = room?.name || '[Room]';
    const setName = set?.name || '[Set]';
    const baseScene = `${actorName} is at ${setName} in the ${roomName}.`;
    const fullScene = wordHmm.movieScene ? `${baseScene} ${wordHmm.movieScene}` : baseScene;

    return (
        <div className="space-y-4">
            {/* Scene display */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-white italic">{fullScene}</p>
            </div>

            {/* Actor, Room, Set cards */}
            <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{actor?.emoji || '👤'}</div>
                    <div className="text-slate-400 text-xs">Actor</div>
                    <div className="text-white font-medium">{actor?.name || 'None'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{set?.emoji || '📍'}</div>
                    <div className="text-slate-400 text-xs">Set</div>
                    <div className="text-white font-medium">{set?.name || 'None'}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-5xl mb-2">{room?.emoji || '🏠'}</div>
                    <div className="text-slate-400 text-xs">Room</div>
                    <div className="text-white font-medium">{room?.name || 'None'}</div>
                </div>
            </div>

            {/* Props */}
            {usedProps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {usedProps.map(prop => (
                        <span key={prop.id} className="bg-slate-700/50 rounded px-3 py-1 text-sm">
                            <span className="text-lg mr-1">{prop.emoji || '🎭'}</span>
                            <span className="text-slate-300">{prop.name}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Notes */}
            {wordHmm.notes && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">{wordHmm.notes}</p>
                </div>
            )}
        </div>
    );
}

// Component to edit HMM data
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
    pinyin: string;
    wordHmm: WordHmmData | null;
    actors: Actor[];
    rooms: Room[];
    sets: Set[];
    props: Prop[];
    onSave: (updated: WordHmmData) => void;
    onCancel: () => void;
}) {
    // Parse pinyin to get auto-detected matches
    const pinyinComponents = parseFirstSyllable(pinyin);
    const autoMatches = findHmmMatches(pinyin, actors, rooms, sets);

    const [actorId, setActorId] = useState(wordHmm?.actorId || autoMatches.actorId || '');
    const [roomId, setRoomId] = useState(wordHmm?.roomId || autoMatches.roomId || '');
    const [setId, setSetId] = useState(wordHmm?.setId || autoMatches.setId || '');
    const [propIds, setPropIds] = useState<string[]>(wordHmm?.propIds || []);
    const [movieScene, setMovieScene] = useState(wordHmm?.movieScene || '');
    const [notes, setNotes] = useState(wordHmm?.notes || '');

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
            {/* Pinyin breakdown info */}
            <div className="text-xs text-slate-500 flex gap-4">
                <span>Initial: <span className="text-amber-400">{pinyinComponents.initial}</span></span>
                <span>Final: <span className="text-amber-400">{pinyinComponents.final}</span></span>
                <span>Tone: <span className="text-amber-400">{pinyinComponents.tone}</span></span>
            </div>

            {/* Actor selector */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Actor (Initial: {pinyinComponents.initial})</label>
                <select
                    value={actorId}
                    onChange={(e) => setActorId(e.target.value)}
                    className="w-full bg-slate-700 rounded p-2 text-white"
                >
                    <option value="">Select actor...</option>
                    {actors.map(actor => (
                        <option key={actor.id} value={actor.id}>
                            {actor.emoji || '👤'} {actor.name} ({actor.initial})
                        </option>
                    ))}
                </select>
            </div>

            {/* Set selector */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Set (Final: {pinyinComponents.final})</label>
                <select
                    value={setId}
                    onChange={(e) => setSetId(e.target.value)}
                    className="w-full bg-slate-700 rounded p-2 text-white"
                >
                    <option value="">Select set...</option>
                    {sets.map(set => (
                        <option key={set.id} value={set.id}>
                            {set.emoji || '📍'} {set.name} ({set.final})
                        </option>
                    ))}
                </select>
            </div>

            {/* Room selector */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Room (Tone: {pinyinComponents.tone})</label>
                <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-slate-700 rounded p-2 text-white"
                >
                    <option value="">Select room...</option>
                    {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                            {room.emoji || '🏠'} {room.name} (Tone {room.tone})
                        </option>
                    ))}
                </select>
            </div>

            {/* Props selector */}
            {props.length > 0 && (
                <div>
                    <label className="block text-slate-400 text-sm mb-1">Props</label>
                    <div className="flex flex-wrap gap-2">
                        {props.map(prop => (
                            <button
                                key={prop.id}
                                onClick={() => toggleProp(prop.id)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${propIds.includes(prop.id)
                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                            >
                                {prop.emoji || '🎭'} {prop.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Scene description */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Scene Description (optional)</label>
                <textarea
                    value={movieScene}
                    onChange={(e) => setMovieScene(e.target.value)}
                    className="w-full bg-slate-700 rounded p-3 text-slate-200 min-h-[80px]"
                    placeholder="Describe what happens in the scene..."
                />
            </div>

            {/* Notes */}
            <div>
                <label className="block text-slate-400 text-sm mb-1">Notes (optional)</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-700 rounded p-2 text-slate-200 min-h-[60px]"
                    placeholder="Any notes or memory aids..."
                />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded font-medium hover:bg-amber-400 transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

// Main MovieScene component
interface MovieSceneProps {
    word: string;
    pinyin: string;
    actors: Actor[];
    rooms: Room[];
    sets: Set[];
    props: Prop[];
}

export default function MovieScene({ word, pinyin, actors, rooms, sets, props }: MovieSceneProps) {
    const [wordHmm, setWordHmmState] = useState<WordHmmData | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Load HMM data on mount
    useEffect(() => {
        const hmm = getWordHmm(word);
        if (hmm) {
            setWordHmmState(hmm);
        }
    }, [word]);

    // Parse pinyin to get auto-detected matches for default display
    const pinyinComponents = parseFirstSyllable(pinyin);
    const autoMatches = findHmmMatches(pinyin, actors, rooms, sets);
    const autoActor = actors.find(a => a.id === autoMatches.actorId);
    const autoRoom = rooms.find(r => r.id === autoMatches.roomId);
    const autoSet = sets.find(s => s.id === autoMatches.setId);

    // Build auto-generated scene template
    const autoActorName = autoActor?.name || '[Actor]';
    const autoRoomName = autoRoom?.name || '[Room]';
    const autoSetName = autoSet?.name || '[Set]';
    const autoTemplate = `${autoActorName} is at ${autoSetName} in the ${autoRoomName}.`;

    return (
        <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-amber-400 font-medium">🎬 Movie Scene</h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
                >
                    {isEditing ? 'Cancel' : (wordHmm ? 'Edit' : 'Create Scene')}
                </button>
            </div>

            {/* Pinyin breakdown info */}
            <div className="text-xs text-slate-500 mb-3 flex gap-4">
                <span>Initial: <span className="text-amber-400">{pinyinComponents.initial}</span></span>
                <span>Final: <span className="text-amber-400">{pinyinComponents.final}</span></span>
                <span>Tone: <span className="text-amber-400">{pinyinComponents.tone}</span></span>
            </div>

            {isEditing ? (
                <HmmEditor
                    word={word}
                    pinyin={pinyin}
                    wordHmm={wordHmm}
                    actors={actors}
                    rooms={rooms}
                    sets={sets}
                    props={props}
                    onSave={(updated) => {
                        setWordHmmState(updated);
                        setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
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
    );
}
