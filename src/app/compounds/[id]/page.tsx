'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompounds, useCharacters } from '@/hooks/useLocalStorage';
import { fetchExampleSentences, TatoebaExample } from '@/lib/hanzipy';
import Link from 'next/link';

export default function CompoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { compounds, loading, remove } = useCompounds();
    const { characters } = useCharacters();
    const [exampleSentences, setExampleSentences] = useState<TatoebaExample[]>([]);
    const [loadingExamples, setLoadingExamples] = useState(false);

    const compound = compounds.find(c => c.id === id);

    // Find character by hanzi to get its ID for linking
    const findCharacter = (hanzi: string) => {
        return characters.find(c => c.hanzi === hanzi);
    };

    // Fetch example sentences when compound loads
    useEffect(() => {
        if (compound?.word) {
            setLoadingExamples(true);
            fetchExampleSentences(compound.word, 5)
                .then(setExampleSentences)
                .finally(() => setLoadingExamples(false));
        }
    }, [compound?.word]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!compound) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Compound Not Found</h1>
                <p className="text-slate-400 mb-6">The compound word you&apos;re looking for doesn&apos;t exist.</p>
                <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
                    ← Go Back
                </button>
            </div>
        );
    }

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this compound word?')) {
            remove(compound.id);
            router.push('/compounds');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back link */}
            <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                ← Back
            </button>

            <div className="bg-slate-800 rounded-lg p-6">
                {/* Header with compound and basic info */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-start gap-4">
                        <div className="flex gap-1">
                            {compound.characters.map((char, index) => {
                                const charData = findCharacter(char);
                                return charData ? (
                                    <Link
                                        key={index}
                                        href={`/characters/${charData.id}`}
                                        className="text-6xl font-bold text-amber-400 hover:text-amber-300 transition-colors"
                                        title={`View character: ${char}`}
                                    >
                                        {char}
                                    </Link>
                                ) : (
                                    <span
                                        key={index}
                                        className="text-6xl font-bold text-slate-500"
                                        title={`Character not in database: ${char}`}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                        </div>
                        <div>
                            <p className="text-2xl text-white mb-1">{compound.pinyin}</p>
                            <p className="text-lg text-slate-400">{compound.definition}</p>
                        </div>
                    </div>
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(compound.word)}&op=translate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Google Translate"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                    </a>
                </div>

                {/* Individual Characters */}
                <div className="mb-6">
                    <h3 className="text-slate-400 text-sm mb-3">Characters</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {compound.characters.map((char, index) => {
                            const charData = findCharacter(char);
                            return (
                                <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-center">
                                    {charData ? (
                                        <Link href={`/characters/${charData.id}`} className="block hover:bg-slate-700 rounded transition-colors">
                                            <span className="text-3xl text-amber-400">{char}</span>
                                            <p className="text-sm text-slate-300 mt-1">{charData.pinyin}</p>
                                            <p className="text-xs text-slate-500">{charData.meaning?.split(',')[0]}</p>
                                        </Link>
                                    ) : (
                                        <>
                                            <span className="text-3xl text-slate-500">{char}</span>
                                            <p className="text-xs text-slate-600 mt-1">Not in database</p>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Notes */}
                {compound.notes && (
                    <div className="mb-6">
                        <h3 className="text-slate-400 text-sm mb-2">Notes</h3>
                        <p className="text-slate-400">{compound.notes}</p>
                    </div>
                )}

                {/* Example Sentences */}
                <div className="mb-6">
                    <h3 className="text-slate-400 text-sm mb-2">Example Sentences</h3>
                    {loadingExamples ? (
                        <div className="text-slate-500 text-sm">Loading examples...</div>
                    ) : exampleSentences.length > 0 ? (
                        <div className="space-y-3">
                            {exampleSentences.map((sentence, index) => (
                                <div key={sentence.id || index} className="bg-slate-700/30 rounded-lg p-3">
                                    <p className="text-lg text-amber-400">{sentence.simplified}</p>
                                    <p className="text-sm text-slate-400 mt-1">{sentence.pinyin}</p>
                                    <p className="text-slate-300 mt-1">{sentence.english}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No example sentences found</p>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex justify-between items-center text-sm text-slate-500 mb-6 py-3 border-t border-slate-700">
                    <span>Created: {new Date(compound.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(compound.updatedAt).toLocaleDateString()}</span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                    <Link
                        href={`/compounds?search=${encodeURIComponent(compound.word)}`}
                        className="flex-1 py-2 text-center bg-slate-700 text-slate-300 rounded font-medium hover:bg-slate-600 transition-colors"
                    >
                        Edit in List
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="px-6 py-2 bg-red-600/20 text-red-400 rounded font-medium hover:bg-red-600/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
