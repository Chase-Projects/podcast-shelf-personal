import { ITunesEpisode, ITunesPodcast } from '@/types';

export async function searchPodcasts(query: string): Promise<ITunesPodcast[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity: 'podcast',
    limit: '20',
  });
  const res = await fetch(`https://itunes.apple.com/search?${params}`);
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

type RawEpisode = {
  trackId: number;
  trackName: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  description?: string;
  episodeUrl?: string;
  trackViewUrl?: string;
  artworkUrl600?: string;
  artworkUrl160?: string;
  artworkUrl60?: string;
};

/**
 * Fetch episodes for a podcast, newest first. iTunes lookup doesn't support
 * offset, so paging is done by increasing `limit` on each call. Max ~200.
 */
export async function lookupEpisodes(
  itunesId: string,
  limit: number = 50
): Promise<ITunesEpisode[]> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${itunesId}&entity=podcastEpisode&limit=${limit}`
  );
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data = await res.json();
  const episodes: ITunesEpisode[] = (data.results || [])
    .slice(1)
    .map((ep: RawEpisode) => ({
      id: ep.trackId,
      title: ep.trackName,
      duration: ep.trackTimeMillis,
      releaseDate: ep.releaseDate,
      description: ep.description,
      episodeUrl: ep.trackViewUrl ?? ep.episodeUrl,
      artworkUrl: ep.artworkUrl600 ?? ep.artworkUrl160 ?? ep.artworkUrl60,
    }));
  episodes.sort((a, b) => {
    const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
    const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
    return db - da;
  });
  return episodes;
}
