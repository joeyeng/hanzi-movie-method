'use client';

import { memo, useCallback } from 'react';
import { WordEntryWithPrimary } from '@/lib/offlineDb';
import { getBestDefinition } from '@/lib/format';
import Link from 'next/link';

interface CorpusWordCardProps {
    word: WordEntryWithPrimary;
    learned?: boolean;
    reviewed?: boolean;
    onToggleLearned?: (word: string) => void;
    onToggleReviewed?: (word: string) => void;
    showActions?: boolean;
    detailUrl?: string;
}

export const CorpusWordCard = memo(function CorpusWordCard({
    word,
    learned = false,
    reviewed = false,
    onToggleLearned,
    onToggleReviewed,
    showActions = true,
    detailUrl
}: CorpusWordCardProps) {
    const handleToggleLearned = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleLearned?.(word.word);
    }, [onToggleLearned, word.word]);

    const handleToggleReviewed = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleReviewed?.(word.word);
    }, [onToggleReviewed, word.word]);
    // Get best/primary definition (filters out less useful entries like "used in...", "surname...", etc.)
    const primaryDefinition = getBestDefinition(word.definition);

    // Format rank with commas
    const formattedRank = (word.rank + 1).toLocaleString();

    const cardContent = (
        <>
            <div className="flex justify-between items-start mb-1 sm:mb-2">
                <div className="flex-1">
                    <span className="text-4xl text-amber-400">{word.word}</span>
                </div>
                {showActions && (
                    <div className="flex gap-1">
                        {onToggleReviewed && (
                            <button
                                onClick={handleToggleReviewed}
                                className={`p-1.5 rounded transition-colors ${reviewed
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                title={reviewed ? 'Remove from review' : 'Add to review'}
                            >
                                📚
                            </button>
                        )}
                        {onToggleLearned && (
                            <button
                                onClick={handleToggleLearned}
                                className={`p-1.5 rounded transition-colors ${learned
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                title={learned ? 'Mark as not learned' : 'Mark as learned'}
                            >
                                {learned ? '✓' : '○'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="text-amber-300 text-base mb-1">{word.pinyin}</div>

            {primaryDefinition && (
                <div className="text-slate-300 text-sm">
                    {primaryDefinition.length > 25 ? primaryDefinition.slice(0, 25) + '...' : primaryDefinition}
                </div>
            )}

            <div className="mt-2 flex items-center gap-2 text-xs">
                <span
                    title="Frequency rank"
                    className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                    #{formattedRank}
                </span>
                <span
                    title="Corpus frequency"
                    className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                    📊 {word.frequency.toLocaleString()}
                </span>
            </div>
        </>
    );

    const cardClassName = `block bg-slate-800 rounded-lg p-2 sm:p-4 border transition-all ${learned
        ? 'border-green-500/50 bg-green-900/10'
        : 'border-slate-700 hover:border-amber-500/50'
        }`;

    if (detailUrl) {
        return (
            <Link href={detailUrl} className={cardClassName}>
                {cardContent}
            </Link>
        );
    }

    return (
        <div className={cardClassName}>
            {cardContent}
        </div>
    );
});
