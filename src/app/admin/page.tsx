'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpDown, Loader2, LogOut, Star } from 'lucide-react';
import type { Library } from '@/types';
import { LibraryProvider, useLibrary } from '@/lib/library';
import {
  getStoredPat,
  clearStoredPat,
  loadLibraryFromGitHub,
} from '@/lib/github';
import PatGate from '@/components/PatGate';
import SaveButton from '@/components/SaveButton';
import PodcastSearch from '@/components/PodcastSearch';
import PodcastEditor from '@/components/PodcastEditor';
import ImportExport from '@/components/ImportExport';

type SortOption = 'recent' | 'name' | 'rating' | string;

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; library: Library; sha: string }
  | { kind: 'error'; message: string };

export default function AdminPage() {
  const [pat, setPat] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    const saved = getStoredPat();
    if (saved) setPat(saved);
  }, []);

  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    setLoadState({ kind: 'loading' });
    loadLibraryFromGitHub(pat)
      .then(({ library, sha }) => {
        if (!cancelled) setLoadState({ kind: 'ready', library, sha });
      })
      .catch((err) => {
        if (!cancelled)
          setLoadState({ kind: 'error', message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [pat]);

  const handleSignOut = () => {
    clearStoredPat();
    setPat(null);
    setLoadState({ kind: 'idle' });
  };

  if (!pat) {
    return <PatGate onAuthed={setPat} />;
  }

  if (loadState.kind === 'loading' || loadState.kind === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen text-foreground">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading library from GitHub...
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-background-secondary rounded-lg">
        <p className="text-sm text-red-400 mb-4">{loadState.message}</p>
        <button
          onClick={handleSignOut}
          className="text-sm text-accent hover:text-accent-hover"
        >
          Sign out and try again
        </button>
      </div>
    );
  }

  return (
    <LibraryProvider initialLibrary={loadState.library}>
      <AdminView
        pat={pat}
        initialSha={loadState.sha}
        onSignOut={handleSignOut}
      />
    </LibraryProvider>
  );
}

interface AdminViewProps {
  pat: string;
  initialSha: string;
  onSignOut: () => void;
}

function AdminView({ pat, initialSha, onSignOut }: AdminViewProps) {
  const { library } = useLibrary();
  const [sha, setSha] = useState(initialSha);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const podcasts = library.podcasts;

  const customCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of podcasts) for (const cr of p.customRatings) set.add(cr.category);
    return [...set].sort();
  }, [podcasts]);

  const sortedPodcasts = useMemo(() => {
    const sorted = [...podcasts];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'rating':
        return sorted.sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0));
      case 'recent':
        return sorted.sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
      default:
        if (sortBy.startsWith('custom:')) {
          const cat = sortBy.replace('custom:', '');
          return sorted.sort((a, b) => {
            const ra = a.customRatings.find((cr) => cr.category === cat)?.rating ?? 0;
            const rb = b.customRatings.find((cr) => cr.category === cat)?.rating ?? 0;
            return rb - ra;
          });
        }
        return sorted;
    }
  }, [podcasts, sortBy]);

  const favoritePodcasts = podcasts.filter((p) => p.isFavorite);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold text-foreground-bright hover:text-accent"
            >
              Podcast Shelf
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-accent text-background">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ImportExport />
            <SaveButton pat={pat} sha={sha} onSaved={setSha} />
            <button
              onClick={onSignOut}
              className="p-2 text-foreground hover:text-foreground-bright rounded-full hover:bg-background-secondary"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <PodcastSearch />
        </div>

        {favoritePodcasts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star size={20} className="text-accent" fill="currentColor" />
              <h2 className="text-lg font-semibold text-foreground-bright">
                Favorite Podcasts
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {favoritePodcasts.map((p) => (
                <div key={p.itunesId} className="flex-shrink-0">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                    <Image
                      src={p.artworkUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-foreground-bright mt-1 w-24 truncate text-center">
                    {p.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {podcasts.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <ArrowUpDown size={16} className="text-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="rating">Overall Rating</option>
              {customCategories.length > 0 && (
                <optgroup label="Custom Ratings">
                  {customCategories.map((cat) => (
                    <option key={cat} value={`custom:${cat}`}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {podcasts.length === 0 ? (
          <div className="text-center py-16 bg-background-secondary rounded-lg">
            <p className="text-foreground mb-2">No podcasts yet</p>
            <p className="text-sm text-foreground">Search above to add your first podcast</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPodcasts.map((p) => (
              <PodcastEditor
                key={p.itunesId}
                podcast={p}
                expanded={expandedId === p.itunesId}
                onToggle={() => setExpandedId(expandedId === p.itunesId ? null : p.itunesId)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
