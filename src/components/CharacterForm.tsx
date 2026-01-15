'use client';

import { useState } from 'react';
import { Character, Actor, Room, Set, Prop } from '@/types';

interface CharacterFormProps {
    actors: Actor[];
    rooms: Room[];
    sets: Set[];
    props: Prop[];
    onSubmit: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'learned' | 'reviewed'>) => void;
    onCancel: () => void;
    initialData?: Partial<Character>;
}

export function CharacterForm({ actors, rooms, sets, props, onSubmit, onCancel, initialData }: CharacterFormProps) {
    const [formData, setFormData] = useState({
        hanzi: initialData?.hanzi || '',
        pinyin: initialData?.pinyin || '',
        meaning: initialData?.meaning || '',
        actorId: initialData?.actorId || '',
        roomId: initialData?.roomId || '',
        setId: initialData?.setId || '',
        props: initialData?.props || [] as string[],
        movieScene: initialData?.movieScene || '',
        keyword: initialData?.keyword || '',
        notes: initialData?.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const toggleProp = (propId: string) => {
        setFormData(prev => ({
            ...prev,
            props: prev.props.includes(propId)
                ? prev.props.filter(id => id !== propId)
                : [...prev.props, propId],
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Character (汉字) *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.hanzi}
                        onChange={e => setFormData(prev => ({ ...prev, hanzi: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-2xl text-center"
                        placeholder="字"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Pinyin *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.pinyin}
                        onChange={e => setFormData(prev => ({ ...prev, pinyin: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="zì"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Meaning *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.meaning}
                        onChange={e => setFormData(prev => ({ ...prev, meaning: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="character, word"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Keyword
                    </label>
                    <input
                        type="text"
                        value={formData.keyword}
                        onChange={e => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="Primary keyword"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Actor (Initial Sound)
                    </label>
                    <select
                        value={formData.actorId}
                        onChange={e => setFormData(prev => ({ ...prev, actorId: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                        <option value="">Select an actor...</option>
                        {actors.map(actor => (
                            <option key={actor.id} value={actor.id}>
                                {actor.name} ({actor.initial})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Room (Tone)
                    </label>
                    <select
                        value={formData.roomId}
                        onChange={e => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                        <option value="">Select a room...</option>
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>
                                {room.name} (Tone {room.tone})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Set (Final Sound)
                    </label>
                    <select
                        value={formData.setId}
                        onChange={e => setFormData(prev => ({ ...prev, setId: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                        <option value="">Select a set...</option>
                        {sets.map(set => (
                            <option key={set.id} value={set.id}>
                                {set.name} ({set.final})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Props (Character Components)
                </label>
                <div className="flex flex-wrap gap-2">
                    {props.length === 0 ? (
                        <p className="text-slate-500 text-sm">No props available. Add props first.</p>
                    ) : (
                        props.map(prop => (
                            <button
                                key={prop.id}
                                type="button"
                                onClick={() => toggleProp(prop.id)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.props.includes(prop.id)
                                    ? 'bg-amber-500 text-slate-900'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {prop.name} ({prop.component})
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Movie Scene *
                </label>
                <textarea
                    required
                    value={formData.movieScene}
                    onChange={e => setFormData(prev => ({ ...prev, movieScene: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-32"
                    placeholder="Describe the vivid movie scene that helps you remember this character..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-20"
                    placeholder="Additional notes..."
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="flex-1 bg-amber-500 text-slate-900 py-2 rounded-lg font-medium hover:bg-amber-400 transition-colors"
                >
                    Save Character
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
