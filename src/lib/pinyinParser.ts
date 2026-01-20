// Pinyin parser for extracting initial, final, and tone for HMM

// Tone mark to number mapping
const TONE_MAP: Record<string, { base: string; tone: number }> = {
  // a with tones
  'ā': { base: 'a', tone: 1 },
  'á': { base: 'a', tone: 2 },
  'ǎ': { base: 'a', tone: 3 },
  'à': { base: 'a', tone: 4 },
  // e with tones
  'ē': { base: 'e', tone: 1 },
  'é': { base: 'e', tone: 2 },
  'ě': { base: 'e', tone: 3 },
  'è': { base: 'e', tone: 4 },
  // i with tones
  'ī': { base: 'i', tone: 1 },
  'í': { base: 'i', tone: 2 },
  'ǐ': { base: 'i', tone: 3 },
  'ì': { base: 'i', tone: 4 },
  // o with tones
  'ō': { base: 'o', tone: 1 },
  'ó': { base: 'o', tone: 2 },
  'ǒ': { base: 'o', tone: 3 },
  'ò': { base: 'o', tone: 4 },
  // u with tones
  'ū': { base: 'u', tone: 1 },
  'ú': { base: 'u', tone: 2 },
  'ǔ': { base: 'u', tone: 3 },
  'ù': { base: 'u', tone: 4 },
  // ü with tones
  'ǖ': { base: 'ü', tone: 1 },
  'ǘ': { base: 'ü', tone: 2 },
  'ǚ': { base: 'ü', tone: 3 },
  'ǜ': { base: 'ü', tone: 4 },
};

// All possible initials in order of length (longest first for matching)
const INITIALS = [
  'zhu', 'chu', 'shu', // u-blend initials (fictional)
  'zh', 'ch', 'sh', // retroflex
  'bi', 'pi', 'mi', 'di', 'ti', 'ji', 'qi', 'xi', 'ni', 'li', // i-blend initials (female)
  'bu', 'pu', 'mu', 'fu', 'du', 'tu', 'nu', 'lu', 'zu', 'cu', 'su', 'ru', 'ku', 'hu', 'gu', // u-blend initials (fictional)
  'yu', 'nü', 'lü', 'ju', 'qu', 'xu', // ü-blend initials (basketball)
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'r', 'z', 'c', 's', // basic initials
  'y', 'w', // semi-vowels
];

// Finals mapping - normalize various spellings to HMM format
const FINALS_MAP: Record<string, string> = {
  // Null final (standalone initials like zhi, chi, shi, ri, zi, ci, si)
  'i': '-Ø', // Only when following zh, ch, sh, r, z, c, s
  '': '-Ø',
  
  // -a finals
  'a': '-a',
  'ia': '-a', // Use base final
  'ua': '-a',
  
  // -ai finals
  'ai': '-ai',
  'uai': '-ai',
  
  // -ao finals
  'ao': '-ao',
  'iao': '-ao',
  
  // -an finals
  'an': '-an',
  'ian': '-an',
  'uan': '-an',
  'üan': '-an',
  
  // -ang finals
  'ang': '-ang',
  'iang': '-ang',
  'uang': '-ang',
  
  // -o finals
  'o': '-o',
  'uo': '-o',
  
  // -ong finals
  'ong': '-ong',
  'iong': '-ong',
  
  // -ou finals
  'ou': '-ou',
  'iu': '-ou', // iu is actually iou
  
  // -e finals
  'e': '-e',
  'ie': '-e',
  'üe': '-e',
  've': '-e', // lüe sometimes written lve
  
  // -(e)i finals
  'ei': '-(e)i',
  'ui': '-(e)i', // ui is actually uei
  
  // -(e)n finals
  'en': '-(e)n',
  'in': '-(e)n',
  'un': '-(e)n', // un is actually uen
  'ün': '-(e)n',
  
  // -(e)ng finals
  'eng': '-(e)ng',
  'ing': '-(e)ng',
  
  // Special standalone vowels (when no initial)
  'er': '-e', // Special case: er
};

// Initials that use -Ø final when followed by just 'i'
const NULL_FINAL_INITIALS = ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'];

export interface PinyinComponents {
  initial: string;  // e.g., "b-", "sh-", "Ø-"
  final: string;    // e.g., "-an", "-eng", "-Ø"
  tone: number;     // 1-5
  normalized: string; // pinyin without tone marks
}

/**
 * Parse a single pinyin syllable and extract its components
 */
export function parsePinyin(pinyin: string): PinyinComponents {
  if (!pinyin) {
    return { initial: 'Ø-', final: '-Ø', tone: 5, normalized: '' };
  }

  // Convert to lowercase and trim
  let syllable = pinyin.toLowerCase().trim();
  
  // Extract tone from tone marks
  let tone = 5; // Default neutral tone
  let normalized = '';
  
  for (const char of syllable) {
    if (TONE_MAP[char]) {
      tone = TONE_MAP[char].tone;
      normalized += TONE_MAP[char].base;
    } else {
      normalized += char;
    }
  }
  
  // Also check for tone numbers at the end (e.g., "ma1")
  const toneNumMatch = normalized.match(/^(.+?)([1-5])$/);
  if (toneNumMatch) {
    normalized = toneNumMatch[1];
    tone = parseInt(toneNumMatch[2], 10);
  }
  
  // Handle ü written as v or u: after j, q, x, y
  normalized = normalized.replace(/v/g, 'ü');
  if (/^[jqxy]u/.test(normalized)) {
    normalized = normalized.replace(/^([jqxy])u/, '$1ü');
  }
  
  // Find the initial
  let initial = 'Ø-'; // Default: null initial
  let remainder = normalized;
  
  for (const init of INITIALS) {
    if (normalized.startsWith(init)) {
      // Check if this is a compound initial (like bi-, ji-, etc.)
      // or if it should be parsed as initial + final
      initial = init + '-';
      remainder = normalized.slice(init.length);
      break;
    }
  }
  
  // Determine the final
  let final = '-Ø';
  
  // Special case: if initial is zh-, ch-, sh-, r-, z-, c-, s- and remainder is 'i' or empty
  if (NULL_FINAL_INITIALS.includes(initial.replace('-', '')) && (remainder === 'i' || remainder === '')) {
    final = '-Ø';
  } else if (remainder) {
    // Look up the final in our mapping
    if (FINALS_MAP[remainder]) {
      final = FINALS_MAP[remainder];
    } else {
      // Try to find a matching final pattern
      // Check for compound finals
      for (const [pattern, mappedFinal] of Object.entries(FINALS_MAP)) {
        if (remainder.endsWith(pattern) && pattern.length > 0) {
          final = mappedFinal;
          break;
        }
      }
    }
  } else if (initial === 'Ø-') {
    // No initial and no remainder means we need to parse differently
    // This shouldn't happen with valid pinyin
    final = '-Ø';
  }
  
  return { initial, final, tone, normalized };
}

/**
 * Parse the first syllable of a multi-syllable pinyin string
 */
export function parseFirstSyllable(pinyinStr: string): PinyinComponents {
  if (!pinyinStr) {
    return { initial: 'Ø-', final: '-Ø', tone: 5, normalized: '' };
  }
  
  // Split by spaces or common separators and take the first syllable
  const syllables = pinyinStr.trim().split(/[\s·']+/);
  return parsePinyin(syllables[0] || '');
}

/**
 * Find matching actor, room, and set IDs based on pinyin
 */
export function findHmmMatches(
  pinyin: string,
  actors: { id: string; initial: string }[],
  rooms: { id: string; tone: number }[],
  sets: { id: string; final: string }[]
): { actorId?: string; roomId?: string; setId?: string } {
  const components = parseFirstSyllable(pinyin);
  
  // Find matching actor by initial
  const actor = actors.find(a => a.initial === components.initial);
  
  // Find matching room by tone
  const room = rooms.find(r => r.tone === components.tone);
  
  // Find matching set by final
  const set = sets.find(s => s.final === components.final);
  
  return {
    actorId: actor?.id,
    roomId: room?.id,
    setId: set?.id,
  };
}
