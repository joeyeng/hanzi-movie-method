'use client';

import { useState } from 'react';
import { useProps } from '@/hooks/useLocalStorage';
import { PropForm } from '@/components/PropForm';
import { Prop } from '@/types';

export default function PropsPage() {
    const { props, loading, add, update, remove } = useProps();
    const [showForm, setShowForm] = useState(false);
    const [editingProp, setEditingProp] = useState<Prop | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProps = props.filter(prop =>
        prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.component.includes(searchQuery)
    );

    const handleSubmit = (data: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingProp) {
            update(editingProp.id, data);
        } else {
            add(data);
        }
        setShowForm(false);
        setEditingProp(null);
    };

    const handleEdit = (prop: Prop) => {
        setEditingProp(prop);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this prop?')) {
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
                    <h1 className="text-3xl font-bold text-pink-400 mb-2">Props</h1>
                    <p className="text-slate-400">Props represent character components/radicals</p>
                </div>
                <button
                    onClick={() => {
                        setEditingProp(null);
                        setShowForm(true);
                    }}
                    className="bg-pink-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-pink-400 transition-colors"
                >
                    + Add Prop
                </button>
            </div>

            {showForm && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingProp ? 'Edit Prop' : 'Add New Prop'}
                    </h2>
                    <PropForm
                        initialData={editingProp || undefined}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingProp(null);
                        }}
                    />
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search props..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
            </div>

            {/* Props Grid */}
            {filteredProps.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {props.length === 0
                        ? 'No props yet. Add your first prop!'
                        : 'No props match your search.'}
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4">
                    {filteredProps.map(prop => (
                        <div key={prop.id} className="bg-slate-800 rounded-lg p-4">
                            <div className="text-center mb-3">
                                <span className="text-4xl text-pink-400">{prop.component}</span>
                            </div>
                            <div className="text-center mb-3">
                                <h3 className="text-lg font-semibold text-white">{prop.name}</h3>
                            </div>
                            {prop.description && (
                                <p className="text-slate-400 text-sm mb-3 text-center">{prop.description}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(prop)}
                                    className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(prop.id)}
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
