'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WordEntryWithPrimary } from '@/lib/offlineDb';
import { CorpusWordState, getCorpusLearningData, markCorpusWordReviewed } from '@/lib/storage';
import { getBestDefinition } from '@/lib/format';

// Normalize pinyin for comparison (remove tone marks, spaces, lowercase)
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
        .replace(/\s+/g, ' ')
        .trim();
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

type ReviewMode = 'reviewed' | 'all' | 'due';
type AnswerState = 'answering' | 'correct' | 'incorrect';

interface WordWithState extends WordEntryWithPrimary {
    learned: boolean;
    reviewed: boolean;
    lastReviewed?: string;
}

interface GroupReviewProps {
    groupWords: WordEntryWithPrimary[];
    learningData: Map<string, CorpusWordState>;
    onExit: () => void;
    onDataChange: () => void;
    groupId: number;
}

export function GroupReview({ groupWords, learningData, onExit, onDataChange, groupId }: GroupReviewProps) {
    const [reviewFilter, setReviewFilter] = useState<ReviewMode>('reviewed');
    const [reviewQueue, setReviewQueue] = useState<WordWithState[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Quiz state
    const [answerState, setAnswerState] = useState<AnswerState>('answering');
    const [pinyinChoices, setPinyinChoices] = useState<string[]>([]);
    const [toneChoices, setToneChoices] = useState<string[]>([]);
    const [definitionChoices, setDefinitionChoices] = useState<string[]>([]);
    const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null);
    const [selectedTone, setSelectedTone] = useState<string | null>(null);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);

    // Current review item
    const currentItem = reviewQueue[currentIndex];

    // Build review queue based on filter
    const buildReviewQueue = useCallback(() => {
        const wordsWithState: WordWithState[] = groupWords.map(word => {
            const state = learningData.get(word.word);
            return {
                ...word,
                learned: state?.learned ?? false,
                reviewed: state?.reviewed ?? false,
                lastReviewed: state?.lastReviewed,
            };
        });

        let filtered: WordWithState[];
        switch (reviewFilter) {
            case 'reviewed':
                filtered = wordsWithState.filter(w => w.reviewed);
                break;
            case 'due':
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = wordsWithState.filter(w => !w.lastReviewed || new Date(w.lastReviewed) < oneDayAgo);
                break;
            default:
                filtered = wordsWithState;
        }

        return shuffleArray(filtered);
    }, [groupWords, learningData, reviewFilter]);

    // Get count for each filter
    const filterCounts = useMemo(() => {
        const wordsWithState = groupWords.map(word => {
            const state = learningData.get(word.word);
            return {
                learned: state?.learned ?? false,
                reviewed: state?.reviewed ?? false,
                lastReviewed: state?.lastReviewed,
            };
        });

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return {
            all: groupWords.length,
            reviewed: wordsWithState.filter(w => w.reviewed).length,
            due: wordsWithState.filter(w => !w.lastReviewed || new Date(w.lastReviewed) < oneDayAgo).length,
        };
    }, [groupWords, learningData]);

    // Generate pinyin choices (toneless)
    const generatePinyinChoices = useCallback(() => {
        if (!currentItem) return;

        const correctPinyin = normalizePinyin(currentItem.pinyin);
        const charCount = currentItem.word.length;

        const otherPinyins = groupWords
            .filter(w => w.word !== currentItem.word && w.word.length === charCount)
            .map(w => normalizePinyin(w.pinyin))
            .filter(p => p && p !== correctPinyin);

        const uniqueWrongPinyins = [...new Set(otherPinyins)];
        const wrongAnswers = shuffleArray(uniqueWrongPinyins).slice(0, 3);
        const allChoices = shuffleArray([correctPinyin, ...wrongAnswers]);
        setPinyinChoices(allChoices);
    }, [currentItem, groupWords]);

    // Generate tone choices
    const generateToneChoices = useCallback((selectedPinyinBase: string) => {
        if (!currentItem) return;

        const correctPinyinWithTones = currentItem.pinyin;
        const correctPinyinNormalized = normalizePinyin(correctPinyinWithTones);

        if (selectedPinyinBase === correctPinyinNormalized) {
            const variations = generateToneVariations(correctPinyinWithTones, 4);
            setToneChoices(shuffleArray(variations));
        } else {
            const matchingWord = groupWords.find(w =>
                normalizePinyin(w.pinyin) === selectedPinyinBase && w.word !== currentItem.word
            );

            if (matchingWord) {
                const variations = generateToneVariations(matchingWord.pinyin, 4);
                setToneChoices(shuffleArray(variations));
            } else {
                setToneChoices([selectedPinyinBase]);
            }
        }
    }, [currentItem, groupWords]);

    // Generate definition choices
    const generateDefinitionChoices = useCallback(() => {
        if (!currentItem) return;

        const correctDef = currentItem.definition || 'No definition';
        const otherDefinitions = groupWords
            .filter(w => w.word !== currentItem.word && w.definition)
            .map(w => w.definition)
            .filter(d => d && d !== correctDef);

        const uniqueWrongDefs = [...new Set(otherDefinitions)];
        const wrongAnswers = shuffleArray(uniqueWrongDefs).slice(0, 3);
        const allChoices = shuffleArray([correctDef, ...wrongAnswers]);
        setDefinitionChoices(allChoices);
    }, [currentItem, groupWords]);

    // Initialize choices when item changes
    useEffect(() => {
        if (currentItem && sessionStarted) {
            generatePinyinChoices();
            generateDefinitionChoices();
        }
    }, [currentItem, sessionStarted, generatePinyinChoices, generateDefinitionChoices]);

    // Handle pinyin selection
    const handlePinyinSelect = (pinyin: string) => {
        setSelectedPinyin(pinyin);
        setSelectedTone(null);
        generateToneChoices(pinyin);
    };

    // Check answer
    const checkAnswer = () => {
        if (!currentItem) return;

        const correctPinyinWithTones = currentItem.pinyin;
        const correctDef = currentItem.definition || 'No definition';

        const toneCorrect = selectedTone === correctPinyinWithTones;
        const definitionCorrect = selectedDefinition === correctDef;

        if (toneCorrect && definitionCorrect) {
            setAnswerState('correct');
            markCorpusWordReviewed(currentItem.word);
            onDataChange();
            setTimeout(() => handleNext(), 1500);
        } else {
            setAnswerState('incorrect');
        }
    };

    // Reset quiz state
    const resetQuizState = () => {
        setAnswerState('answering');
        setSelectedPinyin(null);
        setSelectedTone(null);
        setSelectedDefinition(null);
        setPinyinChoices([]);
        setToneChoices([]);
        setDefinitionChoices([]);
    };

    // Move to next item
    const handleNext = () => {
        resetQuizState();

        if (currentIndex < reviewQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionStarted(false);
        }
    };

    // Skip current item
    const handleSkip = () => {
        handleNext();
    };

    // Start review session
    const startReview = () => {
        const queue = buildReviewQueue();
        if (queue.length === 0) return;

        setReviewQueue(queue);
        setCurrentIndex(0);
        resetQuizState();
        setSessionStarted(true);
    };

    // Correct answers for display
    const correctPinyin = currentItem?.pinyin || '';
    const correctDefinition = currentItem?.definition || 'No definition';

    // Pre-session: filter selection
    if (!sessionStarted) {
        return (
            <div className="max-w-2xl mx-auto px-2 sm:px-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onExit}
                        className="text-slate-400 hover:text-amber-400 transition-colors"
                    >
                        ← Back to Group
                    </button>
                </div>

                <div className="bg-slate-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-amber-400 mb-4">Review Group {groupId}</h2>

                    <div className="space-y-3 mb-6">
                        <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                            <input
                                type="radio"
                                name="reviewFilter"
                                checked={reviewFilter === 'reviewed'}
                                onChange={() => setReviewFilter('reviewed')}
                                className="w-4 h-4 accent-amber-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">Reviewed Words</div>
                                <div className="text-sm text-slate-400">{filterCounts.reviewed} words marked for review</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                            <input
                                type="radio"
                                name="reviewFilter"
                                checked={reviewFilter === 'all'}
                                onChange={() => setReviewFilter('all')}
                                className="w-4 h-4 accent-amber-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">All Words</div>
                                <div className="text-sm text-slate-400">{filterCounts.all} words</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                            <input
                                type="radio"
                                name="reviewFilter"
                                checked={reviewFilter === 'due'}
                                onChange={() => setReviewFilter('due')}
                                className="w-4 h-4 accent-amber-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">Due for Review</div>
                                <div className="text-sm text-slate-400">{filterCounts.due} words (not reviewed in 24h+)</div>
                            </div>
                        </label>
                    </div>

                    <button
                        onClick={startReview}
                        disabled={
                            (reviewFilter === 'reviewed' && filterCounts.reviewed === 0) ||
                            (reviewFilter === 'all' && filterCounts.all === 0) ||
                            (reviewFilter === 'due' && filterCounts.due === 0)
                        }
                        className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Start Review
                    </button>
                </div>
            </div>
        );
    }

    // Session complete
    if (currentIndex >= reviewQueue.length) {
        return (
            <div className="max-w-2xl mx-auto text-center px-2 sm:px-4">
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">Review Complete!</h2>
                    <p className="text-slate-400 mb-6">
                        You reviewed {reviewQueue.length} words from Group {groupId}.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={startReview}
                            className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            Review Again
                        </button>
                        <button
                            onClick={onExit}
                            className="bg-slate-700 text-slate-300 px-6 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                        >
                            Back to Group
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Active review session
    const progress = `${currentIndex + 1} / ${reviewQueue.length}`;

    return (
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => setSessionStarted(false)}
                    className="text-slate-400 hover:text-amber-400 transition-colors"
                >
                    ← End Session
                </button>
                <div className="text-slate-400">{progress}</div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
                <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}
                />
            </div>

            {/* Quiz Card */}
            <div className="bg-slate-800 rounded-lg p-6 sm:p-8">
                {/* Word display */}
                <div className="text-center mb-6">
                    <div className="text-6xl sm:text-8xl text-amber-400 mb-2">{currentItem.word}</div>
                    <div className="text-slate-500 text-sm">#{(currentItem.rank + 1).toLocaleString()}</div>
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
                                <span className="text-white ml-2">{getBestDefinition(correctDefinition)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quiz Form - All three at once */}
                {answerState === 'answering' && (
                    <div className="space-y-6 mb-6">
                        {/* Step 1: Pinyin (toneless) */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">
                                Step 1: Select Pinyin (without tones)
                            </label>
                            <div className="grid grid-cols-1 gap-2">
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
                                            onChange={() => handlePinyinSelect(pinyin)}
                                            className={`w-4 h-4 ${selectedPinyin === pinyin ? 'accent-amber-700' : 'accent-amber-500'}`}
                                        />
                                        <span className="font-medium">{pinyin}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Tones - only show after pinyin selected */}
                        {selectedPinyin && toneChoices.length > 0 && (
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">
                                    Step 2: Select Pinyin with Correct Tones
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {toneChoices.map((tone, index) => (
                                        <label
                                            key={index}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${selectedTone === tone
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="tone"
                                                checked={selectedTone === tone}
                                                onChange={() => setSelectedTone(tone)}
                                                className={`w-4 h-4 ${selectedTone === tone ? 'accent-purple-700' : 'accent-purple-500'}`}
                                            />
                                            <span className="font-medium">{tone}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Definition */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">
                                Step 3: Select Definition
                            </label>
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
                                        <span>{getBestDefinition(def)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={checkAnswer}
                            disabled={!selectedPinyin || !selectedTone || !selectedDefinition}
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
                    {answerState === 'incorrect' && (
                        <button
                            onClick={handleNext}
                            className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            {currentIndex < reviewQueue.length - 1 ? 'Next Word →' : 'Finish Review'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
