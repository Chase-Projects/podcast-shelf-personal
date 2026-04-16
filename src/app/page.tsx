'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpDown, Loader2, Star } from 'lucide-react';
import Header from '@/components/Header';
import PodcastEditor from '@/components/PodcastEditor';
import RatingsChart from '@/components/RatingsChart';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { LIBRARY_RAW_URL } from '@/lib/github';
import type { Library } from '@/types';

type SortOption = 'recent' | 'name' | 'rating' | string;

export default function Home() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Append a cache-busting param so visitors always see the latest data,
    // bypassing raw.githubusercontent.com's CDN cache (typically ~5 min).
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

        {(overallRatings.some((r) => r !== null) || customRatingsData.length > 0) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground-bright mb-4">
              Rating Distributions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-background-secondary rounded-lg h-48">
                <RatingsChart ratings={overallRatings} title="Overall" height={100} />
              </div>
              {customRatingsData.map(({ name, ratings }) => (
                <div key={name} className="p-4 bg-background-secondary rounded-lg h-48">
                  <RatingsChart ratings={ratings} title={name} height={100} />
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
            <p className="text-foreground mb-2">No podcasts in library</p>
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
