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

    // Format frequency as #.#K
    const formattedFrequency = word.frequency >= 1000
        ? `${(word.frequency / 1000).toFixed(1)}K`
        : word.frequency.toString();

    const cardContent = (
        <>
            {/* Rank badge - top left */}
            <div className="absolute top-2 left-2 text-xs">
                <span
                    title="Frequency rank"
                    className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                    #{formattedRank}
                </span>
            </div>

            {/* Frequency badge - top right */}
            <div className="absolute top-2 right-2 text-xs">
                <span
                    title="Corpus frequency"
                    className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                    📊 {formattedFrequency}
                </span>
            </div>

            {/* Centered content */}
            <div className="text-center pt-4">
                <div className="text-4xl text-amber-400 mb-2">{word.word}</div>
                <div className="text-amber-300 text-base mb-1">{word.pinyin}</div>
                {primaryDefinition && (
                    <div className="text-slate-300 text-sm">
                        {primaryDefinition.length > 25 ? primaryDefinition.slice(0, 25) + '...' : primaryDefinition}
                    </div>
                )}
            </div>

            {/* Footer with toggle buttons */}
            {showActions && (
                <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-slate-700 bg-slate-900/50 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 px-2 sm:px-4 pb-2 sm:pb-4 rounded-b-lg">
                    <button
                        onClick={handleToggleLearned}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${learned
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                        title={learned ? 'Mark as not learned' : 'Mark as learned'}
                    >
                        {learned ? '✓ Learned' : 'Mark Learned'}
                    </button>
                    <button
                        onClick={handleToggleReviewed}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${reviewed
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                        title={reviewed ? 'Remove from review' : 'Add to review'}
                    >
                        {reviewed ? '📚 In Review' : 'Add to Review'}
                    </button>
                </div>
            )}
        </>
    );

    const cardClassName = `block relative bg-slate-800 rounded-lg p-2 sm:p-4 border transition-all ${learned
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
