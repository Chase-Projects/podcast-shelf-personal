'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  X,
  Loader2,
  Heart,
  Podcast,
  Search,
  Pencil,
} from 'lucide-react';
import type { FavoriteEpisode, ITunesEpisode } from '@/types';
import { useLibrary } from '@/lib/library';
import { lookupEpisodes } from '@/lib/itunes';

interface Props {
  itunesId: string;
  podcastName: string;
  podcastArtwork: string;
  episodes: FavoriteEpisode[];
}

const PAGE_SIZE = 25;

export default function FavoriteEpisodes({
  itunesId,
  podcastName,
  podcastArtwork,
  episodes,
}: Props) {
  const {
    readOnly,
    addFavoriteEpisode,
    removeFavoriteEpisode,
    updateFavoriteEpisode,
  } = useLibrary();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allEpisodes, setAllEpisodes] = useState<ITunesEpisode[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [loadedLimit, setLoadedLimit] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadEpisodes = useCallback(
    async (target: number) => {
      if (target <= loadedLimit) return;
      setLoading(true);
      try {
        const eps = await lookupEpisodes(itunesId, target);
        setAllEpisodes(eps);
        setLoadedLimit(target);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [itunesId, loadedLimit]
  );

  useEffect(() => {
    if (!isAdding || manualMode) return;
    if (loadedLimit === 0) void loadEpisodes(PAGE_SIZE);
  }, [isAdding, manualMode, loadedLimit, loadEpisodes]);

  // When the user starts searching, pull the full iTunes lookup (up to 200)
  // so results don't require scrolling to reveal older episodes first.
  useEffect(() => {
    if (!isAdding || manualMode) return;
    if (searchQuery.trim().length < 2) return;
    if (loadedLimit >= 200) return;
    void loadEpisodes(200);
  }, [isAdding, manualMode, searchQuery, loadedLimit, loadEpisodes]);

  const filtered = searchQuery.trim().length >= 2
    ? allEpisodes.filter((e) => {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
        );
      })
    : allEpisodes;

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit || loadedLimit < 200;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && !loading) {
      const next = limit + PAGE_SIZE;
      setLimit(next);
      if (next > loadedLimit && loadedLimit < 200) {
        void loadEpisodes(Math.min(loadedLimit + PAGE_SIZE * 2, 200));
      }
    }
  };

  const handleAddFromSearch = (episode: ITunesEpisode) => {
    addFavoriteEpisode(itunesId, {
      title: episode.title,
      number: null,
      notes: null,
      addedAt: new Date().toISOString(),
      artworkUrl: episode.artworkUrl ?? null,
      episodeUrl: episode.episodeUrl ?? null,
    });
    setSearchQuery('');
    setIsAdding(false);
  };

  const handleAddManual = () => {
    if (!title.trim()) return;
    addFavoriteEpisode(itunesId, {
      title: title.trim(),
      number: episodeNumber.trim() || null,
      notes: notes.trim() || null,
      addedAt: new Date().toISOString(),
      episodeUrl: manualUrl.trim() || null,
    });
    setTitle('');
    setEpisodeNumber('');
    setNotes('');
    setManualUrl('');
    setIsAdding(false);
    setManualMode(false);
  };

  const getEpisodeUrl = (episode: FavoriteEpisode) =>
    episode.episodeUrl ||
    `https://podcasts.apple.com/search?term=${encodeURIComponent(`${podcastName} ${episode.title}`)}`;

  if (readOnly && episodes.length === 0) {
    return <p className="text-sm text-foreground italic">No favorite episodes</p>;
  }

  return (
    <div className="space-y-3">
      {episodes.map((episode) => {
        const artwork = episode.artworkUrl ?? podcastArtwork;
        const isEditing = editingReview === episode.title;
        return (
          <div
            key={episode.title}
            className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg"
          >
            <a
              href={getEpisodeUrl(episode)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
              title="Open episode"
            >
              <Image
                src={artwork}
                alt={episode.title}
                width={48}
                height={48}
                className="rounded"
                unoptimized
              />
            </a>
            <div className="flex-1 min-w-0">
              <a
                href={getEpisodeUrl(episode)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-foreground-bright font-medium hover:text-accent transition-colors"
              >
                {episode.number && (
                  <span className="text-foreground mr-1">#{episode.number}</span>
                )}
                {episode.title}
              </a>
              {episode.notes && <p className="text-xs text-foreground mt-1">{episode.notes}</p>}
              {episode.reviewText && !isEditing && (
                <p className="text-xs text-foreground-bright mt-1 whitespace-pre-wrap">
                  {episode.reviewText}
                </p>
              )}
              {!readOnly && isEditing && (
                <div className="mt-2 space-y-1">
                  <textarea
                    value={reviewDraft}
                    onChange={(e) => setReviewDraft(e.target.value)}
                    placeholder="Episode review..."
                    className="w-full text-xs resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateFavoriteEpisode(itunesId, episode.title, {
                          reviewText: reviewDraft.trim() || null,
                        });
                        setEditingReview(null);
                      }}
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingReview(null)}
                      className="text-xs text-foreground hover:text-foreground-bright"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!readOnly && !isEditing && (
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => {
                      setEditingReview(episode.title);
                      setReviewDraft(episode.reviewText ?? '');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-foreground hover:text-foreground-bright"
                  >
                    <Pencil size={10} />
                    {episode.reviewText ? 'Edit review' : 'Add review'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <button
                onClick={() =>
                  !readOnly &&
                  updateFavoriteEpisode(itunesId, episode.title, {
                    isGlobalFavorite: !episode.isGlobalFavorite,
                  })
                }
                disabled={readOnly}
                className={`p-1 transition-colors ${
                  episode.isGlobalFavorite
                    ? 'text-accent'
                    : 'text-foreground hover:text-accent'
                } disabled:hover:text-foreground disabled:cursor-default`}
                title={
                  episode.isGlobalFavorite
                    ? 'Featured on home page'
                    : 'Feature on home page'
                }
              >
                <Heart size={14} fill={episode.isGlobalFavorite ? 'currentColor' : 'none'} />
              </button>
              {!readOnly && (
                <button
                  onClick={() => removeFavoriteEpisode(itunesId, episode.title)}
                  className="p-1 text-foreground hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {!readOnly && (isAdding ? (
        <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
          {!manualMode ? (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground"
                    size={14}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setLimit(PAGE_SIZE);
                    }}
                    placeholder="Filter recent episodes..."
                    className="w-full pl-10 pr-4 py-2 text-sm"
                    autoFocus
                  />
                  {loading && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground animate-spin"
                      size={14}
                    />
                  )}
                </div>
                <button
                  onClick={() => setManualMode(true)}
                  className="text-xs px-2 py-2 bg-background-secondary border border-border rounded text-foreground hover:text-accent hover:border-accent transition-colors whitespace-nowrap"
                  title="Add a subscriber-only or unlisted episode"
                >
                  Add manually
                </button>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-72 overflow-y-auto bg-background-secondary border border-border rounded-lg"
              >
                {visible.length === 0 && !loading && (
                  <p className="p-3 text-xs text-foreground">
                    {searchQuery
                      ? 'No matching episodes.'
                      : 'No episodes found.'}
                  </p>
                )}
                {visible.map((episode) => {
                  const art = episode.artworkUrl ?? podcastArtwork;
                  return (
                    <button
                      key={episode.id}
                      onClick={() => handleAddFromSearch(episode)}
                      className="w-full flex items-start gap-3 text-left px-3 py-2 hover:bg-background-tertiary transition-colors border-b border-border last:border-b-0"
                    >
                      <Image
                        src={art}
                        alt={episode.title}
                        width={40}
                        height={40}
                        className="rounded flex-shrink-0 mt-0.5"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground-bright break-words">
                          {episode.title}
                        </p>
                        {episode.releaseDate && (
                          <p className="text-xs text-foreground">
                            {new Date(episode.releaseDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {loading && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="animate-spin text-foreground" size={14} />
                  </div>
                )}
                {!loading && !hasMore && visible.length > 0 && (
                  <p className="p-2 text-[11px] text-foreground text-center">
                    End of episodes
                  </p>
                )}
              </div>
              <p className="text-[11px] text-foreground italic">
                Showing the most recent {Math.min(loadedLimit, 200)} episodes
                (iTunes caps lookups around 200). Subscriber-only episodes
                won&apos;t appear here — use &ldquo;Add manually&rdquo;.
              </p>
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
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="Episode URL (optional) — e.g. Patreon / private feed"
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
              <p className="text-[11px] text-foreground italic">
                Paste a Patreon / private feed URL to link the episode. Leave
                blank to fall back to an Apple Podcasts search.
              </p>
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
              setManualUrl('');
              setLimit(PAGE_SIZE);
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
      ))}
    </div>
  );
}
