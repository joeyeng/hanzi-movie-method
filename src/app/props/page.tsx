'use client';

import { useState } from 'react';
import { useComponents, useCharactersWithRelations } from '@/hooks/useLocalStorage';
import Link from 'next/link';

export default function PropsPage() {
    const { components, loading } = useComponents();
    const { characters } = useCharactersWithRelations();
    const [searchQuery, setSearchQuery] = useState('');

    // Count how many characters use each component
    const componentUsageCounts = new Map<string, number>();
    characters.forEach(char => {
        (char.components || []).forEach(comp => {
            componentUsageCounts.set(comp.id, (componentUsageCounts.get(comp.id) || 0) + 1);
        });
    });

    // Sort components by usage count (most used first)
    const sortedComponents = [...components].sort((a, b) => {
        const countA = componentUsageCounts.get(a.id) || 0;
        const countB = componentUsageCounts.get(b.id) || 0;
        return countB - countA;
    });

    const filteredComponents = sortedComponents.filter(comp =>
        comp.character.includes(searchQuery) ||
        (comp.pinyin && comp.pinyin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comp.definition && comp.definition.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                    <h1 className="text-3xl font-bold text-pink-400 mb-2">Props (Components)</h1>
                    <p className="text-slate-400">Character components/radicals extracted from your characters ({components.length} total)</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search components..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
            </div>

            {/* Components Grid */}
            {filteredComponents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {components.length === 0
                        ? 'No components yet. Import characters to auto-extract components!'
                        : 'No components match your search.'}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredComponents.map(comp => {
                        const usageCount = componentUsageCounts.get(comp.id) || 0;
                        return (
                            <Link
                                key={comp.id}
                                href={`/component?char=${encodeURIComponent(comp.character)}`}
                                className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition-colors group"
                            >
                                <div className="text-center mb-2">
                                    <span className="text-5xl text-pink-400 group-hover:text-pink-300 transition-colors">
                                        {comp.character}
                                    </span>
                                </div>
                                {comp.pinyin && (
                                    <div className="text-center text-white text-sm mb-1">
                                        {comp.pinyin}
                                    </div>
                                )}
                                {comp.definition && (
                                    <p className="text-slate-400 text-xs text-center line-clamp-2" title={comp.definition}>
                                        {comp.definition.split('/')[0]}
                                    </p>
                                )}
                                <div className="text-center mt-2">
                                    <span className="text-xs text-slate-500">
                                        Used in {usageCount} character{usageCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
