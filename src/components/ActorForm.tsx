'use client';

import { useState, useMemo } from 'react';
import { Actor } from '@/types';
import defaults from '@/lib/defaults.json';
// import { EmojiPicker } from './EmojiPicker';

// HMM initials grouped by category
const INITIALS_BY_CATEGORY = {
    male: ['b-', 'p-', 'm-', 'f-', 'd-', 't-', 'n-', 'l-', 'g-', 'k-', 'h-', 'zh-', 'ch-', 'sh-', 'r-', 'z-', 'c-', 's-', 'Ø-'],
    female: ['y-', 'bi-', 'pi-', 'mi-', 'di-', 'ti-', 'ji-', 'qi-', 'xi-', 'ni-', 'li-'],
    fictional: ['w-', 'bu-', 'pu-', 'mu-', 'fu-', 'du-', 'tu-', 'nu-', 'lu-', 'zu-', 'cu-', 'su-', 'zhu-', 'chu-', 'shu-', 'ru-', 'ku-', 'hu-', 'gu-'],
    basketball_players: ['yu-', 'nü-', 'lü-', 'ju-', 'qu-', 'xu-'],
};

interface ActorFormProps {
    onSubmit: (actor: Omit<Actor, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    initialData?: Partial<Actor>;
    existingActors?: Actor[];
}

export function ActorForm({ onSubmit, onCancel, initialData, existingActors = [] }: ActorFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        initial: initialData?.initial || '',
        category: initialData?.category || 'male' as 'male' | 'female' | 'fictional' | 'basketball_players',
        emoji: initialData?.emoji || '',
        imageUrl: initialData?.imageUrl || '',
    });

    // Get available initials for the selected category
    const availableInitials = INITIALS_BY_CATEGORY[formData.category] || [];

    // Check if the selected initial already exists (excluding the current actor being edited)
    const isDuplicateInitial = useMemo(() => {
        if (!formData.initial) return false;
        const normalizedInitial = formData.initial.toLowerCase();
        return existingActors.some(actor => {
            // Skip if this is the actor being edited
            if (initialData?.id && actor.id === initialData.id) return false;
            // Check for duplicate - include Ø- (null initial) in the check
            return actor.initial.toLowerCase() === normalizedInitial;
        });
    }, [formData.initial, existingActors, initialData?.id]);

    // When category changes, reset initial if it's not valid for the new category
    const handleCategoryChange = (newCategory: 'male' | 'female' | 'fictional' | 'basketball_players') => {
        const newInitials = INITIALS_BY_CATEGORY[newCategory];
        const currentInitialValid = newInitials.includes(formData.initial);
        setFormData(prev => ({
            ...prev,
            category: newCategory,
            initial: currentInitialValid ? prev.initial : '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isDuplicateInitial) return;
        // Always use default description from defaults.json
        const description = defaults.actorDescriptions[formData.initial as keyof typeof defaults.actorDescriptions];
        onSubmit({
            name: formData.name,
            initial: formData.initial,
            category: formData.category,
            emoji: formData.emoji || undefined,
            description: description || undefined,
            imageUrl: formData.imageUrl || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Actor Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="e.g., Brad Pitt"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Category *
                    </label>
                    <select
                        required
                        value={formData.category}
                        onChange={e => handleCategoryChange(e.target.value as 'male' | 'female' | 'fictional' | 'basketball_players')}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                        <option value="male">Male (basic initials)</option>
                        <option value="female">Female (i- initials)</option>
                        <option value="fictional">Fictional (u- initials)</option>
                        <option value="basketball_players">Basketball Players (ü- initials)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Initial Sound *
                    </label>
                    <select
                        required
                        value={formData.initial}
                        onChange={e => setFormData(prev => ({ ...prev, initial: e.target.value }))}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white ${isDuplicateInitial ? 'border-red-500' : 'border-slate-600'
                            }`}
                    >
                        <option value="">Select an initial...</option>
                        {availableInitials.map(initial => {
                            const isUsed = existingActors.some(a =>
                                a.initial.toLowerCase() === initial.toLowerCase() &&
                                (!initialData?.id || a.id !== initialData.id)
                            );
                            return (
                                <option key={initial} value={initial}>
                                    {initial} {isUsed ? '(already assigned)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {isDuplicateInitial && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <span>⚠️</span>
                            This initial is already assigned to another actor
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
                        placeholder="🎬"
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
                    disabled={isDuplicateInitial}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${isDuplicateInitial
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                        }`}
                >
                    Save Actor
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
