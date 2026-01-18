'use client';

import { useState, useMemo } from 'react';
import { Set } from '@/types';
import defaults from '@/lib/defaults.json';
// import { EmojiPicker } from './EmojiPicker';

// HMM finals - the 13 consolidated final sounds used in the Hanzi Movie Method
const FINALS = [
    '-Ø',       // null final
    '-a',       // tā, nà, dà, mā
    '-ai',      // lái, mǎi, dài, ài
    '-ao',      // hǎo, dào, gāo, zǎo
    '-an',      // sān, nán, kàn, fàn
    '-ang',     // shàng, cháng, dāng, fáng
    '-o',       // wǒ, bō, pō, mō
    '-ong',     // zhōng, dōng, tóng, gōng
    '-ou',      // dōu, zǒu, gǒu, hòu
    '-e',       // hé, gē, lè, dé
    '-(e)i',    // měi, bèi, fēi, gěi
    '-(e)n',    // rén, hěn, shén, mén (en after most, n after i/ü)
    '-(e)ng',   // néng, shēng, míng, tīng (eng after most, ng after i)
];

interface SetFormProps {
    onSubmit: (set: Omit<Set, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    initialData?: Partial<Set>;
    existingSets?: Set[];
}

export function SetForm({ onSubmit, onCancel, initialData, existingSets = [] }: SetFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        final: initialData?.final || '',
        emoji: initialData?.emoji || '',
        imageUrl: initialData?.imageUrl || '',
    });

    // Check if the selected final already exists (excluding the current set being edited)
    const isDuplicateFinal = useMemo(() => {
        if (!formData.final) return false;
        const normalizedFinal = formData.final.toLowerCase();
        return existingSets.some(set => {
            // Skip if this is the set being edited
            if (initialData?.id && set.id === initialData.id) return false;
            return set.final.toLowerCase() === normalizedFinal;
        });
    }, [formData.final, existingSets, initialData?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isDuplicateFinal) return;
        // Always use default description from defaults.json
        const description = defaults.setDescriptions[formData.final as keyof typeof defaults.setDescriptions];
        onSubmit({
            name: formData.name,
            final: formData.final,
            emoji: formData.emoji || undefined,
            description: description || undefined,
            imageUrl: formData.imageUrl || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Set Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="e.g., Mom's House, School, Park"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Final Sound *
                    </label>
                    <select
                        required
                        value={formData.final}
                        onChange={e => setFormData(prev => ({ ...prev, final: e.target.value }))}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white ${isDuplicateFinal ? 'border-red-500' : 'border-slate-600'
                            }`}
                    >
                        <option value="">Select a final...</option>
                        {FINALS.map(final => {
                            const isUsed = existingSets.some(s =>
                                s.final.toLowerCase() === final.toLowerCase() &&
                                (!initialData?.id || s.id !== initialData.id)
                            );
                            return (
                                <option key={final} value={final}>
                                    {final} {isUsed ? '(already assigned)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {isDuplicateFinal && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <span>⚠️</span>
                            This final is already assigned to another set
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Emoji
                    </label>
                    <input
                        type="text"
                        inputMode="none"
                        value={formData.emoji}
                        onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                        onFocus={e => {
                            // Try to show native emoji picker (works on some browsers)
                            if ('showPicker' in HTMLInputElement.prototype) {
                                try { (e.target as HTMLInputElement & { showPicker: () => void }).showPicker(); } catch { }
                            }
                        }}
                        className="w-16 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl cursor-pointer"
                        placeholder="🏠"
                        maxLength={2}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Image URL
                </label>
                <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="https://..."
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={isDuplicateFinal}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${isDuplicateFinal
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                        }`}
                >
                    Save Set
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 bg-slate-700 text-white py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
