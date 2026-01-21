'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCharacters, useCompounds, useActors, useRooms, useSets, useProps } from '@/hooks/useLocalStorage';
import { fetchExampleSentences, TatoebaExample } from '@/lib/hanzipy';
import { formatDefinition } from '@/lib/format';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { getCorpusWordState, setCorpusWordLearned, setCorpusWordReviewed } from '@/lib/storage';
import Link from 'next/link';
import ExampleSentences from '@/components/ExampleSentences';
import MovieScene from '@/components/MovieScene';

// Check if string looks like a UUID
function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Hook for corpus word learning state - uses the unified storage system
function useCorpusLearningState(word: string) {
    const [isLearned, setIsLearned] = useState(false);
    const [isReviewed, setIsReviewed] = useState(false);

    useEffect(() => {
        const state = getCorpusWordState(word);
        if (state) {
            setIsLearned(state.learned);
            setIsReviewed(state.reviewed);
        }
    }, [word]);

    const toggleLearned = useCallback(() => {
        const newState = setCorpusWordLearned(word, !isLearned);
        setIsLearned(newState.learned);
    }, [word, isLearned]);

    const toggleReviewed = useCallback(() => {
        const newState = setCorpusWordReviewed(word, !isReviewed);
        setIsReviewed(newState.reviewed);
    }, [word, isReviewed]);

    return { isLearned, isReviewed, toggleLearned, toggleReviewed };
}

export default function WordDetailPage({ params }: { params: Promise<{ word: string }> }) {
    const { word: wordParam } = use(params);
    const decodedWord = decodeURIComponent(wordParam);
    const isLegacyId = isUUID(decodedWord);

    const router = useRouter();
    const { characters, loading: charsLoading, toggleLearned: toggleCharLearned, toggleReviewed: toggleCharReviewed } = useCharacters();
    const { compounds, loading: compoundsLoading, toggleLearned: toggleCompoundLearned, toggleReviewed: toggleCompoundReviewed } = useCompounds();
    const { actors } = useActors();
    const { rooms } = useRooms();
    const { sets } = useSets();
    const { props } = useProps();
    const { isReady: dbReady, getWord } = useOfflineDb();

    const [exampleSentences, setExampleSentences] = useState<TatoebaExample[]>([]);
    const [loadingExamples, setLoadingExamples] = useState(false);
    const [corpusWord, setCorpusWord] = useState<WordEntryWithPrimary | null>(null);
    const [corpusLoading, setCorpusLoading] = useState(!isLegacyId);

    // For corpus words, use the learning state hook
    const corpusLearning = useCorpusLearningState(decodedWord);

    // Find legacy character or compound from localStorage
    const legacyCharacter = isLegacyId
        ? characters.find(c => c.id === decodedWord)
        : characters.find(c => c.hanzi === decodedWord);
    const legacyCompound = isLegacyId
        ? compounds.find(c => c.id === decodedWord)
        : compounds.find(c => c.word === decodedWord);

    // Determine if this is a single character word
    const isSingleChar = corpusWord ? corpusWord.word.length === 1 : (legacyCharacter ? true : (legacyCompound ? legacyCompound.word.length === 1 : decodedWord.length === 1));
    const wordText = corpusWord?.word || legacyCharacter?.hanzi || legacyCompound?.word || decodedWord;

    // Load corpus word from offline db
    useEffect(() => {
        if (isLegacyId || !dbReady) return;

        async function loadCorpusWord() {
            setCorpusLoading(true);
            try {
                const word = await getWord(decodedWord);
                setCorpusWord(word);
            } catch (err) {
                console.error('Failed to load word from db:', err);
            } finally {
                setCorpusLoading(false);
            }
        }

        loadCorpusWord();
    }, [decodedWord, isLegacyId, dbReady, getWord]);

    // Fetch example sentences when word loads
    useEffect(() => {
        if (wordText) {
            setLoadingExamples(true);
            fetchExampleSentences(wordText, 10)
                .then(setExampleSentences)
                .finally(() => setLoadingExamples(false));
        }
    }, [wordText]);

    if (charsLoading || compoundsLoading || corpusLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    // If we have neither localStorage data nor corpus word, show not found
    if (!legacyCharacter && !legacyCompound && !corpusWord) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Word Not Found</h1>
                <p className="text-slate-400 mb-6">The word &quot;{decodedWord}&quot; was not found.</p>
                <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
                    ← Go Back
                </button>
            </div>
        );
    }

    // Get word data from whichever source we have
    const displayWord = corpusWord?.word || legacyCharacter?.hanzi || legacyCompound?.word || '';
    const displayPinyin = corpusWord?.pinyin || legacyCharacter?.pinyin || legacyCompound?.pinyin || '';
    const displayDefinition = corpusWord?.definition || legacyCharacter?.meaning || legacyCompound?.definition || '';
    const displayRank = corpusWord ? (corpusWord.rank + 1).toLocaleString() : null;
    const wordChars = Array.from(displayWord);

    // Learning state - prefer corpus state if available
    const isLearned = corpusWord ? corpusLearning.isLearned : (legacyCharacter?.learned || legacyCompound?.learned || false);
    const isReviewed = corpusWord ? corpusLearning.isReviewed : (legacyCharacter?.reviewed || legacyCompound?.reviewed || false);

    const handleToggleLearned = () => {
        if (corpusWord) {
            corpusLearning.toggleLearned();
        } else if (legacyCharacter) {
            toggleCharLearned(legacyCharacter.id);
        } else if (legacyCompound) {
            toggleCompoundLearned(legacyCompound.id);
        }
    };

    const handleToggleReviewed = () => {
        if (corpusWord) {
            corpusLearning.toggleReviewed();
        } else if (legacyCharacter) {
            toggleCharReviewed(legacyCharacter.id);
        } else if (legacyCompound) {
            toggleCompoundReviewed(legacyCompound.id);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800 rounded-lg p-6">
                {/* Status badges and Google Translate */}
                <div className="flex items-center gap-2 mb-4">
                    {displayRank && (
                        <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">
                            #{displayRank} frequency
                        </span>
                    )}
                    {isLearned && (
                        <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                            ✓ Learned
                        </span>
                    )}
                    {isReviewed && (
                        <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                            📚 In Review
                        </span>
                    )}
                    <div className="flex-1"></div>
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(displayWord)}&op=translate`}
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

                {/* Header with word and basic info */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start gap-4">
                        {/* Clickable characters for multi-char words */}
                        {wordChars.length > 1 ? (
                            <div className="flex gap-1">
                                {wordChars.map((char, index) => (
                                    <Link
                                        key={index}
                                        href={`/words/${encodeURIComponent(char)}`}
                                        className="text-6xl font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                        title={`View character: ${char}`}
                                    >
                                        {char}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <span className="text-7xl font-bold text-amber-400">{displayWord}</span>
                        )}
                        <div>
                            <p className="text-2xl text-white mb-1">{displayPinyin}</p>
                            <p className="text-lg text-slate-400">{formatDefinition(displayDefinition)}</p>
                        </div>
                    </div>
                </div>

                {/* Corpus frequency info for multi-char words */}
                {corpusWord && wordChars.length > 1 && (
                    <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Frequency Rank:</span>
                                <span className="text-white ml-2">#{displayRank}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Corpus Count:</span>
                                <span className="text-white ml-2">{corpusWord.frequency.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Movie Scene - only for single character words */}
                {isSingleChar && (
                    <MovieScene
                        word={displayWord}
                        pinyin={displayPinyin}
                        actors={actors}
                        rooms={rooms}
                        sets={sets}
                        props={props}
                    />
                )}

                {/* Individual Characters - for multi-char words */}
                {wordChars.length > 1 && (
                    <div className="mb-6">
                        <h3 className="text-slate-400 text-sm mb-3">Characters</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {wordChars.map((char, index) => {
                                const charData = characters.find(c => c.hanzi === char);
                                return (
                                    <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-center">
                                        <Link href={`/words/${encodeURIComponent(char)}`} className="block hover:bg-slate-700 rounded transition-colors">
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
                )}

                {/* Example Sentences */}
                <ExampleSentences
                    word={displayWord}
                    sentences={exampleSentences}
                    loading={loadingExamples}
                />

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        onClick={handleToggleLearned}
                        className={`px-4 py-2 rounded font-medium transition-colors ${isLearned
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {isLearned ? '✓ Learned' : 'Mark Learned'}
                    </button>
                    <button
                        onClick={handleToggleReviewed}
                        className={`px-4 py-2 rounded font-medium transition-colors ${isReviewed
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {isReviewed ? '📚 Reviewed' : 'Mark Reviewed'}
                    </button>
                </div>
            </div>
        </div>
    );
}
