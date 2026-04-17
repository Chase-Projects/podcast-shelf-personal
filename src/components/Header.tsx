'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, Lock } from 'lucide-react';

export default function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const next = saved ?? 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-foreground-bright">Podcast Shelf</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-2 text-foreground hover:text-foreground-bright transition-colors rounded-full hover:bg-background-secondary"
            title="Admin"
          >
            <Lock size={16} />
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 text-foreground hover:text-foreground-bright transition-colors rounded-full hover:bg-background-secondary"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
