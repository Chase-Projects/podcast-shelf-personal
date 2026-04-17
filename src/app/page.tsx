'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Star, Search } from 'lucide-react';
import Header from '@/components/Header';
import PodcastEditor from '@/components/PodcastEditor';
import RatingsChart from '@/components/RatingsChart';
import FilterPanel, { type BaseSort, type CustomSort } from '@/components/FilterPanel';
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
      <HomeView />
    </LibraryProvider>
  );
}

function HomeView() {
  const { library } = useLibrary();
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
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
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
            <p className="text-foreground mb-2">No podcasts in library</p>
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
