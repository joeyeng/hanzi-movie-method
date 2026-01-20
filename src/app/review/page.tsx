'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { getCorpusLearningData, markCorpusWordReviewed, setCorpusWordLearned, type CorpusWordState } from '@/lib/storage';
import { formatDefinition } from '@/lib/format';
import Link from 'next/link';

type ReviewMode = 'all' | 'unlearned' | 'due';
type ReviewType = 'characters' | 'compounds';
type AnswerState = 'answering' | 'correct' | 'incorrect';

// Normalize pinyin for comparison (remove tones marks, spaces, lowercase)
function normalizePinyin(pinyin: string): string {
    const toneMap: Record<string, string> = {
        'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
        'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
        'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
        'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
        'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
        'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü',
    };
    return pinyin
        .toLowerCase()
        .split('')
        .map(c => toneMap[c] || c)
        .join('')
        .replace(/\s+/g, '');
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Apply a specific tone to a vowel
function applyToneToVowel(vowel: string, tone: number): string {
    const toneMarks: Record<string, string[]> = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    };
    const lower = vowel.toLowerCase();
    if (toneMarks[lower] && tone >= 1 && tone <= 5) {
        return toneMarks[lower][tone - 1];
    }
    return vowel;
}

// Generate random tone variations of a pinyin string (same letters, different tones)
function generateToneVariations(correctPinyin: string, count: number): string[] {
    const syllables = correctPinyin.split(' ');
    const variations: Set<string> = new Set();
    variations.add(correctPinyin);

    const vowelPattern = /[aeiouü]/gi;

    let attempts = 0;
    while (variations.size < count && attempts < 100) {
        attempts++;
        const newSyllables = syllables.map(syllable => {
            let normalized = normalizePinyin(syllable);
            let result = normalized;
            const vowels = normalized.match(vowelPattern);
            if (vowels && vowels.length > 0) {
                let toneVowelIndex = -1;
                if (normalized.includes('a')) {
                    toneVowelIndex = normalized.indexOf('a');
                } else if (normalized.includes('e')) {
                    toneVowelIndex = normalized.indexOf('e');
                } else if (normalized.includes('ou')) {
                    toneVowelIndex = normalized.indexOf('o');
                } else {
                    for (let i = normalized.length - 1; i >= 0; i--) {
                        if ('aeiouü'.includes(normalized[i])) {
                            toneVowelIndex = i;
                            break;
                        }
                    }
                }

                if (toneVowelIndex >= 0) {
                    const randomTone = Math.floor(Math.random() * 4) + 1;
                    const chars = result.split('');
                    chars[toneVowelIndex] = applyToneToVowel(chars[toneVowelIndex], randomTone);
                    result = chars.join('');
                }
            }
            return result;
        });
        variations.add(newSyllables.join(' '));
    }

    return Array.from(variations);
}

// Corpus word with its learning state
interface CorpusWordWithState extends WordEntryWithPrimary {
    learned: boolean;
    reviewed: boolean;
    lastReviewed?: Date;
}

export default function ReviewPage() {
    const { isReady, isLoading: dbLoading, getCharacterWords, getCompoundWords, getAllWords } = useOfflineDb();

    // Database and loading state
    const [isLoadingWords, setIsLoadingWords] = useState(true);

    // All corpus words for generating choices
    const [allCharacterWords, setAllCharacterWords] = useState<WordEntryWithPrimary[]>([]);
    const [allCompoundWords, setAllCompoundWords] = useState<WordEntryWithPrimary[]>([]);

    // Learning state from localStorage
    const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());

    // Review state
    const [reviewType, setReviewType] = useState<ReviewType>('characters');
    const [reviewMode, setReviewMode] = useState<ReviewMode>('unlearned');
    const [reviewQueue, setReviewQueue] = useState<CorpusWordWithState[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Quiz state for characters (single char)
    const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('answering');
    const [pinyinChoices, setPinyinChoices] = useState<string[]>([]);
    const [definitionChoices, setDefinitionChoices] = useState<string[]>([]);

    // Quiz state for compounds
    const [compoundPinyinChoices, setCompoundPinyinChoices] = useState<string[]>([]);
    const [compoundToneChoices, setCompoundToneChoices] = useState<string[]>([]);
    const [compoundDefinitionChoices, setCompoundDefinitionChoices] = useState<string[]>([]);
    const [selectedCompoundPinyin, setSelectedCompoundPinyin] = useState<string | null>(null);
    const [selectedCompoundTone, setSelectedCompoundTone] = useState<string | null>(null);
    const [selectedCompoundDefinition, setSelectedCompoundDefinition] = useState<string | null>(null);
    const [compoundAnswerState, setCompoundAnswerState] = useState<AnswerState>('answering');

    // Load learning data from localStorage
    useEffect(() => {
        setLearningData(getCorpusLearningData());
    }, []);

    // Load words from database
    useEffect(() => {
        async function loadWords() {
            if (!isReady) return;

            try {
                setIsLoadingWords(true);
                // Load top 500 of each for generating quiz choices
                const chars = await getCharacterWords(0, 500);
                const compounds = await getCompoundWords(0, 500);
                setAllCharacterWords(chars);
                setAllCompoundWords(compounds);
            } catch (error) {
                console.error('Failed to load words:', error);
            } finally {
                setIsLoadingWords(false);
            }
        }
        loadWords();
    }, [isReady, getCharacterWords, getCompoundWords]);

    // Get reviewable words (words marked for review with 📚 button in learningData)
    const reviewableCharacters = useMemo(() => {
        const reviewable: CorpusWordWithState[] = [];

        learningData.forEach((state, word) => {
            if (state.reviewed) {
                const wordEntry = allCharacterWords.find(w => w.word === word);
                if (wordEntry && wordEntry.word.length === 1) {
                    reviewable.push({
                        ...wordEntry,
                        learned: state.learned,
                        reviewed: state.reviewed,
                        lastReviewed: state.lastReviewed
                    });
                }
            }
        });

        return reviewable;
    }, [allCharacterWords, learningData]);

    const reviewableCompounds = useMemo(() => {
        const reviewable: CorpusWordWithState[] = [];

        learningData.forEach((state, word) => {
            if (state.reviewed) {
                const wordEntry = allCompoundWords.find(w => w.word === word);
                if (wordEntry && wordEntry.word.length > 1) {
                    reviewable.push({
                        ...wordEntry,
                        learned: state.learned,
                        reviewed: state.reviewed,
                        lastReviewed: state.lastReviewed
                    });
                }
            }
        });

        return reviewable;
    }, [allCompoundWords, learningData]);

    // Build review queue
    const buildReviewQueue = useCallback((type: ReviewType, mode: ReviewMode) => {
        const reviewable = type === 'characters' ? reviewableCharacters : reviewableCompounds;
        let filtered: CorpusWordWithState[];

        switch (mode) {
            case 'unlearned':
                filtered = reviewable.filter(c => !c.learned);
                break;
            case 'due':
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = reviewable.filter(c => !c.lastReviewed || new Date(c.lastReviewed) < oneDayAgo);
                break;
            default:
                filtered = [...reviewable];
        }
        return shuffleArray(filtered);
    }, [reviewableCharacters, reviewableCompounds]);

    // Rebuild queue when mode/type changes (only when not in session)
    useEffect(() => {
        if (!dbLoading && !isLoadingWords && !sessionStarted) {
            setReviewQueue(buildReviewQueue(reviewType, reviewMode));
            setCurrentIndex(0);
            resetQuizState();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbLoading, isLoadingWords, sessionStarted, reviewMode, reviewType, reviewableCharacters, reviewableCompounds]);

    const currentItem = reviewQueue[currentIndex];
    const currentWord = currentItem?.word; // Stable string identifier
    const progress = reviewQueue.length > 0 ? ((currentIndex + 1) / reviewQueue.length) * 100 : 0;

    // Generate choices when current item changes
    useEffect(() => {
        if (currentWord && sessionStarted) {
            if (reviewType === 'characters') {
                generatePinyinChoices();
                generateDefinitionChoices();
            } else {
                generateCompoundPinyinChoices();
                generateCompoundDefinitionChoices();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWord, sessionStarted, reviewType]);

    // Reset quiz state
    const resetQuizState = () => {
        setSelectedPinyin(null);
        setSelectedDefinition(null);
        setAnswerState('answering');
        setPinyinChoices([]);
        setDefinitionChoices([]);
        setSelectedCompoundPinyin(null);
        setSelectedCompoundTone(null);
        setSelectedCompoundDefinition(null);
        setCompoundAnswerState('answering');
        setCompoundPinyinChoices([]);
        setCompoundToneChoices([]);
        setCompoundDefinitionChoices([]);
    };

    // Generate pinyin choices for single characters
    const generatePinyinChoices = () => {
        if (!currentItem) return;

        const correctPinyin = normalizePinyin(currentItem.pinyin.split(' ')[0]);
        const otherPinyins = allCharacterWords
            .filter(c => c.word !== currentItem.word && c.pinyin)
            .map(c => normalizePinyin(c.pinyin.split(' ')[0]))
            .filter(p => p && p !== correctPinyin);

        const uniqueWrongPinyins = [...new Set(otherPinyins)];
        const wrongAnswers = shuffleArray(uniqueWrongPinyins).slice(0, 3);
        const allChoices = shuffleArray([correctPinyin, ...wrongAnswers]);
        setPinyinChoices(allChoices);
    };

    // Generate definition choices for single characters
    const generateDefinitionChoices = () => {
        if (!currentItem) return;

        const correctDef = currentItem.definition || 'No definition';
        const otherDefinitions = allCharacterWords
            .filter(c => c.word !== currentItem.word && c.definition)
            .map(c => c.definition)
            .filter(d => d && d !== correctDef);

        const wrongAnswers = shuffleArray(otherDefinitions).slice(0, 3);
        const allChoices = shuffleArray([correctDef, ...wrongAnswers]);
        setDefinitionChoices(allChoices);
    };

    // Generate compound pinyin choices (normalized/toneless)
    const generateCompoundPinyinChoices = () => {
        if (!currentItem) return;

        const correctPinyin = normalizePinyin(currentItem.pinyin);
        const charCount = currentItem.word.length;

        const otherPinyins = allCompoundWords
            .filter(c => c.word !== currentItem.word && c.word.length === charCount)
            .map(c => normalizePinyin(c.pinyin))
            .filter(p => p && p !== correctPinyin);

        const uniqueWrongPinyins = [...new Set(otherPinyins)];
        const wrongAnswers = shuffleArray(uniqueWrongPinyins).slice(0, 3);
        const allChoices = shuffleArray([correctPinyin, ...wrongAnswers]);
        setCompoundPinyinChoices(allChoices);
    };

    // Generate tone choices after pinyin is selected
    const generateCompoundToneChoices = (selectedPinyinBase: string) => {
        if (!currentItem) return;

        const correctPinyinWithTones = currentItem.pinyin;
        const correctPinyinNormalized = normalizePinyin(correctPinyinWithTones);

        if (selectedPinyinBase === correctPinyinNormalized) {
            const variations = generateToneVariations(correctPinyinWithTones, 4);
            setCompoundToneChoices(shuffleArray(variations));
        } else {
            const matchingWord = allCompoundWords.find(c =>
                normalizePinyin(c.pinyin) === selectedPinyinBase && c.word !== currentItem.word
            );

            if (matchingWord) {
                const variations = generateToneVariations(matchingWord.pinyin, 4);
                setCompoundToneChoices(shuffleArray(variations));
            } else {
                setCompoundToneChoices([selectedPinyinBase]);
            }
        }
    };

    // Generate compound definition choices
    const generateCompoundDefinitionChoices = () => {
        if (!currentItem) return;

        const correctDef = currentItem.definition || 'No definition';
        const otherDefinitions = allCompoundWords
            .filter(c => c.word !== currentItem.word && c.definition)
            .map(c => c.definition)
            .filter(d => d && d !== correctDef);

        const uniqueWrongDefs = [...new Set(otherDefinitions)];
        const wrongAnswers = shuffleArray(uniqueWrongDefs).slice(0, 3);
        const allChoices = shuffleArray([correctDef, ...wrongAnswers]);
        setCompoundDefinitionChoices(allChoices);
    };

    // Check character answer
    const checkAnswer = () => {
        if (!currentItem) return;

        const correctPinyin = normalizePinyin(currentItem.pinyin.split(' ')[0]);
        const correctDef = currentItem.definition || 'No definition';

        const pinyinCorrect = selectedPinyin === correctPinyin;
        const definitionCorrect = selectedDefinition === correctDef;

        if (pinyinCorrect && definitionCorrect) {
            setAnswerState('correct');
            // Mark as reviewed
            markCorpusWordReviewed(currentItem.word);
            setLearningData(getCorpusLearningData());
            setTimeout(() => handleNext(), 1500);
        } else {
            setAnswerState('incorrect');
        }
    };

    // Check compound answer
    const checkCompoundAnswer = () => {
        if (!currentItem) return;

        const correctPinyinWithTones = currentItem.pinyin;
        const correctDef = currentItem.definition || 'No definition';

        const toneCorrect = selectedCompoundTone === correctPinyinWithTones;
        const definitionCorrect = selectedCompoundDefinition === correctDef;

        if (toneCorrect && definitionCorrect) {
            setCompoundAnswerState('correct');
            markCorpusWordReviewed(currentItem.word);
            setLearningData(getCorpusLearningData());
            setTimeout(() => handleNext(), 1500);
        } else {
            setCompoundAnswerState('incorrect');
        }
    };

    const handleNext = () => {
        resetQuizState();
        if (currentIndex < reviewQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionStarted(false);
        }
    };

    const handleSkip = () => {
        resetQuizState();
        if (currentIndex < reviewQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionStarted(false);
        }
    };

    const handleMarkLearned = () => {
        if (!currentItem) return;
        const newState = setCorpusWordLearned(currentItem.word, !currentItem.learned);
        setLearningData(getCorpusLearningData());
    };

    // Correct answers for display
    const correctPinyin = currentItem?.pinyin.split(' ')[0] || '';
    const correctDefinition = currentItem?.definition || 'No definition';

    if (dbLoading || isLoadingWords) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!sessionStarted) {
        const currentReviewable = reviewType === 'characters' ? reviewableCharacters : reviewableCompounds;
        const itemName = reviewType === 'characters' ? 'character' : 'compound';
        const itemNamePlural = reviewType === 'characters' ? 'characters' : 'compounds';
        const linkHref = reviewType === 'characters' ? '/characters' : '/compounds';

        return (
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-amber-400 mb-2">Review</h1>
                <p className="text-slate-400 mb-6">Test your memory of what you&apos;ve learned</p>

                {/* Type selector tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setReviewType('characters')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${reviewType === 'characters'
                            ? 'bg-amber-500 text-slate-900'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Characters ({reviewableCharacters.length})
                    </button>
                    <button
                        onClick={() => setReviewType('compounds')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${reviewType === 'compounds'
                            ? 'bg-amber-500 text-slate-900'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        Compounds ({reviewableCompounds.length})
                    </button>
                </div>

                {currentReviewable.length === 0 ? (
                    <div className="bg-slate-800 rounded-lg p-8 text-center">
                        <p className="text-slate-400 mb-4">
                            No {itemNamePlural} marked for review yet.
                        </p>
                        <p className="text-slate-500 text-sm mb-4">
                            Click the 📚 button on {itemNamePlural} from the {reviewType === 'characters' ? 'Characters' : 'Compounds'} page to add them to your review queue.
                        </p>
                        <Link
                            href={linkHref}
                            className="inline-block bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            Go to {reviewType === 'characters' ? 'Characters' : 'Compounds'}
                        </Link>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Start a Review Session</h2>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'unlearned'}
                                    onChange={() => setReviewMode('unlearned')}
                                    className="w-4 h-4 accent-amber-500"
                                />
                                <div>
                                    <div className="font-medium">Not Yet Reviewed</div>
                                    <div className="text-sm text-slate-400">
                                        {currentReviewable.filter(c => !c.reviewed).length} {itemNamePlural}
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'all'}
                                    onChange={() => setReviewMode('all')}
                                    className="w-4 h-4 accent-amber-500"
                                />
                                <div>
                                    <div className="font-medium">All {reviewType === 'characters' ? 'Characters' : 'Compounds'}</div>
                                    <div className="text-sm text-slate-400">{currentReviewable.length} {itemNamePlural} in review list</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'due'}
                                    onChange={() => setReviewMode('due')}
                                    className="w-4 h-4 accent-amber-500"
                                />
                                <div>
                                    <div className="font-medium">Due for Review</div>
                                    <div className="text-sm text-slate-400">
                                        Not reviewed in 24+ hours
                                    </div>
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={() => setSessionStarted(true)}
                            disabled={reviewQueue.length === 0}
                            className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Review ({reviewQueue.length} {itemNamePlural})
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Session complete
    if (currentIndex >= reviewQueue.length) {
        const itemNamePlural = reviewType === 'characters' ? 'characters' : 'compound words';
        return (
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">Session Complete!</h2>
                    <p className="text-slate-400 mb-6">
                        You reviewed {reviewQueue.length} {reviewQueue.length !== 1 ? itemNamePlural : (reviewType === 'characters' ? 'character' : 'compound word')}.
                    </p>
                    <button
                        onClick={() => setSessionStarted(false)}
                        className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                    >
                        Start New Session
                    </button>
                </div>
            </div>
        );
    }

    // Compound Review UI
    if (reviewType === 'compounds' && currentItem) {
        const correctCompoundPinyin = currentItem.pinyin;
        const correctCompoundDefinition = currentItem.definition || 'No definition';

        return (
            <div className="max-w-2xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{currentIndex + 1} / {reviewQueue.length}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Compound Quiz Card */}
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-center mb-8">
                        <div className="text-6xl font-bold text-amber-400 mb-4">
                            {currentItem.word}
                        </div>
                    </div>

                    {/* Correct Feedback */}
                    {compoundAnswerState === 'correct' && (
                        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-center">
                            <div className="text-green-400 text-xl font-bold">✓ Correct!</div>
                        </div>
                    )}

                    {/* Incorrect Feedback */}
                    {compoundAnswerState === 'incorrect' && (
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                            <div className="text-red-400 text-xl font-bold text-center mb-4">✗ Incorrect</div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-slate-400">Correct Pinyin:</span>
                                    <span className="text-white ml-2 font-medium">{correctCompoundPinyin}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Correct Definition:</span>
                                    <span className="text-white ml-2">{correctCompoundDefinition}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quiz Form */}
                    {compoundAnswerState === 'answering' && (
                        <div className="space-y-6 mb-8">
                            {/* Step 1: Pinyin (toneless) */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">
                                    Step 1: Select Pinyin (without tones)
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {compoundPinyinChoices.map((pinyin, index) => (
                                        <label
                                            key={index}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedCompoundPinyin === pinyin
                                                ? 'bg-amber-500 text-slate-900'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="compoundPinyin"
                                                checked={selectedCompoundPinyin === pinyin}
                                                onChange={() => {
                                                    setSelectedCompoundPinyin(pinyin);
                                                    setSelectedCompoundTone(null);
                                                    generateCompoundToneChoices(pinyin);
                                                }}
                                                className={`w-4 h-4 ${selectedCompoundPinyin === pinyin ? 'accent-amber-700' : 'accent-amber-500'}`}
                                            />
                                            <span className="font-medium">{pinyin}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Tones */}
                            {selectedCompoundPinyin && compoundToneChoices.length > 0 && (
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">
                                        Step 2: Select Pinyin with Correct Tones
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {compoundToneChoices.map((pinyinWithTone, index) => (
                                            <label
                                                key={index}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedCompoundTone === pinyinWithTone
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="compoundTone"
                                                    checked={selectedCompoundTone === pinyinWithTone}
                                                    onChange={() => setSelectedCompoundTone(pinyinWithTone)}
                                                    className={`w-4 h-4 ${selectedCompoundTone === pinyinWithTone ? 'accent-purple-700' : 'accent-purple-500'}`}
                                                />
                                                <span className="font-medium">{pinyinWithTone}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Definition */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Step 3: Select Definition</label>
                                <div className="space-y-2">
                                    {compoundDefinitionChoices.map((def, index) => (
                                        <label
                                            key={index}
                                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedCompoundDefinition === def
                                                ? 'bg-amber-500 text-slate-900'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="compoundDefinition"
                                                checked={selectedCompoundDefinition === def}
                                                onChange={() => setSelectedCompoundDefinition(def)}
                                                className={`w-4 h-4 ${selectedCompoundDefinition === def ? 'accent-amber-700' : 'accent-amber-500'}`}
                                            />
                                            <span>{formatDefinition(def)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={checkCompoundAnswer}
                                disabled={!selectedCompoundPinyin || !selectedCompoundTone || !selectedCompoundDefinition}
                                className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Check Answer
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                        >
                            Skip →
                        </button>
                        <button
                            onClick={() => setSessionStarted(false)}
                            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                        >
                            End Session
                        </button>
                        {compoundAnswerState === 'incorrect' && (
                            <button
                                onClick={handleNext}
                                className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                            >
                                {currentIndex < reviewQueue.length - 1 ? 'Next Compound →' : 'Finish Review'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Character Review UI
    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>{currentIndex + 1} / {reviewQueue.length}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Character Card */}
            <div className="bg-slate-800 rounded-lg p-8">
                <div className="text-center mb-8">
                    <div className="text-8xl font-bold text-amber-400 mb-4">
                        {currentItem?.word}
                    </div>
                </div>

                {/* Correct Feedback */}
                {answerState === 'correct' && (
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-center">
                        <div className="text-green-400 text-xl font-bold">✓ Correct!</div>
                    </div>
                )}

                {/* Incorrect Feedback */}
                {answerState === 'incorrect' && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <div className="text-red-400 text-xl font-bold text-center mb-4">✗ Incorrect</div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-slate-400">Correct Pinyin:</span>
                                <span className="text-white ml-2 font-medium">{correctPinyin}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Correct Definition:</span>
                                <span className="text-white ml-2">{correctDefinition}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quiz Form */}
                {answerState === 'answering' && (
                    <div className="space-y-6 mb-8">
                        {/* Pinyin */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Select Pinyin</label>
                            <div className="grid grid-cols-2 gap-2">
                                {pinyinChoices.map((pinyin, index) => (
                                    <label
                                        key={index}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedPinyin === pinyin
                                            ? 'bg-amber-500 text-slate-900'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="pinyin"
                                            checked={selectedPinyin === pinyin}
                                            onChange={() => setSelectedPinyin(pinyin)}
                                            className={`w-4 h-4 ${selectedPinyin === pinyin ? 'accent-amber-700' : 'accent-amber-500'}`}
                                        />
                                        <span className="font-medium">{pinyin}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Definition */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Select Definition</label>
                            <div className="space-y-2">
                                {definitionChoices.map((def, index) => (
                                    <label
                                        key={index}
                                        className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedDefinition === def
                                            ? 'bg-amber-500 text-slate-900'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="definition"
                                            checked={selectedDefinition === def}
                                            onChange={() => setSelectedDefinition(def)}
                                            className={`w-4 h-4 ${selectedDefinition === def ? 'accent-amber-700' : 'accent-amber-500'}`}
                                        />
                                        <span>{formatDefinition(def)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={checkAnswer}
                            disabled={!selectedPinyin || !selectedDefinition}
                            className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Check Answer
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                    >
                        Skip →
                    </button>
                    <button
                        onClick={() => setSessionStarted(false)}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                    >
                        End Session
                    </button>
                    {answerState === 'incorrect' && (
                        <button
                            onClick={handleNext}
                            className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            {currentIndex < reviewQueue.length - 1 ? 'Next Character →' : 'Finish Review'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
