// CC-CEDICT Dictionary Lookup
// This module provides functionality to look up Chinese characters using the CC-CEDICT dictionary

export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

// CC-CEDICT online API endpoint (using a public mirror)
const CEDICT_API_URL = 'https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=';

// Local cache to avoid repeated lookups
const cedictCache = new Map<string, CedictEntry | null>();

/**
 * Parse pinyin with tone numbers to tone marks
 * e.g., "zhong1" -> "zhōng"
 */
export function pinyinNumbersToMarks(pinyinWithNumbers: string): string {
  const toneMarks: Record<string, string[]> = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'], // v is sometimes used for ü
  };

  // Split into syllables (each ends with a tone number 1-5 or no number)
  const syllables = pinyinWithNumbers.toLowerCase().split(/(?<=[1-5])\s*/);
  
  return syllables.map(syllable => {
    // Extract tone number (1-5, default to 5 for neutral)
    const toneMatch = syllable.match(/([1-5])$/);
    const tone = toneMatch ? parseInt(toneMatch[1]) : 5;
    const base = syllable.replace(/[1-5]$/, '');
    
    // Replace 'v' with 'ü' first
    let result = base.replace(/v/g, 'ü');
    
    // Find the vowel to add tone mark to
    // Rules: a and e always get the tone mark
    // In "ou", o gets the mark
    // Otherwise, the second vowel gets the mark
    const vowels = ['a', 'e', 'i', 'o', 'u', 'ü'];
    
    if (result.includes('a')) {
      result = result.replace('a', toneMarks['a'][tone - 1]);
    } else if (result.includes('e')) {
      result = result.replace('e', toneMarks['e'][tone - 1]);
    } else if (result.includes('ou')) {
      result = result.replace('o', toneMarks['o'][tone - 1]);
    } else {
      // Find the last vowel
      for (let i = result.length - 1; i >= 0; i--) {
        const char = result[i];
        if (vowels.includes(char) && toneMarks[char]) {
          result = result.slice(0, i) + toneMarks[char][tone - 1] + result.slice(i + 1);
          break;
        }
      }
    }
    
    return result;
  }).join(' ');
}

/**
 * Common characters dictionary for offline lookup
 * This covers the most common HSK 1-3 characters
 */
const commonCharacters: Record<string, { pinyin: string; definition: string }> = {
  // HSK 1 - Basic characters
  '我': { pinyin: 'wǒ', definition: 'I; me; my' },
  '你': { pinyin: 'nǐ', definition: 'you' },
  '他': { pinyin: 'tā', definition: 'he; him' },
  '她': { pinyin: 'tā', definition: 'she; her' },
  '它': { pinyin: 'tā', definition: 'it' },
  '们': { pinyin: 'men', definition: 'plural marker for pronouns' },
  '的': { pinyin: 'de', definition: 'possessive particle; of' },
  '是': { pinyin: 'shì', definition: 'to be; is; am; are' },
  '不': { pinyin: 'bù', definition: 'not; no' },
  '在': { pinyin: 'zài', definition: 'at; in; to be present' },
  '有': { pinyin: 'yǒu', definition: 'to have; there is' },
  '这': { pinyin: 'zhè', definition: 'this' },
  '那': { pinyin: 'nà', definition: 'that' },
  '人': { pinyin: 'rén', definition: 'person; people' },
  '一': { pinyin: 'yī', definition: 'one; 1' },
  '二': { pinyin: 'èr', definition: 'two; 2' },
  '三': { pinyin: 'sān', definition: 'three; 3' },
  '四': { pinyin: 'sì', definition: 'four; 4' },
  '五': { pinyin: 'wǔ', definition: 'five; 5' },
  '六': { pinyin: 'liù', definition: 'six; 6' },
  '七': { pinyin: 'qī', definition: 'seven; 7' },
  '八': { pinyin: 'bā', definition: 'eight; 8' },
  '九': { pinyin: 'jiǔ', definition: 'nine; 9' },
  '十': { pinyin: 'shí', definition: 'ten; 10' },
  '百': { pinyin: 'bǎi', definition: 'hundred; 100' },
  '千': { pinyin: 'qiān', definition: 'thousand; 1000' },
  '万': { pinyin: 'wàn', definition: 'ten thousand; 10000' },
  '个': { pinyin: 'gè', definition: 'general measure word' },
  '大': { pinyin: 'dà', definition: 'big; large' },
  '小': { pinyin: 'xiǎo', definition: 'small; little' },
  '多': { pinyin: 'duō', definition: 'many; much; more' },
  '少': { pinyin: 'shǎo', definition: 'few; little; less' },
  '好': { pinyin: 'hǎo', definition: 'good; well' },
  '坏': { pinyin: 'huài', definition: 'bad; broken' },
  '男': { pinyin: 'nán', definition: 'male; man' },
  '女': { pinyin: 'nǚ', definition: 'female; woman' },
  '子': { pinyin: 'zǐ', definition: 'child; son; seed' },
  '日': { pinyin: 'rì', definition: 'sun; day' },
  '月': { pinyin: 'yuè', definition: 'moon; month' },
  '年': { pinyin: 'nián', definition: 'year' },
  '天': { pinyin: 'tiān', definition: 'sky; day; heaven' },
  '今': { pinyin: 'jīn', definition: 'today; now; present' },
  '明': { pinyin: 'míng', definition: 'bright; clear; tomorrow' },
  '时': { pinyin: 'shí', definition: 'time; hour' },
  '分': { pinyin: 'fēn', definition: 'minute; divide; part' },
  '点': { pinyin: 'diǎn', definition: "point; o'clock; dot" },
  '上': { pinyin: 'shàng', definition: 'up; above; on' },
  '下': { pinyin: 'xià', definition: 'down; below; under' },
  '前': { pinyin: 'qián', definition: 'front; before; ago' },
  '后': { pinyin: 'hòu', definition: 'back; behind; after' },
  '左': { pinyin: 'zuǒ', definition: 'left' },
  '右': { pinyin: 'yòu', definition: 'right' },
  '里': { pinyin: 'lǐ', definition: 'inside; inner; village' },
  '外': { pinyin: 'wài', definition: 'outside; outer; foreign' },
  '中': { pinyin: 'zhōng', definition: 'middle; center; China' },
  '东': { pinyin: 'dōng', definition: 'east' },
  '西': { pinyin: 'xī', definition: 'west' },
  '南': { pinyin: 'nán', definition: 'south' },
  '北': { pinyin: 'běi', definition: 'north' },
  '家': { pinyin: 'jiā', definition: 'home; family' },
  '国': { pinyin: 'guó', definition: 'country; nation' },
  '学': { pinyin: 'xué', definition: 'to learn; study' },
  '校': { pinyin: 'xiào', definition: 'school' },
  '生': { pinyin: 'shēng', definition: 'to be born; life; raw' },
  '老': { pinyin: 'lǎo', definition: 'old; aged' },
  '师': { pinyin: 'shī', definition: 'teacher; master' },
  '朋': { pinyin: 'péng', definition: 'friend' },
  '友': { pinyin: 'yǒu', definition: 'friend' },
  '爸': { pinyin: 'bà', definition: 'father; dad' },
  '妈': { pinyin: 'mā', definition: 'mother; mom' },
  '哥': { pinyin: 'gē', definition: 'older brother' },
  '姐': { pinyin: 'jiě', definition: 'older sister' },
  '弟': { pinyin: 'dì', definition: 'younger brother' },
  '妹': { pinyin: 'mèi', definition: 'younger sister' },
  '儿': { pinyin: 'ér', definition: 'son; child' },
  '书': { pinyin: 'shū', definition: 'book' },
  '本': { pinyin: 'běn', definition: 'root; origin; this' },
  '字': { pinyin: 'zì', definition: 'character; word' },
  '文': { pinyin: 'wén', definition: 'writing; language; culture' },
  '言': { pinyin: 'yán', definition: 'speech; word; to say' },
  '话': { pinyin: 'huà', definition: 'speech; talk; words' },
  '说': { pinyin: 'shuō', definition: 'to speak; to say' },
  '听': { pinyin: 'tīng', definition: 'to listen; to hear' },
  '读': { pinyin: 'dú', definition: 'to read; to study' },
  '写': { pinyin: 'xiě', definition: 'to write' },
  '看': { pinyin: 'kàn', definition: 'to see; to look; to watch' },
  '见': { pinyin: 'jiàn', definition: 'to see; to meet' },
  '想': { pinyin: 'xiǎng', definition: 'to think; to want; to miss' },
  '知': { pinyin: 'zhī', definition: 'to know' },
  '道': { pinyin: 'dào', definition: 'way; road; to say' },
  '会': { pinyin: 'huì', definition: 'can; will; meeting' },
  '能': { pinyin: 'néng', definition: 'can; able to' },
  '要': { pinyin: 'yào', definition: 'to want; will; need' },
  '可': { pinyin: 'kě', definition: 'can; may; able' },
  '以': { pinyin: 'yǐ', definition: 'by means of; in order to' },
  '来': { pinyin: 'lái', definition: 'to come' },
  '去': { pinyin: 'qù', definition: 'to go' },
  '出': { pinyin: 'chū', definition: 'to go out; to come out' },
  '入': { pinyin: 'rù', definition: 'to enter' },
  '回': { pinyin: 'huí', definition: 'to return; to answer' },
  '走': { pinyin: 'zǒu', definition: 'to walk; to go' },
  '坐': { pinyin: 'zuò', definition: 'to sit' },
  '站': { pinyin: 'zhàn', definition: 'to stand; station' },
  '开': { pinyin: 'kāi', definition: 'to open; to start' },
  '关': { pinyin: 'guān', definition: 'to close; to turn off' },
  '住': { pinyin: 'zhù', definition: 'to live; to stay' },
  '做': { pinyin: 'zuò', definition: 'to do; to make' },
  '作': { pinyin: 'zuò', definition: 'to do; to make; work' },
  '工': { pinyin: 'gōng', definition: 'work; labor' },
  '吃': { pinyin: 'chī', definition: 'to eat' },
  '喝': { pinyin: 'hē', definition: 'to drink' },
  '睡': { pinyin: 'shuì', definition: 'to sleep' },
  '觉': { pinyin: 'jué', definition: 'to feel; sense' },
  '买': { pinyin: 'mǎi', definition: 'to buy' },
  '卖': { pinyin: 'mài', definition: 'to sell' },
  '钱': { pinyin: 'qián', definition: 'money' },
  '块': { pinyin: 'kuài', definition: 'piece; yuan' },
  '元': { pinyin: 'yuán', definition: 'yuan; dollar' },
  '水': { pinyin: 'shuǐ', definition: 'water' },
  '火': { pinyin: 'huǒ', definition: 'fire' },
  '土': { pinyin: 'tǔ', definition: 'earth; soil' },
  '木': { pinyin: 'mù', definition: 'wood; tree' },
  '金': { pinyin: 'jīn', definition: 'gold; metal' },
  '山': { pinyin: 'shān', definition: 'mountain' },
  '河': { pinyin: 'hé', definition: 'river' },
  '海': { pinyin: 'hǎi', definition: 'sea; ocean' },
  '花': { pinyin: 'huā', definition: 'flower' },
  '草': { pinyin: 'cǎo', definition: 'grass' },
  '树': { pinyin: 'shù', definition: 'tree' },
  '鸟': { pinyin: 'niǎo', definition: 'bird' },
  '鱼': { pinyin: 'yú', definition: 'fish' },
  '狗': { pinyin: 'gǒu', definition: 'dog' },
  '猫': { pinyin: 'māo', definition: 'cat' },
  '马': { pinyin: 'mǎ', definition: 'horse' },
  '牛': { pinyin: 'niú', definition: 'cow; ox' },
  '羊': { pinyin: 'yáng', definition: 'sheep; goat' },
  '猪': { pinyin: 'zhū', definition: 'pig' },
  '鸡': { pinyin: 'jī', definition: 'chicken' },
  '虫': { pinyin: 'chóng', definition: 'insect; bug' },
  '手': { pinyin: 'shǒu', definition: 'hand' },
  '足': { pinyin: 'zú', definition: 'foot; enough' },
  '口': { pinyin: 'kǒu', definition: 'mouth; opening' },
  '目': { pinyin: 'mù', definition: 'eye' },
  '耳': { pinyin: 'ěr', definition: 'ear' },
  '心': { pinyin: 'xīn', definition: 'heart; mind' },
  '头': { pinyin: 'tóu', definition: 'head' },
  '身': { pinyin: 'shēn', definition: 'body' },
  '面': { pinyin: 'miàn', definition: 'face; surface; noodles' },
  '眼': { pinyin: 'yǎn', definition: 'eye' },
  '脸': { pinyin: 'liǎn', definition: 'face' },
  '白': { pinyin: 'bái', definition: 'white; blank' },
  '黑': { pinyin: 'hēi', definition: 'black; dark' },
  '红': { pinyin: 'hóng', definition: 'red' },
  '黄': { pinyin: 'huáng', definition: 'yellow' },
  '蓝': { pinyin: 'lán', definition: 'blue' },
  '绿': { pinyin: 'lǜ', definition: 'green' },
  '长': { pinyin: 'cháng', definition: 'long; length' },
  '短': { pinyin: 'duǎn', definition: 'short; brief' },
  '高': { pinyin: 'gāo', definition: 'tall; high' },
  '低': { pinyin: 'dī', definition: 'low; below' },
  '快': { pinyin: 'kuài', definition: 'fast; quick' },
  '慢': { pinyin: 'màn', definition: 'slow' },
  '新': { pinyin: 'xīn', definition: 'new' },
  '旧': { pinyin: 'jiù', definition: 'old; used' },
  '对': { pinyin: 'duì', definition: 'right; correct; towards' },
  '错': { pinyin: 'cuò', definition: 'wrong; mistake' },
  '热': { pinyin: 'rè', definition: 'hot; heat' },
  '冷': { pinyin: 'lěng', definition: 'cold' },
  '爱': { pinyin: 'ài', definition: 'love; to love' },
  '很': { pinyin: 'hěn', definition: 'very; quite' },
  '太': { pinyin: 'tài', definition: 'too; very' },
  '都': { pinyin: 'dōu', definition: 'all; both' },
  '也': { pinyin: 'yě', definition: 'also; too' },
  '还': { pinyin: 'hái', definition: 'still; yet; also' },
  '就': { pinyin: 'jiù', definition: 'then; just' },
  '只': { pinyin: 'zhǐ', definition: 'only; just' },
  '和': { pinyin: 'hé', definition: 'and; with' },
  '但': { pinyin: 'dàn', definition: 'but; however' },
  '或': { pinyin: 'huò', definition: 'or; perhaps' },
  '如': { pinyin: 'rú', definition: 'if; like; as' },
  '果': { pinyin: 'guǒ', definition: 'fruit; result' },
  '因': { pinyin: 'yīn', definition: 'cause; because' },
  '为': { pinyin: 'wèi', definition: 'for; because; to do' },
  '什': { pinyin: 'shén', definition: 'what' },
  '么': { pinyin: 'me', definition: 'interrogative particle' },
  '谁': { pinyin: 'shuí', definition: 'who; whom' },
  '哪': { pinyin: 'nǎ', definition: 'which; where' },
  '几': { pinyin: 'jǐ', definition: 'how many; several' },
  '怎': { pinyin: 'zěn', definition: 'how; why' },
  '样': { pinyin: 'yàng', definition: 'manner; appearance' },
  '吗': { pinyin: 'ma', definition: 'question particle' },
  '呢': { pinyin: 'ne', definition: 'question particle' },
  '了': { pinyin: 'le', definition: 'perfective aspect particle' },
  '着': { pinyin: 'zhe', definition: 'continuous aspect particle' },
  '过': { pinyin: 'guò', definition: 'to pass; experiential particle' },
  '得': { pinyin: 'de', definition: 'structural particle' },
  '地': { pinyin: 'dì', definition: 'earth; ground' },
  '车': { pinyin: 'chē', definition: 'car; vehicle' },
  '飞': { pinyin: 'fēi', definition: 'to fly' },
  '机': { pinyin: 'jī', definition: 'machine; airplane' },
  '船': { pinyin: 'chuán', definition: 'ship; boat' },
  '路': { pinyin: 'lù', definition: 'road; path' },
  '门': { pinyin: 'mén', definition: 'door; gate' },
  '窗': { pinyin: 'chuāng', definition: 'window' },
  '桌': { pinyin: 'zhuō', definition: 'table; desk' },
  '椅': { pinyin: 'yǐ', definition: 'chair' },
  '床': { pinyin: 'chuáng', definition: 'bed' },
  '电': { pinyin: 'diàn', definition: 'electricity; lightning' },
  '视': { pinyin: 'shì', definition: 'to look at; vision' },
  '脑': { pinyin: 'nǎo', definition: 'brain' },
  '网': { pinyin: 'wǎng', definition: 'net; network' },
  '食': { pinyin: 'shí', definition: 'food; to eat' },
  '饭': { pinyin: 'fàn', definition: 'rice; meal' },
  '菜': { pinyin: 'cài', definition: 'vegetable; dish' },
  '肉': { pinyin: 'ròu', definition: 'meat; flesh' },
  '米': { pinyin: 'mǐ', definition: 'rice; meter' },
  '茶': { pinyin: 'chá', definition: 'tea' },
  '酒': { pinyin: 'jiǔ', definition: 'wine; alcohol' },
  '衣': { pinyin: 'yī', definition: 'clothing' },
  '服': { pinyin: 'fú', definition: 'clothes; to serve' },
  '裤': { pinyin: 'kù', definition: 'pants; trousers' },
  '鞋': { pinyin: 'xié', definition: 'shoes' },
  '帽': { pinyin: 'mào', definition: 'hat; cap' },
  '包': { pinyin: 'bāo', definition: 'bag; package' },
  '表': { pinyin: 'biǎo', definition: 'watch; table; surface' },
  '伞': { pinyin: 'sǎn', definition: 'umbrella' },
  '气': { pinyin: 'qì', definition: 'air; gas; breath' },
  '风': { pinyin: 'fēng', definition: 'wind' },
  '雨': { pinyin: 'yǔ', definition: 'rain' },
  '雪': { pinyin: 'xuě', definition: 'snow' },
  '云': { pinyin: 'yún', definition: 'cloud' },
  '星': { pinyin: 'xīng', definition: 'star' },
  '春': { pinyin: 'chūn', definition: 'spring (season)' },
  '夏': { pinyin: 'xià', definition: 'summer' },
  '秋': { pinyin: 'qiū', definition: 'autumn; fall' },
  '冬': { pinyin: 'dōng', definition: 'winter' },
  '早': { pinyin: 'zǎo', definition: 'early; morning' },
  '晚': { pinyin: 'wǎn', definition: 'late; evening' },
  '午': { pinyin: 'wǔ', definition: 'noon; midday' },
  '先': { pinyin: 'xiān', definition: 'first; before' },
  '再': { pinyin: 'zài', definition: 'again' },
  '次': { pinyin: 'cì', definition: 'time; occurrence' },
  '每': { pinyin: 'měi', definition: 'every; each' },
  '常': { pinyin: 'cháng', definition: 'often; common' },
  '问': { pinyin: 'wèn', definition: 'to ask' },
  '答': { pinyin: 'dá', definition: 'to answer' },
  '给': { pinyin: 'gěi', definition: 'to give' },
  '拿': { pinyin: 'ná', definition: 'to take; to hold' },
  '用': { pinyin: 'yòng', definition: 'to use' },
  '打': { pinyin: 'dǎ', definition: 'to hit; to play' },
  '放': { pinyin: 'fàng', definition: 'to put; to release' },
  '找': { pinyin: 'zhǎo', definition: 'to look for; to find' },
  '让': { pinyin: 'ràng', definition: 'to let; to allow' },
  '帮': { pinyin: 'bāng', definition: 'to help' },
  '教': { pinyin: 'jiāo', definition: 'to teach' },
  '习': { pinyin: 'xí', definition: 'to practice; habit' },
  '试': { pinyin: 'shì', definition: 'to try; to test' },
  '考': { pinyin: 'kǎo', definition: 'to test; exam' },
  '完': { pinyin: 'wán', definition: 'to finish; complete' },
  '始': { pinyin: 'shǐ', definition: 'to begin; start' },
  '玩': { pinyin: 'wán', definition: 'to play; to have fun' },
  '乐': { pinyin: 'lè', definition: 'happy; joy; music' },
  '笑': { pinyin: 'xiào', definition: 'to laugh; to smile' },
  '哭': { pinyin: 'kū', definition: 'to cry; to weep' },
  '怕': { pinyin: 'pà', definition: 'to fear; afraid' },
  '喜': { pinyin: 'xǐ', definition: 'happy; to like' },
  '欢': { pinyin: 'huān', definition: 'happy; joyful' },
  '忙': { pinyin: 'máng', definition: 'busy' },
  '累': { pinyin: 'lèi', definition: 'tired; weary' },
  '病': { pinyin: 'bìng', definition: 'sick; illness' },
  '药': { pinyin: 'yào', definition: 'medicine; drug' },
  '医': { pinyin: 'yī', definition: 'doctor; medicine' },
  '院': { pinyin: 'yuàn', definition: 'courtyard; institution' },
  '事': { pinyin: 'shì', definition: 'matter; thing; affair' },
  '情': { pinyin: 'qíng', definition: 'feeling; emotion; situation' },
  '意': { pinyin: 'yì', definition: 'meaning; idea; intention' },
  '思': { pinyin: 'sī', definition: 'to think; thought' },
  '同': { pinyin: 'tóng', definition: 'same; together' },
  '别': { pinyin: 'bié', definition: "don't; other; to separate" },
  '第': { pinyin: 'dì', definition: 'ordinal prefix' },
  '所': { pinyin: 'suǒ', definition: 'place; that which' },
  '然': { pinyin: 'rán', definition: 'so; like this' },
  '经': { pinyin: 'jīng', definition: 'to pass through; classic' },
  '已': { pinyin: 'yǐ', definition: 'already' },
  '正': { pinyin: 'zhèng', definition: 'just; right; straight' },
  '比': { pinyin: 'bǐ', definition: 'to compare' },
  '真': { pinyin: 'zhēn', definition: 'true; real' },
  '假': { pinyin: 'jiǎ', definition: 'false; fake; vacation' },
  '全': { pinyin: 'quán', definition: 'whole; complete; all' },
  '部': { pinyin: 'bù', definition: 'part; section; ministry' },
  '半': { pinyin: 'bàn', definition: 'half' },
  '自': { pinyin: 'zì', definition: 'self; from' },
  '己': { pinyin: 'jǐ', definition: 'self; oneself' },
  '当': { pinyin: 'dāng', definition: 'to act as; when' },
  '从': { pinyin: 'cóng', definition: 'from; to follow' },
  '向': { pinyin: 'xiàng', definition: 'towards; direction' },
  '往': { pinyin: 'wǎng', definition: 'towards; to go' },
  '到': { pinyin: 'dào', definition: 'to arrive; to reach' },
  '离': { pinyin: 'lí', definition: 'to leave; from' },
  '近': { pinyin: 'jìn', definition: 'near; close' },
  '远': { pinyin: 'yuǎn', definition: 'far; distant' },
  '更': { pinyin: 'gèng', definition: 'more; even more' },
  '最': { pinyin: 'zuì', definition: 'most; -est' },
  '些': { pinyin: 'xiē', definition: 'some; a few' },
  '把': { pinyin: 'bǎ', definition: 'to hold; disposal particle' },
  '被': { pinyin: 'bèi', definition: 'passive particle; by' },
  '必': { pinyin: 'bì', definition: 'must; certainly' },
  '须': { pinyin: 'xū', definition: 'must; need' },
  '该': { pinyin: 'gāi', definition: 'should; ought to' },
  '应': { pinyin: 'yīng', definition: 'should; ought' },
  '刚': { pinyin: 'gāng', definition: 'just; barely' },
  '才': { pinyin: 'cái', definition: 'just now; only' },
  '非': { pinyin: 'fēi', definition: 'not; non-' },
  '无': { pinyin: 'wú', definition: 'not have; without' },
  '像': { pinyin: 'xiàng', definition: 'to resemble; image' },
  '跟': { pinyin: 'gēn', definition: 'with; to follow' },
  '起': { pinyin: 'qǐ', definition: 'to rise; to start' },
  '成': { pinyin: 'chéng', definition: 'to become; to complete' },
  '变': { pinyin: 'biàn', definition: 'to change' },
  '死': { pinyin: 'sǐ', definition: 'to die; death' },
  '活': { pinyin: 'huó', definition: 'to live; alive' },
  '动': { pinyin: 'dòng', definition: 'to move; action' },
  '静': { pinyin: 'jìng', definition: 'quiet; still' },
  '送': { pinyin: 'sòng', definition: 'to send; to give' },
  '接': { pinyin: 'jiē', definition: 'to receive; to connect' },
  '等': { pinyin: 'děng', definition: 'to wait; equal' },
  '带': { pinyin: 'dài', definition: 'to bring; belt' },
  '穿': { pinyin: 'chuān', definition: 'to wear; to pass through' },
  '戴': { pinyin: 'dài', definition: 'to wear (accessories)' },
  '洗': { pinyin: 'xǐ', definition: 'to wash' },
  '换': { pinyin: 'huàn', definition: 'to change; to exchange' },
  '运': { pinyin: 'yùn', definition: 'to transport; luck' },
  '步': { pinyin: 'bù', definition: 'step; pace' },
  '跑': { pinyin: 'pǎo', definition: 'to run' },
  '游': { pinyin: 'yóu', definition: 'to swim; to travel' },
  '泳': { pinyin: 'yǒng', definition: 'to swim' },
  '跳': { pinyin: 'tiào', definition: 'to jump; to dance' },
  '舞': { pinyin: 'wǔ', definition: 'to dance; dance' },
  '唱': { pinyin: 'chàng', definition: 'to sing' },
  '歌': { pinyin: 'gē', definition: 'song' },
  '画': { pinyin: 'huà', definition: 'to draw; painting' },
  '影': { pinyin: 'yǐng', definition: 'shadow; movie' },
  '音': { pinyin: 'yīn', definition: 'sound; tone' },
  '报': { pinyin: 'bào', definition: 'newspaper; to report' },
  '纸': { pinyin: 'zhǐ', definition: 'paper' },
  '笔': { pinyin: 'bǐ', definition: 'pen; brush' },
  '信': { pinyin: 'xìn', definition: 'letter; to believe' },
  '件': { pinyin: 'jiàn', definition: 'item; piece' },
  '张': { pinyin: 'zhāng', definition: 'measure word for flat objects' },
  '位': { pinyin: 'wèi', definition: 'position; measure word for people' },
  '层': { pinyin: 'céng', definition: 'layer; floor' },
  '间': { pinyin: 'jiān', definition: 'room; between' },
  '房': { pinyin: 'fáng', definition: 'house; room' },
  '店': { pinyin: 'diàn', definition: 'shop; store' },
  '馆': { pinyin: 'guǎn', definition: 'hall; building' },
  '场': { pinyin: 'chǎng', definition: 'field; place' },
  '城': { pinyin: 'chéng', definition: 'city; town' },
  '市': { pinyin: 'shì', definition: 'city; market' },
  '区': { pinyin: 'qū', definition: 'district; area' },
  '街': { pinyin: 'jiē', definition: 'street' },
  '公': { pinyin: 'gōng', definition: 'public; fair' },
  '司': { pinyin: 'sī', definition: 'department; to manage' },
  '社': { pinyin: 'shè', definition: 'society; organization' },
  '办': { pinyin: 'bàn', definition: 'to do; to handle' },
  '处': { pinyin: 'chù', definition: 'place; department' },
};

/**
 * Look up a single Chinese character in the local dictionary
 */
export function lookupCharacter(hanzi: string): CedictEntry | null {
  // Check cache first
  if (cedictCache.has(hanzi)) {
    return cedictCache.get(hanzi) || null;
  }

  // Try local dictionary
  const localEntry = commonCharacters[hanzi];
  if (localEntry) {
    const entry: CedictEntry = {
      traditional: hanzi,
      simplified: hanzi,
      pinyin: localEntry.pinyin,
      definitions: [localEntry.definition],
    };
    cedictCache.set(hanzi, entry);
    return entry;
  }

  return null;
}

/**
 * Look up multiple Chinese characters
 */
export function lookupCharacters(characters: string[]): Map<string, CedictEntry | null> {
  const results = new Map<string, CedictEntry | null>();
  
  for (const char of characters) {
    results.set(char, lookupCharacter(char));
  }
  
  return results;
}

/**
 * Split a string into individual Chinese characters
 * Filters out non-Chinese characters
 */
export function splitIntoCharacters(text: string): string[] {
  // Unicode range for CJK Unified Ideographs
  const chineseCharRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
  const matches = text.match(chineseCharRegex);
  return matches ? [...new Set(matches)] : []; // Remove duplicates
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
 * Parse a plain text file containing Chinese characters
 * Returns unique characters with their dictionary lookups
 */
export function parseCharacterFile(content: string): Array<{
  hanzi: string;
  pinyin: string | null;
  definition: string | null;
  found: boolean;
}> {
  // Split by lines and collect all unique Chinese characters
  const lines = content.split(/\r?\n/);
  const allCharacters: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Split each line into individual characters
    const chars = splitIntoCharacters(trimmed);
    allCharacters.push(...chars);
  }
  
  // Remove duplicates while preserving order
  const uniqueCharacters = [...new Set(allCharacters)];
  
  // Look up each character
  return uniqueCharacters.map(hanzi => {
    const entry = lookupCharacter(hanzi);
    return {
      hanzi,
      pinyin: entry?.pinyin || null,
      definition: entry?.definitions.join('; ') || null,
      found: !!entry,
    };
  });
}
