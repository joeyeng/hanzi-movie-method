'use client';

import { useState, useEffect, Suspense } from 'react';
import { useCompounds, useCharacters } from '@/hooks/useLocalStorage';
import { CompoundWord } from '@/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const COMPOUNDS_PER_PAGE = 100;

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

function CompoundsContent() {
    const { compounds, loading, add, update, remove } = useCompounds();
    const { characters } = useCharacters();
    const searchParams = useSearchParams();
    const [showForm, setShowForm] = useState(false);
    const [editingCompound, setEditingCompound] = useState<CompoundWord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Initialize search from URL param
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setSearchQuery(searchFromUrl);
        }
    }, [searchParams]);

    // Form state
    const [formWord, setFormWord] = useState('');
    const [formPinyin, setFormPinyin] = useState('');
    const [formDefinition, setFormDefinition] = useState('');
    const [formNotes, setFormNotes] = useState('');

    const filteredCompounds = compounds.filter(compound => {
        const searchLower = searchQuery.toLowerCase();
        const searchNormalized = normalizePinyin(searchQuery);
        const matchesSearch =
            compound.word.includes(searchQuery) ||
            compound.pinyin.toLowerCase().includes(searchLower) ||
            normalizePinyin(compound.pinyin).includes(searchNormalized) ||
            compound.definition.toLowerCase().includes(searchLower);
        return matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredCompounds.length / COMPOUNDS_PER_PAGE);
    const startIndex = (currentPage - 1) * COMPOUNDS_PER_PAGE;
    const paginatedCompounds = filteredCompounds.slice(startIndex, startIndex + COMPOUNDS_PER_PAGE);

    // Reset to page 1 when search changes
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const resetForm = () => {
        setFormWord('');
        setFormPinyin('');
        setFormDefinition('');
        setFormNotes('');
        setEditingCompound(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const chars = Array.from(formWord);

        if (editingCompound) {
            update(editingCompound.id, {
                word: formWord,
                characters: chars,
                pinyin: formPinyin,
                definition: formDefinition,
                notes: formNotes || undefined,
            });
        } else {
            add({
                word: formWord,
                characters: chars,
                pinyin: formPinyin,
                definition: formDefinition,
                notes: formNotes || undefined,
            });
        }
        setShowForm(false);
        resetForm();
    };

    const handleEdit = (compound: CompoundWord) => {
        setEditingCompound(compound);
        setFormWord(compound.word);
        setFormPinyin(compound.pinyin);
        setFormDefinition(compound.definition);
        setFormNotes(compound.notes || '');
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this compound word?')) {
            remove(id);
        }
    };

    // Find character by hanzi to get its ID for linking
    const findCharacterId = (hanzi: string): string | null => {
        const char = characters.find(c => c.hanzi === hanzi);
        return char ? char.id : null;
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1 sm:mb-2">Compound Words</h1>
                    <p className="text-slate-400 text-sm sm:text-base">Multi-character words and phrases</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="w-full sm:w-auto bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                    Add Compound Word
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search compounds..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full sm:max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold text-amber-400 mb-4">
                            {editingCompound ? 'Edit Compound Word' : 'Add Compound Word'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Word (Chinese)
                                </label>
                                <input
                                    type="text"
                                    value={formWord}
                                    onChange={(e) => setFormWord(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="你好"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Pinyin
                                </label>
                                <input
                                    type="text"
                                    value={formPinyin}
                                    onChange={(e) => setFormPinyin(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="nǐ hǎo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Definition
                                </label>
                                <input
                                    type="text"
                                    value={formDefinition}
                                    onChange={(e) => setFormDefinition(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                                    placeholder="hello"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                                >
                                    {editingCompound ? 'Update' : 'Add'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    className="flex-1 bg-slate-700 text-slate-300 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Compound Cards */}
            {filteredCompounds.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-slate-400">
                        {searchQuery ? 'No compound words match your search.' : 'No compound words yet. Add some or import from the Import page.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="text-sm text-slate-400 mb-4">
                        Showing {startIndex + 1}-{Math.min(startIndex + COMPOUNDS_PER_PAGE, filteredCompounds.length)} of {filteredCompounds.length} compound words
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedCompounds.map((compound) => (
                            <div
                                key={compound.id}
                                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-amber-500/50 transition-colors relative"
                            >
                                {/* Google Translate Icon */}
                                <a
                                    href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(compound.word)}&op=translate`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-3 right-3 text-slate-400 hover:text-blue-400 transition-colors"
                                    title="Google Translate"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                                    </svg>
                                </a>

                                {/* Clickable Characters */}
                                <div className="flex justify-center gap-2 mb-3">
                                    {compound.characters.map((char, index) => {
                                        const charId = findCharacterId(char);
                                        return charId ? (
                                            <Link
                                                key={index}
                                                href={`/characters?search=${encodeURIComponent(char)}`}
                                                className="text-4xl text-amber-400 hover:text-amber-300 hover:scale-110 transition-all cursor-pointer"
                                                title={`View character: ${char}`}
                                            >
                                                {char}
                                            </Link>
                                        ) : (
                                            <span
                                                key={index}
                                                className="text-4xl text-slate-400"
                                                title={`Character not in database: ${char}`}
                                            >
                                                {char}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Pinyin */}
                                <div className="text-center text-lg text-amber-300 mb-2">
                                    {compound.pinyin}
                                </div>

                                {/* Definition */}
                                <div className="text-center text-slate-300 mb-3">
                                    {compound.definition}
                                </div>

                                {/* Notes */}
                                {compound.notes && (
                                    <div className="text-center text-sm text-slate-500 mb-3 italic">
                                        {compound.notes}
                                    </div>
                                )}

                                {/* Example Sentences */}
                                {compound.exampleSentences && compound.exampleSentences.length > 0 && (
                                    <div className="mb-3 pt-2 border-t border-slate-700">
                                        <div className="text-xs text-slate-500 mb-2">Example:</div>
                                        <div className="text-sm text-amber-400/80">{compound.exampleSentences[0].simplified}</div>
                                        <div className="text-xs text-slate-500 mt-1">{compound.exampleSentences[0].english}</div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex justify-center gap-2 pt-2 border-t border-slate-700">
                                    <button
                                        onClick={() => handleEdit(compound)}
                                        className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(compound.id)}
                                        className="px-3 py-1 text-sm bg-red-900/50 text-red-400 rounded hover:bg-red-900 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
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

export default function CompoundsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        }>
            <CompoundsContent />
        </Suspense>
    );
}