'use client';

import { TatoebaExample } from '@/lib/hanzipy';

interface ExampleSentencesProps {
    word: string;
    sentences: TatoebaExample[];
    loading: boolean;
}

export default function ExampleSentences({ word, sentences, loading }: ExampleSentencesProps) {
    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-400 text-sm">Example Sentences</h3>
                <a
                    href={`https://tatoeba.org/en/sentences/search?from=cmn&to=eng&query=${encodeURIComponent(word)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                >
                    View more on Tatoeba →
                </a>
            </div>
            {loading ? (
                <div className="text-slate-500 text-sm">Loading examples...</div>
            ) : sentences.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sentences.map((sentence, index) => (
                        <div key={sentence.id || index} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors">
                            <p className="text-xl text-amber-400 mb-2">{sentence.simplified}</p>
                            <p className="text-sm text-slate-400 mb-2 italic">{sentence.pinyin}</p>
                            <p className="text-slate-300 text-sm">{sentence.english}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-slate-500 text-sm">No example sentences found</p>
            )}
        </div>
    );
}
