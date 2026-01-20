'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { CorpusWordCard } from '@/components/CorpusWordCard';
import { CorpusWordState, getCorpusLearningData, setCorpusWordLearned, setCorpusWordReviewed } from '@/lib/storage';

const WORDS_PER_GROUP = 100;

// Hook for word learning state
function useWordLearningState() {
    const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());

    // Load from localStorage on mount
    useEffect(() => {
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

    return { learningData, isLearned, isReviewed, toggleLearned, toggleReviewed };
}

export default function StudyGroupPage() {
    const params = useParams();
    const router = useRouter();
    const { isReady, isLoading: dbLoading, getAllWords, getTotalWordCount } = useOfflineDb();
    const { learningData, isLearned, isReviewed, toggleLearned, toggleReviewed } = useWordLearningState();

    const groupId = parseInt(params.groupId as string, 10);
    const [totalWords, setTotalWords] = useState(0);
    const [groupWords, setGroupWords] = useState<WordEntryWithPrimary[]>([]);
    const [loadingWords, setLoadingWords] = useState(true);

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

    return (
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
            {/* Header with back button and stats - mobile responsive */}
            <div className="mb-4 sm:mb-6 bg-slate-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => router.push('/study')}
                            className="text-slate-400 hover:text-amber-400 transition-colors text-sm sm:text-base"
                        >
                            ← Back
                        </button>
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-amber-400">
                                Group {groupId}
                            </h2>
                            <p className="text-slate-400 text-xs sm:text-sm">
                                #{startRank.toLocaleString()} - #{endRank.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-around sm:justify-end gap-4 sm:gap-6 text-sm border-t sm:border-t-0 border-slate-700 pt-3 sm:pt-0">
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-bold text-green-400">{groupStats.learned}</div>
                            <div className="text-slate-500 text-xs sm:text-sm">Learned</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-bold text-blue-400">{groupStats.reviewed}</div>
                            <div className="text-slate-500 text-xs sm:text-sm">Review</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-bold text-slate-400">{groupWords.length}</div>
                            <div className="text-slate-500 text-xs sm:text-sm">Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Words grid */}
            {loadingWords ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading words...</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {groupWords.map(word => (
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
