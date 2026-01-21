'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOfflineDb, WordEntryWithPrimary } from '@/lib/offlineDb';
import { getCorpusLearningData, CorpusWordState } from '@/lib/storage';
import Link from 'next/link';

const WORDS_PER_GROUP = 100;

// Segment a Chinese sentence into individual characters/words
function segmentSentence(sentence: string): string[] {
  // Simple character-by-character segmentation for now
  // Filter out punctuation and non-Chinese characters
  return sentence.split('').filter(char => /[\u4e00-\u9fff]/.test(char));
}

interface ExampleSentenceDisplay {
  simplified: string;
  pinyin: string;
  english: string;
}

export default function Home() {
  const { isReady, isLoading: dbLoading, getTotalWordCount, getAllWords, searchExamples } = useOfflineDb();
  const [learningData, setLearningData] = useState<Map<string, CorpusWordState>>(new Map());
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exampleSentences, setExampleSentences] = useState<ExampleSentenceDisplay[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [groupWords, setGroupWords] = useState<WordEntryWithPrimary[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // Load learning data from localStorage
  useEffect(() => {
    setLearningData(getCorpusLearningData());
    setLoading(false);
  }, []);

  // Load total word count
  useEffect(() => {
    if (isReady) {
      getTotalWordCount().then(setTotalWords);
    }
  }, [isReady, getTotalWordCount]);

  // Calculate overall stats
  const stats = useMemo(() => {
    let learned = 0;
    let reviewed = 0;
    let totalReviewCount = 0;

    learningData.forEach((state) => {
      if (state.learned) learned++;
      if (state.reviewed) reviewed++;
      if (state.reviewCount) totalReviewCount += state.reviewCount;
    });

    return { learned, reviewed, totalReviewCount };
  }, [learningData]);

  // Find the lowest group with unlearned words
  const currentGroup = useMemo(() => {
    if (stats.learned === 0) return 1; // Start with group 1 if nothing learned

    // Group N contains words ranked (N-1)*100 to N*100-1
    const totalGroups = Math.ceil(totalWords / WORDS_PER_GROUP);

    // Find the first group that isn't fully learned
    for (let g = 1; g <= totalGroups; g++) {
      if (stats.learned < g * WORDS_PER_GROUP) {
        return g;
      }
    }

    return totalGroups || 1;
  }, [stats.learned, totalWords]);

  // Load words for the current group
  useEffect(() => {
    if (!isReady || !currentGroup) return;

    const loadGroupWords = async () => {
      setLoadingGroup(true);
      try {
        const offset = (currentGroup - 1) * WORDS_PER_GROUP;
        const words = await getAllWords(offset, WORDS_PER_GROUP);
        setGroupWords(words);
      } catch (error) {
        console.error('Error loading group words:', error);
      } finally {
        setLoadingGroup(false);
      }
    };

    loadGroupWords();
  }, [isReady, currentGroup, getAllWords]);

  // Calculate group-specific progress
  const groupProgress = useMemo(() => {
    if (groupWords.length === 0) return { learned: 0, total: 0, percent: 0 };

    let learnedInGroup = 0;
    for (const word of groupWords) {
      const state = learningData.get(word.word);
      if (state?.learned) learnedInGroup++;
    }

    return {
      learned: learnedInGroup,
      total: groupWords.length,
      percent: Math.round((learnedInGroup / groupWords.length) * 100)
    };
  }, [groupWords, learningData]);

  // Get learned words set for filtering sentences
  const learnedWordsSet = useMemo(() => {
    const set = new Set<string>();
    learningData.forEach((state, word) => {
      if (state.learned) {
        // Add the word and its individual characters
        set.add(word);
        for (const char of word) {
          if (/[\u4e00-\u9fff]/.test(char)) {
            set.add(char);
          }
        }
      }
    });
    return set;
  }, [learningData]);

  // Load example sentences that only contain learned words
  useEffect(() => {
    if (!isReady || learnedWordsSet.size < 5) {
      setExampleSentences([]);
      return;
    }

    const loadExamples = async () => {
      setLoadingExamples(true);
      try {
        // Get a sample of learned words to search for sentences
        const learnedWordsList = Array.from(learnedWordsSet).slice(0, 50);
        const validSentences: ExampleSentenceDisplay[] = [];

        // Search for sentences containing learned words
        for (const word of learnedWordsList) {
          if (validSentences.length >= 5) break;

          const sentences = await searchExamples(word, 10);

          for (const sentence of sentences) {
            if (validSentences.length >= 5) break;

            // Check if ALL characters in the sentence are learned
            const chars = segmentSentence(sentence.simplified);
            const allLearned = chars.every(char => learnedWordsSet.has(char));

            if (allLearned && !validSentences.some(s => s.simplified === sentence.simplified)) {
              validSentences.push({
                simplified: sentence.simplified,
                pinyin: sentence.pinyin,
                english: sentence.english
              });
            }
          }
        }

        setExampleSentences(validSentences);
      } catch (error) {
        console.error('Error loading example sentences:', error);
      } finally {
        setLoadingExamples(false);
      }
    };

    loadExamples();
  }, [isReady, learnedWordsSet, searchExamples]);

  if (loading || dbLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-2">Group {currentGroup} Progress</h1>
        <p className="text-slate-400">
          Words #{((currentGroup - 1) * WORDS_PER_GROUP + 1).toLocaleString()} - #{Math.min(currentGroup * WORDS_PER_GROUP, totalWords).toLocaleString()} by frequency
        </p>
      </div>

      {/* Group Progress Card */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {loadingGroup ? 'Loading...' : `${groupProgress.learned} of ${groupProgress.total} words learned`}
          </h2>
          <span className="text-2xl font-bold text-amber-400">{groupProgress.percent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-4 mb-4">
          <div
            className="bg-gradient-to-r from-amber-500 to-green-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${groupProgress.percent}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">{stats.learned.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-slate-400">Total Learned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{stats.reviewed.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-slate-400">In Review Queue</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{stats.totalReviewCount.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-slate-400">Total Reviews</div>
          </div>
        </div>
      </div>

      {/* Resume Study Card */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-slate-300 mb-2">
              {groupProgress.learned === groupProgress.total && groupProgress.total > 0
                ? "🎉 You've completed this group! Ready for the next one?"
                : stats.learned === 0
                  ? "Start your journey with the most common Chinese words!"
                  : `${groupProgress.total - groupProgress.learned} words remaining in this group`
              }
            </p>
          </div>

          <Link
            href={`/study/group/${currentGroup}`}
            className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors text-center"
          >
            {stats.learned === 0 ? 'Start Learning' : 'Continue Study'}
          </Link>
        </div>
      </div>

      {/* Example Sentences Card */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          📖 Sentences You Can Read
        </h2>

        {learnedWordsSet.size < 5 ? (
          <p className="text-slate-400 text-center py-4">
            Learn at least 5 words to see example sentences you can fully understand!
          </p>
        ) : loadingExamples ? (
          <div className="text-slate-400 text-center py-4">
            Finding sentences with only words you know...
          </div>
        ) : exampleSentences.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            Keep learning more words to unlock readable sentences!
          </p>
        ) : (
          <div className="space-y-4">
            {exampleSentences.map((sentence, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-xl text-amber-400 mb-1">{sentence.simplified}</div>
                <div className="text-sm text-amber-300/70 mb-1">{sentence.pinyin}</div>
                <div className="text-sm text-slate-300">{sentence.english}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/study"
          className="bg-slate-800 rounded-lg p-4 text-center hover:bg-slate-700 transition-colors"
        >
          <div className="text-2xl mb-1">📚</div>
          <div className="text-slate-300 font-medium">All Groups</div>
          <div className="text-slate-500 text-sm">Browse study groups</div>
        </Link>

        <Link
          href="/compounds"
          className="bg-slate-800 rounded-lg p-4 text-center hover:bg-slate-700 transition-colors"
        >
          <div className="text-2xl mb-1">🔍</div>
          <div className="text-slate-300 font-medium">Browse Words</div>
          <div className="text-slate-500 text-sm">Search the dictionary</div>
        </Link>
      </div>
    </div>
  );
}
