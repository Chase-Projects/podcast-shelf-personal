'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, LogOut, Search, Heart } from 'lucide-react';
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
import SortControls, { type Ordering, type RatingType } from '@/components/SortControls';
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
  const [ordering, setOrdering] = useState<Ordering>('bestToWorst');
  const [ratingType, setRatingType] = useState<RatingType>('overall');
  const [query, setQuery] = useState('');

  const podcasts = library.podcasts;

  const customCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of podcasts) for (const cr of p.customRatings) set.add(cr.category);
    return [...set].sort();
  }, [podcasts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = podcasts;
    if (ratingType !== 'overall') {
      list = list.filter((p) =>
        p.customRatings.some((cr) => cr.category === ratingType)
      );
    }
    if (q.length >= 2) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          (p.reviewText && p.reviewText.toLowerCase().includes(q))
      );
    }
    return list;
  }, [podcasts, query, ratingType]);

  const sortedPodcasts = useMemo(() => {
    const WEIGHT_DIVISOR = 5.01;
    const getRating = (p: typeof filtered[0]) => {
      if (ratingType !== 'overall') {
        return p.customRatings.find((cr) => cr.category === ratingType)?.rating ?? null;
      }
      if (p.overallRating === null) return null;
      const customVals = p.customRatings.map((cr) => cr.rating);
      const meanCustom =
        customVals.length > 0
          ? customVals.reduce((sum, r) => sum + r, 0) / customVals.length
          : 0;
      return p.overallRating + meanCustom / WEIGHT_DIVISOR;
    };
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (ordering) {
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'dateAdded':
          return (
            new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
          );
        case 'bestToWorst': {
          const ra = getRating(a) ?? -1;
          const rb = getRating(b) ?? -1;
          if (ra !== rb) return rb - ra;
          return a.title.localeCompare(b.title);
        }
        case 'worstToBest': {
          const ra = getRating(a) ?? Infinity;
          const rb = getRating(b) ?? Infinity;
          if (ra !== rb) return ra - rb;
          return a.title.localeCompare(b.title);
        }
        case 'dateAltered':
        default:
          return (
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
          );
      }
    });
    return sorted;
  }, [filtered, ordering, ratingType]);

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
              <Heart size={20} className="text-accent" fill="currentColor" />
              <h2 className="text-lg font-semibold text-foreground-bright">
                Favorite Podcasts
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {favoritePodcasts.map((p) => (
                <div key={p.itunesId} className="flex-shrink-0" title={p.title}>
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                    <Image
                      src={p.artworkUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <GlobalFavoriteEpisodes podcasts={podcasts} />

        {(overallRatings.some((r) => r !== null) || customRatingsData.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground-bright">
                Rating Distributions
              </h2>
              <Link
                href="/ratings"
                className="text-xs px-2.5 py-1 rounded border border-border bg-background-secondary text-foreground hover:text-accent hover:border-accent transition-colors"
              >
                Browse by rating
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-background-secondary rounded-lg h-48">
                <RatingsChart ratings={overallRatings} title="Overall" height={100} />
              </div>
              {customRatingsData.map(({ name, ratings }) => (
                <div
                  key={name}
                  className="p-4 bg-background-secondary rounded-lg h-48"
                >
                  <RatingsChart
                    ratings={ratings}
                    title={name}
                    height={100}
                    category={name}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {podcasts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none"
                size={14}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, or review..."
                className="w-full pl-9 pr-3 py-1.5 text-sm"
              />
            </div>
            <SortControls
              ordering={ordering}
              onOrderingChange={setOrdering}
              ratingType={ratingType}
              onRatingTypeChange={setRatingType}
              customCategories={customCategories}
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
