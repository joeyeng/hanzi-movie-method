'use client';

import { useEffect, useState } from 'react';

interface LoadingModalProps {
  isLoading: boolean;
}

export function LoadingModal({ isLoading }: LoadingModalProps) {
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      // Wait for fade out animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-4 transform transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Spinning loader */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
        </div>
        
        {/* Loading text with animated dots */}
        <div className="text-amber-400 font-medium text-lg flex items-center gap-1">
          <span>Loading</span>
          <span className="animate-pulse">.</span>
          <span className="animate-pulse animation-delay-200">.</span>
          <span className="animate-pulse animation-delay-400">.</span>
        </div>
      </div>
    </div>
  );
}
