"""
Build SQLite database of pronunciation frequencies from SUBTLEX-CH corpus.
The database contains characters with their pronunciations ranked by frequency.
Pinyin is normalized to use tone diacritics instead of tone numbers.
"""
import sqlite3
import os
import re

SUBTLEX_FILE = os.path.join(os.path.dirname(__file__), 'subtlex_data', 'SUBTLEX_CH_131210_CE.utf8')
OUTPUT_DB = os.path.join(os.path.dirname(__file__), '..', 'public', 'pronunciation.db')

def tone_number_to_diacritic(pinyin: str) -> str:
    """
    Convert pinyin with tone numbers to tone diacritics.
    e.g., 'wo3' -> 'wǒ', 'lv4' -> 'lǜ'
    Returns None if the pinyin is invalid.
    """
    # Skip invalid pinyin
    if not pinyin or not re.match(r'^[a-züA-ZÜ]+[1-5]?$', pinyin, re.IGNORECASE):
        return None
    
    tone_marks = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    }
    
    # Handle 'v' as 'ü'
    pinyin = pinyin.replace('v', 'ü')
    
    # Extract tone number
    match = re.match(r'^([a-züA-ZÜ]+)([1-5])?$', pinyin, re.IGNORECASE)
    if not match:
        return None
    
    base = match.group(1).lower()
    tone = int(match.group(2)) - 1 if match.group(2) else 4  # Default to neutral (5)
    
    # Find which vowel gets the tone mark
    # Rules: 
    # 1. 'a' or 'e' always get the mark
    # 2. In 'ou', 'o' gets the mark
    # 3. Otherwise, the last vowel gets the mark
    vowels = 'aeiouü'
    
    if 'a' in base:
        idx = base.index('a')
        return base[:idx] + tone_marks['a'][tone] + base[idx+1:]
    elif 'e' in base:
        idx = base.index('e')
        return base[:idx] + tone_marks['e'][tone] + base[idx+1:]
    elif 'ou' in base:
        idx = base.index('o')
        return base[:idx] + tone_marks['o'][tone] + base[idx+1:]
    else:
        # Find last vowel
        for i in range(len(base) - 1, -1, -1):
            if base[i] in vowels:
                char = base[i]
                return base[:i] + tone_marks[char][tone] + base[i+1:]
    
    return base


def parse_subtlex_file():
    """
    Parse the SUBTLEX-CH file and extract character-pinyin frequencies.
    For multi-character words, extract individual character pronunciations.
    """
    char_pinyin_freq = {}  # {char: {pinyin: total_freq}}
    
    print("Parsing SUBTLEX-CH file...")
    
    with open(SUBTLEX_FILE, 'r', encoding='utf-8') as f:
        header = f.readline()  # Skip header
        
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) < 5:
                continue
            
            word = parts[0]
            length = int(parts[1]) if parts[1].isdigit() else len(word)
            pinyin_field = parts[2]  # e.g., "zhao1/zhao2/zhe5/zhuo2" or "kan4 zhe5"
            wcount = int(parts[4]) if parts[4].isdigit() else 0
            
            if length == 0 or wcount == 0:
                continue
            
            # Only use multi-character words where we know the exact pronunciation of each character
            # Single-character entries often list multiple pronunciations without frequency breakdown
            if length > 1 and ' ' in pinyin_field and '/' not in pinyin_field:
                pinyin_parts = pinyin_field.split()
                chars = list(word)
                
                if len(pinyin_parts) == len(chars):
                    for char, py in zip(chars, pinyin_parts):
                        if char not in char_pinyin_freq:
                            char_pinyin_freq[char] = {}
                        if py not in char_pinyin_freq[char]:
                            char_pinyin_freq[char][py] = 0
                        char_pinyin_freq[char][py] += wcount
    
    return char_pinyin_freq


def build_database():
    """Build the SQLite database with pronunciation data."""
    char_pinyin_freq = parse_subtlex_file()
    
    print(f"Found {len(char_pinyin_freq)} unique characters")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_DB), exist_ok=True)
    
    # Remove existing database
    if os.path.exists(OUTPUT_DB):
        os.remove(OUTPUT_DB)
    
    # Create database
    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
        CREATE TABLE pronunciations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character TEXT NOT NULL,
            pinyin TEXT NOT NULL,
            frequency INTEGER NOT NULL,
            rank INTEGER NOT NULL
        )
    ''')
    
    # Create indexes
    cursor.execute('CREATE INDEX idx_character ON pronunciations(character)')
    cursor.execute('CREATE INDEX idx_rank ON pronunciations(rank)')
    
    # Insert data - only characters with multiple pronunciations
    total_entries = 0
    multi_pron_chars = 0
    
    for char, pinyin_freqs in sorted(char_pinyin_freq.items()):
        # Convert and deduplicate pinyins (different tone numbers may normalize to same diacritic)
        normalized_freqs = {}
        for pinyin_num, freq in pinyin_freqs.items():
            pinyin_mark = tone_number_to_diacritic(pinyin_num)
            if pinyin_mark is None:
                continue  # Skip invalid pinyin
            if pinyin_mark not in normalized_freqs:
                normalized_freqs[pinyin_mark] = 0
            normalized_freqs[pinyin_mark] += freq
        
        if len(normalized_freqs) < 2:
            continue  # Skip single-pronunciation characters
        
        multi_pron_chars += 1
        
        # Sort by frequency (highest first)
        sorted_pinyins = sorted(normalized_freqs.items(), key=lambda x: -x[1])
        
        for rank, (pinyin_mark, freq) in enumerate(sorted_pinyins):
            cursor.execute(
                'INSERT INTO pronunciations (character, pinyin, frequency, rank) VALUES (?, ?, ?, ?)',
                (char, pinyin_mark, freq, rank)
            )
            total_entries += 1
    
    conn.commit()
    
    # Get file size
    cursor.execute('SELECT COUNT(*) FROM pronunciations')
    row_count = cursor.fetchone()[0]
    
    conn.close()
    
    file_size = os.path.getsize(OUTPUT_DB)
    print(f"Generated {OUTPUT_DB}")
    print(f"  - {multi_pron_chars} multi-pronunciation characters")
    print(f"  - {row_count} total entries")
    print(f"  - {file_size / 1024:.1f} KB")
    
    # Show examples
    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    
    print("\nExample entries:")
    for char in ['着', '了', '得', '长', '行']:
        cursor.execute('SELECT pinyin, frequency, rank FROM pronunciations WHERE character = ? ORDER BY rank', (char,))
        rows = cursor.fetchall()
        if rows:
            pinyins = ', '.join([f"{p}({f})" for p, f, r in rows])
            print(f"  {char}: {pinyins}")
    
    conn.close()


if __name__ == '__main__':
    build_database()
