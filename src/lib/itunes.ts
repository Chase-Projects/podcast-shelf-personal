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

export async function lookupEpisodes(
  itunesId: string,
  query?: string
): Promise<ITunesEpisode[]> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${itunesId}&entity=podcastEpisode&limit=50`
  );
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data = await res.json();
  type Raw = {
    trackId: number;
    trackName: string;
    trackTimeMillis?: number;
    releaseDate?: string;
    description?: string;
    episodeUrl?: string;
    trackViewUrl?: string;
  };
  const episodes: ITunesEpisode[] = (data.results || []).slice(1).map((ep: Raw) => ({
    id: ep.trackId,
    title: ep.trackName,
    duration: ep.trackTimeMillis,
    releaseDate: ep.releaseDate,
    description: ep.description,
    episodeUrl: ep.episodeUrl ?? ep.trackViewUrl,
  }));
  if (query && query.length >= 2) {
    const q = query.toLowerCase();
    return episodes.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }
  return episodes;
}
