'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Common emoji categories for HMM
// Skin tone modifiers: 🏻 🏼 🏽 🏾 🏿
const SKIN_TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];

// Helper to generate skin tone variants for an emoji
const withSkinTones = (emoji: string): string[] => SKIN_TONES.map(tone => emoji + tone);

const EMOJI_CATEGORIES = {
    'People': [
        ...withSkinTones('👨'), ...withSkinTones('👩'), ...withSkinTones('🧑'),
        ...withSkinTones('👴'), ...withSkinTones('👵'), ...withSkinTones('👶'),
        ...withSkinTones('🧒'), ...withSkinTones('👦'), ...withSkinTones('👧'),
        ...withSkinTones('🧔'), ...withSkinTones('👱'), ...withSkinTones('👸'),
        ...withSkinTones('🤴'), ...withSkinTones('🦸'), ...withSkinTones('🦹'),
        ...withSkinTones('🧙'), ...withSkinTones('🧚'), ...withSkinTones('🧛'),
        ...withSkinTones('🧜'), ...withSkinTones('🧝'), '🧞', '🧟',
        ...withSkinTones('🎅'), ...withSkinTones('🤶'),
        ...withSkinTones('🧑‍🎄'), ...withSkinTones('🧑‍🎓'), ...withSkinTones('👨‍🎓'), ...withSkinTones('👩‍🎓'),
        ...withSkinTones('🧑‍🏫'), ...withSkinTones('👨‍🏫'), ...withSkinTones('👩‍🏫'),
        ...withSkinTones('🧑‍🍳'), ...withSkinTones('👨‍🍳'), ...withSkinTones('👩‍🍳'),
        ...withSkinTones('🧑‍🔧'), ...withSkinTones('👨‍🔧'), ...withSkinTones('👩‍🔧'),
        ...withSkinTones('🧑‍🚀'), ...withSkinTones('👨‍🚀'), ...withSkinTones('👩‍🚀'),
        ...withSkinTones('🧑‍⚕️'), ...withSkinTones('👨‍⚕️'), ...withSkinTones('👩‍⚕️'),
        '💀', '👻', '👽', '🤖', '👹', '👺', '👿', '😈'
    ],
    'Hands': [
        ...withSkinTones('👋'), ...withSkinTones('🤚'), ...withSkinTones('🖐️'),
        ...withSkinTones('✋'), ...withSkinTones('🖖'), ...withSkinTones('🫱'),
        ...withSkinTones('🫲'), ...withSkinTones('🫳'), ...withSkinTones('🫴'),
        ...withSkinTones('👌'), ...withSkinTones('🤌'), ...withSkinTones('🤏'),
        ...withSkinTones('✌️'), ...withSkinTones('🤞'), ...withSkinTones('🫰'),
        ...withSkinTones('🤟'), ...withSkinTones('🤘'), ...withSkinTones('🤙'),
        ...withSkinTones('👈'), ...withSkinTones('👉'), ...withSkinTones('👆'),
        ...withSkinTones('🖕'), ...withSkinTones('👇'), ...withSkinTones('☝️'),
        ...withSkinTones('🫵'), ...withSkinTones('👍'), ...withSkinTones('👎'),
        ...withSkinTones('✊'), ...withSkinTones('👊'), ...withSkinTones('🤛'),
        ...withSkinTones('🤜'), ...withSkinTones('👏'), ...withSkinTones('🙌'),
        ...withSkinTones('🫶'), ...withSkinTones('👐'), ...withSkinTones('🤲'),
        ...withSkinTones('🤝'), ...withSkinTones('🙏'), ...withSkinTones('✍️'),
        ...withSkinTones('💅'), ...withSkinTones('🤳'), ...withSkinTones('💪'),
        ...withSkinTones('🦵'), ...withSkinTones('🦶'), ...withSkinTones('👂'),
        ...withSkinTones('🦻'), ...withSkinTones('👃'), ...withSkinTones('👁️'),
        '👀', '👅', '👄', '🫦', '🧠', '🫀', '🫁', '🦷', '🦴'
    ],
    'Faces': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '💩', '🤡', '👾'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐉', '🐲'],
    'Nature': ['🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚', '🪨', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️'],
    'Food': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
    'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
    'Travel': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'],
    'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
};

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
    placeholder?: string;
}

export function EmojiPicker({ value, onChange, placeholder = '🎯' }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('People');
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Calculate position and open picker
    const openPicker = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const pickerHeight = 350;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < pickerHeight && spaceAbove > spaceBelow) {
                setPosition({
                    top: rect.top - pickerHeight - 8,
                    left: rect.left,
                });
            } else {
                setPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                });
            }
        }
        setIsOpen(true);
    };

    const closePicker = () => {
        setIsOpen(false);
        setPosition(null);
    };

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                pickerRef.current && !pickerRef.current.contains(target)
            ) {
                closePicker();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter emojis based on search
    const filteredEmojis = search
        ? Object.values(EMOJI_CATEGORIES).flat().filter(emoji => emoji.includes(search))
        : EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || [];

    const handleSelect = (emoji: string) => {
        onChange(emoji);
        closePicker();
        setSearch('');
    };

    // Picker dropdown content - only render when position is calculated
    const pickerContent = isOpen && position && (
        <div
            ref={pickerRef}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 9999,
            }}
            className="w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden"
        >
            {/* Search */}
            <div className="p-2 border-b border-slate-700">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search emojis..."
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                />
            </div>

            {/* Category Tabs */}
            {!search && (
                <div className="flex overflow-x-auto border-b border-slate-700 px-1 py-1 gap-1 scrollbar-thin">
                    {Object.keys(EMOJI_CATEGORIES).map(category => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory(category)}
                            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${activeCategory === category
                                    ? 'bg-amber-500 text-slate-900 font-medium'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Grid */}
            <div className="p-2 h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                        <button
                            key={`${emoji}-${index}`}
                            type="button"
                            onClick={() => handleSelect(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-700 rounded transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                {filteredEmojis.length === 0 && (
                    <div className="text-slate-400 text-sm text-center py-4">
                        No emojis found
                    </div>
                )}
            </div>

            {/* Clear Button */}
            {value && (
                <div className="p-2 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={() => handleSelect('')}
                        className="w-full px-3 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                        Clear emoji
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => isOpen ? closePicker() : openPicker()}
                className="w-16 h-10 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl hover:bg-slate-600 transition-colors flex items-center justify-center"
            >
                {value || <span className="text-slate-400 text-lg">{placeholder}</span>}
            </button>

            {/* Render picker in portal to escape modal overflow */}
            {typeof document !== 'undefined' && createPortal(pickerContent, document.body)}
        </div>
    );
}
