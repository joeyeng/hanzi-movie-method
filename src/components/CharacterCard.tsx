'use client';

import { CharacterWithRelations, CompoundWord } from '@/types';
import Link from 'next/link';

interface CharacterCardProps {
    character: CharacterWithRelations;
    compounds?: CompoundWord[];
    onDelete?: () => void;
    onToggleLearned?: () => void;
    onToggleReviewed?: () => void;
    showActions?: boolean;
}

export function CharacterCard({ character, compounds = [], onDelete, onToggleLearned, onToggleReviewed, showActions = true }: CharacterCardProps) {
    // Get first/primary definition only
    const primaryMeaning = character.meaning.split(',')[0].trim();

    return (
        <div className="bg-slate-800 rounded-lg p-3 sm:p-4 hover:bg-slate-750 transition-colors">
            {/* Main content - clickable to detail page */}
            <Link href={`/characters/${character.id}`} className="block">
                <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="text-4xl sm:text-5xl font-bold text-amber-400 flex-shrink-0">{character.hanzi}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-base sm:text-lg text-white">{character.pinyin}</p>
                            <p className="text-slate-400 text-sm sm:text-base break-words">{primaryMeaning}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {character.reviewed && (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs whitespace-nowrap">
                                📚
                            </span>
                        )}
                        {character.learned && (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs whitespace-nowrap">
                                ✓
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Review stats */}
            <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Reviews: {character.reviewCount}</span>
                {character.lastReviewed && (
                    <span>Last: {new Date(character.lastReviewed).toLocaleDateString()}</span>
                )}
            </div>

            {/* Action buttons */}
            {showActions && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
                    <button
                        onClick={onToggleReviewed}
                        className={`flex-1 min-w-[80px] py-1.5 rounded text-sm transition-colors ${character.reviewed
                            ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/40'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                    >
                        {character.reviewed ? '📚 Unmark Reviewed' : '📚 Mark Reviewed'}
                    </button>
                    <button
                        onClick={onToggleLearned}
                        className={`flex-1 min-w-[80px] py-1.5 rounded text-sm transition-colors ${character.learned
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-green-600 text-white hover:bg-green-500'
                            }`}
                    >
                        {character.learned ? 'Unmark Learned' : 'Mark Learned'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
                    >
                        Del
                    </button>
                </div>
            )}
        </div>
    );
}
