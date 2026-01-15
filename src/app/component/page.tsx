'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useCharactersWithRelations, useComponents } from '@/hooks/useLocalStorage';
import { lookupCharactersAPI, HanziDefinition } from '@/lib/hanzipy';

function ComponentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const componentChar = searchParams.get('char') || '';
    const { characters, loading } = useCharactersWithRelations();
    const { components: allComponents, loading: componentsLoading } = useComponents();
    const [apiDefinitions, setApiDefinitions] = useState<HanziDefinition[]>([]);
    const [apiPinyin, setApiPinyin] = useState<string | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);

    // Get the stored component info
    const storedComponentInfo = allComponents.find(c => c.character === componentChar);

    // Only look up from API if the stored component doesn't have allDefinitions
    useEffect(() => {
        if (componentChar && (!storedComponentInfo?.allDefinitions || storedComponentInfo.allDefinitions.length === 0)) {
            setLookupLoading(true);
            lookupCharactersAPI([componentChar]).then(results => {
                const entry = results.get(componentChar);
                if (entry) {
                    setApiPinyin(entry.pinyin);
                    setApiDefinitions(entry.all_definitions || []);
                }
                setLookupLoading(false);
            }).catch(() => {
                setLookupLoading(false);
            });
        }
    }, [componentChar, storedComponentInfo?.allDefinitions]);

    if (loading || lookupLoading || componentsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    if (!componentChar) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h1 className="text-2xl font-bold text-red-400 mb-4">No Component Specified</h1>
                <p className="text-slate-400 mb-6">Please specify a component to view.</p>
                <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300">
                    ← Back to Characters
                </button>
            </div>
        );
    }

    // Find all characters that have this component
    const charactersWithComponent = characters.filter(char =>
        char.components?.some(c => c.character === componentChar)
    );

    // Use stored definitions if available, otherwise fall back to API
    const allDefinitions = storedComponentInfo?.allDefinitions || apiDefinitions;
    const displayPinyin = storedComponentInfo?.pinyin || apiPinyin;
    const hasDefinitions = allDefinitions.length > 0;

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-amber-400 mb-4 inline-block">
                ← Back to Characters
            </button>

            <div className="bg-slate-800 rounded-lg p-6">
                {/* Component Header */}
                <div className="flex items-start gap-6 mb-8">
                    <span className="text-8xl font-bold text-amber-400">{componentChar}</span>
                    <div className="pt-2 flex-1">
                        {displayPinyin && (
                            <p className="text-2xl text-white mb-2">{displayPinyin}</p>
                        )}
                        {hasDefinitions ? (
                            <div className="space-y-3">
                                {allDefinitions.map((def, index) => (
                                    <div key={index} className="border-l-2 border-slate-600 pl-3">
                                        <span className="text-slate-300 text-sm">{def.pinyin}</span>
                                        <p className="text-slate-400">{def.definition}</p>
                                    </div>
                                ))}
                            </div>
                        ) : storedComponentInfo?.definition ? (
                            <p className="text-lg text-slate-400">{storedComponentInfo.definition}</p>
                        ) : (
                            <p className="text-lg text-slate-500 italic">No definition available</p>
                        )}
                    </div>
                </div>

                {/* Characters containing this component */}
                <div>
                    <h2 className="text-xl font-semibold text-amber-400 mb-4">
                        Characters with this component ({charactersWithComponent.length})
                    </h2>

                    {charactersWithComponent.length === 0 ? (
                        <p className="text-slate-500 italic">No characters in your database contain this component.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {charactersWithComponent.map(char => (
                                <Link
                                    key={char.id}
                                    href={`/characters/${char.id}`}
                                    className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors group"
                                >
                                    <div className="text-4xl text-center text-amber-400 group-hover:text-amber-300 mb-2">
                                        {char.hanzi}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white text-sm">{char.pinyin}</p>
                                        <p className="text-slate-400 text-xs truncate" title={char.meaning}>
                                            {char.meaning.split(',')[0]}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lookup link */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                    <a
                        href={`https://translate.google.com/?sl=zh-CN&tl=en&text=${encodeURIComponent(componentChar)}&op=translate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </svg>
                        Look up on Google Translate
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function ComponentPage() {
    return (
        <Suspense fallback={<div className="text-slate-400 text-center py-12">Loading...</div>}>
            <ComponentContent />
        </Suspense>
    );
}
