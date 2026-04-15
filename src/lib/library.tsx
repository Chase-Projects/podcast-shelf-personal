'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CustomRating, FavoriteEpisode, Library, LibraryPodcast } from '@/types';
import seedLibrary from '../../content/library.json';

const STORAGE_KEY = 'podcast-shelf:library:v1';
const DIRTY_KEY = 'podcast-shelf:dirty:v1';

interface LibraryContextValue {
  library: Library;
  dirty: boolean;
  addPodcast: (p: Omit<LibraryPodcast, 'addedAt' | 'updatedAt' | 'customRatings' | 'favoriteEpisodes' | 'overallRating' | 'reviewText' | 'isFavorite'>) => void;
  updatePodcast: (itunesId: string, patch: Partial<LibraryPodcast>) => void;
  removePodcast: (itunesId: string) => void;
  setOverallRating: (itunesId: string, rating: number | null) => void;
  setReviewText: (itunesId: string, text: string) => void;
  toggleFavorite: (itunesId: string) => void;
  addCustomRating: (itunesId: string, category: string) => void;
  updateCustomRating: (itunesId: string, category: string, rating: number) => void;
  removeCustomRating: (itunesId: string, category: string) => void;
  addFavoriteEpisode: (itunesId: string, ep: FavoriteEpisode) => void;
  removeFavoriteEpisode: (itunesId: string, title: string) => void;
  setDisplayName: (name: string) => void;
  exportJson: () => string;
  importJson: (text: string) => { ok: true } | { ok: false; error: string };
  discardLocalChanges: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function hydrate(): { library: Library; dirty: boolean } {
  if (typeof window === 'undefined') {
    return { library: seedLibrary as Library, dirty: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dirty = localStorage.getItem(DIRTY_KEY) === '1';
    if (stored) {
      const parsed = JSON.parse(stored) as Library;
      return { library: parsed, dirty };
    }
  } catch {
    // fall through to seed
  }
  return { library: seedLibrary as Library, dirty: false };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library>(seedLibrary as Library);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { library, dirty } = hydrate();
    setLibrary(library);
    setDirty(dirty);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Library) => {
    setLibrary(next);
    setDirty(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(DIRTY_KEY, '1');
    } catch {
      // quota or private mode — silently ignore
    }
  }, []);

  const mutatePodcast = useCallback(
    (itunesId: string, fn: (p: LibraryPodcast) => LibraryPodcast) => {
      setLibrary((prev) => {
        const now = new Date().toISOString();
        const next: Library = {
          ...prev,
          podcasts: prev.podcasts.map((p) =>
            p.itunesId === itunesId ? { ...fn(p), updatedAt: now } : p
          ),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(DIRTY_KEY, '1');
        } catch {
          // ignore
        }
        setDirty(true);
        return next;
      });
    },
    []
  );

  const addPodcast: LibraryContextValue['addPodcast'] = useCallback(
    (p) => {
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
        const next: Library = { ...prev, podcasts: [newPodcast, ...prev.podcasts] };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(DIRTY_KEY, '1');
        } catch {
          // ignore
        }
        setDirty(true);
        return next;
      });
    },
    []
  );

  const updatePodcast = useCallback<LibraryContextValue['updatePodcast']>(
    (itunesId, patch) => mutatePodcast(itunesId, (p) => ({ ...p, ...patch })),
    [mutatePodcast]
  );

  const removePodcast = useCallback<LibraryContextValue['removePodcast']>(
    (itunesId) => {
      setLibrary((prev) => {
        const next: Library = {
          ...prev,
          podcasts: prev.podcasts.filter((p) => p.itunesId !== itunesId),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(DIRTY_KEY, '1');
        } catch {
          // ignore
        }
        setDirty(true);
        return next;
      });
    },
    []
  );

  const setOverallRating = useCallback<LibraryContextValue['setOverallRating']>(
    (itunesId, rating) => mutatePodcast(itunesId, (p) => ({ ...p, overallRating: rating })),
    [mutatePodcast]
  );

  const setReviewText = useCallback<LibraryContextValue['setReviewText']>(
    (itunesId, text) => mutatePodcast(itunesId, (p) => ({ ...p, reviewText: text || null })),
    [mutatePodcast]
  );

  const toggleFavorite = useCallback<LibraryContextValue['toggleFavorite']>(
    (itunesId) => mutatePodcast(itunesId, (p) => ({ ...p, isFavorite: !p.isFavorite })),
    [mutatePodcast]
  );

  const addCustomRating = useCallback<LibraryContextValue['addCustomRating']>(
    (itunesId, category) =>
      mutatePodcast(itunesId, (p) => {
        if (p.customRatings.some((cr) => cr.category === category)) return p;
        return {
          ...p,
          customRatings: [...p.customRatings, { category, rating: 3 }],
        };
      }),
    [mutatePodcast]
  );

  const updateCustomRating = useCallback<LibraryContextValue['updateCustomRating']>(
    (itunesId, category, rating) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        customRatings: p.customRatings.map((cr) =>
          cr.category === category ? { ...cr, rating } : cr
        ),
      })),
    [mutatePodcast]
  );

  const removeCustomRating = useCallback<LibraryContextValue['removeCustomRating']>(
    (itunesId, category) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        customRatings: p.customRatings.filter((cr) => cr.category !== category),
      })),
    [mutatePodcast]
  );

  const addFavoriteEpisode = useCallback<LibraryContextValue['addFavoriteEpisode']>(
    (itunesId, ep) =>
      mutatePodcast(itunesId, (p) => {
        if (p.favoriteEpisodes.some((e) => e.title === ep.title)) return p;
        return { ...p, favoriteEpisodes: [...p.favoriteEpisodes, ep] };
      }),
    [mutatePodcast]
  );

  const removeFavoriteEpisode = useCallback<LibraryContextValue['removeFavoriteEpisode']>(
    (itunesId, title) =>
      mutatePodcast(itunesId, (p) => ({
        ...p,
        favoriteEpisodes: p.favoriteEpisodes.filter((e) => e.title !== title),
      })),
    [mutatePodcast]
  );

  const setDisplayName = useCallback((name: string) => {
    setLibrary((prev) => {
      const next = { ...prev, displayName: name };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(DIRTY_KEY, '1');
      } catch {
        // ignore
      }
      setDirty(true);
      return next;
    });
  }, []);

  const exportJson = useCallback(() => JSON.stringify(library, null, 2) + '\n', [library]);

  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.podcasts)) {
        return { ok: false as const, error: 'Not a valid library.json (expected version: 1)' };
      }
      persist(parsed as Library);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [persist]);

  const discardLocalChanges = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DIRTY_KEY);
    } catch {
      // ignore
    }
    setLibrary(seedLibrary as Library);
    setDirty(false);
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      library,
      dirty,
      addPodcast,
      updatePodcast,
      removePodcast,
      setOverallRating,
      setReviewText,
      toggleFavorite,
      addCustomRating,
      updateCustomRating,
      removeCustomRating,
      addFavoriteEpisode,
      removeFavoriteEpisode,
      setDisplayName,
      exportJson,
      importJson,
      discardLocalChanges,
    }),
    [
      library,
      dirty,
      addPodcast,
      updatePodcast,
      removePodcast,
      setOverallRating,
      setReviewText,
      toggleFavorite,
      addCustomRating,
      updateCustomRating,
      removeCustomRating,
      addFavoriteEpisode,
      removeFavoriteEpisode,
      setDisplayName,
      exportJson,
      importJson,
      discardLocalChanges,
    ]
  );

  // Suppress hydration flicker on first render — render the seed until client hydrates.
  void hydrated;

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}

export type { CustomRating, FavoriteEpisode, LibraryPodcast };
