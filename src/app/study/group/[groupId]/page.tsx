'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { CorpusWordCard } from '@/components/CorpusWordCard';
import { GroupReview } from '@/components/GroupReview';
import { CorpusWordState, getCorpusLearningData, setCorpusWordLearned, setCorpusWordReviewed } from '@/lib/storage';

const WORDS_PER_GROUP = 100;

// Hook for word learning state
function useWordLearningState() {
    const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());

    // Load from localStorage on mount
    useEffect(() => {
        setLearningData(getCorpusLearningData());
    }, []);

    const refreshData = useCallback(() => {
        setLearningData(getCorpusLearningData());
    }, []);

    const isLearned = useCallback((word: string) => {
        return learningData.get(word)?.learned ?? false;
    }, [learningData]);

    const isReviewed = useCallback((word: string) => {
        return learningData.get(word)?.reviewed ?? false;
    }, [learningData]);

    const toggleLearned = useCallback((word: string) => {
        const current = learningData.get(word);
        const newState = setCorpusWordLearned(word, !(current?.learned ?? false));
        setLearningData(prev => {
            const newMap = new Map(prev);
            newMap.set(word, newState);
            return newMap;
        });
    }, [learningData]);

    const toggleReviewed = useCallback((word: string) => {
        const current = learningData.get(word);
        const newState = setCorpusWordReviewed(word, !(current?.reviewed ?? false));
        setLearningData(prev => {
            const newMap = new Map(prev);
            newMap.set(word, newState);
            return newMap;
        });
    }, [learningData]);

    return { learningData, isLearned, isReviewed, toggleLearned, toggleReviewed, refreshData };
}

export default function StudyGroupPage() {
    const params = useParams();
    const router = useRouter();
    const { isReady, isLoading: dbLoading, getAllWords, getTotalWordCount } = useOfflineDb();
    const { learningData, isLearned, isReviewed, toggleLearned, toggleReviewed, refreshData } = useWordLearningState();

    const groupId = parseInt(params.groupId as string, 10);
    const [totalWords, setTotalWords] = useState(0);
    const [groupWords, setGroupWords] = useState<WordEntryWithPrimary[]>([]);
    const [loadingWords, setLoadingWords] = useState(true);

    // Review mode state
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'unlearned'>('all');

    // Load total word count
    useEffect(() => {
        if (isReady) {
            getTotalWordCount().then(setTotalWords);
        }
    }, [isReady, getTotalWordCount]);

    // Load words for this group
    useEffect(() => {
        if (!isReady || !groupId || isNaN(groupId)) {
            setGroupWords([]);
            setLoadingWords(false);
            return;
        }

        async function loadWords() {
            setLoadingWords(true);
            try {
                const offset = (groupId - 1) * WORDS_PER_GROUP;
                const words = await getAllWords(offset, WORDS_PER_GROUP);
                setGroupWords(words);
            } catch (err) {
                console.error('Failed to load group words:', err);
            } finally {
                setLoadingWords(false);
            }
        }

        loadWords();
    }, [isReady, groupId, getAllWords]);

    // Stats for this group
    const groupStats = useMemo(() => {
        if (groupWords.length === 0) return { learned: 0, reviewed: 0 };

        let learned = 0;
        let reviewed = 0;

        for (const word of groupWords) {
            const state = learningData.get(word.word);
            if (state?.learned) learned++;
            if (state?.reviewed) reviewed++;
        }

        return { learned, reviewed };
    }, [groupWords, learningData]);

    // Filter words based on selected filter
    const filteredWords = useMemo(() => {
        if (reviewFilter === 'all') return groupWords;

        return groupWords.filter(word => {
            const state = learningData.get(word.word);
            if (reviewFilter === 'reviewed') {
                return state?.reviewed === true;
            } else if (reviewFilter === 'unlearned') {
                return !state?.learned;
            }
            return true;
        });
    }, [groupWords, learningData, reviewFilter]);

    // Calculate rank range
    const startRank = (groupId - 1) * WORDS_PER_GROUP + 1;
    const endRank = totalWords > 0
        ? Math.min(groupId * WORDS_PER_GROUP, totalWords)
        : groupId * WORDS_PER_GROUP;

    if (dbLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading database...</div>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12 px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-amber-400 mb-4">Study Group {groupId}</h1>
                <p className="text-slate-400">Please download the database first from the Settings page.</p>
            </div>
        );
    }

    if (isNaN(groupId) || groupId < 1) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12 px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-amber-400 mb-4">Invalid Group</h1>
                <p className="text-slate-400 mb-4">The group number is invalid.</p>
                <button
                    onClick={() => router.push('/study')}
                    className="text-amber-400 hover:underline"
                >
                    ← Back to Study
                </button>
            </div>
        );
    }

    // Review mode - use the GroupReview component
    if (isReviewMode) {
        return (
            <GroupReview
                groupWords={groupWords}
                learningData={learningData}
                onExit={() => setIsReviewMode(false)}
                onDataChange={refreshData}
                groupId={groupId}
                initialFilter={reviewFilter}
                autoStart={false}
            />
        );
    }

    // Normal group view
    return (
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
            {/* Header with back button, group name, and start button */}
            <div className="mb-4 sm:mb-6 bg-slate-800 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-amber-400">
                                Group {groupId}
                            </h2>
                            <p className="text-slate-400 text-xs sm:text-sm">
                                #{startRank.toLocaleString()} - #{endRank.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsReviewMode(true)}
                        disabled={groupWords.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ▶ Start Review
                    </button>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="mb-4 bg-slate-800 rounded-lg p-4">
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        onClick={() => setReviewFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${reviewFilter === 'all' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setReviewFilter('reviewed')}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${reviewFilter === 'reviewed' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        📚 Reviewed
                    </button>
                    <button
                        onClick={() => setReviewFilter('unlearned')}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${reviewFilter === 'unlearned' ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        ✗ Not Learned
                    </button>
                </div>
            </div>

            {/* Filter result count */}
            <div className="mb-4 text-center text-sm text-slate-400">
                Showing {filteredWords.length} of {groupWords.length} words
            </div>

            {/* Words grid */}
            {loadingWords ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading words...</div>
                </div>
            ) : filteredWords.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">No words match the current filter</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {filteredWords.map(word => (
                        <CorpusWordCard
                            key={word.id}
                            word={word}
                            learned={isLearned(word.word)}
                            reviewed={isReviewed(word.word)}
                            onToggleLearned={toggleLearned}
                            onToggleReviewed={toggleReviewed}
                            detailUrl={`/words/${encodeURIComponent(word.word)}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
