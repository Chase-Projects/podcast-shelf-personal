'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Loader2, Heart, ExternalLink, Search } from 'lucide-react';
import type { FavoriteEpisode, ITunesEpisode } from '@/types';
import { useLibrary } from '@/lib/library';
import { lookupEpisodes } from '@/lib/itunes';

interface Props {
  itunesId: string;
  podcastName: string;
  episodes: FavoriteEpisode[];
}

export default function FavoriteEpisodes({ itunesId, podcastName, episodes }: Props) {
  const { addFavoriteEpisode, removeFavoriteEpisode } = useLibrary();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ITunesEpisode[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await lookupEpisodes(itunesId, searchQuery);
        setSearchResults(results);
        setIsSearchOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, itunesId]);

  const handleAddFromSearch = (episode: ITunesEpisode) => {
    addFavoriteEpisode(itunesId, {
      title: episode.title,
      number: null,
      notes: null,
      addedAt: new Date().toISOString(),
    });
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsAdding(false);
  };

  const handleAddManual = () => {
    if (!title.trim()) return;
    addFavoriteEpisode(itunesId, {
      title: title.trim(),
      number: episodeNumber.trim() || null,
      notes: notes.trim() || null,
      addedAt: new Date().toISOString(),
    });
    setTitle('');
    setEpisodeNumber('');
    setNotes('');
    setIsAdding(false);
    setManualMode(false);
  };

  const getITunesSearchUrl = (episodeTitle: string) =>
    `https://podcasts.apple.com/search?term=${encodeURIComponent(`${podcastName} ${episodeTitle}`)}`;

  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <div
          key={episode.title}
          className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg"
        >
          <Heart size={16} className="text-accent mt-0.5 flex-shrink-0" fill="currentColor" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground-bright font-medium">
              {episode.number && <span className="text-foreground mr-1">#{episode.number}</span>}
              {episode.title}
            </p>
            {episode.notes && <p className="text-xs text-foreground mt-1">{episode.notes}</p>}
            <a
              href={getITunesSearchUrl(episode.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover mt-1"
            >
              <ExternalLink size={10} />
              Find on Apple Podcasts
            </a>
          </div>
          <button
            onClick={() => removeFavoriteEpisode(itunesId, episode.title)}
            className="p-1 text-foreground hover:text-red-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
          {!manualMode ? (
            <>
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground"
                    size={14}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
                    placeholder="Search episodes..."
                    className="w-full pl-9 pr-4 py-2 text-sm"
                    autoFocus
                  />
                  {searchLoading && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground animate-spin"
                      size={14}
                    />
                  )}
                </div>
                {isSearchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                    {searchResults.map((episode) => (
                      <button
                        key={episode.id}
                        onClick={() => handleAddFromSearch(episode)}
                        className="w-full text-left px-3 py-2 hover:bg-background-tertiary transition-colors border-b border-border last:border-b-0"
                      >
                        <p className="text-sm text-foreground-bright truncate">{episode.title}</p>
                        {episode.releaseDate && (
                          <p className="text-xs text-foreground">
                            {new Date(episode.releaseDate).toLocaleDateString()}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-foreground">Can&apos;t find it?</span>
                <button
                  onClick={() => setManualMode(true)}
                  className="text-accent hover:text-accent-hover"
                >
                  Add manually
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode title..."
                className="w-full text-sm"
                autoFocus
              />
              <input
                type="text"
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
                placeholder="Episode number (optional)"
                className="w-full text-sm"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddManual}
                  disabled={!title.trim()}
                  className="flex-1 py-1.5 bg-accent text-background text-sm rounded disabled:opacity-50"
                >
                  Add Episode
                </button>
                <button
                  onClick={() => setManualMode(false)}
                  className="px-3 py-1.5 text-foreground hover:text-foreground-bright text-sm"
                >
                  Back to Search
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => {
              setIsAdding(false);
              setManualMode(false);
              setSearchQuery('');
              setTitle('');
              setEpisodeNumber('');
              setNotes('');
            }}
            className="w-full py-1.5 text-foreground hover:text-foreground-bright text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          <Plus size={14} />
          Add favorite episode
        </button>
      )}
    </div>
  );
}
