'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CustomRating, FavoriteEpisode, Library, LibraryPodcast } from '@/types';

interface LibraryContextValue {
  library: Library;
  readOnly: boolean;
  dirty: boolean;
  resetDirty: () => void;
  replaceLibrary: (next: Library) => void;
  addPodcast: (
    p: Omit<
      LibraryPodcast,
      'addedAt' | 'updatedAt' | 'customRatings' | 'favoriteEpisodes' | 'overallRating' | 'reviewText' | 'isFavorite'
    >
  ) => void;
  removePodcast: (itunesId: string) => void;
  setOverallRating: (itunesId: string, rating: number | null) => void;
  setReviewText: (itunesId: string, text: string) => void;
  toggleFavorite: (itunesId: string) => void;
  addCustomRating: (itunesId: string, category: string) => void;
  updateCustomRating: (itunesId: string, category: string, rating: number) => void;
  removeCustomRating: (itunesId: string, category: string) => void;
  addFavoriteEpisode: (itunesId: string, ep: FavoriteEpisode) => void;
  removeFavoriteEpisode: (itunesId: string, title: string) => void;
  exportJson: () => string;
  importJson: (text: string) => { ok: true } | { ok: false; error: string };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

interface LibraryProviderProps {
  children: ReactNode;
  initialLibrary: Library;
  readOnly?: boolean;
}

export function LibraryProvider({
  children,
  initialLibrary,
  readOnly = false,
}: LibraryProviderProps) {
  const [library, setLibrary] = useState<Library>(initialLibrary);
  const [dirty, setDirty] = useState(false);

  const mutatePodcast = useCallback(
    (itunesId: string, fn: (p: LibraryPodcast) => LibraryPodcast) => {
      if (readOnly) return;
      setLibrary((prev) => {
        const now = new Date().toISOString();
        return {
          ...prev,
          podcasts: prev.podcasts.map((p) =>
            p.itunesId === itunesId ? { ...fn(p), updatedAt: now } : p
          ),
        };
      });
      setDirty(true);
    },
    [readOnly]
  );

  const replaceLibrary = useCallback((next: Library) => {
    setLibrary(next);
    setDirty(false);
  }, []);

  const resetDirty = useCallback(() => setDirty(false), []);

  const addPodcast: LibraryContextValue['addPodcast'] = useCallback(
    (p) => {
      if (readOnly) return;
      setLibrary((prev) => {
        if (prev.podcasts.some((x) => x.itunesId === p.itunesId)) return prev;
        const now = new Date().toISOString();
        const newPodcast: LibraryPodcast = {
          ...p,
          overallRating: null,
          reviewText: null,
          isFavorite: false,
          addedAt: now,
          updatedAt: now,
          customRatings: [],
          favoriteEpisodes: [],
        };
        return { ...prev, podcasts: [newPodcast, ...prev.podcasts] };
      });
      setDirty(true);
    },
    [readOnly]
  );

  const removePodcast = useCallback(
    (itunesId: string) => {
      if (readOnly) return;
      setLibrary((prev) => ({
        ...prev,
        podcasts: prev.podcasts.filter((p) => p.itunesId !== itunesId),
      }));
      setDirty(true);
    },
    [readOnly]
  );

  const setOverallRating = useCallback(
    (itunesId: string, rating: number | null) =>
      mutatePodcast(itunesId, (p) => ({ ...p, overallRating: rating })),
    [mutatePodcast]
  );

  const setReviewText = useCallback(
    (itunesId: string, text: string) =>
      mutatePodcast(itunesId, (p) => ({ ...p, reviewText: text || null })),
    [mutatePodcast]
  );

  const toggleFavorite = useCallback(
    (itunesId: string) => mutatePodcast(itunesId, (p) => ({ ...p, isFavorite: !p.isFavorite })),
    [mutatePodcast]
  );

  const addCustomRating = useCallback(
    (itunesId: string, category: string) =>
      mutatePodcast(itunesId, (p) => {
        if (p.customRatings.some((cr) => cr.category === category)) return p;
        return { ...p, customRatings: [...p.customRatings, { category, rating: 3 }] };
      }),
    [mutatePodcast]
  );

  const updateCustomRating = useCallback(
    (itunesId: string, category: string, rating: number) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        customRatings: p.customRatings.map((cr) =>
          cr.category === category ? { ...cr, rating } : cr
        ),
      })),
    [mutatePodcast]
  );

  const removeCustomRating = useCallback(
    (itunesId: string, category: string) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        customRatings: p.customRatings.filter((cr) => cr.category !== category),
      })),
    [mutatePodcast]
  );

  const addFavoriteEpisode = useCallback(
    (itunesId: string, ep: FavoriteEpisode) =>
      mutatePodcast(itunesId, (p) => {
        if (p.favoriteEpisodes.some((e) => e.title === ep.title)) return p;
        return { ...p, favoriteEpisodes: [...p.favoriteEpisodes, ep] };
      }),
    [mutatePodcast]
  );

  const removeFavoriteEpisode = useCallback(
    (itunesId: string, title: string) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        favoriteEpisodes: p.favoriteEpisodes.filter((e) => e.title !== title),
      })),
    [mutatePodcast]
  );

  const exportJson = useCallback(() => JSON.stringify(library, null, 2) + '\n', [library]);

  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.podcasts)) {
        return { ok: false as const, error: 'Not a valid library.json (expected version: 1)' };
      }
      setLibrary(parsed as Library);
      setDirty(true);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      library,
      readOnly,
      dirty,
      resetDirty,
      replaceLibrary,
      addPodcast,
      removePodcast,
      setOverallRating,
      setReviewText,
      toggleFavorite,
      addCustomRating,
      updateCustomRating,
      removeCustomRating,
      addFavoriteEpisode,
      removeFavoriteEpisode,
      exportJson,
      importJson,
    }),
    [
      library,
      readOnly,
      dirty,
      resetDirty,
      replaceLibrary,
      addPodcast,
      removePodcast,
      setOverallRating,
      setReviewText,
      toggleFavorite,
      addCustomRating,
      updateCustomRating,
      removeCustomRating,
      addFavoriteEpisode,
      removeFavoriteEpisode,
      exportJson,
      importJson,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}

export type { CustomRating, FavoriteEpisode, LibraryPodcast };
