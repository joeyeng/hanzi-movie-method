'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { CorpusWordCard } from '@/components/CorpusWordCard';
import { getCorpusLearningData, setCorpusWordLearned, setCorpusWordReviewed, CorpusWordState } from '@/lib/storage';

const CHARS_PER_PAGE = 50;
const SCROLL_STORAGE_KEY = 'characters-scroll-position';
const PAGE_STORAGE_KEY = 'characters-page';
const FILTER_STORAGE_KEY = 'characters-filter';

// Normalize pinyin by removing tone marks for search comparison
function normalizePinyin(pinyin: string): string {
    const toneMap: Record<string, string> = {
        'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
        'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
        'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
        'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
        'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
        'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü',
    };
    return pinyin.toLowerCase().split('').map(c => toneMap[c] || c).join('');
}

// Custom hook for managing learned/reviewed state using unified storage
function useWordLearningState() {
    const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());

    // Load from localStorage on mount
    useEffect(() => {
        setLearningData(getCorpusLearningData());
    }, []);

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

    const learnedCount = Array.from(learningData.values()).filter(s => s.learned).length;
    const reviewedCount = Array.from(learningData.values()).filter(s => s.reviewed).length;

    return {
        learningData,
        toggleLearned,
        toggleReviewed,
        isLearned: (word: string) => learningData.get(word)?.learned ?? false,
        isReviewed: (word: string) => learningData.get(word)?.reviewed ?? false,
        learnedCount,
        reviewedCount
    };
}

function CharactersContent() {
    const { isReady, isLoading: dbLoading, getCharacterWords, getCharacterWordCount, searchWords } = useOfflineDb();
    const { isLearned, isReviewed, toggleLearned, toggleReviewed, learnedCount, reviewedCount } = useWordLearningState();
    const searchParams = useSearchParams();

    const [characters, setCharacters] = useState<WordEntryWithPrimary[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLearned, setFilterLearned] = useState<'all' | 'learned' | 'unlearned' | 'reviewed'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isRestored, setIsRestored] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Cache for loaded pages to avoid re-fetching
    const pageCache = useRef<Map<number, WordEntryWithPrimary[]>>(new Map());

    // Restore page and filter from sessionStorage on mount
    useEffect(() => {
        const savedPage = sessionStorage.getItem(PAGE_STORAGE_KEY);
        const savedFilter = sessionStorage.getItem(FILTER_STORAGE_KEY);

        if (savedPage) {
            setCurrentPage(parseInt(savedPage, 10));
        }
        if (savedFilter) {
            setFilterLearned(savedFilter as 'all' | 'learned' | 'unlearned' | 'reviewed');
        }
        setIsRestored(true);
    }, []);

    // Restore scroll position after content is loaded and page is restored
    useEffect(() => {
        if (!loading && isRestored) {
            const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
            if (savedScroll) {
                requestAnimationFrame(() => {
                    window.scrollTo(0, parseInt(savedScroll, 10));
                });
            }
        }
    }, [loading, isRestored]);

    // Save scroll position on scroll
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Save page to sessionStorage when it changes
    useEffect(() => {
        if (isRestored) {
            sessionStorage.setItem(PAGE_STORAGE_KEY, currentPage.toString());
        }
    }, [currentPage, isRestored]);

    // Save filter to sessionStorage when it changes
    useEffect(() => {
        if (isRestored) {
            sessionStorage.setItem(FILTER_STORAGE_KEY, filterLearned);
        }
    }, [filterLearned, isRestored]);

    // Initialize search from URL parameter
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setSearchQuery(searchFromUrl);
        }
    }, [searchParams]);

    // Clear cache when search changes
    useEffect(() => {
        pageCache.current.clear();
    }, [searchQuery]);

    // Load total count once
    useEffect(() => {
        if (!isReady) return;
        console.time('getCharacterWordCount');
        getCharacterWordCount().then(count => {
            console.timeEnd('getCharacterWordCount');
            setTotalCount(count);
        });
    }, [isReady, getCharacterWordCount]);

    // Load characters for current page using SQL LIMIT/OFFSET
    useEffect(() => {
        let cancelled = false;

        async function loadPage() {
            if (!isReady) return;

            console.time('loadPage total');

            if (searchQuery) {
                // Search mode - load matching results
                setLoading(true);
                try {
                    console.time('searchWords');
                    const results = await searchWords(searchQuery, 500);
                    console.timeEnd('searchWords');
                    if (cancelled) return;
                    const singleChars = results.filter(w => w.length === 1);
                    setCharacters(singleChars);
                } finally {
                    if (!cancelled) setLoading(false);
                    console.timeEnd('loadPage total');
                }
            } else {
                // Check cache first
                const cached = pageCache.current.get(currentPage);
                if (cached) {
                    console.log('Using cached page', currentPage);
                    setCharacters(cached);
                    setLoading(false);
                    console.timeEnd('loadPage total');
                    return;
                }

                // Load from database with SQL pagination
                setLoading(true);
                try {
                    const offset = (currentPage - 1) * CHARS_PER_PAGE;
                    console.time('getCharacterWords SQL');
                    const words = await getCharacterWords(offset, CHARS_PER_PAGE);
                    console.timeEnd('getCharacterWords SQL');
                    if (cancelled) return;

                    // Cache the result
                    pageCache.current.set(currentPage, words);
                    console.time('setCharacters');
                    setCharacters(words);
                    console.timeEnd('setCharacters');
                } finally {
                    if (!cancelled) setLoading(false);
                    console.timeEnd('loadPage total');
                }
            }
        }

        loadPage();

        return () => { cancelled = true; };
    }, [isReady, currentPage, searchQuery, getCharacterWords, searchWords]);

    // Apply learned/reviewed filter (client-side since it's based on localStorage)
    const filteredCharacters = characters.filter(char => {
        if (filterLearned === 'learned' && !isLearned(char.word)) return false;
        if (filterLearned === 'unlearned' && isLearned(char.word)) return false;
        if (filterLearned === 'reviewed' && !isReviewed(char.word)) return false;
        return true;
    });

    // For search mode, paginate client-side; for normal mode, already paginated by SQL
    const totalPages = searchQuery
        ? Math.ceil(filteredCharacters.length / CHARS_PER_PAGE)
        : Math.ceil(totalCount / CHARS_PER_PAGE);

    const displayCharacters = searchQuery
        ? filteredCharacters.slice((currentPage - 1) * CHARS_PER_PAGE, currentPage * CHARS_PER_PAGE)
        : filteredCharacters;

    // Reset to page 1 and clear scroll when search changes
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    };

    const handleFilterChange = (value: 'all' | 'learned' | 'unlearned' | 'reviewed') => {
        setFilterLearned(value);
        setCurrentPage(1);
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    };

    if (dbLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading characters...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1 sm:mb-2">Characters</h1>
                    <p className="text-slate-400 text-sm sm:text-base">
                        {totalCount.toLocaleString()} characters from SUBTLEX corpus
                        {learnedCount > 0 && (
                            <span className="text-green-400 ml-2">• {learnedCount} learned</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search characters by hanzi, pinyin, or meaning..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
                <div className="flex flex-wrap gap-2">
                    <span className="text-slate-400 text-sm self-center mr-2">Filter:</span>
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterLearned === 'all'
                            ? 'bg-amber-500 text-slate-900'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => handleFilterChange('learned')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterLearned === 'learned'
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        ✓ Learned ({learnedCount})
                    </button>
                    <button
                        onClick={() => handleFilterChange('unlearned')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterLearned === 'unlearned'
                            ? 'bg-slate-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Not Learned
                    </button>
                    <button
                        onClick={() => handleFilterChange('reviewed')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterLearned === 'reviewed'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        📚 In Review ({reviewedCount})
                    </button>
                </div>
            </div>

            {/* Character Grid */}
            {filteredCharacters.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {searchQuery || filterLearned !== 'all'
                        ? 'No characters match your search or filter.'
                        : 'No characters available. Please download the offline database.'}
                </div>
            ) : (
                <>
                    <div className="text-sm text-slate-400 mb-4">
                        {searchQuery ? (
                            <>Showing {((currentPage - 1) * CHARS_PER_PAGE) + 1}-{Math.min(currentPage * CHARS_PER_PAGE, filteredCharacters.length)} of {filteredCharacters.length.toLocaleString()} characters matching &quot;{searchQuery}&quot;</>
                        ) : (
                            <>Showing {((currentPage - 1) * CHARS_PER_PAGE) + 1}-{Math.min(currentPage * CHARS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} characters</>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                        {displayCharacters.map(word => (
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ‹
                            </button>
                            <span className="px-4 py-1 text-slate-300">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ›
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                »
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function CharactersPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        }>
            <CharactersContent />
        </Suspense>
    );
}