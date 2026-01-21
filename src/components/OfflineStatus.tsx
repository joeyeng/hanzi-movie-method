'use client';

import { useState, useEffect } from 'react';

export function OfflineStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isClient) {
        return null;
    }

    return (
        <div className={`fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isOnline
                ? 'bg-green-500/20 text-green-400 opacity-0 pointer-events-none'
                : 'bg-amber-500/90 text-white shadow-lg'
            }`}>
            {!isOnline && (
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
                    Offline Mode
                </span>
            )}
        </div>
    );
}
