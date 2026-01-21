'use client';

import { useEffect, useState, useTransition } from 'react';
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
            const link = target.closest('a');

            if (link && link.href && !link.target && !link.download) {
                const url = new URL(link.href);
                const currentUrl = new URL(window.location.href);

                // Only show loading for same-origin navigation to different pages
                if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
                    setIsLoading(true);
                }
            }
        };

        // Also handle programmatic navigation via router.push
        const handleBeforeUnload = () => {
            setIsLoading(true);
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
