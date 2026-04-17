'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, Plus, Check, Loader2 } from 'lucide-react';
import type { ITunesPodcast } from '@/types';
import { searchPodcasts } from '@/lib/itunes';
import { useLibrary } from '@/lib/library';

export default function PodcastSearch() {
  const { library, addPodcast } = useLibrary();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesPodcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchPodcasts(query);
        setResults(r);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const existing = new Set(library.podcasts.map((p) => p.itunesId));

  const handleAdd = (podcast: ITunesPodcast) => {
    addPodcast({
      itunesId: podcast.collectionId.toString(),
      title: podcast.collectionName,
      author: podcast.artistName,
      artworkUrl: podcast.artworkUrl600,
      feedUrl: podcast.feedUrl ?? null,
      itunesUrl:
        podcast.collectionViewUrl ??
        `https://podcasts.apple.com/podcast/id${podcast.collectionId}`,
      artistUrl: podcast.artistViewUrl ?? null,
    });
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none"
          size={18}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search podcasts..."
          className="w-full pl-11 pr-4 py-2.5"
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground animate-spin"
            size={18}
          />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background-secondary border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {results.map((podcast) => {
            const already = existing.has(podcast.collectionId.toString());
            return (
              <div
                key={podcast.collectionId}
                className="flex items-center gap-3 p-3 hover:bg-background-tertiary transition-colors"
              >
                <Image
                  src={podcast.artworkUrl600}
                  alt={podcast.collectionName}
                  width={48}
                  height={48}
                  className="rounded"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground-bright font-medium truncate">
                    {podcast.collectionName}
                  </p>
                  <p className="text-sm text-foreground truncate">{podcast.artistName}</p>
                </div>
                <button
                  onClick={() => !already && handleAdd(podcast)}
                  disabled={already}
                  className="p-2 text-accent hover:bg-accent/10 rounded-full transition-colors disabled:opacity-50"
                  title={already ? 'Already in library' : 'Add to library'}
                >
                  {already ? <Check size={20} /> : <Plus size={20} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
