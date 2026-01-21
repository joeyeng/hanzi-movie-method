'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegistration() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        // Register service worker
        navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
                console.log('Service Worker registered:', reg.scope);
                setRegistration(reg);

                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker is ready
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });

        // Listen for controller change (after skipWaiting)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
            registration.waiting.postMessage('skipWaiting');
        }
    };

    // Show update notification if available
    if (updateAvailable) {
        return (
            <div className="fixed bottom-4 right-4 z-50 bg-amber-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <span>A new version is available!</span>
                <button
                    onClick={handleUpdate}
                    className="bg-white text-amber-600 px-3 py-1 rounded font-medium hover:bg-amber-50 transition-colors"
                >
                    Update
                </button>
            </div>
        );
    }

    return null;
}
