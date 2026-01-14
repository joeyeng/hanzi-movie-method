'use client';

import { CharacterWithRelations, CompoundWord } from '@/types';
import Link from 'next/link';

interface CharacterCardProps {
    character: CharacterWithRelations;
    compounds?: CompoundWord[];
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleLearned?: () => void;
    showActions?: boolean;
}

// Resolve placeholders in movie scene with actual actor/room/set names
function resolveMovieScene(
    scene: string,
    actor?: { name: string },
    room?: { name: string },
    set?: { name: string }
): string {
    const actorName = actor?.name || '[Actor]';
    const roomName = room?.name || '[Room]';
    const setName = set?.name || '[Set]';
    return scene
        .replace(/\{\{ACTOR\}\}/g, actorName)
        .replace(/\{\{ROOM\}\}/g, roomName)
        .replace(/\{\{SET\}\}/g, setName);
}

export function CharacterCard({ character, compounds = [], onEdit, onDelete, onToggleLearned, showActions = true }: CharacterCardProps) {
    const resolvedMovieScene = resolveMovieScene(character.movieScene, character.actor, character.room, character.set);

    // Filter compounds that contain this character
    const relatedCompounds = compounds.filter(c => c.characters.includes(character.hanzi));

    // Check if there are additional definitions beyond the primary one
    const hasMultipleDefinitions = character.allDefinitions && character.allDefinitions.length > 1;

    return (
        <div className="bg-slate-800 rounded-lg p-3 sm:p-4 hover:bg-slate-750 transition-colors">
            <div className="flex justify-between items-start mb-3 gap-2">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="text-4xl sm:text-5xl font-bold text-amber-400 flex-shrink-0">{character.hanzi}</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-lg text-white">{character.pinyin}</p>
                        <p className="text-slate-400 text-sm sm:text-base break-words">{character.meaning}</p>
                        {character.keyword && (
                            <p className="text-amber-300 text-xs sm:text-sm break-words">Keyword: {character.keyword}</p>
                        )}
                        {hasMultipleDefinitions && (
                            <details className="mt-2">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                                    +{character.allDefinitions!.length - 1} more definition{character.allDefinitions!.length > 2 ? 's' : ''}
                                </summary>
                                <div className="mt-1 space-y-1 pl-2 border-l-2 border-slate-700">
                                    {character.allDefinitions!.slice(1).map((def, index) => (
                                        <div key={index} className="text-xs">
                                            <span className="text-slate-400">{def.pinyin}</span>
                                            <span className="text-slate-500 mx-1">—</span>
                                            <span className="text-slate-400 break-words">{def.definition}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(character.hanzi)}&op=translate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Google Translate"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                    </a>
                    {character.learned && (
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs whitespace-nowrap">
                            ✓ Learned
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
                {character.actor && (
                    <div className="bg-slate-700/50 rounded px-2 py-1">
                        <span className="text-slate-400">Actor:</span>{' '}
                        <span className="text-white">{character.actor.name}</span>
                        <span className="text-slate-500 ml-1">({character.actor.initial})</span>
                    </div>
                )}
                {character.room && (
                    <div className="bg-slate-700/50 rounded px-2 py-1">
                        <span className="text-slate-400">Room:</span>{' '}
                        <span className="text-white">{character.room.name}</span>
                        <span className="text-slate-500 ml-1">(T{character.room.tone})</span>
                    </div>
                )}
                {character.set && (
                    <div className="bg-slate-700/50 rounded px-2 py-1">
                        <span className="text-slate-400">Set:</span>{' '}
                        <span className="text-white">{character.set.name}</span>
                        <span className="text-slate-500 ml-1">({character.set.final})</span>
                    </div>
                )}
            </div>

            {character.props.length > 0 && (
                <div className="mb-3">
                    <span className="text-slate-400 text-sm">Props: </span>
                    {character.props.map(prop => (
                        <span key={prop.id} className="inline-block bg-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 mr-1">
                            {prop.name} ({prop.component})
                        </span>
                    ))}
                </div>
            )}

            <div className="bg-slate-700/30 rounded p-3 mb-3">
                <p className="text-slate-300 text-sm italic">&quot;{resolvedMovieScene}&quot;</p>
            </div>

            {character.notes && (
                <p className="text-slate-500 text-xs mb-3">{character.notes}</p>
            )}

            {relatedCompounds.length > 0 && (
                <div className="mb-3">
                    <span className="text-slate-400 text-sm">Compound Words: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {relatedCompounds.map(compound => (
                            <Link
                                key={compound.id}
                                href={`/compounds?search=${encodeURIComponent(compound.word)}`}
                                className="inline-block bg-amber-500/20 hover:bg-amber-500/30 rounded px-2 py-0.5 text-sm text-amber-300 transition-colors"
                                title={`${compound.pinyin} - ${compound.definition}`}
                            >
                                {compound.word}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Reviews: {character.reviewCount}</span>
                {character.lastReviewed && (
                    <span>Last reviewed: {new Date(character.lastReviewed).toLocaleDateString()}</span>
                )}
            </div>

            {showActions && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
                    <button
                        onClick={onToggleLearned}
                        className={`flex-1 min-w-[120px] py-1.5 rounded text-sm transition-colors ${character.learned
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-green-600 text-white hover:bg-green-500'
                            }`}
                    >
                        {character.learned ? 'Mark Unlearned' : 'Mark Learned'}
                    </button>
                    <button
                        onClick={onEdit}
                        className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={onDelete}
                        className="px-4 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
