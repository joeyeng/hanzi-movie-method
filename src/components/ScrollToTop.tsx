'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Detail page patterns - pages with dynamic [id] segments
const detailPagePatterns = [
    /^\/characters\/[^/]+$/, // /characters/[id]
    /^\/compounds\/[^/]+$/,  // /compounds/[id]
    /^\/component$/,         // /component?char=X (component detail page)
];

function isDetailPage(pathname: string): boolean {
    return detailPagePatterns.some(pattern => pattern.test(pathname));
}

export function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        // Only scroll to top for detail pages
        if (isDetailPage(pathname)) {
            window.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
}
