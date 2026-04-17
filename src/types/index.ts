export interface CustomRating {
  category: string;
  rating: number;
}

export interface FavoriteEpisode {
  title: string;
  number: string | null;
  notes: string | null;
  addedAt: string | null;
  isGlobalFavorite?: boolean;
  artworkUrl?: string | null;
  reviewText?: string | null;
  episodeUrl?: string | null;
}

export interface LibraryPodcast {
  itunesId: string;
  title: string;
  author: string;
  artworkUrl: string;
  feedUrl: string | null;
  itunesUrl: string | null;
  artistUrl: string | null;
  overallRating: number | null;
  reviewText: string | null;
  isFavorite: boolean;
  addedAt: string | null;
  updatedAt: string | null;
  customRatings: CustomRating[];
  favoriteEpisodes: FavoriteEpisode[];
}

export interface Library {
  version: 1;
  displayName: string;
  podcasts: LibraryPodcast[];
}

export interface ITunesPodcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  feedUrl?: string;
  collectionViewUrl?: string;
  artistViewUrl?: string;
}

export interface ITunesEpisode {
  id: number;
  title: string;
  duration?: number;
  releaseDate?: string;
  description?: string;
  episodeUrl?: string;
  artworkUrl?: string;
}
