"""
Build pronunciation frequency data from SUBTLEX-CH corpus.
This script extracts character-pinyin frequency mappings from the SUBTLEX-CH word frequency list.
"""

import os
import re
from collections import defaultdict

def tone_number_to_diacritic(pinyin: str) -> str:
    """
    Convert pinyin with tone numbers to tone diacritics.
    e.g., 'wo3' -> 'wǒ', 'lv4' -> 'lǜ'
    Returns original string if conversion fails.
    """
    if not pinyin or not re.match(r'^[a-züA-ZÜ]+[1-5]?$', pinyin, re.IGNORECASE):
        return pinyin
    
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
        return pinyin
    
    base = match.group(1).lower()
    tone = int(match.group(2)) - 1 if match.group(2) else 4  # Default to neutral (5)
    
    # Find which vowel gets the tone mark
    # Rules: 
    # 1. 'a' or 'e' always get the mark
    # 2. In 'ou', 'o' gets the mark
    # 3. Otherwise, the last vowel gets the mark
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
        vowels = 'aeiouü'
        for i in range(len(base) - 1, -1, -1):
            if base[i] in vowels:
                char = base[i]
                return base[:i] + tone_marks[char][tone] + base[i+1:]
    
    return base

def normalize_pinyin(pinyin: str) -> str:
    """Normalize pinyin for comparison (lowercase, strip tone numbers)"""
    # Remove tone numbers
    result = re.sub(r'[1-5]', '', pinyin.lower().strip())
    # Normalize ü representations
    result = result.replace('v', 'ü').replace('u:', 'ü')
    return result

def extract_tone(pinyin: str) -> int:
    """Extract tone number from pinyin (returns 5 for neutral/no tone)"""
    match = re.search(r'([1-5])$', pinyin)
    return int(match.group(1)) if match else 5

def parse_subtlex_file(filepath: str) -> dict:
    """
    Parse SUBTLEX-CH file and build character-pinyin frequency mapping.
    Uses compound word pronunciations to determine actual frequency of each reading.
    
    Returns dict: {character: {pinyin: total_frequency}}
    """
    char_pinyin_freq = defaultdict(lambda: defaultdict(int))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        # Skip header line
        header = f.readline()
        
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) < 5:
                continue
            
            word = parts[0]
            length = int(parts[1]) if parts[1].isdigit() else len(word)
            pinyin_with_tones = parts[2]  # Contains tone numbers like "de5/di2/di4" or "wo3 men5"
            freq = int(parts[4]) if parts[4].isdigit() else 0
            
            if freq == 0 or not word:
                continue
            
            # Skip single characters - we'll infer their frequencies from compound words
            # This gives us more accurate pronunciation frequencies
            if length == 1:
                continue
            
            # Multi-character word - split pinyin by spaces
            # Handle cases like "wo3 men5" for 我们
            syllables = pinyin_with_tones.split()
            chars = list(word)
            
            # Remove any slashes in syllables (take first variant)
            syllables = [s.split('/')[0].lower() for s in syllables]
            
            # Skip if syllables don't match character count
            if len(syllables) != len(chars):
                continue
            
            # Skip entries with # (unknown/noise)
            if any('#' in s for s in syllables):
                continue
                
            for char, syl in zip(chars, syllables):
                if '\u4e00' <= char <= '\u9fff':  # Is Chinese character
                    # Normalize: remove capitalization 
                    syl_normalized = syl.lower().strip()
                    if syl_normalized and syl_normalized != '#':
                        char_pinyin_freq[char][syl_normalized] += freq
    
    return char_pinyin_freq

def build_frequency_ranking(char_pinyin_freq: dict) -> dict:
    """
    Build a ranking of pronunciations for each character.
    
    Returns dict: {character: [(pinyin, frequency), ...]} sorted by frequency descending
    """
    rankings = {}
    
    for char, pinyin_freqs in char_pinyin_freq.items():
        # Sort by frequency (descending)
        sorted_pinyins = sorted(pinyin_freqs.items(), key=lambda x: -x[1])
        rankings[char] = sorted_pinyins
    
    return rankings

def generate_python_dict(rankings: dict, output_file: str, min_freq_ratio: float = 0.01):
    """
    Generate a Python file with pronunciation frequency data.
    Only includes characters with multiple pronunciations.
    
    min_freq_ratio: minimum frequency ratio to include a pronunciation (filters noise)
    """
    multi_pron_chars = {}
    
    for char, pinyins in rankings.items():
        if len(pinyins) > 1:
            total_freq = sum(f for _, f in pinyins)
            # Filter out very rare pronunciations (noise)
            significant_pinyins = [
                (p, f) for p, f in pinyins 
                if f / total_freq >= min_freq_ratio or f == pinyins[0][1]
            ]
            if len(significant_pinyins) > 1:
                multi_pron_chars[char] = significant_pinyins
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('"""\n')
        f.write('Pronunciation frequency data extracted from SUBTLEX-CH corpus.\n')
        f.write('Format: {character: [(pinyin, frequency), ...]}\n')
        f.write('Pronunciations are sorted by frequency (most common first).\n')
        f.write('Generated from SUBTLEX-CH word frequency database.\n')
        f.write('"""\n\n')
        f.write('# Character -> [(pinyin, frequency), ...] sorted by frequency\n')
        f.write('PRONUNCIATION_FREQUENCY = {\n')
        
        for char in sorted(multi_pron_chars.keys()):
            pinyins = multi_pron_chars[char]
            # Convert tone numbers to diacritics
            pinyin_list = ', '.join(f'("{tone_number_to_diacritic(p)}", {freq})' for p, freq in pinyins)
            f.write(f'    "{char}": [{pinyin_list}],\n')
        
        f.write('}\n')
    
    print(f"Generated {output_file} with {len(multi_pron_chars)} multi-pronunciation characters")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    subtlex_file = os.path.join(script_dir, 'subtlex_data', 'SUBTLEX_CH_131210_CE.utf8')
    output_file = os.path.join(script_dir, 'frequency_data.py')
    
    if not os.path.exists(subtlex_file):
        print(f"Error: SUBTLEX file not found at {subtlex_file}")
        return
    
    print("Parsing SUBTLEX-CH file...")
    char_pinyin_freq = parse_subtlex_file(subtlex_file)
    print(f"Found {len(char_pinyin_freq)} unique characters")
    
    print("Building frequency rankings...")
    rankings = build_frequency_ranking(char_pinyin_freq)
    
    print("Generating Python frequency data...")
    generate_python_dict(rankings, output_file)
    
    # Show some examples
    print("\nExample multi-pronunciation characters:")
    examples = ['着', '了', '得', '还', '为', '长', '行']
    for char in examples:
        if char in rankings:
            pinyins = rankings[char][:5]  # Top 5
            print(f"  {char}: {pinyins}")

if __name__ == '__main__':
    main()
