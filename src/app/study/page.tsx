'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOfflineDb } from '@/lib/offlineDb';
import { getCorpusLearningData, CorpusWordState } from '@/lib/storage';

const WORDS_PER_GROUP = 100;
const GROUPS_PER_PAGE = 10;

// Custom hook for managing learned/reviewed state (read-only for stats)
function useWordLearningState() {
    const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());

    useEffect(() => {
        setLearningData(getCorpusLearningData());
    }, []);

    return { learningData };
}

// Group card component
interface GroupCardProps {
    groupNumber: number;
    startRank: number;
    endRank: number;
    learnedCount: number;
    reviewedCount: number;
    totalWords: number;
    onClick: () => void;
}

function GroupCard({ groupNumber, startRank, endRank, learnedCount, reviewedCount, totalWords, onClick }: GroupCardProps) {
    const learnedPercent = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;
    const reviewedPercent = totalWords > 0 ? Math.round((reviewedCount / totalWords) * 100) : 0;
    const isComplete = learnedCount === totalWords && totalWords > 0;

    return (
        <button
            onClick={onClick}
            className={`p-3 sm:p-4 rounded-lg border transition-all text-left w-full ${
                isComplete
                    ? 'bg-green-900/20 border-green-500/50 hover:border-green-500'
                    : 'bg-slate-800 border-slate-700 hover:border-amber-500/50'
            }`}
        >
            <div className="flex justify-between items-start mb-1 sm:mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-amber-400">
                    Group {groupNumber}
                </h3>
                {isComplete && (
                    <span className="text-green-400 text-xs sm:text-sm">✓</span>
                )}
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3">
                #{startRank.toLocaleString()} - #{endRank.toLocaleString()}
            </p>
            
            {/* Progress bars */}
            <div className="space-y-1 sm:space-y-2">
                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5 sm:mb-1">
                        <span>Learned</span>
                        <span>{learnedPercent}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${learnedPercent}%` }}
                        />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5 sm:mb-1">
                        <span>Review</span>
                        <span>{reviewedPercent}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${reviewedPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        </button>
    );
}

// Pagination component
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        const pages: (number | 'ellipsis')[] = [];
        const showEllipsis = totalPages > 7;
        
        if (!showEllipsis) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        
        // Always show first page
        pages.push(1);
        
        if (currentPage > 3) {
            pages.push('ellipsis');
        }
        
        // Show pages around current
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) pages.push(i);
        }
        
        if (currentPage < totalPages - 2) {
            pages.push('ellipsis');
        }
        
        // Always show last page
        if (!pages.includes(totalPages)) pages.push(totalPages);
        
        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
                ←
            </button>
            
            <div className="flex gap-1">
                {getVisiblePages().map((page, i) => 
                    page === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-slate-500">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-sm min-w-[32px] sm:min-w-[40px] ${
                                currentPage === page
                                    ? 'bg-amber-500 text-slate-900 font-medium'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>
            
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
                →
            </button>
        </div>
    );
}

export default function StudyPage() {
    const router = useRouter();
    const { isReady, isLoading: dbLoading, getAllWords, getTotalWordCount } = useOfflineDb();
    const { learningData } = useWordLearningState();

    const [totalWords, setTotalWords] = useState(0);
    const [currentGroupPage, setCurrentGroupPage] = useState(1);
    const [pageGroupStats, setPageGroupStats] = useState<Map<number, { learned: number; reviewed: number; total: number }>>(new Map());
    const [loadingStats, setLoadingStats] = useState(false);

    // Calculate number of groups and pages
    const numGroups = Math.ceil(totalWords / WORDS_PER_GROUP);
    const totalGroupPages = Math.ceil(numGroups / GROUPS_PER_PAGE);

    // Groups to display on current page
    const currentPageGroups = useMemo(() => {
        const startGroup = (currentGroupPage - 1) * GROUPS_PER_PAGE + 1;
        const endGroup = Math.min(currentGroupPage * GROUPS_PER_PAGE, numGroups);
        return Array.from({ length: endGroup - startGroup + 1 }, (_, i) => startGroup + i);
    }, [currentGroupPage, numGroups]);

    // Load total word count
    useEffect(() => {
        if (isReady) {
            getTotalWordCount().then(setTotalWords);
        }
    }, [isReady, getTotalWordCount]);

    // Load stats only for groups on current page
    useEffect(() => {
        if (!isReady || totalWords === 0 || currentPageGroups.length === 0) return;

        async function loadPageStats() {
            setLoadingStats(true);
            const statsMap = new Map<number, { learned: number; reviewed: number; total: number }>();
            
            for (const groupNum of currentPageGroups) {
                const offset = (groupNum - 1) * WORDS_PER_GROUP;
                const words = await getAllWords(offset, WORDS_PER_GROUP);
                
                let learnedCount = 0;
                let reviewedCount = 0;
                
                for (const word of words) {
                    const state = learningData.get(word.word);
                    if (state?.learned) learnedCount++;
                    if (state?.reviewed) reviewedCount++;
                }
                
                statsMap.set(groupNum, {
                    learned: learnedCount,
                    reviewed: reviewedCount,
                    total: words.length
                });
            }
            
            setPageGroupStats(prev => {
                const newMap = new Map(prev);
                statsMap.forEach((value, key) => newMap.set(key, value));
                return newMap;
            });
            setLoadingStats(false);
        }

        loadPageStats();
    }, [isReady, totalWords, getAllWords, learningData, currentPageGroups]);

    // Navigate to a group (uses dynamic route)
    const navigateToGroup = useCallback((groupNumber: number) => {
        router.push(`/study/group/${groupNumber}`);
    }, [router]);

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentGroupPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                <h1 className="text-xl sm:text-2xl font-bold text-amber-400 mb-4">Study Progress</h1>
                <p className="text-slate-400">Please download the database first from the Settings page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-amber-400 mb-1 sm:mb-2">📚 Study Progress</h1>
                <p className="text-slate-400 text-sm sm:text-base">
                    Progress through groups of {WORDS_PER_GROUP} words, ordered by frequency.
                    {totalWords > 0 && (
                        <span className="block sm:inline sm:ml-1">
                            {totalWords.toLocaleString()} words in {numGroups} groups.
                        </span>
                    )}
                </p>
            </div>

            {/* Page info */}
            <div className="text-slate-500 text-sm mb-3 sm:mb-4">
                Showing groups {(currentGroupPage - 1) * GROUPS_PER_PAGE + 1} - {Math.min(currentGroupPage * GROUPS_PER_PAGE, numGroups)} of {numGroups}
            </div>

            {/* Groups grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                {currentPageGroups.map(groupNum => {
                    const startRank = (groupNum - 1) * WORDS_PER_GROUP + 1;
                    const endRank = Math.min(groupNum * WORDS_PER_GROUP, totalWords);
                    const stats = pageGroupStats.get(groupNum) || { learned: 0, reviewed: 0, total: endRank - startRank + 1 };
                    
                    return (
                        <GroupCard
                            key={groupNum}
                            groupNumber={groupNum}
                            startRank={startRank}
                            endRank={endRank}
                            learnedCount={stats.learned}
                            reviewedCount={stats.reviewed}
                            totalWords={stats.total}
                            onClick={() => navigateToGroup(groupNum)}
                        />
                    );
                })}
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentGroupPage}
                totalPages={totalGroupPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}
