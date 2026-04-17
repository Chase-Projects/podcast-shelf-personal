'use client';

import Image from 'next/image';
import { Star, ExternalLink } from 'lucide-react';
import type { LibraryPodcast } from '@/types';

interface Props {
  podcasts: LibraryPodcast[];
}

export default function GlobalFavoriteEpisodes({ podcasts }: Props) {
  const items = podcasts.flatMap((p) =>
    p.favoriteEpisodes
      .filter((e) => e.isGlobalFavorite)
      .map((e) => ({ podcast: p, episode: e }))
  );

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star size={20} className="text-accent" fill="currentColor" />
        <h2 className="text-lg font-semibold text-foreground-bright">
          Global Favorite Episodes
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(({ podcast, episode }) => {
          const artwork = episode.artworkUrl ?? podcast.artworkUrl;
          const searchUrl = `https://podcasts.apple.com/search?term=${encodeURIComponent(
            `${podcast.title} ${episode.title}`
          )}`;
          return (
            <a
              key={`${podcast.itunesId}-${episode.title}`}
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors group"
            >
              <Image
                src={artwork}
                alt={episode.title}
                width={56}
                height={56}
                className="rounded flex-shrink-0"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground-bright font-medium line-clamp-2">
                  {episode.title}
                </p>
                <p className="text-xs text-foreground mt-0.5 truncate">
                  {podcast.title}
                </p>
                {episode.reviewText && (
                  <p className="text-xs text-foreground mt-1 line-clamp-2">
                    {episode.reviewText}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={10} />
                  Apple Podcasts
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
