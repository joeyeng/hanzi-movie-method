"""
HanziPy Server - Provides Chinese character lookup via REST API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import os

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

# Common multi-pronunciation characters with their most frequent readings ranked first
# Based on modern Mandarin usage frequency
PRONUNCIATION_FREQUENCY = {
    # 着: zhe (aspect particle) is most common, then zháo (touch/ignite), zhuó (wear), zhāo (move in chess)
    '着': ['zhe', 'zháo', 'zhuó', 'zhāo'],
    # 了: le (aspect particle) more common than liǎo (to finish/understand)
    '了': ['le', 'liǎo'],
    # 得: de (structural particle) most common, then dé (obtain), děi (must)
    '得': ['de', 'dé', 'děi'],
    # 地: de (adverbial particle) and dì (earth/ground) both very common
    '地': ['dì', 'de'],
    # 还: hái (still) more common than huán (return)
    '还': ['hái', 'huán'],
    # 为: wèi (for/because) slightly more common than wéi (to be/act as)
    '为': ['wèi', 'wéi'],
    # 长: cháng (long) more common than zhǎng (grow/chief)
    '长': ['cháng', 'zhǎng'],
    # 行: xíng (walk/ok) more common than háng (row/profession)
    '行': ['xíng', 'háng'],
    # 种: zhǒng (seed/type) more common than zhòng (to plant)
    '种': ['zhǒng', 'zhòng'],
    # 重: zhòng (heavy/important) more common than chóng (repeat/layer)
    '重': ['zhòng', 'chóng'],
    # 数: shù (number) more common than shǔ (to count)
    '数': ['shù', 'shǔ'],
    # 相: xiāng (mutual) more common than xiàng (appearance/photo)
    '相': ['xiāng', 'xiàng'],
    # 觉: jué (feel/sense) more common than jiào (sleep)
    '觉': ['jué', 'jiào'],
    # 发: fā (emit/send) more common than fà (hair) in modern usage
    '发': ['fā', 'fà'],
    # 只: zhǐ (only) more common than zhī (measure word)
    '只': ['zhǐ', 'zhī'],
    # 都: dōu (all) more common than dū (capital city)
    '都': ['dōu', 'dū'],
    # 没: méi (not have) more common than mò (sink/submerge)
    '没': ['méi', 'mò'],
    # 分: fēn (divide/minute) more common than fèn (portion)
    '分': ['fēn', 'fèn'],
    # 会: huì (can/meeting) more common than kuài (accounting)
    '会': ['huì', 'kuài'],
    # 教: jiāo (teach) and jiào (religion/teaching) both common
    '教': ['jiāo', 'jiào'],
    # 应: yīng (should) more common than yìng (respond)
    '应': ['yīng', 'yìng'],
    # 间: jiān (between/room) more common than jiàn (gap)
    '间': ['jiān', 'jiàn'],
    # 难: nán (difficult) more common than nàn (disaster)
    '难': ['nán', 'nàn'],
    # 干: gàn (do/work) more common than gān (dry)
    '干': ['gàn', 'gān'],
    # 空: kōng (empty) more common than kòng (free time)
    '空': ['kōng', 'kòng'],
    # 好: hǎo (good) more common than hào (to like)
    '好': ['hǎo', 'hào'],
    # 当: dāng (when/should) more common than dàng (treat as)
    '当': ['dāng', 'dàng'],
    # 乐: lè (happy) more common than yuè (music)
    '乐': ['lè', 'yuè'],
    # 少: shǎo (few) more common than shào (young)
    '少': ['shǎo', 'shào'],
    # 强: qiáng (strong) more common than qiǎng (force) or jiàng (stubborn)
    '强': ['qiáng', 'qiǎng', 'jiàng'],
    # 传: chuán (pass/transmit) more common than zhuàn (biography)
    '传': ['chuán', 'zhuàn'],
    # 处: chù (place) more common than chǔ (handle)
    '处': ['chù', 'chǔ'],
    # 参: cān (participate) more common than shēn (ginseng)
    '参': ['cān', 'shēn'],
    # 藏: cáng (hide) more common than zàng (Tibet/storehouse)
    '藏': ['cáng', 'zàng'],
    # 调: tiáo (adjust) and diào (transfer/tone) both common
    '调': ['tiáo', 'diào'],
    # 便: biàn (convenient) more common than pián (cheap)
    '便': ['biàn', 'pián'],
    # 差: chà (differ/bad) more common than chāi (dispatch) or cī (uneven)
    '差': ['chà', 'chāi', 'cī'],
    # 朝: cháo (dynasty/toward) more common than zhāo (morning)
    '朝': ['cháo', 'zhāo'],
    # 称: chēng (call/weigh) more common than chèn (suitable)
    '称': ['chēng', 'chèn'],
    # 盛: shèng (flourishing) more common than chéng (fill)
    '盛': ['shèng', 'chéng'],
    # 累: lèi (tired) more common than léi (accumulate) or lěi (involve)
    '累': ['lèi', 'léi', 'lěi'],
    # 量: liàng (quantity) more common than liáng (measure)
    '量': ['liàng', 'liáng'],
    # 率: lǜ (rate) more common than shuài (lead)
    '率': ['lǜ', 'shuài'],
    # 落: luò (fall) more common than là (leave behind) or lào (colloquial)
    '落': ['luò', 'là', 'lào'],
    # 模: mó (model) more common than mú (mold)
    '模': ['mó', 'mú'],
    # 切: qiē (cut) more common than qiè (close/eager)
    '切': ['qiē', 'qiè'],
    # 曾: céng (once) more common than zēng (great-grand)
    '曾': ['céng', 'zēng'],
    # 占: zhàn (occupy) more common than zhān (divine)
    '占': ['zhàn', 'zhān'],
    # 折: zhé (fold/break) more common than shé (break even) or zhē (turning)
    '折': ['zhé', 'shé', 'zhē'],
    # 正: zhèng (correct) more common than zhēng (first month)
    '正': ['zhèng', 'zhēng'],
    # 中: zhōng (middle) more common than zhòng (hit target)
    '中': ['zhōng', 'zhòng'],
    # 转: zhuǎn (turn) more common than zhuàn (revolve)
    '转': ['zhuǎn', 'zhuàn'],
    # 恶: è (evil) more common than wù (hate) or ě (nausea)
    '恶': ['è', 'wù', 'ě'],
    # 和: hé (and) more common than huò (mix) or hè (respond in singing)
    '和': ['hé', 'huò', 'hè'],
    # 假: jiǎ (fake) more common than jià (vacation)
    '假': ['jiǎ', 'jià'],
    # 降: jiàng (descend) more common than xiáng (surrender)
    '降': ['jiàng', 'xiáng'],
    # 尽: jìn (exhaust) more common than jǐn (to the greatest extent)
    '尽': ['jìn', 'jǐn'],
    # 禁: jìn (prohibit) more common than jīn (endure)
    '禁': ['jìn', 'jīn'],
    # 角: jiǎo (angle/corner) more common than jué (role/actor)
    '角': ['jiǎo', 'jué'],
    # 解: jiě (solve) more common than jiè (escort) or xiè (surname)
    '解': ['jiě', 'jiè', 'xiè'],
    # 结: jié (tie/result) more common than jiē (bear fruit)
    '结': ['jié', 'jiē'],
    # 供: gōng (supply) more common than gòng (offerings)
    '供': ['gōng', 'gòng'],
    # 更: gèng (more) more common than gēng (change)
    '更': ['gèng', 'gēng'],
    # 奇: qí (strange) more common than jī (odd number)
    '奇': ['qí', 'jī'],
    # 期: qī (period) - single pronunciation, included for completeness
    # 塞: sāi (stuff/stopper) more common than sè (strategic pass) or sài (frontier)
    '塞': ['sāi', 'sè', 'sài'],
    # 省: shěng (province/save) more common than xǐng (reflect)
    '省': ['shěng', 'xǐng'],
    # 识: shí (know) more common than zhì (mark)
    '识': ['shí', 'zhì'],
    # 似: sì (similar) more common than shì (as if - in 似的)
    '似': ['sì', 'shì'],
    # 宿: sù (stay overnight) more common than xiǔ (night) or xiù (constellation)
    '宿': ['sù', 'xiǔ', 'xiù'],
    # 血: xuè (blood) more common than xiě (colloquial blood)
    '血': ['xuè', 'xiě'],
    # 要: yào (want/important) more common than yāo (demand)
    '要': ['yào', 'yāo'],
    # 与: yǔ (and/with) more common than yù (participate)
    '与': ['yǔ', 'yù'],
    # 语: yǔ (language) more common than yù (tell)
    '语': ['yǔ', 'yù'],
    # 载: zài (carry) more common than zǎi (record/year)
    '载': ['zài', 'zǎi'],
    # 作: zuò (do/work) more common than zuō (workshop)
    '作': ['zuò', 'zuō'],
}

def normalize_pinyin_for_comparison(pinyin: str) -> str:
    """Remove tone marks from pinyin for comparison"""
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
    return result

def get_pronunciation_rank(char: str, pinyin: str) -> int:
    """
    Get the frequency rank for a character's pronunciation.
    Lower number = more common pronunciation.
    """
    if char not in PRONUNCIATION_FREQUENCY:
        return 0  # No ranking available, treat as first
    
    freq_list = PRONUNCIATION_FREQUENCY[char]
    normalized = normalize_pinyin_for_comparison(pinyin)
    
    for i, common_pinyin in enumerate(freq_list):
        if normalize_pinyin_for_comparison(common_pinyin) == normalized:
            return i
    
    return len(freq_list)  # Unknown pronunciation, rank after known ones


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
            # Sort definitions by frequency and type
            def definition_sort_key(d):
                d_pinyin = d.get('pinyin', '')
                if isinstance(d_pinyin, list):
                    d_pinyin = ' '.join(d_pinyin)
                d_pinyin = convert_pinyin_tone_number_to_mark(d_pinyin)
                
                definition_lower = d.get('definition', '').lower().strip()
                
                # Get frequency rank (0 = most common)
                freq_rank = get_pronunciation_rank(char, d_pinyin)
                
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
            
            # Get the primary (most common) definition
            primary_def = sorted_definitions[0]
            pinyin = primary_def.get('pinyin', '')
            definition = primary_def.get('definition', '')
            
            # Format pinyin (may be a list)
            if isinstance(pinyin, list):
                pinyin = ' '.join(pinyin)
            
            # Convert tone numbers to tone marks
            pinyin = convert_pinyin_tone_number_to_mark(pinyin)
            
            # Convert all definitions pinyin to tone marks
            all_defs_converted = []
            for d in sorted_definitions:
                d_pinyin = d.get('pinyin', '')
                if isinstance(d_pinyin, list):
                    d_pinyin = ' '.join(d_pinyin)
                all_defs_converted.append({
                    'pinyin': convert_pinyin_tone_number_to_mark(d_pinyin),
                    'definition': d.get('definition', '')
                })
            
            return jsonify({
                'character': char,
                'pinyin': pinyin,
                'definition': definition,
                'found': True,
                'all_definitions': all_defs_converted
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
                
                # Sort definitions by:
                # 1. Frequency rank (most common pronunciation first)
                # 2. Type (regular > abbr > variant > surname)
                def definition_sort_key(d):
                    d_pinyin = d.get('pinyin', '')
                    if isinstance(d_pinyin, list):
                        d_pinyin = ' '.join(d_pinyin)
                    d_pinyin = convert_pinyin_tone_number_to_mark(d_pinyin)
                    
                    definition_lower = d.get('definition', '').lower().strip()
                    
                    # Get frequency rank (0 = most common)
                    freq_rank = get_pronunciation_rank(char, d_pinyin)
                    
                    # Type penalties (added to frequency rank)
                    type_penalty = 0
                    
                    # Surnames always last
                    if 'surname' in definition_lower:
                        type_penalty = 300
                    # Variants second-to-last
                    elif 'variant of' in definition_lower or 'variant' in definition_lower.split('/')[0]:
                        type_penalty = 200
                    # Abbreviations third-to-last
                    elif 'abbr.' in definition_lower or 'abbr ' in definition_lower or definition_lower.startswith('abbr'):
                        type_penalty = 100
                    
                    return (freq_rank * 10) + type_penalty
                
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
    port = int(os.environ.get('PORT', 5000))
    print(f"HanziPy available: {HANZIPY_AVAILABLE}")
    print(f"Starting HanziPy server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
