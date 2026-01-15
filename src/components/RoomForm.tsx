'use client';

import { useState } from 'react';
import { Room } from '@/types';

interface RoomFormProps {
    initialData?: Room;
    onSubmit: (data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
}

export function RoomForm({ initialData, onSubmit, onCancel }: RoomFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [tone, setTone] = useState(initialData?.tone || 1);
    const [emoji, setEmoji] = useState(initialData?.emoji || '');
    const [description, setDescription] = useState(initialData?.description || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            tone,
            emoji: emoji || undefined,
            description: description || undefined,
        });
    };

    const toneDescriptions: Record<number, string> = {
        1: 'First tone (high level) - ā',
        2: 'Second tone (rising) - á',
        3: 'Third tone (dipping) - ǎ',
        4: 'Fourth tone (falling) - à',
        5: 'Fifth tone (neutral) - a',
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Room Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Living Room, Kitchen, Bathroom..."
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Emoji
                    </label>
                    <input
                        type="text"
                        value={emoji}
                        onChange={e => setEmoji(e.target.value)}
                        placeholder="🛋️"
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-center text-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        maxLength={2}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tone *
                </label>
                <select
                    value={tone}
                    onChange={e => setTone(Number(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                >
                    {[1, 2, 3, 4, 5].map(t => (
                        <option key={t} value={t}>
                            Tone {t} - {toneDescriptions[t]}
                        </option>
                    ))}
                </select>
                <p className="text-slate-400 text-xs mt-1">
                    Each tone should have a consistent room type across all your sets
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe this room and why it represents this tone..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                    {initialData ? 'Update Room' : 'Add Room'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-slate-700 text-white py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
