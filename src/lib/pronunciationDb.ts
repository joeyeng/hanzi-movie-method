/**
 * Client-side pronunciation database using sql.js (SQLite compiled to WebAssembly)
 */

import { useState, useEffect, useCallback } from 'react';

// Types for the pronunciation data
export interface PronunciationEntry {
  character: string;
  pinyin: string;
  frequency: number;
  rank: number;
}

// Database singleton
let dbInstance: any = null;
let dbPromise: Promise<any> | null = null;

// Check if the database is downloaded
export function isDatabaseDownloaded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pronunciationDbDownloaded') === 'true';
}

// Mark database as downloaded
function markDatabaseDownloaded(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pronunciationDbDownloaded', 'true');
  }
}

// Clear database cache
export function clearDatabaseCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pronunciationDbDownloaded');
    dbInstance = null;
    dbPromise = null;
    // Clear IndexedDB cache
    indexedDB.deleteDatabase('pronunciationDb');
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
    
    // Try to load from IndexedDB cache first
    const cachedData = await loadFromCache();
    if (cachedData) {
      dbInstance = new SQL.Database(cachedData);
      return dbInstance;
    }
    
    // Download the database file
    const response = await fetch('/pronunciation.db');
    if (!response.ok) {
      throw new Error('Failed to download pronunciation database');
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
    const request = indexedDB.open('pronunciationDb', 1);
    
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
    const request = indexedDB.open('pronunciationDb', 1);
    
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

/**
 * Hook to use the pronunciation database
 */
export function usePronunciationDb() {
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
    getPronunciations,
    getMostCommonPronunciation,
    hasMultiplePronunciations,
    clearCache: clearDatabaseCache
  };
}
