'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LoadingModal } from './LoadingModal';

export function NavigationLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [prevPath, setPrevPath] = useState('');

    useEffect(() => {
        const currentPath = pathname + searchParams.toString();

        if (prevPath && prevPath !== currentPath) {
            // Navigation completed
            setIsLoading(false);
        }

        setPrevPath(currentPath);
    }, [pathname, searchParams, prevPath]);

    // Listen for navigation start via click events on links
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Ignore clicks on buttons or inside button elements
            // Use multiple checks to be thorough
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                return;
            }

            // Ignore clicks on interactive elements that aren't navigation
            if (target.closest('[role="button"], input, select, textarea')) {
                return;
            }

            const link = target.closest('a');

            if (link && link.href && !link.target && !link.download) {
                const url = new URL(link.href);
                const currentUrl = new URL(window.location.href);

                // Only show loading for same-origin navigation to different pages
                if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
                    // Use microtask to check after all synchronous handlers have run
                    Promise.resolve().then(() => {
                        if (!e.defaultPrevented) {
                            setIsLoading(true);
                        }
                    });
                }
            }
        };

        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, []);

    // Safety timeout to hide loading after 5 seconds
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    return <LoadingModal isLoading={isLoading} />;
}
