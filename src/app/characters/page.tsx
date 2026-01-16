'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCharactersWithRelations, useCompounds } from '@/hooks/useLocalStorage';
import { CharacterCard } from '@/components/CharacterCard';

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

function CharactersContent() {
    const { characters, loading, remove, toggleLearned, toggleReviewed } = useCharactersWithRelations();
    const { compounds } = useCompounds();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLearned, setFilterLearned] = useState<'all' | 'learned' | 'unlearned'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isRestored, setIsRestored] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Restore page and filter from sessionStorage on mount
    useEffect(() => {
        const savedPage = sessionStorage.getItem(PAGE_STORAGE_KEY);
        const savedFilter = sessionStorage.getItem(FILTER_STORAGE_KEY);

        if (savedPage) {
            setCurrentPage(parseInt(savedPage, 10));
        }
        if (savedFilter) {
            setFilterLearned(savedFilter as 'all' | 'learned' | 'unlearned');
        }
        setIsRestored(true);
    }, []);

    // Restore scroll position after content is loaded and page is restored
    useEffect(() => {
        if (!loading && isRestored) {
            const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
            if (savedScroll) {
                // Small delay to ensure DOM is rendered
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

    const filteredCharacters = characters.filter(char => {
        const searchLower = searchQuery.toLowerCase();
        const searchNormalized = normalizePinyin(searchQuery);
        const matchesSearch =
            char.hanzi.includes(searchQuery) ||
            char.pinyin.toLowerCase().includes(searchLower) ||
            normalizePinyin(char.pinyin).includes(searchNormalized) ||
            char.meaning.toLowerCase().includes(searchLower);

        const matchesFilter =
            filterLearned === 'all' ||
            (filterLearned === 'learned' && char.learned) ||
            (filterLearned === 'unlearned' && !char.learned);

        return matchesSearch && matchesFilter;
    });

    // Pagination
    const totalPages = Math.ceil(filteredCharacters.length / CHARS_PER_PAGE);
    const startIndex = (currentPage - 1) * CHARS_PER_PAGE;
    const paginatedCharacters = filteredCharacters.slice(startIndex, startIndex + CHARS_PER_PAGE);

    // Reset to page 1 and clear scroll when search changes
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    };

    const handleFilterChange = (value: 'all' | 'learned' | 'unlearned') => {
        setFilterLearned(value);
        setCurrentPage(1);
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this character?')) {
            remove(id);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1 sm:mb-2">Characters</h1>
                    <p className="text-slate-400 text-sm sm:text-base">Browse your Chinese characters</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
                <select
                    value={filterLearned}
                    onChange={e => handleFilterChange(e.target.value as 'all' | 'learned' | 'unlearned')}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                    <option value="all">All Characters</option>
                    <option value="learned">Learned</option>
                    <option value="unlearned">Not Learned</option>
                </select>
            </div>

            {/* Character Grid */}
            {filteredCharacters.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {characters.length === 0
                        ? 'No characters yet. Add your first character!'
                        : 'No characters match your search.'}
                </div>
            ) : (
                <>
                    <div className="text-sm text-slate-400 mb-4">
                        Showing {startIndex + 1}-{Math.min(startIndex + CHARS_PER_PAGE, filteredCharacters.length)} of {filteredCharacters.length} characters
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {paginatedCharacters.map(character => (
                            <CharacterCard
                                key={character.id}
                                character={character}
                                compounds={compounds}
                                onDelete={() => handleDelete(character.id)}
                                onToggleLearned={() => toggleLearned(character.id)}
                                onToggleReviewed={() => toggleReviewed(character.id)}
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