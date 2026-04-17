'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
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

  useEffect(() => {
    if (!library || tiers.length === 0) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash.startsWith('tier-')) return;
    const el = document.getElementById(hash);
    if (el) {
      const t = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return () => window.clearTimeout(t);
    }
  }, [library, tiers]);

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
                  ? 'bg-accent text-background border-accent'
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
                    ? 'bg-accent text-background border-accent'
                    : 'border-border text-foreground hover:text-accent'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        {tiers.length > 0 && (
          <div className="flex items-center gap-2 mb-8 sticky top-0 py-3 bg-background z-10 border-b border-border">
            <label htmlFor="tier-jump" className="text-xs text-foreground">
              Jump to
            </label>
            <select
              id="tier-jump"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const el = document.getElementById(`tier-${v}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                e.target.value = '';
              }}
              className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
            >
              <option value="" disabled>
                Select rating...
              </option>
              {tiers.map(({ tier, podcasts }) => (
                <option key={tier} value={tier}>
                  {tier % 1 === 0.5 ? `${Math.floor(tier)}½` : tier} stars ({podcasts.length})
                </option>
              ))}
            </select>
          </div>
        )}

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
