'use client';

import { useState, useEffect } from 'react';
import { usePronunciationDb, isDatabaseDownloaded } from '@/lib/pronunciationDb';

interface DatabaseDownloadPromptProps {
    children: React.ReactNode;
}

export default function DatabaseDownloadPrompt({ children }: DatabaseDownloadPromptProps) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { isLoading, isReady, error, initialize } = usePronunciationDb();

    useEffect(() => {
        setIsClient(true);
        // Check if database needs to be downloaded
        if (!isDatabaseDownloaded()) {
            setShowPrompt(true);
        }
    }, []);

    const handleDownload = async () => {
        await initialize();
        setShowPrompt(false);
    };

    // Server-side or initial render - show nothing special
    if (!isClient) {
        return <>{children}</>;
    }

    // Show download prompt
    if (showPrompt && !isReady) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                    <div className="text-center space-y-2">
                        <div className="text-4xl mb-2">📚</div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Download Pronunciation Data
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                            This app needs a small database (~72 KB) to rank character pronunciations by frequency.
                            This helps select the most common pronunciation for multi-reading characters.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-red-700 dark:text-red-300 text-sm">
                                {error.message}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleDownload}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                         text-white font-medium rounded-lg transition-colors
                         flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12" cy="12" r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Database
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            Data sourced from SUBTLEX-CH film subtitle corpus.
                            <br />
                            The database is cached locally for offline use.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
