'use client';

import { useState, useEffect } from 'react';
import { useCharactersWithRelations } from '@/hooks/useLocalStorage';
import { CharacterWithRelations } from '@/types';
import Link from 'next/link';

type ReviewMode = 'all' | 'unlearned' | 'due';

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
    return scene
        .replace(/\{\{ACTOR\}\}/g, actorName)
        .replace(/\{\{ROOM\}\}/g, roomName)
        .replace(/\{\{SET\}\}/g, setName);
}

export default function ReviewPage() {
    const { characters, loading, markReviewed, toggleLearned } = useCharactersWithRelations();
    const [reviewMode, setReviewMode] = useState<ReviewMode>('all');
    const [reviewQueue, setReviewQueue] = useState<CharacterWithRelations[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);

    // Build review queue only when mode changes or session starts, not on every character update
    const buildReviewQueue = () => {
        let filtered: CharacterWithRelations[];
        switch (reviewMode) {
            case 'unlearned':
                filtered = characters.filter(c => !c.learned);
                break;
            case 'due':
                // Characters not reviewed in the last 24 hours
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = characters.filter(c => !c.lastReviewed || new Date(c.lastReviewed) < oneDayAgo);
                break;
            default:
                filtered = [...characters];
        }
        // Shuffle the array
        return filtered.sort(() => Math.random() - 0.5);
    };

    // Only rebuild queue when loading finishes initially
    useEffect(() => {
        if (!loading && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCurrentIndex(0);
            setShowAnswer(false);
        }
    }, [loading, sessionStarted]);

    // Rebuild queue when review mode changes (only when not in active session)
    useEffect(() => {
        if (!loading && !sessionStarted) {
            setReviewQueue(buildReviewQueue());
            setCurrentIndex(0);
            setShowAnswer(false);
        }
    }, [reviewMode]);

    const currentCharacter = reviewQueue[currentIndex];
    const progress = reviewQueue.length > 0 ? ((currentIndex + 1) / reviewQueue.length) * 100 : 0;

    const handleNext = () => {
        if (currentCharacter) {
            markReviewed(currentCharacter.id);
        }
        setShowAnswer(false);
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

                {characters.length === 0 ? (
                    <div className="bg-slate-800 rounded-lg p-8 text-center">
                        <p className="text-slate-400 mb-4">No characters to review yet.</p>
                        <Link
                            href="/characters"
                            className="inline-block bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                        >
                            Add Your First Character
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
                                    <div className="text-sm text-slate-400">{characters.length} characters</div>
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
                                        {characters.filter(c => !c.learned).length} characters
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
                {/* Question */}
                <div className="text-center mb-8">
                    <div className="text-8xl font-bold text-amber-400 mb-4">
                        {currentCharacter.hanzi}
                    </div>
                    <p className="text-slate-400">What is the pinyin and meaning?</p>
                </div>

                {/* Answer */}
                {showAnswer ? (
                    <div className="space-y-4 mb-8">
                        <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-slate-400 text-sm">Pinyin</div>
                                    <div className="text-2xl text-white">{currentCharacter.pinyin}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-sm">Meaning</div>
                                    <div className="text-2xl text-white">{currentCharacter.meaning}</div>
                                </div>
                            </div>
                            {currentCharacter.keyword && (
                                <div className="text-center mt-4">
                                    <div className="text-slate-400 text-sm">Keyword</div>
                                    <div className="text-amber-300">{currentCharacter.keyword}</div>
                                </div>
                            )}
                            {/* All Definitions */}
                            {currentCharacter.allDefinitions && currentCharacter.allDefinitions.length > 1 && (
                                <div className="mt-4 pt-4 border-t border-slate-600">
                                    <div className="text-slate-400 text-sm mb-2">All Definitions</div>
                                    <div className="space-y-2">
                                        {currentCharacter.allDefinitions.map((def, index) => (
                                            <div key={index} className="flex items-start gap-2 text-sm">
                                                <span className="text-amber-400 font-medium min-w-[60px]">{def.pinyin}</span>
                                                <span className="text-slate-300">{def.definition}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                            {currentCharacter.actor && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-blue-400">Actor</div>
                                    <div className="text-white">{currentCharacter.actor.name} ({currentCharacter.actor.initial})</div>
                                </div>
                            )}
                            {currentCharacter.room && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-orange-400">Room</div>
                                    <div className="text-white">{currentCharacter.room.name} (T{currentCharacter.room.tone})</div>
                                </div>
                            )}
                            {currentCharacter.set && (
                                <div className="bg-slate-700/30 rounded p-3">
                                    <div className="text-purple-400">Set</div>
                                    <div className="text-white">{currentCharacter.set.name} ({currentCharacter.set.final})</div>
                                </div>
                            )}
                        </div>

                        {currentCharacter.props.length > 0 && (
                            <div className="bg-slate-700/30 rounded p-3">
                                <div className="text-pink-400 text-sm mb-1">Props</div>
                                <div className="flex flex-wrap gap-2">
                                    {currentCharacter.props.map(prop => (
                                        <span key={prop.id} className="bg-slate-700 px-2 py-1 rounded text-sm">
                                            {prop.name} ({prop.component})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-700/30 rounded p-4">
                            <div className="text-slate-400 text-sm mb-2">Movie Scene</div>
                            <p className="text-slate-200 italic">&quot;{resolveMovieScene(currentCharacter.movieScene, currentCharacter.actor, currentCharacter.room, currentCharacter.set)}&quot;</p>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAnswer(true)}
                        className="w-full bg-slate-700 text-white py-4 rounded-lg font-medium hover:bg-slate-600 transition-colors mb-8"
                    >
                        Show Answer
                    </button>
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
                    <button
                        onClick={handleNext}
                        className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                    >
                        {currentIndex < reviewQueue.length - 1 ? 'Next Character →' : 'Finish Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}
