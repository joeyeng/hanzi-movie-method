'use client';

import Link from 'next/link';

interface StudyCardProps {
    id: string;
    /** The main display text (character or compound word) */
    mainText: string;
    /** Individual characters for display (for compounds with multiple chars) */
    characters?: string[];
    /** Pinyin pronunciation */
    pinyin: string;
    /** Primary definition/meaning */
    definition: string;
    /** Optional notes */
    notes?: string;
    /** Link to detail page */
    detailUrl: string;
    /** Whether this item is marked as learned */
    learned?: boolean;
    /** Whether this item is in review */
    reviewed?: boolean;
    /** Callback when toggling learned status */
    onToggleLearned?: () => void;
    /** Callback when toggling reviewed status */
    onToggleReviewed?: () => void;
    /** Whether to show action buttons */
    showActions?: boolean;
}

export function StudyCard({
    mainText,
    characters,
    pinyin,
    definition,
    notes,
    detailUrl,
    learned = false,
    reviewed = false,
    onToggleLearned,
    onToggleReviewed,
    showActions = true,
}: StudyCardProps) {
    // Use characters array if provided, otherwise use mainText as single character
    const displayChars = characters || [mainText];

    return (
        <div className={`bg-slate-800 rounded-lg p-3 sm:p-4 transition-colors relative ${learned
            ? 'border border-green-500/50 hover:border-green-400'
            : 'border border-slate-700 hover:border-amber-500/50'
            }`}>
            {/* Status badges */}
            <div className="absolute top-3 left-3 flex gap-1">
                {learned && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        ✓ Learned
                    </span>
                )}
                {reviewed && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        📚 Review
                    </span>
                )}
            </div>

            {/* Google Translate Icon */}
            <a
                href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(mainText)}&op=translate`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 text-slate-400 hover:text-blue-400 transition-colors"
                title="Google Translate"
                onClick={(e) => e.stopPropagation()}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                </svg>
            </a>

            {/* Main content - clickable to detail page */}
            <Link href={detailUrl} className="block mt-6">
                {/* Centered characters */}
                <div className="flex justify-center gap-2 mb-3 hover:opacity-80 transition-opacity">
                    {displayChars.map((char, index) => (
                        <span key={index} className="text-4xl text-amber-400">
                            {char}
                        </span>
                    ))}
                </div>

                {/* Pinyin */}
                <div className="text-center text-lg text-amber-300 mb-2">
                    {pinyin}
                </div>

                {/* Definition */}
                <div className="text-center text-slate-300">
                    {definition}
                </div>

                {/* Notes */}
                {notes && (
                    <div className="text-center text-sm text-slate-500 mt-2 italic">
                        {notes}
                    </div>
                )}
            </Link>

            {/* Toggle buttons */}
            {showActions && (
                <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-slate-700">
                    <button
                        onClick={onToggleLearned}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${learned
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                        title={learned ? 'Mark as not learned' : 'Mark as learned'}
                    >
                        {learned ? '✓ Learned' : 'Mark Learned'}
                    </button>
                    <button
                        onClick={onToggleReviewed}
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
        </div>
    );
}
