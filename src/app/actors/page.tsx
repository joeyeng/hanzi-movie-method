'use client';

import { useState } from 'react';
import { useActors } from '@/hooks/useLocalStorage';
import { ActorForm } from '@/components/ActorForm';
import { Actor } from '@/types';

export default function ActorsPage() {
    const { actors, loading, add, update, remove } = useActors();
    const [showForm, setShowForm] = useState(false);
    const [editingActor, setEditingActor] = useState<Actor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredActors = actors.filter(actor =>
        actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        actor.initial.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = (data: Omit<Actor, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingActor) {
            update(editingActor.id, data);
        } else {
            add(data);
        }
        setShowForm(false);
        setEditingActor(null);
    };

    const handleEdit = (actor: Actor) => {
        setEditingActor(actor);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this actor?')) {
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
                    <h1 className="text-3xl font-bold text-blue-400 mb-2">Actors</h1>
                    <p className="text-slate-400">Actors represent initial sounds in pinyin</p>
                </div>
                <button
                    onClick={() => {
                        setEditingActor(null);
                        setShowForm(true);
                    }}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors"
                >
                    + Add Actor
                </button>
            </div>

            {showForm && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingActor ? 'Edit Actor' : 'Add New Actor'}
                    </h2>
                    <ActorForm
                        initialData={editingActor || undefined}
                        onSubmit={handleSubmit}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingActor(null);
                        }}
                    />
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search actors..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
            </div>

            {/* Actor Grid - Categorized */}
            {filteredActors.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {actors.length === 0
                        ? 'No actors yet. Add your first actor!'
                        : 'No actors match your search.'}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Male Actors */}
                    {filteredActors.filter(a => a.category === 'male' || !a.category).length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-blue-300 mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                Male Actors
                                <span className="text-sm font-normal text-slate-500">(b-, p-, m-, f-, d-, t-, n-, l-, g-, k-, h-, zh-, ch-, sh-, r-, z-, c-, s-, Ø)</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredActors.filter(a => a.category === 'male' || !a.category).map(actor => (
                                    <ActorCard key={actor.id} actor={actor} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Female Actors */}
                    {filteredActors.filter(a => a.category === 'female').length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-pink-300 mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                                Female Actors
                                <span className="text-sm font-normal text-slate-500">(y-, bi-, pi-, mi-, di-, ti-, ji-, qi-, xi-, ni-, li-)</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredActors.filter(a => a.category === 'female').map(actor => (
                                    <ActorCard key={actor.id} actor={actor} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fictional Actors */}
                    {filteredActors.filter(a => a.category === 'fictional').length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-purple-300 mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                                Fictional Characters
                                <span className="text-sm font-normal text-slate-500">(w-, bu-, pu-, mu-, fu-, du-, tu-, nu-, lu-, zu-, cu-, su-, zhu-, chu-, shu-, ru-, ku-, hu-, gu-)</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredActors.filter(a => a.category === 'fictional').map(actor => (
                                    <ActorCard key={actor.id} actor={actor} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Basketball Players */}
                    {filteredActors.filter(a => a.category === 'basketball_players').length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                Basketball Players
                                <span className="text-sm font-normal text-slate-500">(yu-, nü-, lü-, ju-, qu-, xu-)</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredActors.filter(a => a.category === 'basketball_players').map(actor => (
                                    <ActorCard key={actor.id} actor={actor} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Actor Card Component
function ActorCard({ actor, onEdit, onDelete }: { actor: Actor; onEdit: (actor: Actor) => void; onDelete: (id: string) => void }) {
    return (
        <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    {actor.emoji && <span className="text-4xl">{actor.emoji}</span>}
                    <div>
                        <h3 className="text-xl font-semibold text-white">
                            {actor.name}
                        </h3>
                        <span className="inline-block bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-sm mt-1">
                            {actor.initial}
                        </span>
                    </div>
                </div>
                {actor.imageUrl && (
                    <div className="w-12 h-12 bg-slate-700 rounded-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={actor.imageUrl} alt={actor.name} className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
            {actor.description && (
                <p className="text-slate-400 text-sm mb-3">{actor.description}</p>
            )}
            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(actor)}
                    className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(actor.id)}
                    className="px-4 py-1.5 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}
