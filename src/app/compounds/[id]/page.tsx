'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCompounds, useCharacters } from '@/hooks/useLocalStorage';
import { fetchExampleSentences, TatoebaExample } from '@/lib/hanzipy';
import { formatDefinition } from '@/lib/format';
import { useOfflineDb, WordEntryWithPrimary, isDatabaseDownloaded } from '@/lib/offlineDb';
import DatabaseDownloadPrompt from '@/components/DatabaseDownloadPrompt';
import Link from 'next/link';

// Storage keys for learning state (matching the list page)
const LEARNED_COMPOUNDS_KEY = 'hmm-learned-compounds';
const REVIEWED_COMPOUNDS_KEY = 'hmm-reviewed-compounds';

// Check if string looks like a UUID
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Hook for corpus word learning state
function useCorpusLearningState(word: string) {
    const [isLearned, setIsLearned] = useState(false);
    const [isReviewed, setIsReviewed] = useState(false);

    useEffect(() => {
        const learned = localStorage.getItem(LEARNED_COMPOUNDS_KEY);
        const reviewed = localStorage.getItem(REVIEWED_COMPOUNDS_KEY);
        if (learned) {
            try {
                const set = new Set(JSON.parse(learned));
                setIsLearned(set.has(word));
            } catch { }
        }
        if (reviewed) {
            try {
                const set = new Set(JSON.parse(reviewed));
                setIsReviewed(set.has(word));
            } catch { }
        }
    }, [word]);

    const toggleLearned = useCallback(() => {
        const saved = localStorage.getItem(LEARNED_COMPOUNDS_KEY);
        const set = new Set(saved ? JSON.parse(saved) : []);
        if (set.has(word)) {
            set.delete(word);
            setIsLearned(false);
        } else {
            set.add(word);
            setIsLearned(true);
        }
        localStorage.setItem(LEARNED_COMPOUNDS_KEY, JSON.stringify([...set]));
    }, [word]);

    const toggleReviewed = useCallback(() => {
        const saved = localStorage.getItem(REVIEWED_COMPOUNDS_KEY);
        const set = new Set(saved ? JSON.parse(saved) : []);
        if (set.has(word)) {
            set.delete(word);
            setIsReviewed(false);
        } else {
            set.add(word);
            setIsReviewed(true);
        }
        localStorage.setItem(REVIEWED_COMPOUNDS_KEY, JSON.stringify([...set]));
    }, [word]);

    return { isLearned, isReviewed, toggleLearned, toggleReviewed };
}

export default function CompoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const decodedId = decodeURIComponent(id);
    const isLegacyId = isUUID(decodedId);

    const router = useRouter();
    const { compounds, loading, toggleLearned, toggleReviewed } = useCompounds();
    const { characters } = useCharacters();
    const { isReady: dbReady, getWord } = useOfflineDb();

    const [exampleSentences, setExampleSentences] = useState<TatoebaExample[]>([]);
    const [loadingExamples, setLoadingExamples] = useState(false);
    const [corpusWord, setCorpusWord] = useState<WordEntryWithPrimary | null>(null);
    const [corpusLoading, setCorpusLoading] = useState(!isLegacyId);
    const [showDbPrompt, setShowDbPrompt] = useState(false);

    // For corpus words, use the learning state hook
    const corpusLearning = useCorpusLearningState(decodedId);

    // Find compound from localStorage (for legacy UUIDs)
    const compound = isLegacyId
        ? compounds.find(c => c.id === decodedId)
        : compounds.find(c => c.word === decodedId);

    // Find character by hanzi to get its ID for linking
    const findCharacter = (hanzi: string) => {
        return characters.find(c => c.hanzi === hanzi);
    };

    // Load corpus word from offline db
    useEffect(() => {
        if (isLegacyId || !dbReady) return;

        async function loadCorpusWord() {
            setCorpusLoading(true);
            try {
                const word = await getWord(decodedId);
                setCorpusWord(word);
            } catch (err) {
                console.error('Failed to load word from db:', err);
            } finally {
                setCorpusLoading(false);
            }
        }

        loadCorpusWord();
    }, [decodedId, isLegacyId, dbReady, getWord]);

    // Check if db needs download for corpus words
    useEffect(() => {
        if (!isLegacyId && typeof window !== 'undefined' && !isDatabaseDownloaded()) {
            setShowDbPrompt(true);
        }
    }, [isLegacyId]);

    // Get the word text to use for fetching examples
    const wordText = compound?.word || corpusWord?.word || decodedId;

    // Fetch example sentences when compound loads
    useEffect(() => {
        if (wordText) {
            setLoadingExamples(true);
            fetchExampleSentences(wordText, 10)
                .then(setExampleSentences)
                .finally(() => setLoadingExamples(false));
        }
    }, [wordText]);

    // Show database download prompt if needed
    if (showDbPrompt) {
        return (
            <DatabaseDownloadPrompt>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading database...</div>
                </div>
            </DatabaseDownloadPrompt>
        );
    }

    if (loading || corpusLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    // If we have neither localStorage compound nor corpus word, show not found
    if (!compound && !corpusWord) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Compound Not Found</h1>
                <p className="text-slate-400 mb-6">The compound &quot;{decodedId}&quot; was not found.</p>
                <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
                    ← Go Back
                </button>
            </div>
        );
    }

    // If we have localStorage compound data, show the original view
    if (compound) {
        return (
            <div className="max-w-4xl mx-auto">
                {/* Back link */}
                <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                    ← Back
                </button>

                <div className="bg-slate-800 rounded-lg p-6">
                    {/* Status badges and Google Translate */}
                    <div className="flex items-center gap-2 mb-4">
                        {compound.learned && (
                            <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                                ✓ Learned
                            </span>
                        )}
                        {compound.reviewed && (
                            <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                                📚 In Review
                            </span>
                        )}
                        {compound.reviewCount > 0 && (
                            <span className="text-sm bg-slate-700 text-slate-400 px-3 py-1 rounded-full">
                                Reviewed {compound.reviewCount}x
                            </span>
                        )}
                        <div className="flex-1"></div>
                        <a
                            href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(compound.word)}&op=translate`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-400 transition-colors"
                            title="Google Translate"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                            </svg>
                        </a>
                    </div>

                    {/* Header with compound and basic info */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start gap-4">
                            <div className="flex gap-1">
                                {compound.characters.map((char, index) => {
                                    const charData = findCharacter(char);
                                    return charData ? (
                                        <Link
                                            key={index}
                                            href={`/characters/${charData.id}`}
                                            className="text-6xl font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                            title={`View character: ${char}`}
                                        >
                                            {char}
                                        </Link>
                                    ) : (
                                        <span
                                            key={index}
                                            className="text-6xl font-bold text-slate-500"
                                            title={`Character not in database: ${char}`}
                                        >
                                            {char}
                                        </span>
                                    );
                                })}
                            </div>
                            <div>
                                <p className="text-2xl text-white mb-1">{compound.pinyin}</p>
                                <p className="text-lg text-slate-400">{formatDefinition(compound.definition)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Individual Characters */}
                    <div className="mb-6">
                        <h3 className="text-slate-400 text-sm mb-3">Characters</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {compound.characters.map((char, index) => {
                                const charData = findCharacter(char);
                                return (
                                    <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-center">
                                        {charData ? (
                                            <Link href={`/characters/${charData.id}`} className="block hover:bg-slate-700 rounded transition-colors">
                                                <span className="text-3xl text-amber-400">{char}</span>
                                                <p className="text-sm text-slate-300 mt-1">{charData.pinyin}</p>
                                                <p className="text-xs text-slate-500">{charData.meaning?.split(',')[0]}</p>
                                            </Link>
                                        ) : (
                                            <>
                                                <span className="text-3xl text-slate-500">{char}</span>
                                                <p className="text-xs text-slate-600 mt-1">Not in database</p>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    {compound.notes && (
                        <div className="mb-6">
                            <h3 className="text-slate-400 text-sm mb-2">Notes</h3>
                            <p className="text-slate-400">{compound.notes}</p>
                        </div>
                    )}

                    {/* Example Sentences */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-slate-400 text-sm">Example Sentences</h3>
                            <a
                                href={`https://tatoeba.org/en/sentences/search?from=cmn&to=eng&query=${encodeURIComponent(compound.word)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                View more on Tatoeba →
                            </a>
                        </div>
                        {loadingExamples ? (
                            <div className="text-slate-500 text-sm">Loading examples...</div>
                        ) : exampleSentences.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {exampleSentences.map((sentence, index) => (
                                    <div key={sentence.id || index} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors">
                                        <p className="text-xl text-amber-400 mb-2">{sentence.simplified}</p>
                                        <p className="text-sm text-slate-400 mb-2 italic">{sentence.pinyin}</p>
                                        <p className="text-slate-300 text-sm">{sentence.english}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No example sentences found</p>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-6 py-3 border-t border-slate-700">
                        <span>Created: {new Date(compound.createdAt).toLocaleDateString()}</span>
                        <span>Updated: {new Date(compound.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            onClick={() => toggleLearned(compound.id)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${compound.learned
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {compound.learned ? '✓ Learned' : 'Mark as Learned'}
                        </button>
                        <button
                            onClick={() => toggleReviewed(compound.id)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${compound.reviewed
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {compound.reviewed ? '📚 In Review' : 'Add to Review'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Corpus-only view (no localStorage data)
    const formattedRank = (corpusWord!.rank + 1).toLocaleString();
    const wordChars = Array.from(corpusWord!.word);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back link */}
            <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                ← Back
            </button>

            <div className="bg-slate-800 rounded-lg p-6">
                {/* Status badges and Google Translate */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">
                        #{formattedRank} frequency
                    </span>
                    {corpusLearning.isLearned && (
                        <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                            ✓ Learned
                        </span>
                    )}
                    {corpusLearning.isReviewed && (
                        <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                            📚 In Review
                        </span>
                    )}
                    <div className="flex-1"></div>
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(corpusWord!.word)}&op=translate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Google Translate"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                    </a>
                </div>

                {/* Header with compound and basic info */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start gap-4">
                        <div className="flex gap-1">
                            {wordChars.map((char, index) => (
                                <Link
                                    key={index}
                                    href={`/characters/${encodeURIComponent(char)}`}
                                    className="text-6xl font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                    title={`View character: ${char}`}
                                >
                                    {char}
                                </Link>
                            ))}
                        </div>
                        <div>
                            <p className="text-2xl text-white mb-1">{corpusWord!.pinyin}</p>
                            <p className="text-lg text-slate-400">{formatDefinition(corpusWord!.definition)}</p>
                        </div>
                    </div>
                </div>

                {/* Corpus Info */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500">Frequency Rank:</span>
                            <span className="text-white ml-2">#{formattedRank}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Corpus Count:</span>
                            <span className="text-white ml-2">{corpusWord!.frequency.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Individual Characters */}
                <div className="mb-6">
                    <h3 className="text-slate-400 text-sm mb-3">Characters</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {wordChars.map((char, index) => {
                            const charData = findCharacter(char);
                            return (
                                <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    <Link href={`/characters/${encodeURIComponent(char)}`} className="block hover:bg-slate-700 rounded transition-colors">
                                        <span className="text-3xl text-amber-400">{char}</span>
                                        {charData && (
                                            <>
                                                <p className="text-sm text-slate-300 mt-1">{charData.pinyin}</p>
                                                <p className="text-xs text-slate-500">{charData.meaning?.split(',')[0]}</p>
                                            </>
                                        )}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Example Sentences */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-slate-400 text-sm">Example Sentences</h3>
                        <a
                            href={`https://tatoeba.org/en/sentences/search?from=cmn&to=eng&query=${encodeURIComponent(corpusWord!.word)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            View more on Tatoeba →
                        </a>
                    </div>
                    {loadingExamples ? (
                        <div className="text-slate-500 text-sm">Loading examples...</div>
                    ) : exampleSentences.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exampleSentences.map((sentence, index) => (
                                <div key={sentence.id || index} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors">
                                    <p className="text-xl text-amber-400 mb-2">{sentence.simplified}</p>
                                    <p className="text-sm text-slate-400 mb-2 italic">{sentence.pinyin}</p>
                                    <p className="text-slate-300 text-sm">{sentence.english}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No example sentences found</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        onClick={corpusLearning.toggleLearned}
                        className={`px-4 py-2 rounded font-medium transition-colors ${corpusLearning.isLearned
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {corpusLearning.isLearned ? '✓ Learned' : 'Mark as Learned'}
                    </button>
                    <button
                        onClick={corpusLearning.toggleReviewed}
                        className={`px-4 py-2 rounded font-medium transition-colors ${corpusLearning.isReviewed
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {corpusLearning.isReviewed ? '📚 In Review' : 'Add to Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}
