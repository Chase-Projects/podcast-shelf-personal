'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Heart, Search } from 'lucide-react';
import Header from '@/components/Header';
import PodcastEditor from '@/components/PodcastEditor';
import RatingsChart from '@/components/RatingsChart';
import SortControls, { type Ordering, type RatingType } from '@/components/SortControls';
import GlobalFavoriteEpisodes from '@/components/GlobalFavoriteEpisodes';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { LIBRARY_RAW_URL } from '@/lib/github';
import type { Library } from '@/types';

export default function Home() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${LIBRARY_RAW_URL}?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load library (${r.status})`);
        return r.json() as Promise<Library>;
      })
      .then(setLibrary)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <LibraryProvider initialLibrary={library} readOnly>
      <Suspense fallback={null}>
        <HomeView />
      </Suspense>
    </LibraryProvider>
  );
}

function HomeView() {
  const { library } = useLibrary();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');
  const [expandedId, setExpandedId] = useState<string | null>(focusId);
  const [ordering, setOrdering] = useState<Ordering>('dateAltered');
  const [ratingType, setRatingType] = useState<RatingType>('overall');
  const [query, setQuery] = useState('');
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusId) return;
    setExpandedId(focusId);
    const t = window.setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [focusId]);

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
    const getRating = (p: typeof filtered[0]) =>
      ratingType === 'overall'
        ? p.overallRating
        : p.customRatings.find((cr) => cr.category === ratingType)?.rating ?? null;
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
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
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
                <Link
                  key={p.itunesId}
                  href={`/?focus=${p.itunesId}#podcast-${p.itunesId}`}
                  scroll={false}
                  className="flex-shrink-0"
                  title={p.title}
                >
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                    <Image
                      src={p.artworkUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </Link>
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
            <p className="text-foreground mb-2">No podcasts in library</p>
          </div>
        ) : sortedPodcasts.length === 0 ? (
          <div className="text-center py-12 bg-background-secondary rounded-lg">
            <p className="text-foreground text-sm">No matches for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {sortedPodcasts.map((p) => (
              <div
                key={p.itunesId}
                id={`podcast-${p.itunesId}`}
                ref={p.itunesId === focusId ? focusRef : undefined}
                className="scroll-mt-4"
              >
                <PodcastEditor
                  podcast={p}
                  expanded={expandedId === p.itunesId}
                  onToggle={() => setExpandedId(expandedId === p.itunesId ? null : p.itunesId)}
                  highlightQuery={query}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
