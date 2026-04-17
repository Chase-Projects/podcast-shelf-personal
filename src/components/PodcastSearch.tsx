'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, Plus, Check, Loader2 } from 'lucide-react';
import type { ITunesPodcast } from '@/types';
import { searchPodcasts } from '@/lib/itunes';
import { useLibrary } from '@/lib/library';

const FALLBACK_ARTWORK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e47e2e'/><text x='50' y='66' text-anchor='middle' font-size='56' fill='%23fff' font-family='sans-serif'>%F0%9F%8E%99</text></svg>";

const EMPTY_MANUAL = {
  title: '',
  author: '',
  link: '',
  artworkUrl: '',
  feedUrl: '',
};

export default function PodcastSearch() {
  const { library, addPodcast } = useLibrary();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesPodcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
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

  const handleAddManual = () => {
    const title = manual.title.trim();
    if (!title) return;
    addPodcast({
      itunesId: `manual-${Date.now()}`,
      title,
      author: manual.author.trim() || 'Unknown',
      artworkUrl: manual.artworkUrl.trim() || FALLBACK_ARTWORK,
      feedUrl: manual.feedUrl.trim() || null,
      itunesUrl: manual.link.trim() || null,
      artistUrl: null,
    });
    setManual(EMPTY_MANUAL);
    setManualMode(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
        <button
          onClick={() => setManualMode((v) => !v)}
          className="text-sm px-3 py-2.5 bg-background-secondary border border-border rounded text-foreground hover:text-accent hover:border-accent transition-colors whitespace-nowrap"
          title="Add a subscriber-only or unlisted podcast by link"
        >
          Add manually
        </button>
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

      {manualMode && (
        <div className="mt-3 space-y-2 p-3 bg-background-secondary border border-border rounded-lg">
          <p className="text-xs text-foreground">
            Add a podcast that isn&apos;t on iTunes — e.g. a Patreon or private
            feed. Only the title is required.
          </p>
          <input
            type="text"
            value={manual.title}
            onChange={(e) => setManual({ ...manual, title: e.target.value })}
            placeholder="Title *"
            className="w-full text-sm"
            autoFocus
          />
          <input
            type="text"
            value={manual.author}
            onChange={(e) => setManual({ ...manual, author: e.target.value })}
            placeholder="Author / host (optional)"
            className="w-full text-sm"
          />
          <input
            type="url"
            value={manual.link}
            onChange={(e) => setManual({ ...manual, link: e.target.value })}
            placeholder="Link URL (Patreon page, website, etc.)"
            className="w-full text-sm"
          />
          <input
            type="url"
            value={manual.artworkUrl}
            onChange={(e) => setManual({ ...manual, artworkUrl: e.target.value })}
            placeholder="Artwork image URL (optional)"
            className="w-full text-sm"
          />
          <input
            type="url"
            value={manual.feedUrl}
            onChange={(e) => setManual({ ...manual, feedUrl: e.target.value })}
            placeholder="RSS feed URL (optional)"
            className="w-full text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddManual}
              disabled={!manual.title.trim()}
              className="flex-1 py-1.5 bg-accent text-background text-sm rounded disabled:opacity-50"
            >
              Add Podcast
            </button>
            <button
              onClick={() => {
                setManual(EMPTY_MANUAL);
                setManualMode(false);
              }}
              className="px-3 py-1.5 text-foreground hover:text-foreground-bright text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
