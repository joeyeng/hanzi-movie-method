'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/study', label: 'Study', icon: '📚' },
    { href: '/characters', label: 'Characters', icon: '字' },
    { href: '/compounds', label: 'Compounds', icon: '词' },
    { href: '/actors', label: 'Actors', icon: '🎭' },
    { href: '/rooms', label: 'Rooms', icon: '🚪' },
    { href: '/sets', label: 'Sets', icon: '🎬' },
    { href: '/props', label: 'Props', icon: '🎪' },
    { href: '/review', label: 'Review', icon: '📖' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <Link href="/" className="text-lg font-bold text-amber-400 hover:text-amber-300 transition-colors">🏯 汉字 Movie Method</Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-slate-300 hover:text-white"
                    aria-label="Toggle menu"
                >
                    {isOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white min-h-screen p-4
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:transform-none
      `}>
                <div className="mb-8 mt-12 lg:mt-0">
                    <Link href="/" onClick={() => setIsOpen(false)} className="text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors block">🏯 汉字 Movie Method</Link>
                    <p className="text-sm text-slate-400">Chinese Character Database</p>
                </div>
                <nav>
                    <ul className="space-y-2">
                        {navItems.map(item => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${pathname === item.href
                                        ? 'bg-amber-500 text-slate-900'
                                        : 'hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        </>
    );
}
