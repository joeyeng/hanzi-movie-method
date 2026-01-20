"""
Build unified offline database for Hanzi Movie Method.
Combines:
1. Pronunciation frequency data from SUBTLEX-CH corpus
2. Word definitions from HanziPy (CC-CEDICT)
3. Example sentences from Tatoeba/Chinese Example Sentences

Output: public/hanzi_data.db (for client-side use via sql.js)
"""
import sqlite3
import os
import re
import csv
import urllib.request
import tempfile

# Try to import hanzipy for dictionary lookups
try:
    from hanzipy.dictionary import HanziDictionary
    dictionary = HanziDictionary()
    HANZIPY_AVAILABLE = True
    print("HanziPy dictionary available")
except ImportError:
    HANZIPY_AVAILABLE = False
    dictionary = None
    print("Warning: HanziPy not available, definitions will be limited")

# Import frequency data for ranking
try:
    from frequency_data import PRONUNCIATION_FREQUENCY as CORPUS_FREQUENCY
    print(f"Loaded frequency data for {len(CORPUS_FREQUENCY)} characters")
except ImportError:
    CORPUS_FREQUENCY = {}
    print("Warning: frequency_data.py not found")

SUBTLEX_FILE = os.path.join(os.path.dirname(__file__), 'subtlex_data', 'SUBTLEX_CH_131210_CE.utf8')
TATOEBA_DB_URL = "https://github.com/krmanik/Chinese-Example-Sentences/raw/main/Chinese%20Example%20Sentences/sen_data.db"
OUTPUT_DB = os.path.join(os.path.dirname(__file__), '..', 'public', 'hanzi_data.db')


def tone_number_to_diacritic(pinyin: str) -> str:
    """
    Convert pinyin with tone numbers to tone diacritics.
    e.g., 'wo3' -> 'wǒ', 'lv4' -> 'lǜ'
    Returns None if the pinyin is invalid.
    """
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
    
    pinyin = pinyin.replace('v', 'ü')
    
    match = re.match(r'^([a-züA-ZÜ]+)([1-5])?$', pinyin, re.IGNORECASE)
    if not match:
        return None
    
    base = match.group(1).lower()
    tone = int(match.group(2)) - 1 if match.group(2) else 4
    
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
        for i in range(len(base) - 1, -1, -1):
            if base[i] in vowels:
                char = base[i]
                return base[:i] + tone_marks[char][tone] + base[i+1:]
    
    return base


def normalize_pinyin_for_comparison(pinyin: str) -> str:
    """Remove tone marks from pinyin for comparison."""
    tone_map = {
        'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
        'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
        'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
        'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
        'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
        'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
    }
    result = pinyin.lower()
    for marked, plain in tone_map.items():
        result = result.replace(marked, plain)
    # Also remove tone numbers
    result = re.sub(r'[1-5]', '', result)
    return result


def get_pronunciation_rank(char: str, pinyin: str) -> int:
    """
    Get the frequency rank for a character's pronunciation.
    Lower number = more common pronunciation.
    """
    if char in CORPUS_FREQUENCY:
        freq_list = CORPUS_FREQUENCY[char]
        normalized = normalize_pinyin_for_comparison(pinyin)
        
        for i, (corpus_pinyin, _) in enumerate(freq_list):
            if normalize_pinyin_for_comparison(corpus_pinyin) == normalized:
                return i
        
        return len(freq_list)  # Unknown pronunciation, rank after known ones
    
    return 0  # No ranking available


def convert_pinyin_tone_number_to_mark(pinyin: str) -> str:
    """Convert pinyin with tone numbers to tone marks."""
    tone_marks = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
        'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    }
    
    def convert_syllable(syllable: str) -> str:
        match = re.match(r'([a-zA-Züv]+)([1-5])?', syllable)
        if not match:
            return syllable
        
        base = match.group(1).lower()
        tone = int(match.group(2)) if match.group(2) else 5
        base = base.replace('v', 'ü')
        result = base
        
        if 'a' in base:
            result = base.replace('a', tone_marks['a'][tone - 1], 1)
        elif 'e' in base:
            result = base.replace('e', tone_marks['e'][tone - 1], 1)
        elif 'ou' in base:
            result = base.replace('o', tone_marks['o'][tone - 1], 1)
        else:
            vowels = 'iouü'
            for i in range(len(base) - 1, -1, -1):
                if base[i] in vowels:
                    char = base[i]
                    if char in tone_marks:
                        result = base[:i] + tone_marks[char][tone - 1] + base[i+1:]
                    break
        
        return result
    
    syllables = pinyin.split()
    converted = [convert_syllable(s) for s in syllables]
    return ' '.join(converted)


def get_hanzipy_definitions(word: str) -> list:
    """
    Get all definitions for a word from HanziPy, sorted by frequency.
    Returns list of (pinyin, definition, rank) tuples.
    """
    if not HANZIPY_AVAILABLE or not dictionary:
        return []
    
    try:
        definitions = dictionary.definition_lookup(word)
        if not definitions:
            return []
        
        # For single characters, use frequency ranking
        if len(word) == 1:
            def definition_sort_key(d):
                d_pinyin = d.get('pinyin', '')
                if isinstance(d_pinyin, list):
                    d_pinyin = ' '.join(d_pinyin)
                d_pinyin = convert_pinyin_tone_number_to_mark(d_pinyin)
                
                definition_lower = d.get('definition', '').lower().strip()
                
                # Get frequency rank (0 = most common)
                freq_rank = get_pronunciation_rank(word, d_pinyin)
                
                # Type penalties
                type_penalty = 0
                if 'surname' in definition_lower:
                    type_penalty = 300
                elif 'variant of' in definition_lower or 'variant' in definition_lower.split('/')[0]:
                    type_penalty = 200
                elif 'abbr.' in definition_lower or 'abbr ' in definition_lower or definition_lower.startswith('abbr'):
                    type_penalty = 100
                
                return (freq_rank * 10) + type_penalty
            
            sorted_definitions = sorted(definitions, key=definition_sort_key)
        else:
            # For compounds, just use the order from HanziPy
            sorted_definitions = definitions
        
        result = []
        for rank, d in enumerate(sorted_definitions):
            d_pinyin = d.get('pinyin', '')
            if isinstance(d_pinyin, list):
                d_pinyin = ' '.join(d_pinyin)
            d_pinyin = convert_pinyin_tone_number_to_mark(d_pinyin)
            d_definition = d.get('definition', '')
            result.append((d_pinyin, d_definition, rank))
        
        return result
    except Exception as e:
        return []


def parse_subtlex_file():
    """Parse SUBTLEX-CH file and extract character-pinyin frequencies."""
    char_pinyin_freq = {}
    
    print("Parsing SUBTLEX-CH file...")
    
    with open(SUBTLEX_FILE, 'r', encoding='utf-8') as f:
        header = f.readline()
        
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) < 5:
                continue
            
            word = parts[0]
            length = int(parts[1]) if parts[1].isdigit() else len(word)
            pinyin_field = parts[2]
            wcount = int(parts[4]) if parts[4].isdigit() else 0
            
            if length == 0 or wcount == 0:
                continue
            
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


def download_tatoeba_db():
    """Download Tatoeba example sentences database."""
    print("Downloading Tatoeba example sentences database...")
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        urllib.request.urlretrieve(TATOEBA_DB_URL, temp_path)
        print(f"  Downloaded to {temp_path}")
        return temp_path
    except Exception as e:
        print(f"  Error downloading: {e}")
        return None


def build_database():
    """Build the unified SQLite database."""
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_DB), exist_ok=True)
    
    # Remove existing database
    if os.path.exists(OUTPUT_DB):
        os.remove(OUTPUT_DB)
    
    # Create new database
    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    
    # ========== PRONUNCIATION TABLE ==========
    print("\n=== Building Pronunciation Table ===")
    
    cursor.execute('''
        CREATE TABLE pronunciations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character TEXT NOT NULL,
            pinyin TEXT NOT NULL,
            frequency INTEGER NOT NULL,
            rank INTEGER NOT NULL
        )
    ''')
    cursor.execute('CREATE INDEX idx_pron_character ON pronunciations(character)')
    
    char_pinyin_freq = parse_subtlex_file()
    print(f"Found {len(char_pinyin_freq)} unique characters")
    
    pron_entries = 0
    multi_pron_chars = 0
    
    for char, pinyin_freqs in sorted(char_pinyin_freq.items()):
        normalized_freqs = {}
        for pinyin_num, freq in pinyin_freqs.items():
            pinyin_mark = tone_number_to_diacritic(pinyin_num)
            if pinyin_mark is None:
                continue
            if pinyin_mark not in normalized_freqs:
                normalized_freqs[pinyin_mark] = 0
            normalized_freqs[pinyin_mark] += freq
        
        if len(normalized_freqs) < 2:
            continue
        
        multi_pron_chars += 1
        sorted_pinyins = sorted(normalized_freqs.items(), key=lambda x: -x[1])
        
        for rank, (pinyin_mark, freq) in enumerate(sorted_pinyins):
            cursor.execute(
                'INSERT INTO pronunciations (character, pinyin, frequency, rank) VALUES (?, ?, ?, ?)',
                (char, pinyin_mark, freq, rank)
            )
            pron_entries += 1
    
    print(f"  {multi_pron_chars} multi-pronunciation characters")
    print(f"  {pron_entries} total pronunciation entries")
    
    # ========== WORDS TABLE ==========
    print("\n=== Building Words Table ===")
    
    cursor.execute('''
        CREATE TABLE words (
            id INTEGER PRIMARY KEY,
            word TEXT NOT NULL UNIQUE,
            length INTEGER NOT NULL,
            frequency INTEGER NOT NULL,
            rank INTEGER NOT NULL
        )
    ''')
    cursor.execute('CREATE INDEX idx_words_word ON words(word)')
    # Composite index for efficient pagination by length and rank
    cursor.execute('CREATE INDEX idx_words_length_rank ON words(length, rank)')
    
    # Word definitions table (1:m relationship)
    cursor.execute('''
        CREATE TABLE word_definitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            pinyin TEXT NOT NULL,
            definition TEXT,
            rank INTEGER NOT NULL,
            FOREIGN KEY (word) REFERENCES words(word)
        )
    ''')
    # Composite index for efficient JOIN on (word, rank)
    cursor.execute('CREATE INDEX idx_word_defs_word_rank ON word_definitions(word, rank)')
    
    # Build list of all words with their frequencies
    word_entries = []
    with open(SUBTLEX_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        header = next(reader)
        
        for row in reader:
            if len(row) < 5:
                continue
            
            word = row[0]
            try:
                length = int(row[1])
            except ValueError:
                length = len(word)
            
            try:
                frequency = int(row[4])  # WCount column
            except ValueError:
                frequency = 0
            
            word_entries.append((word, length, frequency))
    
    # Sort by frequency descending and assign ranks
    word_entries.sort(key=lambda x: -x[2])
    
    # Remove duplicates, keeping highest frequency
    seen_words = set()
    unique_word_entries = []
    for word, length, frequency in word_entries:
        if word not in seen_words:
            seen_words.add(word)
            unique_word_entries.append((word, length, frequency))
    
    word_entries = unique_word_entries
    
    char_count = 0
    compound_count = 0
    def_count = 0
    
    print(f"  Processing {len(word_entries)} unique words...")
    
    for rank, (word, length, frequency) in enumerate(word_entries):
        # Insert word entry
        cursor.execute(
            'INSERT INTO words (word, length, frequency, rank) VALUES (?, ?, ?, ?)',
            (word, length, frequency, rank)
        )
        
        # Get definitions from HanziPy
        definitions = get_hanzipy_definitions(word)
        
        if definitions:
            for pinyin, definition, def_rank in definitions:
                cursor.execute(
                    'INSERT INTO word_definitions (word, pinyin, definition, rank) VALUES (?, ?, ?, ?)',
                    (word, pinyin, definition, def_rank)
                )
                def_count += 1
        
        if length == 1:
            char_count += 1
        else:
            compound_count += 1
        
        # Progress indicator
        if rank > 0 and rank % 10000 == 0:
            print(f"    Processed {rank} words...")
    
    print(f"  {len(word_entries)} total words")
    print(f"  {char_count} single characters")
    print(f"  {compound_count} compound words")
    print(f"  {def_count} definitions from HanziPy")
    
    # ========== EXAMPLES TABLE ==========
    print("\n=== Building Examples Table ===")
    
    tatoeba_path = download_tatoeba_db()
    if not tatoeba_path:
        print("  Warning: Could not download Tatoeba database, skipping examples")
    else:
        # Open Tatoeba database
        tatoeba_conn = sqlite3.connect(tatoeba_path)
        tatoeba_cursor = tatoeba_conn.cursor()
        
        # Check table structure
        tatoeba_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = tatoeba_cursor.fetchall()
        print(f"  Tatoeba tables: {[t[0] for t in tables]}")
        
        # Get the table name (might be 'examples' or something else)
        table_name = tables[0][0] if tables else 'examples'
        
        # Check columns
        tatoeba_cursor.execute(f"PRAGMA table_info({table_name})")
        columns = tatoeba_cursor.fetchall()
        col_names = [c[1] for c in columns]
        print(f"  Columns: {col_names}")
        
        # Create examples table in our database
        cursor.execute('''
            CREATE TABLE examples (
                id INTEGER PRIMARY KEY,
                simplified TEXT NOT NULL,
                traditional TEXT,
                pinyin TEXT,
                english TEXT
            )
        ''')
        cursor.execute('CREATE INDEX idx_examples_simplified ON examples(simplified)')
        
        # Copy data from Tatoeba
        # Adjust column selection based on what's available
        if 'traditional' in col_names:
            tatoeba_cursor.execute(f"SELECT id, simplified, traditional, pinyin, english FROM {table_name}")
        else:
            tatoeba_cursor.execute(f"SELECT id, simplified, NULL, pinyin, english FROM {table_name}")
        
        rows = tatoeba_cursor.fetchall()
        cursor.executemany(
            'INSERT INTO examples (id, simplified, traditional, pinyin, english) VALUES (?, ?, ?, ?, ?)',
            rows
        )
        
        example_count = len(rows)
        print(f"  {example_count} example sentences imported")
        
        tatoeba_conn.close()
        os.remove(tatoeba_path)
    
    # Commit and close
    conn.commit()
    
    # Print final stats
    cursor.execute('SELECT COUNT(*) FROM pronunciations')
    pron_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM words')
    word_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM words WHERE length = 1')
    single_char_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM words WHERE length > 1')
    compound_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM examples')
    example_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM word_definitions')
    def_count = cursor.fetchone()[0]
    
    conn.close()
    
    file_size = os.path.getsize(OUTPUT_DB)
    
    print(f"\n=== Database Generated ===")
    print(f"  File: {OUTPUT_DB}")
    print(f"  Size: {file_size / 1024 / 1024:.2f} MB")
    print(f"  Pronunciations: {pron_count} entries")
    print(f"  Words: {word_count} total ({single_char_count} chars, {compound_count} compounds)")
    print(f"  Definitions: {def_count} entries")
    print(f"  Examples: {example_count} sentences")
    
    # Show sample data
    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    
    print("\nSample pronunciations (from corpus frequency):")
    for char in ['着', '了', '得', '长', '行']:
        cursor.execute('SELECT pinyin, frequency FROM pronunciations WHERE character = ? ORDER BY rank', (char,))
        rows = cursor.fetchall()
        if rows:
            pinyins = ', '.join([f"{p}({f})" for p, f in rows])
            print(f"  {char}: {pinyins}")
    
    print("\nSample word definitions (from HanziPy):")
    for word in ['着', '了', '得', '我', '你好']:
        cursor.execute('SELECT pinyin, definition FROM word_definitions WHERE word = ? ORDER BY rank LIMIT 3', (word,))
        rows = cursor.fetchall()
        if rows:
            print(f"  {word}:")
            for pinyin, definition in rows:
                def_short = definition[:50] + '...' if len(definition) > 50 else definition
                print(f"    [{pinyin}] {def_short}")
    
    print("\nTop 10 single characters:")
    cursor.execute("""
        SELECT w.word, wd.pinyin, w.frequency, wd.definition 
        FROM words w 
        LEFT JOIN word_definitions wd ON w.word = wd.word AND wd.rank = 0
        WHERE w.length = 1 
        ORDER BY w.rank LIMIT 10
    """)
    for row in cursor.fetchall():
        def_short = row[3][:30] + '...' if row[3] and len(row[3]) > 30 else (row[3] or 'N/A')
        print(f"  {row[0]} ({row[1] or 'N/A'}) - freq:{row[2]} - {def_short}")
    
    print("\nTop 10 compound words:")
    cursor.execute("""
        SELECT w.word, wd.pinyin, w.frequency, wd.definition 
        FROM words w 
        LEFT JOIN word_definitions wd ON w.word = wd.word AND wd.rank = 0
        WHERE w.length > 1 
        ORDER BY w.rank LIMIT 10
    """)
    for row in cursor.fetchall():
        def_short = row[3][:30] + '...' if row[3] and len(row[3]) > 30 else (row[3] or 'N/A')
        print(f"  {row[0]} ({row[1] or 'N/A'}) - freq:{row[2]} - {def_short}")
    
    print("\nSample examples for '你好':")
    cursor.execute("SELECT simplified, english FROM examples WHERE simplified LIKE '%你好%' LIMIT 3")
    for row in cursor.fetchall():
        print(f"  {row[0]} - {row[1][:50]}...")
    
    conn.close()


if __name__ == '__main__':
    build_database()
