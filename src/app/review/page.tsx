'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCharactersWithRelations, useCompounds } from '@/hooks/useLocalStorage';
import { CharacterWithRelations, CompoundWord } from '@/types';
import Link from 'next/link';

type ReviewMode = 'all' | 'unlearned' | 'due';
type ReviewType = 'characters' | 'compounds';
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
    // Split pinyin into syllables (space-separated)
    const syllables = correctPinyin.split(' ');
    const variations: Set<string> = new Set();
    variations.add(correctPinyin); // Always include the correct one

    // Find vowels that can have tones in each syllable
    const vowelPattern = /[aeiouü]/gi;

    // Generate random variations
    let attempts = 0;
    while (variations.size < count && attempts < 100) {
        attempts++;
        const newSyllables = syllables.map(syllable => {
            // First normalize to base letters
            let normalized = normalizePinyin(syllable);
            // Find the main vowel to apply tone to (follows standard pinyin rules: a/e first, then ou, then last vowel)
            let result = normalized;
            const vowels = normalized.match(vowelPattern);
            if (vowels && vowels.length > 0) {
                // Determine which vowel gets the tone mark
                let toneVowelIndex = -1;
                if (normalized.includes('a')) {
                    toneVowelIndex = normalized.indexOf('a');
                } else if (normalized.includes('e')) {
                    toneVowelIndex = normalized.indexOf('e');
                } else if (normalized.includes('ou')) {
                    toneVowelIndex = normalized.indexOf('o');
                } else {
                    // Find the last vowel
                    for (let i = normalized.length - 1; i >= 0; i--) {
                        if ('aeiouü'.includes(normalized[i])) {
                            toneVowelIndex = i;
                            break;
                        }
                    }
                }

                if (toneVowelIndex >= 0) {
                    const randomTone = Math.floor(Math.random() * 4) + 1; // Tones 1-4
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

export default function ReviewPage() {
    const { characters, loading, markReviewed, toggleLearned } = useCharactersWithRelations();
    const { compounds, loading: loadingCompounds, markReviewed: markCompoundReviewed, toggleLearned: toggleCompoundLearned } = useCompounds();
    const [reviewType, setReviewType] = useState<ReviewType>('characters');
    const [reviewMode, setReviewMode] = useState<ReviewMode>('unlearned');
    const [reviewQueue, setReviewQueue] = useState<CharacterWithRelations[]>([]);
    const [compoundQueue, setCompoundQueue] = useState<CompoundWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Quiz state
    const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null);
    const [selectedTone, setSelectedTone] = useState<number | null>(null);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('answering');
    const [pinyinChoices, setPinyinChoices] = useState<string[]>([]);
    const [definitionChoices, setDefinitionChoices] = useState<string[]>([]);

    // Compound quiz state
    const [compoundPinyinChoices, setCompoundPinyinChoices] = useState<string[]>([]);
    const [compoundToneChoices, setCompoundToneChoices] = useState<string[]>([]);
    const [compoundDefinitionChoices, setCompoundDefinitionChoices] = useState<string[]>([]);
    const [selectedCompoundPinyin, setSelectedCompoundPinyin] = useState<string | null>(null);
    const [selectedCompoundTone, setSelectedCompoundTone] = useState<string | null>(null);
    const [selectedCompoundDefinition, setSelectedCompoundDefinition] = useState<string | null>(null);
    const [compoundAnswerState, setCompoundAnswerState] = useState<AnswerState>('answering');

    // Only include characters marked as "reviewed" (ready for review)
    const reviewableCharacters = characters.filter(c => c.reviewed);
    const reviewableCompounds = compounds.filter(c => c.reviewed);

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

    // Build compound queue
    const buildCompoundQueue = () => {
        let filtered: CompoundWord[];
        switch (reviewMode) {
            case 'unlearned':
                filtered = reviewableCompounds.filter(c => !c.learned);
                break;
            case 'due':
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = reviewableCompounds.filter(c => !c.lastReviewed || new Date(c.lastReviewed) < oneDayAgo);
                break;
            default:
                filtered = [...reviewableCompounds];
        }
        return filtered.sort(() => Math.random() - 0.5);
    };

    // Only rebuild queue when loading finishes initially
    useEffect(() => {
        if (!loading && !loadingCompounds && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCompoundQueue(buildCompoundQueue());
            setCurrentIndex(0);
            resetQuizState();
        }
    }, [loading, loadingCompounds, sessionStarted]);

    // Rebuild queue when review mode or type changes (only when not in active session)
    useEffect(() => {
        if (!loading && !loadingCompounds && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCompoundQueue(buildCompoundQueue());
            setCurrentIndex(0);
            resetQuizState();
        }
    }, [reviewMode, reviewType]);

    const currentCharacter = reviewQueue[currentIndex];
    const currentCompound = compoundQueue[currentIndex];
    const currentQueue = reviewType === 'characters' ? reviewQueue : compoundQueue;
    const progress = currentQueue.length > 0 ? ((currentIndex + 1) / currentQueue.length) * 100 : 0;

    // Generate definition choices when current character changes
    useEffect(() => {
        if (currentCharacter && sessionStarted && reviewType === 'characters') {
            generatePinyinChoices();
            generateDefinitionChoices();
        }
    }, [currentIndex, sessionStarted, reviewType]);

    // Generate compound choices when current compound changes
    useEffect(() => {
        if (currentCompound && sessionStarted && reviewType === 'compounds') {
            generateCompoundPinyinChoices();
            generateCompoundDefinitionChoices();
        }
    }, [currentIndex, sessionStarted, reviewType]);

    // Reset quiz state for new question
    const resetQuizState = () => {
        setSelectedPinyin(null);
        setSelectedTone(null);
        setSelectedDefinition(null);
        setAnswerState('answering');
        setPinyinChoices([]);
        setDefinitionChoices([]);
        // Reset compound state too
        setSelectedCompoundPinyin(null);
        setSelectedCompoundTone(null);
        setSelectedCompoundDefinition(null);
        setCompoundAnswerState('answering');
        setCompoundPinyinChoices([]);
        setCompoundToneChoices([]);
        setCompoundDefinitionChoices([]);
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

    // Generate multiple choice options for compound pinyin (without tones)
    const generateCompoundPinyinChoices = () => {
        if (!currentCompound) return;

        const correctPinyin = normalizePinyin(currentCompound.pinyin);
        const charCount = currentCompound.characters.length;

        // Get wrong pinyins from compounds with the same number of characters (normalized/toneless)
        const otherPinyins = compounds
            .filter(c => c.id !== currentCompound.id && c.characters.length === charCount)
            .map(c => normalizePinyin(c.pinyin))
            .filter(p => p && p !== correctPinyin);

        // Get unique wrong answers
        const uniqueWrongPinyins = [...new Set(otherPinyins)];

        // Shuffle and pick 3 wrong answers
        const wrongAnswers = shuffleArray(uniqueWrongPinyins).slice(0, 3);

        // Combine and shuffle all options
        const allChoices = shuffleArray([correctPinyin, ...wrongAnswers]);
        setCompoundPinyinChoices(allChoices);
    };

    // Generate tone choices after pinyin is selected
    const generateCompoundToneChoices = (selectedPinyinBase: string) => {
        if (!currentCompound) return;

        const correctPinyinWithTones = currentCompound.pinyin;
        const correctPinyinNormalized = normalizePinyin(correctPinyinWithTones);

        // Check if the user selected the correct base pinyin
        if (selectedPinyinBase === correctPinyinNormalized) {
            // Generate 4 variations of the correct pinyin with different tones
            const variations = generateToneVariations(correctPinyinWithTones, 4);
            const allChoices = shuffleArray(variations);
            setCompoundToneChoices(allChoices);
        } else {
            // User selected wrong pinyin - generate variations based on their selection
            // Find a compound that matches the selected pinyin to get a base with tones
            const matchingCompound = compounds.find(c =>
                normalizePinyin(c.pinyin) === selectedPinyinBase && c.id !== currentCompound.id
            );

            if (matchingCompound) {
                const variations = generateToneVariations(matchingCompound.pinyin, 4);
                const allChoices = shuffleArray(variations);
                setCompoundToneChoices(allChoices);
            } else {
                // Fallback: just show the selected pinyin without tone options
                setCompoundToneChoices([selectedPinyinBase]);
            }
        }
    };

    // Generate multiple choice options for compound definitions
    const generateCompoundDefinitionChoices = () => {
        if (!currentCompound) return;

        const correctDef = currentCompound.definition;

        // Get wrong definitions from other compounds
        const otherDefinitions = compounds
            .filter(c => c.id !== currentCompound.id)
            .map(c => c.definition)
            .filter(d => d && d !== correctDef);

        // Get unique wrong answers
        const uniqueWrongDefs = [...new Set(otherDefinitions)];

        // Shuffle and pick 3 wrong answers
        const wrongAnswers = shuffleArray(uniqueWrongDefs).slice(0, 3);

        // Combine and shuffle all options
        const allChoices = shuffleArray([correctDef, ...wrongAnswers]);
        setCompoundDefinitionChoices(allChoices);
    };

    // Check if the user's compound answer is correct
    const checkCompoundAnswer = () => {
        if (!currentCompound) return;

        const correctPinyinWithTones = currentCompound.pinyin;
        const correctDef = currentCompound.definition;

        const toneCorrect = selectedCompoundTone === correctPinyinWithTones;
        const definitionCorrect = selectedCompoundDefinition === correctDef;

        if (toneCorrect && definitionCorrect) {
            setCompoundAnswerState('correct');
            // Mark as learned when answered correctly
            if (!currentCompound.learned) {
                toggleCompoundLearned(currentCompound.id);
            }
            // Auto advance after short delay
            setTimeout(() => {
                handleNext();
            }, 1500);
        } else {
            setCompoundAnswerState('incorrect');
        }
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
        if (reviewType === 'characters' && currentCharacter) {
            markReviewed(currentCharacter.id);
        } else if (reviewType === 'compounds' && currentCompound) {
            markCompoundReviewed(currentCompound.id);
        }
        resetQuizState();
        if (currentIndex < currentQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionStarted(false);
        }
    };

    const handleMarkLearned = () => {
        if (reviewType === 'characters' && currentCharacter) {
            toggleLearned(currentCharacter.id);
        } else if (reviewType === 'compounds' && currentCompound) {
            toggleCompoundLearned(currentCompound.id);
        }
    };

    // Get correct answers for display
    const correctPinyin = currentCharacter?.pinyin.split(',')[0].split(' ')[0] || '';
    const correctTone = currentCharacter ? extractTone(currentCharacter.pinyin) : 5;
    const correctDefinition = currentCharacter?.allDefinitions?.[0]?.definition || currentCharacter?.meaning || '';

    if (loading || loadingCompounds) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!sessionStarted) {
        const currentReviewable = reviewType === 'characters' ? reviewableCharacters : reviewableCompounds;
        const currentItems = reviewType === 'characters' ? characters : compounds;
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
                            {currentItems.length === 0
                                ? `No ${itemNamePlural} to review yet.`
                                : `No ${itemNamePlural} marked for review. Add ${itemNamePlural} to your review list from the ${reviewType === 'characters' ? 'Characters' : 'Compounds'} page.`}
                        </p>
                        <Link
                            href={linkHref}
                            className="inline-block bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            {currentItems.length === 0 ? `Add Your First ${itemName.charAt(0).toUpperCase() + itemName.slice(1)}` : `Go to ${reviewType === 'characters' ? 'Characters' : 'Compounds'}`}
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
                                    className="w-4 h-4 text-amber-500"
                                />
                                <div>
                                    <div className="font-medium">Unlearned Only</div>
                                    <div className="text-sm text-slate-400">
                                        {currentReviewable.filter(c => !c.learned).length} {itemNamePlural}
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                                <input
                                    type="radio"
                                    name="reviewMode"
                                    checked={reviewMode === 'all'}
                                    onChange={() => setReviewMode('all')}
                                    className="w-4 h-4 text-amber-500"
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
                            disabled={currentQueue.length === 0}
                            className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Review ({currentQueue.length} {itemNamePlural})
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Review session UI
    if (currentIndex >= currentQueue.length) {
        const itemNamePlural = reviewType === 'characters' ? 'characters' : 'compound words';
        return (
            <div className="max-w-2xl mx-auto text-center">
                <div className="bg-slate-800 rounded-lg p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">Session Complete!</h2>
                    <p className="text-slate-400 mb-6">
                        You reviewed {currentQueue.length} {currentQueue.length !== 1 ? itemNamePlural : (reviewType === 'characters' ? 'character' : 'compound word')}.
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

    // Compound Review Session UI
    if (reviewType === 'compounds' && currentCompound) {
        const correctCompoundPinyin = currentCompound.pinyin;
        const correctCompoundDefinition = currentCompound.definition;

        return (
            <div className="max-w-2xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{currentIndex + 1} / {compoundQueue.length}</span>
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
                    {/* Question - Compound Word */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center gap-2 mb-4">
                            {currentCompound.characters.map((char, index) => (
                                <span key={index} className="text-6xl font-bold text-amber-400">
                                    {char}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Correct Answer Feedback */}
                    {compoundAnswerState === 'correct' && (
                        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-center">
                            <div className="text-green-400 text-xl font-bold">✓ Correct!</div>
                        </div>
                    )}

                    {/* Incorrect Answer Feedback */}
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
                            {/* Step 1: Pinyin Multiple Choice (without tones) */}
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
                                                className="w-4 h-4 text-amber-500 accent-amber-500"
                                            />
                                            <span className="font-medium">{pinyin}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Tone Selection (shown after pinyin is selected) */}
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
                                                    className="w-4 h-4 text-purple-500 accent-purple-500"
                                                />
                                                <span className="font-medium">{pinyinWithTone}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Definition Multiple Choice */}
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
                                                className="w-4 h-4 text-amber-500 accent-amber-500"
                                            />
                                            <span>{def}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Check Answer Button */}
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
                            onClick={handleMarkLearned}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${currentCompound.learned
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {currentCompound.learned ? '✓ Learned' : 'Mark Learned'}
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
                                {currentIndex < compoundQueue.length - 1 ? 'Next Compound →' : 'Finish Review'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Character Review Session UI
    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>{currentIndex + 1} / {currentQueue.length}</span>
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
                            {currentIndex < currentQueue.length - 1 ? 'Next Character →' : 'Finish Review'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
