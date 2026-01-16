// HanziPy API Client - Looks up Chinese characters via the HanziPy server

export interface HanziDefinition {
  pinyin: string;
  definition: string;
}

export interface HanziComponent {
  character: string;
  pinyin?: string;
  definition?: string;
  all_definitions?: HanziDefinition[];
}

export interface HanziEntry {
  character: string;
  pinyin: string | null;
  definition: string | null;
  found: boolean;
  error?: string;
  all_definitions?: HanziDefinition[];
}

export interface ParsedCharacter {
  hanzi: string;
  pinyin: string | null;
  definition: string | null;
  found: boolean;
  all_definitions?: HanziDefinition[];
  components?: HanziComponent[];
}

/**
 * Check if a character is a Chinese character
 */
export function isChineseCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs (most common)
  if (code >= 0x4e00 && code <= 0x9fff) return true;
  // CJK Unified Ideographs Extension A
  if (code >= 0x3400 && code <= 0x4dbf) return true;
  return false;
}

/**
 * Split a string into individual Chinese characters
 * Filters out non-Chinese characters and removes duplicates
 */
export function splitIntoCharacters(text: string): string[] {
  const chineseCharRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const matches = text.match(chineseCharRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract compound words (sequences of 2+ Chinese characters) from text using regex
 * This is the fallback method when jieba is not available
 * Returns unique compound words
 */
export function extractCompoundWordsRegex(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const compounds = new Set<string>();
  
  // Match sequences of 2+ Chinese characters
  const compoundRegex = /[\u4e00-\u9fff\u3400-\u4dbf]{2,}/g;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const matches = trimmed.match(compoundRegex);
    if (matches) {
      for (const match of matches) {
        compounds.add(match);
      }
    }
  }
  
  return [...compounds];
}

/**
 * Extract compound words using jieba word segmentation via the API
 * Falls back to regex-based extraction if the API is unavailable
 */
export async function extractCompoundWordsWithJieba(content: string): Promise<string[]> {
  try {
    const response = await fetch('/api/hanzi/segment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      console.warn('Jieba segmentation unavailable, falling back to regex');
      return extractCompoundWordsRegex(content);
    }

    const data = await response.json();
    return data.compounds || [];
  } catch (error) {
    console.warn('Error calling jieba segment API, falling back to regex:', error);
    return extractCompoundWordsRegex(content);
  }
}

/**
 * Extract compound words from text
 * Uses jieba for better word segmentation when available
 */
export async function extractCompoundWords(content: string): Promise<string[]> {
  return extractCompoundWordsWithJieba(content);
}

/**
 * Look up multiple Chinese characters via the HanziPy API
 */
export async function lookupCharactersAPI(characters: string[]): Promise<Map<string, HanziEntry>> {
  const results = new Map<string, HanziEntry>();
  
  if (characters.length === 0) {
    return results;
  }

  try {
    const response = await fetch('/api/hanzi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characters }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      for (const entry of data.results) {
        results.set(entry.character, {
          character: entry.character,
          pinyin: entry.pinyin,
          definition: entry.definition,
          found: entry.found,
          all_definitions: entry.all_definitions,
        });
      }
    }
  } catch (error) {
    console.error('Error looking up characters:', error);
    // Return entries marked as not found on error
    for (const char of characters) {
      results.set(char, {
        character: char,
        pinyin: null,
        definition: null,
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

export interface CompoundWordResult {
  word: string;
  characters: string[];
  pinyin: string | null;
  definition: string | null;
  found: boolean;
}

/**
 * Look up multiple compound words via the HanziPy API
 */
export async function lookupCompoundWordsAPI(words: string[]): Promise<CompoundWordResult[]> {
  const results: CompoundWordResult[] = [];
  
  if (words.length === 0) {
    return results;
  }

  try {
    const response = await fetch('/api/hanzi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characters: words }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      for (const entry of data.results) {
        results.push({
          word: entry.character,
          characters: Array.from(entry.character),
          pinyin: entry.pinyin,
          definition: entry.definition,
          found: entry.found,
        });
      }
    }
  } catch (error) {
    console.error('Error looking up compound words:', error);
    // Return entries marked as not found on error
    for (const word of words) {
      results.push({
        word,
        characters: Array.from(word),
        pinyin: null,
        definition: null,
        found: false,
      });
    }
  }

  return results;
}

/**
 * Parse a plain text file containing Chinese characters
 * Returns unique characters ready for API lookup
 */
export function extractCharactersFromText(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const allCharacters: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const chars = splitIntoCharacters(trimmed);
    allCharacters.push(...chars);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(allCharacters)];
}

/**
 * Parse a plain text file and look up all characters via the API
 * This is the main function for the import page
 */
export async function parseCharacterFileAsync(content: string): Promise<ParsedCharacter[]> {
  const characters = extractCharactersFromText(content);
  
  if (characters.length === 0) {
    return [];
  }

  const lookupResults = await lookupCharactersAPI(characters);
  
  return characters.map(hanzi => {
    const entry = lookupResults.get(hanzi);
    return {
      hanzi,
      pinyin: entry?.pinyin || null,
      definition: entry?.definition || null,
      found: entry?.found || false,
      all_definitions: entry?.all_definitions,
    };
  });
}

/**
 * Check if the HanziPy server is available
 */
export async function checkHanziPyServer(): Promise<{ available: boolean; message: string }> {
  try {
    const response = await fetch('/api/hanzi', {
      method: 'GET',
    });
    
    if (response.ok) {
      return { available: true, message: 'HanziPy server is running' };
    } else {
      const data = await response.json().catch(() => ({}));
      return { available: false, message: data.message || 'HanziPy server returned an error' };
    }
  } catch {
    return { 
      available: false, 
      message: 'Cannot connect to HanziPy server. Start it with: python hanzipy_server/server.py' 
    };
  }
}

// Keep the synchronous version for backwards compatibility, but it won't have data
export function parseCharacterFile(content: string): ParsedCharacter[] {
  const characters = extractCharactersFromText(content);
  return characters.map(hanzi => ({
    hanzi,
    pinyin: null,
    definition: null,
    found: false,
  }));
}

/**
 * Look up character decomposition (components) via the HanziPy API
 */
export async function decomposeCharactersAPI(characters: string[]): Promise<Map<string, HanziComponent[]>> {
  const results = new Map<string, HanziComponent[]>();
  
  if (characters.length === 0) {
    return results;
  }

  try {
    const response = await fetch('/api/hanzi/decompose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characters }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      for (const entry of data.results) {
        results.set(entry.character, entry.components || []);
      }
    }
  } catch (error) {
    console.error('Error decomposing characters:', error);
    // Return empty arrays on error
    for (const char of characters) {
      results.set(char, []);
    }
  }

  return results;
}

/**
 * Parse a plain text file, look up all characters, and get their components
 * This is the enhanced import function with component decomposition
 */
export async function parseCharacterFileWithComponentsAsync(content: string): Promise<ParsedCharacter[]> {
  const characters = extractCharactersFromText(content);
  
  if (characters.length === 0) {
    return [];
  }

  // Look up definitions and decompose in parallel
  const [lookupResults, decomposeResults] = await Promise.all([
    lookupCharactersAPI(characters),
    decomposeCharactersAPI(characters),
  ]);
  
  return characters.map(hanzi => {
    const entry = lookupResults.get(hanzi);
    const components = decomposeResults.get(hanzi) || [];
    return {
      hanzi,
      pinyin: entry?.pinyin || null,
      definition: entry?.definition || null,
      found: entry?.found || false,
      all_definitions: entry?.all_definitions,
      components,
    };
  });
}

// Tatoeba Example Sentences API

export interface TatoebaExample {
  id: number;
  simplified: string;
  pinyin: string;
  english: string;
}

/**
 * Fetch example sentences for a Chinese word from the Tatoeba API
 */
export async function fetchExampleSentences(
  query: string,
  limit: number = 5
): Promise<TatoebaExample[]> {
  try {
    const response = await fetch(
      `/api/examples?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch example sentences:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching example sentences:', error);
    return [];
  }
}

/**
 * Batch fetch example sentences for multiple words
 * Returns a Map of word -> example sentences
 */
export async function batchFetchExampleSentences(
  words: string[],
  limitPerWord: number = 3
): Promise<Map<string, TatoebaExample[]>> {
  const results = new Map<string, TatoebaExample[]>();
  
  if (words.length === 0) return results;
  
  // Use batch endpoint for efficiency - process in chunks to avoid too large requests
  const chunkSize = 50;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    
    try {
      const response = await fetch('/api/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: chunk, limit: limitPerWord }),
      });
      
      if (!response.ok) {
        console.error('Batch fetch failed:', response.statusText);
        continue;
      }
      
      const data = await response.json();
      // data.results is { "word1": [...], "word2": [...] }
      if (data.results) {
        for (const [word, examples] of Object.entries(data.results)) {
          results.set(word, examples as TatoebaExample[]);
        }
      }
    } catch (error) {
      console.error('Error in batch fetch:', error);
    }
  }
  
  return results;
}
