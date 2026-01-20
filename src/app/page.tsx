'use client';

import { useCharactersWithRelations, useActors, useRooms, useSets, useComponents } from '@/hooks/useLocalStorage';
import { formatDefinition } from '@/lib/format';
import Link from 'next/link';

export default function Home() {
  const { characters, loading: charsLoading } = useCharactersWithRelations();
  const { actors, loading: actorsLoading } = useActors();
  const { rooms, loading: roomsLoading } = useRooms();
  const { sets, loading: setsLoading } = useSets();
  const { components, loading: componentsLoading } = useComponents();

  const loading = charsLoading || actorsLoading || roomsLoading || setsLoading || componentsLoading;

  const learnedCount = characters.filter(c => c.learned).length;
  const recentCharacters = [...characters]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">Dashboard</h1>
        <p className="text-slate-400">Your Hanzi Movie Method learning progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Link href="/characters" className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors">
          <div className="text-4xl font-bold text-amber-400">{characters.length}</div>
          <div className="text-slate-400">Characters</div>
          <div className="text-green-400 text-sm mt-1">{learnedCount} learned</div>
        </Link>
        <Link href="/actors" className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors">
          <div className="text-4xl font-bold text-blue-400">{actors.length}</div>
          <div className="text-slate-400">Actors</div>
          <div className="text-slate-500 text-sm mt-1">Initial sounds</div>
        </Link>
        <Link href="/sets" className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors">
          <div className="text-4xl font-bold text-purple-400">{sets.length}</div>
          <div className="text-slate-400">Sets</div>
          <div className="text-slate-500 text-sm mt-1">Locations</div>
        </Link>
        <Link href="/rooms" className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors">
          <div className="text-4xl font-bold text-orange-400">{rooms.length}</div>
          <div className="text-slate-400">Rooms</div>
          <div className="text-slate-500 text-sm mt-1">Tone areas</div>
        </Link>
        <Link href="/props" className="bg-slate-800 rounded-lg p-6 hover:bg-slate-750 transition-colors">
          <div className="text-4xl font-bold text-pink-400">{components.length}</div>
          <div className="text-slate-400">Props</div>
          <div className="text-slate-500 text-sm mt-1">Components</div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          href="/characters?add=true"
          className="bg-amber-500 text-slate-900 rounded-lg p-6 text-center font-medium hover:bg-amber-400 transition-colors"
        >
          + Add New Character
        </Link>
        <Link
          href="/review"
          className="bg-slate-800 text-white rounded-lg p-6 text-center font-medium hover:bg-slate-700 transition-colors"
        >
          📖 Start Review Session
        </Link>
      </div>

      {/* Recent Characters */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recently Added Characters</h2>
        {recentCharacters.length === 0 ? (
          <p className="text-slate-500">No characters yet. Add your first character to get started!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {recentCharacters.map(char => (
              <Link
                key={char.id}
                href={`/words/${encodeURIComponent(char.hanzi)}`}
                className="bg-slate-700 rounded-lg p-4 text-center hover:bg-slate-600 transition-colors overflow-hidden"
              >
                <div className="text-4xl text-amber-400 mb-2">{char.hanzi}</div>
                <div className="text-sm text-slate-300 truncate">{char.pinyin}</div>
                <div className="text-xs text-slate-500 truncate">{formatDefinition(char.meaning)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      {characters.length === 0 && actors.length === 0 && sets.length === 0 && (
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-amber-500/30">
          <h2 className="text-xl font-semibold text-amber-400 mb-4">🎬 Getting Started with the Hanzi Movie Method</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>
              <strong>Create Actors</strong> - Each actor represents an initial sound (like &quot;j-&quot;, &quot;sh-&quot;, &quot;m-&quot;)
            </li>
            <li>
              <strong>Create Sets</strong> - Each set is a location that represents a final sound + tone
            </li>
            <li>
              <strong>Create Props</strong> - Props represent character components/radicals
            </li>
            <li>
              <strong>Add Characters</strong> - Combine actors, sets, and props into vivid movie scenes
            </li>
            <li>
              <strong>Review Regularly</strong> - Use the review feature to strengthen your memory
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
