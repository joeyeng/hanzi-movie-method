'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCharactersWithRelations } from '@/hooks/useLocalStorage';
import { CharacterWithRelations } from '@/types';
import Link from 'next/link';

type ReviewMode = 'all' | 'unlearned' | 'due';
type AnswerState = 'answering' | 'correct' | 'incorrect';

// Resolve placeholders in movie scene with actual actor/room/set names
function resolveMovieScene(
    scene: string,
    actor?: { name: string },
    room?: { name: string },
    set?: { name: string }
): string {
    const actorName = actor?.name || '[Actor]';
    const roomName = room?.name || '[Room]';
    const setName = set?.name || '[Set]';

    // Strip any existing template prefix from the scene (for backwards compatibility)
    const cleanScene = scene.replace(/^\{\{ACTOR\}\} is at \{\{SET\}\} in the \{\{ROOM\}\}\.\s*/i, '');

    // Build the full scene with template prepended
    const template = `${actorName} is at ${setName} in the ${roomName}.`;

    return cleanScene ? `${template} ${cleanScene}` : template;
}

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

// Extract tone from pinyin with tone marks
function extractTone(pinyin: string): number {
    const tone1 = /[āēīōūǖ]/;
    const tone2 = /[áéíóúǘ]/;
    const tone3 = /[ǎěǐǒǔǚ]/;
    const tone4 = /[àèìòùǜ]/;

    if (tone1.test(pinyin)) return 1;
    if (tone2.test(pinyin)) return 2;
    if (tone3.test(pinyin)) return 3;
    if (tone4.test(pinyin)) return 4;
    return 5; // neutral tone
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

export default function ReviewPage() {
    const { characters, loading, markReviewed, toggleLearned } = useCharactersWithRelations();
    const [reviewMode, setReviewMode] = useState<ReviewMode>('all');
    const [reviewQueue, setReviewQueue] = useState<CharacterWithRelations[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Quiz state
    const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null);
    const [selectedTone, setSelectedTone] = useState<number | null>(null);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('answering');
    const [pinyinChoices, setPinyinChoices] = useState<string[]>([]);
    const [definitionChoices, setDefinitionChoices] = useState<string[]>([]);

    // Only include characters marked as "reviewed" (ready for review)
    const reviewableCharacters = characters.filter(c => c.reviewed);

    // Build review queue only when mode changes or session starts, not on every character update
    const buildReviewQueue = () => {
        let filtered: CharacterWithRelations[];
        switch (reviewMode) {
            case 'unlearned':
                filtered = reviewableCharacters.filter(c => !c.learned);
                break;
            case 'due':
                // Characters not reviewed in the last 24 hours
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = reviewableCharacters.filter(c => !c.lastReviewed || new Date(c.lastReviewed) < oneDayAgo);
                break;
            default:
                filtered = [...reviewableCharacters];
        }
        // Shuffle the array
        return filtered.sort(() => Math.random() - 0.5);
    };

    // Only rebuild queue when loading finishes initially
    useEffect(() => {
        if (!loading && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCurrentIndex(0);
            resetQuizState();
        }
    }, [loading, sessionStarted]);

    // Rebuild queue when review mode changes (only when not in active session)
    useEffect(() => {
        if (!loading && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCurrentIndex(0);
            resetQuizState();
        }
    }, [reviewMode]);

    const currentCharacter = reviewQueue[currentIndex];
    const progress = reviewQueue.length > 0 ? ((currentIndex + 1) / reviewQueue.length) * 100 : 0;

    // Generate definition choices when current character changes
    useEffect(() => {
        if (currentCharacter && sessionStarted) {
            generatePinyinChoices();
            generateDefinitionChoices();
        }
    }, [currentIndex, sessionStarted]);

    // Reset quiz state for new question
    const resetQuizState = () => {
        setSelectedPinyin(null);
        setSelectedTone(null);
        setSelectedDefinition(null);
        setAnswerState('answering');
        setPinyinChoices([]);
        setDefinitionChoices([]);
    };

    // Generate multiple choice options for pinyin
    const generatePinyinChoices = () => {
        if (!currentCharacter) return;

        // Get correct answer - first pinyin syllable without tone
        const correctPinyin = normalizePinyin(currentCharacter.pinyin.split(',')[0].split(' ')[0]);

        // Get random wrong pinyins from other characters
        const otherPinyins = characters
            .filter(c => c.id !== currentCharacter.id && c.pinyin)
            .map(c => normalizePinyin(c.pinyin.split(',')[0].split(' ')[0]))
            .filter(p => p && p !== correctPinyin);

        // Get unique wrong answers
        const uniqueWrongPinyins = [...new Set(otherPinyins)];

        // Shuffle and pick 3 wrong answers
        const wrongAnswers = shuffleArray(uniqueWrongPinyins).slice(0, 3);

        // Combine and shuffle all options
        const allChoices = shuffleArray([correctPinyin, ...wrongAnswers]);
        setPinyinChoices(allChoices);
    };

    // Generate multiple choice options for definitions
    const generateDefinitionChoices = () => {
        if (!currentCharacter) return;

        // Get correct answer - first definition or meaning
        const correctDef = currentCharacter.allDefinitions?.[0]?.definition || currentCharacter.meaning;

        // Get random wrong definitions from other characters
        const otherDefinitions = characters
            .filter(c => c.id !== currentCharacter.id)
            .flatMap(c => {
                if (c.allDefinitions && c.allDefinitions.length > 0) {
                    return c.allDefinitions.map(d => d.definition);
                }
                return [c.meaning];
            })
            .filter(d => d && d !== correctDef);

        // Shuffle and pick 3 wrong answers
        const wrongAnswers = shuffleArray(otherDefinitions).slice(0, 3);

        // Combine and shuffle all options
        const allChoices = shuffleArray([correctDef, ...wrongAnswers]);
        setDefinitionChoices(allChoices);
    };

    // Check if the user's answer is correct
    const checkAnswer = () => {
        if (!currentCharacter) return;

        const correctPinyin = normalizePinyin(currentCharacter.pinyin.split(',')[0].split(' ')[0]);
        const correctTone = extractTone(currentCharacter.pinyin);
        const correctDef = currentCharacter.allDefinitions?.[0]?.definition || currentCharacter.meaning;

        const pinyinCorrect = selectedPinyin === correctPinyin;
        const toneCorrect = selectedTone === correctTone;
        const definitionCorrect = selectedDefinition === correctDef;

        if (pinyinCorrect && toneCorrect && definitionCorrect) {
            setAnswerState('correct');
            // Mark as learned when answered correctly
            if (!currentCharacter.learned) {
                toggleLearned(currentCharacter.id);
            }
            // Auto advance after short delay
            setTimeout(() => {
                handleNext();
            }, 1500);
        } else {
            setAnswerState('incorrect');
        }
    };

    const handleNext = () => {
        if (currentCharacter) {
            markReviewed(currentCharacter.id);
        }
        resetQuizState();
        if (currentIndex < reviewQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionStarted(false);
        }
    };

    const handleMarkLearned = () => {
        if (currentCharacter) {
            toggleLearned(currentCharacter.id);
        }
    };

    // Get correct answers for display
    const correctPinyin = currentCharacter?.pinyin.split(',')[0].split(' ')[0] || '';
    const correctTone = currentCharacter ? extractTone(currentCharacter.pinyin) : 5;
    const correctDefinition = currentCharacter?.allDefinitions?.[0]?.definition || currentCharacter?.meaning || '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!sessionStarted) {
        return (
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-amber-400 mb-2">Review Characters</h1>
                <p className="text-slate-400 mb-8">Test your memory of the characters you&apos;ve learned</p>

                {reviewableCharacters.length === 0 ? (
                    <div className="bg-slate-800 rounded-lg p-8 text-center">
                        <p className="text-slate-400 mb-4">
                            {characters.length === 0
                                ? "No characters to review yet."
                                : "No characters marked for review. Add characters to your review list from the Characters page."}
                        </p>
                        <Link
                            href="/characters"
                            className="inline-block bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            {characters.length === 0 ? "Add Your First Character" : "Go to Characters"}
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
                                    checked={reviewMode === 'all'}
                                    onChange={() => setReviewMode('all')}
                                    className="w-4 h-4 text-amber-500"
                                />
                                <div>
                                    <div className="font-medium">All Characters</div>
                                    <div className="text-sm text-slate-400">{reviewableCharacters.length} characters in review list</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'unlearned'}
                                    onChange={() => setReviewMode('unlearned')}
                                    className="w-4 h-4 text-amber-500"
                                />
                                <div>
                                    <div className="font-medium">Unlearned Only</div>
                                    <div className="text-sm text-slate-400">
                                        {reviewableCharacters.filter(c => !c.learned).length} characters
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'due'}
                                    onChange={() => setReviewMode('due')}
                                    className="w-4 h-4 text-amber-500"
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
                            Start Review ({reviewQueue.length} characters)
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Review session UI
    if (currentIndex >= reviewQueue.length) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">Session Complete!</h2>
                    <p className="text-slate-400 mb-6">
                        You reviewed {reviewQueue.length} character{reviewQueue.length !== 1 ? 's' : ''}.
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
                {/* Question - Character */}
                <div className="text-center mb-8">
                    <div className="text-8xl font-bold text-amber-400 mb-4">
                        {currentCharacter.hanzi}
                    </div>
                </div>

                {/* Correct Answer Feedback */}
                {answerState === 'correct' && (
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-center">
                        <div className="text-green-400 text-xl font-bold">✓ Correct!</div>
                    </div>
                )}

                {/* Incorrect Answer Feedback */}
                {answerState === 'incorrect' && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <div className="text-red-400 text-xl font-bold text-center mb-4">✗ Incorrect</div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-slate-400">Correct Pinyin:</span>
                                <span className="text-white ml-2 font-medium">{correctPinyin}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Correct Tone:</span>
                                <span className="text-white ml-2 font-medium">Tone {correctTone}</span>
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
                        {/* Pinyin Multiple Choice */}
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
                                            className="w-4 h-4 text-amber-500 accent-amber-500"
                                        />
                                        <span className="font-medium">{pinyin}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Tone Selection */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Select Tone</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(tone => (
                                    <button
                                        key={tone}
                                        onClick={() => setSelectedTone(tone)}
                                        className={`flex-1 py-4 rounded-lg font-medium transition-colors ${selectedTone === tone
                                            ? 'bg-amber-500 text-slate-900'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        <div className="text-3xl">
                                            {tone === 1 ? 'ā' : tone === 2 ? 'á' : tone === 3 ? 'ǎ' : tone === 4 ? 'à' : '·'}
                                        </div>
                                        <div className="text-xs opacity-75 mt-1">Tone {tone}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Definition Multiple Choice */}
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
                                            className="w-4 h-4 text-amber-500 accent-amber-500"
                                        />
                                        <span>{def}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Check Answer Button */}
                        <button
                            onClick={checkAnswer}
                            disabled={!selectedPinyin || selectedTone === null || !selectedDefinition}
                            className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Check Answer
                        </button>
                    </div>
                )}

                {/* Show full answer details after incorrect */}
                {answerState === 'incorrect' && (
                    <div className="space-y-4 mb-8">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            {currentCharacter.actor && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-blue-400">Actor</div>
                                    <div className="text-white">{currentCharacter.actor.name} ({currentCharacter.actor.initial})</div>
                                </div>
                            )}
                            {currentCharacter.set && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-purple-400">Set</div>
                                    <div className="text-white">{currentCharacter.set.name} ({currentCharacter.set.final})</div>
                                </div>
                            )}
                            {currentCharacter.room && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-orange-400">Room</div>
                                    <div className="text-white">{currentCharacter.room.name} (T{currentCharacter.room.tone})</div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-700/30 rounded p-4">
                            <div className="text-slate-400 text-sm mb-2">Movie Scene</div>
                            <p className="text-slate-200 italic">&quot;{resolveMovieScene(currentCharacter.movieScene, currentCharacter.actor, currentCharacter.room, currentCharacter.set)}&quot;</p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleMarkLearned}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${currentCharacter.learned
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {currentCharacter.learned ? '✓ Learned' : 'Mark Learned'}
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
