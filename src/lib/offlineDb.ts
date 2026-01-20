/**
 * Client-side offline database using sql.js (SQLite compiled to WebAssembly)
 * Contains:
 * - Pronunciation frequencies from SUBTLEX-CH corpus
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

// Database singleton
let dbInstance: any = null;
let dbPromise: Promise<any> | null = null;

const DB_NAME = 'hanziOfflineDb';
const DB_FILE = '/hanzi_data.db';
const STORAGE_KEY = 'hanziDbDownloaded';
const DB_VERSION = 2; // Increment when database structure changes

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
  if (dbInstance) return dbInstance;
  
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    // Dynamically import sql.js
    const initSqlJs = (await import('sql.js')).default;
    
    // Initialize sql.js with the wasm file from CDN
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    
    // Try to load from IndexedDB cache first (if version matches)
    if (isDatabaseDownloaded()) {
      const cachedData = await loadFromCache();
      if (cachedData) {
        dbInstance = new SQL.Database(cachedData);
        return dbInstance;
      }
    }
    
    // Download the database file
    const response = await fetch(DB_FILE);
    if (!response.ok) {
      throw new Error('Failed to download offline database');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Cache in IndexedDB for future use
    await saveToCache(uint8Array);
    
    dbInstance = new SQL.Database(uint8Array);
    markDatabaseDownloaded();
    
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
