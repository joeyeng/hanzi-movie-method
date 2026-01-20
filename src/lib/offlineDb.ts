/**
 * Client-side offline database using sql.js (SQLite compiled to WebAssembly)
 * Contains:
 * - Pronunciation frequencies from SUBTLEX-CH corpus
 * - Word definitions from HanziPy (CC-CEDICT)
 * - Example sentences from Tatoeba
 */

import { useState, useEffect, useCallback } from 'react';

// Types for the data
export interface PronunciationEntry {
  character: string;
  pinyin: string;
  frequency: number;
  rank: number;
}

export interface ExampleSentence {
  id: number;
  simplified: string;
  traditional?: string;
  pinyin: string;
  english: string;
}

export interface WordDefinition {
  pinyin: string;
  definition: string;
  rank: number;
}

export interface WordEntry {
  id: number;
  word: string;
  length: number;
  frequency: number;
  rank: number;
  definitions: WordDefinition[];  // 1:m relationship
}

// Legacy interface for backward compatibility (includes primary pinyin/definition)
export interface WordEntryWithPrimary extends WordEntry {
  pinyin: string;      // Primary (rank 0) pinyin
  definition: string;  // Primary (rank 0) definition
}

// Database singleton
let dbInstance: any = null;
let dbPromise: Promise<any> | null = null;

const DB_NAME = 'hanziOfflineDb';
const DB_FILE = '/hanzi_data.db';
const STORAGE_KEY = 'hanziDbDownloaded';
const DB_VERSION = 5; // Increment when database structure changes (v5: optimized composite indexes)

// Check if the database is downloaded
export function isDatabaseDownloaded(): boolean {
  if (typeof window === 'undefined') return false;
  const version = localStorage.getItem(STORAGE_KEY);
  return version === String(DB_VERSION);
}

// Mark database as downloaded
function markDatabaseDownloaded(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(DB_VERSION));
  }
}

// Clear database cache
export function clearDatabaseCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    dbInstance = null;
    dbPromise = null;
    indexedDB.deleteDatabase(DB_NAME);
  }
}

// Initialize sql.js and load the database
async function initDatabase(): Promise<any> {
  if (dbInstance) {
    console.log('DB: Using existing instance');
    return dbInstance;
  }
  
  if (dbPromise) {
    console.log('DB: Waiting for existing promise');
    return dbPromise;
  }
  
  console.time('DB: Total init');
  dbPromise = (async () => {
    // Dynamically import sql.js
    console.time('DB: Import sql.js');
    const initSqlJs = (await import('sql.js')).default;
    console.timeEnd('DB: Import sql.js');
    
    // Initialize sql.js with the wasm file from CDN
    console.time('DB: Init WASM');
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    console.timeEnd('DB: Init WASM');
    
    // Try to load from IndexedDB cache first (if version matches)
    if (isDatabaseDownloaded()) {
      console.time('DB: Load from IndexedDB');
      const cachedData = await loadFromCache();
      console.timeEnd('DB: Load from IndexedDB');
      if (cachedData) {
        console.time('DB: Create instance from cache');
        dbInstance = new SQL.Database(cachedData);
        console.timeEnd('DB: Create instance from cache');
        console.timeEnd('DB: Total init');
        return dbInstance;
      }
    }
    
    // Download the database file
    console.time('DB: Fetch database');
    const response = await fetch(DB_FILE);
    if (!response.ok) {
      throw new Error('Failed to download offline database');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.timeEnd('DB: Fetch database');
    
    // Cache in IndexedDB for future use
    console.time('DB: Save to IndexedDB');
    await saveToCache(uint8Array);
    console.timeEnd('DB: Save to IndexedDB');
    
    console.time('DB: Create instance');
    dbInstance = new SQL.Database(uint8Array);
    console.timeEnd('DB: Create instance');
    markDatabaseDownloaded();
    
    console.timeEnd('DB: Total init');
    return dbInstance;
  })();
  
  return dbPromise;
}

// Save database to IndexedDB cache
async function saveToCache(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      store.put(data, 'database');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Load database from IndexedDB cache
async function loadFromCache(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => resolve(null);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction('data', 'readonly');
        const store = tx.objectStore('data');
        const getRequest = store.get('database');
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
  });
}

// ==================== PRONUNCIATION FUNCTIONS ====================

/**
 * Get pronunciations for a character, ranked by frequency
 */
export async function getPronunciations(character: string): Promise<PronunciationEntry[]> {
  const db = await initDatabase();
  
  const results = db.exec(
    'SELECT character, pinyin, frequency, rank FROM pronunciations WHERE character = ? ORDER BY rank',
    [character]
  );
  
  if (results.length === 0 || results[0].values.length === 0) {
    return [];
  }
  
  return results[0].values.map((row: any[]) => ({
    character: row[0],
    pinyin: row[1],
    frequency: row[2],
    rank: row[3]
  }));
}

/**
 * Get the most common pronunciation for a character
 */
export async function getMostCommonPronunciation(character: string): Promise<string | null> {
  const pronunciations = await getPronunciations(character);
  return pronunciations.length > 0 ? pronunciations[0].pinyin : null;
}

/**
 * Check if a character has multiple pronunciations
 */
export async function hasMultiplePronunciations(character: string): Promise<boolean> {
  const pronunciations = await getPronunciations(character);
  return pronunciations.length > 1;
}

// ==================== EXAMPLE SENTENCE FUNCTIONS ====================

/**
 * Search for example sentences containing a query string
 */
export async function searchExamples(query: string, limit: number = 5): Promise<ExampleSentence[]> {
  const db = await initDatabase();
  
  // Search for sentences containing the query, ordered by length (shorter = simpler)
  const results = db.exec(
    `SELECT id, simplified, traditional, pinyin, english 
     FROM examples 
     WHERE simplified LIKE ? 
     ORDER BY LENGTH(simplified) ASC 
     LIMIT ?`,
    [`%${query}%`, limit * 2]  // Fetch extra for deduplication
  );
  
  if (results.length === 0 || results[0].values.length === 0) {
    return [];
  }
  
  // Deduplicate by simplified text
  const seen = new Set<string>();
  const sentences: ExampleSentence[] = [];
  
  for (const row of results[0].values) {
    const simplified = row[1] as string;
    if (!seen.has(simplified)) {
      seen.add(simplified);
      sentences.push({
        id: row[0] as number,
        simplified,
        traditional: row[2] as string | undefined,
        pinyin: row[3] as string,
        english: row[4] as string
      });
      if (sentences.length >= limit) break;
    }
  }
  
  return sentences;
}

/**
 * Batch search for example sentences for multiple queries
 */
export async function batchSearchExamples(
  queries: string[], 
  limitPerQuery: number = 3
): Promise<Map<string, ExampleSentence[]>> {
  const results = new Map<string, ExampleSentence[]>();
  
  for (const query of queries) {
    const examples = await searchExamples(query, limitPerQuery);
    results.set(query, examples);
  }
  
  return results;
}

/**
 * Get total count of example sentences
 */
export async function getExampleCount(): Promise<number> {
  const db = await initDatabase();
  const results = db.exec('SELECT COUNT(*) FROM examples');
  return results[0]?.values[0]?.[0] || 0;
}

// ==================== WORD FUNCTIONS ====================

/**
 * Get definitions for a word from the word_definitions table
 */
async function getWordDefinitions(db: any, word: string): Promise<WordDefinition[]> {
  const results = db.exec(
    `SELECT pinyin, definition, rank 
     FROM word_definitions 
     WHERE word = ? 
     ORDER BY rank ASC`,
    [word]
  );
  
  if (results.length === 0 || results[0].values.length === 0) {
    return [];
  }
  
  return results[0].values.map((row: any[]) => ({
    pinyin: row[0] || '',
    definition: row[1] || '',
    rank: row[2]
  }));
}

/**
 * Batch get definitions for multiple words at once
 */
async function getBatchWordDefinitions(db: any, words: string[]): Promise<Map<string, WordDefinition[]>> {
  if (words.length === 0) return new Map();
  
  // Build placeholders for IN clause
  const placeholders = words.map(() => '?').join(',');
  const results = db.exec(
    `SELECT word, pinyin, definition, rank 
     FROM word_definitions 
     WHERE word IN (${placeholders})
     ORDER BY word, rank ASC`,
    words
  );
  
  const definitionsMap = new Map<string, WordDefinition[]>();
  
  // Initialize all words with empty arrays
  for (const word of words) {
    definitionsMap.set(word, []);
  }
  
  if (results.length > 0 && results[0].values.length > 0) {
    for (const row of results[0].values) {
      const word = row[0] as string;
      const defs = definitionsMap.get(word) || [];
      defs.push({
        pinyin: (row[1] || '') as string,
        definition: (row[2] || '') as string,
        rank: row[3] as number
      });
      definitionsMap.set(word, defs);
    }
  }
  
  return definitionsMap;
}

/**
 * Helper to convert raw word rows to WordEntryWithPrimary
 */
async function mapWordsWithDefinitions(db: any, rows: any[][]): Promise<WordEntryWithPrimary[]> {
  // Extract all words for batch lookup
  const words = rows.map(row => row[1] as string);
  const definitionsMap = await getBatchWordDefinitions(db, words);
  
  const entries: WordEntryWithPrimary[] = [];
  
  for (const row of rows) {
    const word = row[1] as string;
    const definitions = definitionsMap.get(word) || [];
    const primary = definitions[0] || { pinyin: '', definition: '', rank: 0 };
    
    entries.push({
      id: row[0] as number,
      word,
      length: row[2] as number,
      frequency: row[3] as number,
      rank: row[4] as number,
      definitions,
      pinyin: primary.pinyin,
      definition: primary.definition
    });
  }
  
  return entries;
}

/**
 * Get single character words (length = 1), ordered by frequency rank
 * Optimized: Query words first, then batch fetch definitions
 */
export async function getCharacterWords(
  offset: number = 0, 
  limit: number = 100
): Promise<WordEntryWithPrimary[]> {
  console.time('getCharacterWords: initDatabase');
  const db = await initDatabase();
  console.timeEnd('getCharacterWords: initDatabase');
  
  // Step 1: Get words only (fast query with index)
  console.time('getCharacterWords: words query');
  const wordsResult = db.exec(
    `SELECT id, word, length, frequency, rank
     FROM words
     WHERE length = 1 
     ORDER BY rank ASC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  console.timeEnd('getCharacterWords: words query');
  
  if (wordsResult.length === 0 || wordsResult[0].values.length === 0) {
    return [];
  }
  
  const words = wordsResult[0].values;
  
  // Step 2: Batch fetch primary definitions for these words
  console.time('getCharacterWords: definitions query');
  const wordList = words.map((row: any[]) => row[1] as string);
  const placeholders = wordList.map(() => '?').join(',');
  const defsResult = db.exec(
    `SELECT word, pinyin, definition 
     FROM word_definitions 
     WHERE word IN (${placeholders}) AND rank = 0`,
    wordList
  );
  console.timeEnd('getCharacterWords: definitions query');
  
  // Build a map for quick lookup
  const defMap = new Map<string, { pinyin: string; definition: string }>();
  if (defsResult.length > 0) {
    for (const row of defsResult[0].values) {
      defMap.set(row[0] as string, {
        pinyin: row[1] as string,
        definition: row[2] as string
      });
    }
  }
  
  console.time('getCharacterWords: map results');
  const mapped = words.map((row: any[]) => {
    const word = row[1] as string;
    const def = defMap.get(word);
    return {
      id: row[0] as number,
      word,
      length: row[2] as number,
      frequency: row[3] as number,
      rank: row[4] as number,
      definitions: [],
      pinyin: def?.pinyin || '',
      definition: def?.definition || ''
    };
  });
  console.timeEnd('getCharacterWords: map results');
  return mapped;
}

/**
 * Get compound words (length > 1), ordered by frequency rank
 * Optimized: Query words first, then batch fetch definitions
 */
export async function getCompoundWords(
  offset: number = 0, 
  limit: number = 100
): Promise<WordEntryWithPrimary[]> {
  const db = await initDatabase();
  
  // Step 1: Get words only (fast query with index)
  const wordsResult = db.exec(
    `SELECT id, word, length, frequency, rank
     FROM words
     WHERE length > 1 
     ORDER BY rank ASC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  if (wordsResult.length === 0 || wordsResult[0].values.length === 0) {
    return [];
  }
  
  const words = wordsResult[0].values;
  
  // Step 2: Batch fetch primary definitions for these words
  const wordList = words.map((row: any[]) => row[1] as string);
  const placeholders = wordList.map(() => '?').join(',');
  const defsResult = db.exec(
    `SELECT word, pinyin, definition 
     FROM word_definitions 
     WHERE word IN (${placeholders}) AND rank = 0`,
    wordList
  );
  
  // Build a map for quick lookup
  const defMap = new Map<string, { pinyin: string; definition: string }>();
  if (defsResult.length > 0) {
    for (const row of defsResult[0].values) {
      defMap.set(row[0] as string, {
        pinyin: row[1] as string,
        definition: row[2] as string
      });
    }
  }
  
  return words.map((row: any[]) => {
    const word = row[1] as string;
    const def = defMap.get(word);
    return {
      id: row[0] as number,
      word,
      length: row[2] as number,
      frequency: row[3] as number,
      rank: row[4] as number,
      definitions: [],
      pinyin: def?.pinyin || '',
      definition: def?.definition || ''
    };
  });
}

/**
 * Get all words, ordered by frequency rank
 * Optimized: Query words first, then batch fetch definitions
 */
export async function getAllWords(
  offset: number = 0, 
  limit: number = 100
): Promise<WordEntryWithPrimary[]> {
  const db = await initDatabase();
  
  // Step 1: Get words only
  const wordsResult = db.exec(
    `SELECT id, word, length, frequency, rank
     FROM words
     ORDER BY rank ASC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  if (wordsResult.length === 0 || wordsResult[0].values.length === 0) {
    return [];
  }
  
  const words = wordsResult[0].values;
  
  // Step 2: Batch fetch primary definitions
  const wordList = words.map((row: any[]) => row[1] as string);
  const placeholders = wordList.map(() => '?').join(',');
  const defsResult = db.exec(
    `SELECT word, pinyin, definition 
     FROM word_definitions 
     WHERE word IN (${placeholders}) AND rank = 0`,
    wordList
  );
  
  const defMap = new Map<string, { pinyin: string; definition: string }>();
  if (defsResult.length > 0) {
    for (const row of defsResult[0].values) {
      defMap.set(row[0] as string, {
        pinyin: row[1] as string,
        definition: row[2] as string
      });
    }
  }
  
  return words.map((row: any[]) => {
    const word = row[1] as string;
    const def = defMap.get(word);
    return {
      id: row[0] as number,
      word,
      length: row[2] as number,
      frequency: row[3] as number,
      rank: row[4] as number,
      definitions: [],
      pinyin: def?.pinyin || '',
      definition: def?.definition || ''
    };
  });
}

/**
 * Search for words containing a query string
 * Optimized: Search words table first, then batch fetch definitions
 */
export async function searchWords(
  query: string, 
  limit: number = 20
): Promise<WordEntryWithPrimary[]> {
  const db = await initDatabase();
  
  // Step 1: Search for matching words (by hanzi or definition/pinyin)
  // First try to find by word text
  const wordMatches = db.exec(
    `SELECT id, word, length, frequency, rank
     FROM words
     WHERE word LIKE ?
     ORDER BY rank ASC 
     LIMIT ?`,
    [`%${query}%`, limit]
  );
  
  // Also search in definitions for pinyin/meaning matches
  const defMatches = db.exec(
    `SELECT DISTINCT w.id, w.word, w.length, w.frequency, w.rank
     FROM words w
     INNER JOIN word_definitions wd ON w.word = wd.word
     WHERE wd.pinyin LIKE ? OR wd.definition LIKE ?
     ORDER BY w.rank ASC 
     LIMIT ?`,
    [`%${query}%`, `%${query}%`, limit]
  );
  
  // Combine results, deduplicate by word
  const seenWords = new Set<string>();
  const allWords: any[][] = [];
  
  const addResults = (results: any) => {
    if (results.length > 0 && results[0].values) {
      for (const row of results[0].values) {
        const word = row[1] as string;
        if (!seenWords.has(word)) {
          seenWords.add(word);
          allWords.push(row);
        }
      }
    }
  };
  
  addResults(wordMatches);
  addResults(defMatches);
  
  // Sort by rank and limit
  allWords.sort((a, b) => (a[4] as number) - (b[4] as number));
  const limitedWords = allWords.slice(0, limit);
  
  if (limitedWords.length === 0) {
    return [];
  }
  
  // Step 2: Batch fetch definitions
  const wordList = limitedWords.map(row => row[1] as string);
  const placeholders = wordList.map(() => '?').join(',');
  const defsResult = db.exec(
    `SELECT word, pinyin, definition 
     FROM word_definitions 
     WHERE word IN (${placeholders}) AND rank = 0`,
    wordList
  );
  
  const defMap = new Map<string, { pinyin: string; definition: string }>();
  if (defsResult.length > 0) {
    for (const row of defsResult[0].values) {
      defMap.set(row[0] as string, {
        pinyin: row[1] as string,
        definition: row[2] as string
      });
    }
  }
  
  return limitedWords.map((row: any[]) => {
    const word = row[1] as string;
    const def = defMap.get(word);
    return {
      id: row[0] as number,
      word,
      length: row[2] as number,
      frequency: row[3] as number,
      rank: row[4] as number,
      definitions: [],
      pinyin: def?.pinyin || '',
      definition: def?.definition || ''
    };
  });
}

/**
 * Get a specific word by its word text
 */
export async function getWord(word: string): Promise<WordEntryWithPrimary | null> {
  const db = await initDatabase();
  
  const results = db.exec(
    `SELECT id, word, length, frequency, rank 
     FROM words 
     WHERE word = ?`,
    [word]
  );
  
  if (results.length === 0 || results[0].values.length === 0) {
    return null;
  }
  
  const row = results[0].values[0];
  const definitions = await getWordDefinitions(db, word);
  const primary = definitions[0] || { pinyin: '', definition: '', rank: 0 };
  
  return {
    id: row[0] as number,
    word: row[1] as string,
    length: row[2] as number,
    frequency: row[3] as number,
    rank: row[4] as number,
    definitions,
    pinyin: primary.pinyin,
    definition: primary.definition
  };
}

/**
 * Get all definitions for a word
 */
export async function getWordAllDefinitions(word: string): Promise<WordDefinition[]> {
  const db = await initDatabase();
  return getWordDefinitions(db, word);
}

/**
 * Get count of single character words
 */
export async function getCharacterWordCount(): Promise<number> {
  const db = await initDatabase();
  const results = db.exec('SELECT COUNT(*) FROM words WHERE length = 1');
  return results[0]?.values[0]?.[0] || 0;
}

/**
 * Get count of compound words
 */
export async function getCompoundWordCount(): Promise<number> {
  const db = await initDatabase();
  const results = db.exec('SELECT COUNT(*) FROM words WHERE length > 1');
  return results[0]?.values[0]?.[0] || 0;
}

// ==================== REACT HOOK ====================

/**
 * Hook to use the offline database
 */
export function useOfflineDb() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await initDatabase();
      setIsReady(true);
      setDownloadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Check if already downloaded
    if (isDatabaseDownloaded()) {
      initialize();
    } else {
      setIsLoading(false);
    }
  }, [initialize]);
  
  return {
    isLoading,
    isReady,
    error,
    downloadProgress,
    initialize,
    // Pronunciation functions
    getPronunciations,
    getMostCommonPronunciation,
    hasMultiplePronunciations,
    // Word functions
    getCharacterWords,
    getCompoundWords,
    getAllWords,
    searchWords,
    getWord,
    getWordAllDefinitions,
    getCharacterWordCount,
    getCompoundWordCount,
    // Example sentence functions
    searchExamples,
    batchSearchExamples,
    getExampleCount,
    // Cache management
    clearCache: clearDatabaseCache
  };
}

// Re-export for backward compatibility
export { isDatabaseDownloaded as isOfflineDbDownloaded };
