"""
HanziPy Server - Provides Chinese character lookup via REST API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js to call this API

# Try to import hanzipy
try:
    from hanzipy.decomposer import HanziDecomposer
    from hanzipy.dictionary import HanziDictionary
    decomposer = HanziDecomposer()
    dictionary = HanziDictionary()
    HANZIPY_AVAILABLE = True
except ImportError:
    HANZIPY_AVAILABLE = False
    decomposer = None
    dictionary = None

# Try to import jieba for word segmentation
try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False


def convert_pinyin_tone_number_to_mark(pinyin: str) -> str:
    """
    Convert pinyin with tone numbers to tone marks.
    e.g., 'wo3' -> 'wǒ', 'ni3 hao3' -> 'nǐ hǎo'
    """
    tone_marks = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
        'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],  # v is sometimes used for ü
    }
    
    def convert_syllable(syllable: str) -> str:
        # Extract tone number (1-5) from the end
        match = re.match(r'([a-zA-Züv]+)([1-5])?', syllable)
        if not match:
            return syllable
        
        base = match.group(1).lower()
        tone = int(match.group(2)) if match.group(2) else 5
        
        # Replace 'v' with 'ü'
        base = base.replace('v', 'ü')
        
        # Find the vowel to add tone mark to
        # Rules: a and e always get the tone mark
        # In "ou", o gets the mark
        # Otherwise, the last vowel gets the mark
        result = base
        
        if 'a' in base:
            result = base.replace('a', tone_marks['a'][tone - 1], 1)
        elif 'e' in base:
            result = base.replace('e', tone_marks['e'][tone - 1], 1)
        elif 'ou' in base:
            result = base.replace('o', tone_marks['o'][tone - 1], 1)
        else:
            # Find the last vowel
            vowels = 'iouü'
            for i in range(len(base) - 1, -1, -1):
                if base[i] in vowels:
                    char = base[i]
                    if char in tone_marks:
                        result = base[:i] + tone_marks[char][tone - 1] + base[i+1:]
                    break
        
        return result
    
    # Split by spaces and convert each syllable
    syllables = pinyin.split()
    converted = [convert_syllable(s) for s in syllables]
    return ' '.join(converted)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'hanzipy_available': HANZIPY_AVAILABLE,
        'jieba_available': JIEBA_AVAILABLE
    })


def is_chinese_char(char):
    """Check if a character is a Chinese character"""
    code = ord(char)
    # CJK Unified Ideographs (most common)
    if 0x4e00 <= code <= 0x9fff:
        return True
    # CJK Unified Ideographs Extension A
    if 0x3400 <= code <= 0x4dbf:
        return True
    return False


@app.route('/segment', methods=['POST'])
def segment_text():
    """
    Segment Chinese text into words using jieba
    Request body: { "text": "我喜欢学习中文" }
    Response: { "words": ["我", "喜欢", "学习", "中文"], "compounds": ["喜欢", "学习", "中文"] }
    
    Returns all segmented words and filters compounds (2+ characters)
    """
    if not JIEBA_AVAILABLE:
        return jsonify({'error': 'Jieba not installed'}), 500
    
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text parameter'}), 400
    
    text = data['text']
    
    try:
        # Use jieba to segment the text
        words = list(jieba.cut(text, cut_all=False))
        
        # Filter to only Chinese words (remove punctuation, spaces, etc.)
        chinese_words = []
        for word in words:
            # Check if word contains only Chinese characters
            if word and all(is_chinese_char(c) for c in word):
                chinese_words.append(word)
        
        # Extract compounds (2+ characters)
        compounds = [w for w in chinese_words if len(w) >= 2]
        
        # Remove duplicates while preserving order
        seen_words = set()
        unique_words = []
        for w in chinese_words:
            if w not in seen_words:
                seen_words.add(w)
                unique_words.append(w)
        
        seen_compounds = set()
        unique_compounds = []
        for w in compounds:
            if w not in seen_compounds:
                seen_compounds.add(w)
                unique_compounds.append(w)
        
        return jsonify({
            'words': unique_words,
            'compounds': unique_compounds
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/lookup', methods=['POST'])
def lookup_character():
    """
    Look up a single Chinese character
    Request body: { "character": "我" }
    Response: { "character": "我", "pinyin": "wǒ", "definition": "I; me", "found": true }
    """
    if not HANZIPY_AVAILABLE:
        return jsonify({'error': 'HanziPy not installed'}), 500
    
    data = request.get_json()
    if not data or 'character' not in data:
        return jsonify({'error': 'Missing character parameter'}), 400
    
    char = data['character']
    
    try:
        # Use HanziPy dictionary to look up the character
        definitions = dictionary.definition_lookup(char)
        
        if definitions and len(definitions) > 0:
            # Get the first definition entry
            entry = definitions[0]
            pinyin = entry.get('pinyin', '')
            definition = entry.get('definition', '')
            
            # Format pinyin (may be a list)
            if isinstance(pinyin, list):
                pinyin = ' '.join(pinyin)
            
            # Convert tone numbers to tone marks
            pinyin = convert_pinyin_tone_number_to_mark(pinyin)
            
            return jsonify({
                'character': char,
                'pinyin': pinyin,
                'definition': definition,
                'found': True,
                'all_definitions': definitions
            })
        else:
            return jsonify({
                'character': char,
                'pinyin': None,
                'definition': None,
                'found': False
            })
    except Exception as e:
        return jsonify({
            'character': char,
            'pinyin': None,
            'definition': None,
            'found': False,
            'error': str(e)
        })


@app.route('/lookup/batch', methods=['POST'])
def lookup_characters_batch():
    """
    Look up multiple Chinese characters at once
    Request body: { "characters": ["我", "你", "他"] }
    Response: { "results": [...] }
    """
    if not HANZIPY_AVAILABLE:
        return jsonify({'error': 'HanziPy not installed'}), 500
    
    data = request.get_json()
    if not data or 'characters' not in data:
        return jsonify({'error': 'Missing characters parameter'}), 400
    
    characters = data['characters']
    if not isinstance(characters, list):
        return jsonify({'error': 'Characters must be a list'}), 400
    
    results = []
    for char in characters:
        try:
            definitions = dictionary.definition_lookup(char)
            
            if definitions and len(definitions) > 0:
                entry = definitions[0]
                pinyin = entry.get('pinyin', '')
                definition = entry.get('definition', '')
                
                if isinstance(pinyin, list):
                    pinyin = ' '.join(pinyin)
                
                # Convert tone numbers to tone marks
                pinyin = convert_pinyin_tone_number_to_mark(pinyin)
                
                # Sort definitions: surnames last, variants second-to-last, abbr third-to-last
                def definition_sort_key(d):
                    definition_lower = d.get('definition', '').lower().strip()
                    
                    # Surnames always last
                    if 'surname' in definition_lower:
                        return 3
                    
                    # Variants second-to-last
                    if 'variant of' in definition_lower or 'variant' in definition_lower.split('/')[0]:
                        return 2
                    
                    # Abbreviations third-to-last
                    if 'abbr.' in definition_lower or 'abbr ' in definition_lower or definition_lower.startswith('abbr'):
                        return 1
                    
                    return 0  # Regular definitions first
                
                sorted_definitions = sorted(definitions, key=definition_sort_key)
                
                # Convert all pinyin in definitions to tone marks
                all_defs_converted = []
                for d in sorted_definitions:
                    d_pinyin = d.get('pinyin', '')
                    if isinstance(d_pinyin, list):
                        d_pinyin = ' '.join(d_pinyin)
                    all_defs_converted.append({
                        'pinyin': convert_pinyin_tone_number_to_mark(d_pinyin),
                        'definition': d.get('definition', '')
                    })
                
                # Use the first non-surname definition as primary
                primary_def = sorted_definitions[0]
                primary_pinyin = primary_def.get('pinyin', '')
                if isinstance(primary_pinyin, list):
                    primary_pinyin = ' '.join(primary_pinyin)
                primary_pinyin = convert_pinyin_tone_number_to_mark(primary_pinyin)
                
                results.append({
                    'character': char,
                    'pinyin': primary_pinyin,
                    'definition': primary_def.get('definition', ''),
                    'found': True,
                    'all_definitions': all_defs_converted
                })
            else:
                results.append({
                    'character': char,
                    'pinyin': None,
                    'definition': None,
                    'found': False
                })
        except Exception as e:
            results.append({
                'character': char,
                'pinyin': None,
                'definition': None,
                'found': False,
                'error': str(e)
            })
    
    return jsonify({'results': results})


@app.route('/decompose', methods=['POST'])
def decompose_character():
    """
    Decompose a Chinese character into its components
    Request body: { "character": "我" }
    Response: { "character": "我", "components": [...] }
    """
    if not HANZIPY_AVAILABLE:
        return jsonify({'error': 'HanziPy not installed'}), 500
    
    data = request.get_json()
    if not data or 'character' not in data:
        return jsonify({'error': 'Missing character parameter'}), 400
    
    char = data['character']
    
    try:
        # Decompose the character
        decomposition = decomposer.decompose(char)
        
        return jsonify({
            'character': char,
            'decomposition': decomposition
        })
    except Exception as e:
        return jsonify({
            'character': char,
            'error': str(e)
        })


@app.route('/decompose/batch', methods=['POST'])
def decompose_characters_batch():
    """
    Decompose multiple Chinese characters into their components
    Request body: { "characters": ["我", "你"] }
    Response: { "results": [{ "character": "我", "components": [...] }, ...] }
    """
    if not HANZIPY_AVAILABLE:
        return jsonify({'error': 'HanziPy not installed'}), 500
    
    data = request.get_json()
    if not data or 'characters' not in data:
        return jsonify({'error': 'Missing characters parameter'}), 400
    
    characters = data['characters']
    if not isinstance(characters, list):
        return jsonify({'error': 'Characters must be a list'}), 400
    
    results = []
    for char in characters:
        try:
            # Decompose the character
            decomposition = decomposer.decompose(char)
            
            # Extract unique component characters from 'once' and 'radical' keys
            # (excluding the character itself)
            components = []
            seen = set()
            
            if decomposition:
                # Combine 'once' (immediate components) and 'radical' keys
                component_chars = []
                if 'once' in decomposition:
                    component_chars.extend(decomposition['once'])
                if 'radical' in decomposition:
                    component_chars.extend(decomposition['radical'])
                
                for comp in component_chars:
                    # Skip if it's the same as the character, already seen, or a radical stroke
                    if comp and comp != char and comp not in seen and len(comp) == 1 and ord(comp) >= 0x4e00:
                        seen.add(comp)
                        # Look up the component's definitions (all of them)
                        comp_def = None
                        comp_pinyin = None
                        all_defs = []
                        try:
                            comp_defs = dictionary.definition_lookup(comp)
                            if comp_defs and len(comp_defs) > 0:
                                # Sort definitions: surnames last, variants second-to-last, abbr third-to-last
                                def definition_sort_key(d):
                                    definition_lower = d.get('definition', '').lower().strip()
                                    if 'surname' in definition_lower:
                                        return 3
                                    if 'variant of' in definition_lower or 'variant' in definition_lower.split('/')[0]:
                                        return 2
                                    if 'abbr.' in definition_lower or 'abbr ' in definition_lower or definition_lower.startswith('abbr'):
                                        return 1
                                    return 0
                                
                                sorted_defs = sorted(comp_defs, key=definition_sort_key)
                                
                                # Convert all definitions with proper pinyin
                                for d in sorted_defs:
                                    d_pinyin = d.get('pinyin', '')
                                    if isinstance(d_pinyin, list):
                                        d_pinyin = ' '.join(d_pinyin)
                                    all_defs.append({
                                        'pinyin': convert_pinyin_tone_number_to_mark(d_pinyin),
                                        'definition': d.get('definition', '')
                                    })
                                
                                # Primary is first sorted definition
                                comp_pinyin = all_defs[0]['pinyin'] if all_defs else None
                                comp_def = all_defs[0]['definition'] if all_defs else None
                        except:
                            pass
                        
                        components.append({
                            'character': comp,
                            'pinyin': comp_pinyin,
                            'definition': comp_def,
                            'all_definitions': all_defs
                        })
            
            results.append({
                'character': char,
                'components': components,
                'decomposition': decomposition
            })
        except Exception as e:
            results.append({
                'character': char,
                'components': [],
                'error': str(e)
            })
    
    return jsonify({'results': results})


if __name__ == '__main__':
    print(f"HanziPy available: {HANZIPY_AVAILABLE}")
    print("Starting HanziPy server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
