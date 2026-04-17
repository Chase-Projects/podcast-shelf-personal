'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, LogOut, Search, Star } from 'lucide-react';
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
import RatingsChart from '@/components/RatingsChart';
import FilterPanel, { type BaseSort, type CustomSort } from '@/components/FilterPanel';
import GlobalFavoriteEpisodes from '@/components/GlobalFavoriteEpisodes';

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
  const [baseSort, setBaseSort] = useState<BaseSort>('recent');
  const [customSorts, setCustomSorts] = useState<CustomSort[]>([]);
  const [query, setQuery] = useState('');

  const podcasts = library.podcasts;

  const customCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of podcasts) for (const cr of p.customRatings) set.add(cr.category);
    return [...set].sort();
  }, [podcasts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return podcasts;
    return podcasts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        (p.reviewText && p.reviewText.toLowerCase().includes(q))
    );
  }, [podcasts, query]);

  const sortedPodcasts = useMemo(() => {
    const sorted = [...filtered];
    const baseCompare = (a: typeof filtered[0], b: typeof filtered[0]) => {
      switch (baseSort) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'rating':
          return (b.overallRating ?? 0) - (a.overallRating ?? 0);
        case 'recent':
        default:
          return (
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
          );
      }
    };
    sorted.sort((a, b) => {
      for (const s of customSorts) {
        const ra = a.customRatings.find((cr) => cr.category === s.category)?.rating ?? -1;
        const rb = b.customRatings.find((cr) => cr.category === s.category)?.rating ?? -1;
        if (ra !== rb) return s.direction === 'desc' ? rb - ra : ra - rb;
      }
      return baseCompare(a, b);
    });
    return sorted;
  }, [filtered, baseSort, customSorts]);

  const favoritePodcasts = podcasts.filter((p) => p.isFavorite);
  const overallRatings = podcasts.map((p) => p.overallRating);

  const customRatingsData = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of podcasts) {
      for (const cr of p.customRatings) {
        if (!map.has(cr.category)) map.set(cr.category, []);
        map.get(cr.category)!.push(cr.rating);
      }
    }
    return [...map.entries()]
      .map(([name, ratings]) => ({ name, ratings }))
      .sort((a, b) => b.ratings.length - a.ratings.length);
  }, [podcasts]);

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

        <GlobalFavoriteEpisodes podcasts={podcasts} />

        {(overallRatings.some((r) => r !== null) || customRatingsData.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground-bright">
                Rating Distributions
              </h2>
              <Link
                href="/ratings"
                className="text-sm text-accent hover:text-accent-hover"
              >
                Browse by rating →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Link
                href="/ratings"
                className="p-4 bg-background-secondary rounded-lg h-48 hover:bg-background-tertiary transition-colors"
              >
                <RatingsChart ratings={overallRatings} title="Overall" height={100} />
              </Link>
              {customRatingsData.map(({ name, ratings }) => (
                <Link
                  key={name}
                  href={`/ratings?category=${encodeURIComponent(name)}`}
                  className="p-4 bg-background-secondary rounded-lg h-48 hover:bg-background-tertiary transition-colors"
                >
                  <RatingsChart ratings={ratings} title={name} height={100} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {podcasts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground"
                size={16}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, or review..."
                className="w-full pl-9 pr-3 py-1.5 text-sm"
              />
            </div>
            <FilterPanel
              baseSort={baseSort}
              onBaseSortChange={setBaseSort}
              customCategories={customCategories}
              customSorts={customSorts}
              onCustomSortsChange={setCustomSorts}
            />
          </div>
        )}

        {podcasts.length === 0 ? (
          <div className="text-center py-16 bg-background-secondary rounded-lg">
            <p className="text-foreground mb-2">No podcasts yet</p>
            <p className="text-sm text-foreground">Search above to add your first podcast</p>
          </div>
        ) : sortedPodcasts.length === 0 ? (
          <div className="text-center py-12 bg-background-secondary rounded-lg">
            <p className="text-foreground text-sm">No matches for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {sortedPodcasts.map((p) => (
              <PodcastEditor
                key={p.itunesId}
                podcast={p}
                expanded={expandedId === p.itunesId}
                onToggle={() => setExpandedId(expandedId === p.itunesId ? null : p.itunesId)}
                highlightQuery={query}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
