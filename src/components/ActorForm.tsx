'use client';

import { useState } from 'react';
import { Actor } from '@/types';

interface ActorFormProps {
    onSubmit: (actor: Omit<Actor, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    initialData?: Partial<Actor>;
}

export function ActorForm({ onSubmit, onCancel, initialData }: ActorFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        initial: initialData?.initial || '',
        emoji: initialData?.emoji || '',
        description: initialData?.description || '',
        imageUrl: initialData?.imageUrl || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name: formData.name,
            initial: formData.initial,
            emoji: formData.emoji || undefined,
            description: formData.description || undefined,
            imageUrl: formData.imageUrl || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4">
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
                        placeholder="e.g., Jackie Chan"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Initial Sound *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.initial}
                        onChange={e => setFormData(prev => ({ ...prev, initial: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="e.g., j-"
                    />
                    <p className="text-xs text-slate-500 mt-1">The pinyin initial this actor represents</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Emoji
                    </label>
                    <input
                        type="text"
                        value={formData.emoji}
                        onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                        className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl"
                        placeholder="🥋"
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

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-20"
                    placeholder="Why you chose this actor, memorable traits..."
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
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
