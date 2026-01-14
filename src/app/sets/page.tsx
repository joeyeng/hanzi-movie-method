'use client';

import { useState } from 'react';
import { useSets } from '@/hooks/useLocalStorage';
import { SetForm } from '@/components/SetForm';
import { Set } from '@/types';

export default function SetsPage() {
    const { sets, loading, add, update, remove } = useSets();
    const [showForm, setShowForm] = useState(false);
    const [editingSet, setEditingSet] = useState<Set | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSets = sets.filter(set =>
        set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.final.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = (data: Omit<Set, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingSet) {
            update(editingSet.id, data);
        } else {
            add(data);
        }
        setShowForm(false);
        setEditingSet(null);
    };

    const handleEdit = (set: Set) => {
        setEditingSet(set);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this set?')) {
            remove(id);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-purple-400 mb-2">Sets</h1>
                    <p className="text-slate-400">Sets represent locations based on final sounds</p>
                </div>
                <button
                    onClick={() => {
                        setEditingSet(null);
                        setShowForm(true);
                    }}
                    className="bg-purple-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-400 transition-colors"
                >
                    + Add Set
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
                <h3 className="text-purple-400 font-medium mb-2">💡 How Sets Work</h3>
                <p className="text-slate-300 text-sm">
                    Sets are <strong>locations</strong> based on the final sound of a character&apos;s pinyin.
                    For example, all characters ending in &quot;-i&quot; (like yī, nǐ, lǐ) might use Mom&apos;s House.
                    The <strong>tone</strong> determines which room within that set you use (see Rooms page).
                </p>
            </div>

            {showForm && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingSet ? 'Edit Set' : 'Add New Set'}
                    </h2>
                    <SetForm
                        initialData={editingSet || undefined}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingSet(null);
                        }}
                    />
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search sets..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
            </div>

            {/* Sets Grid */}
            {filteredSets.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {sets.length === 0
                        ? 'No sets yet. Add your first set!'
                        : 'No sets match your search.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSets.map(set => (
                        <div key={set.id} className="bg-slate-800 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{set.name}</h3>
                                    <span className="inline-block bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-sm mt-1">
                                        {set.final}
                                    </span>
                                </div>
                            </div>
                            {set.description && (
                                <p className="text-slate-400 text-sm mb-3">{set.description}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(set)}
                                    className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(set.id)}
                                    className="px-4 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
