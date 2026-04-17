'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Star } from 'lucide-react';
import Header from '@/components/Header';
import StarRating from '@/components/StarRating';
import { LIBRARY_RAW_URL } from '@/lib/github';
import type { Library, LibraryPodcast } from '@/types';

const TIERS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

function getRating(p: LibraryPodcast, category: string | null): number | null {
  if (!category) return p.overallRating;
  return p.customRatings.find((cr) => cr.category === category)?.rating ?? null;
}

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

function RatingsContent() {
  const params = useSearchParams();
  const category = params.get('category');

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

  const categories = useMemo(() => {
    if (!library) return [];
    const set = new Set<string>();
    for (const p of library.podcasts)
      for (const cr of p.customRatings) set.add(cr.category);
    return [...set].sort();
  }, [library]);

  const tiers = useMemo(() => {
    if (!library) return [];
    return TIERS.map((tier) => ({
      tier,
      podcasts: library.podcasts
        .filter((p) => {
          const r = getRating(p, category);
          return r !== null && roundToHalf(r) === tier;
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    })).filter((t) => t.podcasts.length > 0);
  }, [library, category]);

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

  const heading = category ? category : 'Overall rating';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-foreground hover:text-accent mb-4"
        >
          <ArrowLeft size={14} />
          Back to shelf
        </Link>

        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground-bright">Browse by rating</h1>
            <p className="text-sm text-foreground mt-1">{heading}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Link
              href="/ratings"
              className={`px-2 py-1 rounded border ${
                !category
                  ? 'bg-accent text-background-tertiary border-accent'
                  : 'border-border text-foreground hover:text-accent'
              }`}
            >
              Overall
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/ratings?category=${encodeURIComponent(cat)}`}
                className={`px-2 py-1 rounded border ${
                  category === cat
                    ? 'bg-accent text-background-tertiary border-accent'
                    : 'border-border text-foreground hover:text-accent'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 py-3 bg-background z-10 border-b border-border">
          {tiers.map(({ tier, podcasts }) => {
            const fullStars = Math.floor(tier);
            const hasHalf = tier % 1 === 0.5;
            return (
              <a
                key={tier}
                href={`#tier-${tier}`}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-background-secondary border border-border text-foreground hover:text-accent hover:border-accent transition-colors"
              >
                <span className="flex items-center text-star">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                  ))}
                  {hasHalf && (
                    <span className="relative inline-block" style={{ width: 12, height: 12 }}>
                      <Star
                        size={12}
                        className="absolute inset-0 text-star-empty"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      <span className="absolute inset-0 overflow-hidden" style={{ width: 6 }}>
                        <Star size={12} fill="currentColor" strokeWidth={0} />
                      </span>
                    </span>
                  )}
                </span>
                <span className="text-foreground">({podcasts.length})</span>
              </a>
            );
          })}
        </div>

        {tiers.length === 0 ? (
          <div className="text-center py-16 bg-background-secondary rounded-lg">
            <p className="text-foreground text-sm">No ratings yet for {heading}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {tiers.map(({ tier, podcasts }) => (
              <section key={tier} id={`tier-${tier}`} className="scroll-mt-20">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-foreground-bright">{tier}</h2>
                  <StarRating rating={tier} readonly size={18} />
                  <span className="text-sm text-foreground">
                    {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {podcasts.map((p) => (
                    <Link
                      key={p.itunesId}
                      href={`/?focus=${p.itunesId}#podcast-${p.itunesId}`}
                      className="group"
                      title={`Open ${p.title} on shelf`}
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={p.artworkUrl}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:opacity-80 transition-opacity"
                          unoptimized
                        />
                      </div>
                      <p className="text-xs text-foreground-bright mt-1 line-clamp-2">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-foreground truncate">{p.author}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function RatingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-foreground">
          <Loader2 className="animate-spin" size={24} />
        </div>
      }
    >
      <RatingsContent />
    </Suspense>
  );
}
