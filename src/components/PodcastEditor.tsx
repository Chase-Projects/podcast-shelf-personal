'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Trash2, ExternalLink, Star } from 'lucide-react';
import type { LibraryPodcast } from '@/types';
import StarRating from './StarRating';
import CustomRatings from './CustomRatings';
import FavoriteEpisodes from './FavoriteEpisodes';
import { useLibrary } from '@/lib/library';

interface Props {
  podcast: LibraryPodcast;
  expanded: boolean;
  onToggle: () => void;
}

export default function PodcastEditor({ podcast, expanded, onToggle }: Props) {
  const { setOverallRating, setReviewText, toggleFavorite, removePodcast } = useLibrary();
  const [reviewDraft, setReviewDraft] = useState(podcast.reviewText || '');

  useEffect(() => {
    setReviewDraft(podcast.reviewText || '');
  }, [podcast.reviewText, podcast.itunesId]);

  const handleDelete = () => {
    if (!confirm(`Remove "${podcast.title}" from your library?`)) return;
    removePodcast(podcast.itunesId);
  };

  return (
    <div className="bg-background-secondary rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-background-tertiary transition-colors"
        onClick={onToggle}
      >
        <Image
          src={podcast.artworkUrl}
          alt={podcast.title}
          width={64}
          height={64}
          className="rounded"
          unoptimized
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground-bright truncate">{podcast.title}</h3>
          <p className="text-sm text-foreground truncate">{podcast.author}</p>
          <div className="mt-1">
            <StarRating rating={podcast.overallRating} readonly size={14} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {podcast.itunesUrl && (
            <a
              href={podcast.itunesUrl}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-foreground hover:text-accent transition-colors"
              title="Open on Apple Podcasts"
            >
              <ExternalLink size={18} />
            </a>
          )}
          {expanded ? (
            <ChevronUp size={20} className="text-foreground" />
          ) : (
            <ChevronDown size={20} className="text-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="grid md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-2">Overall Rating</label>
                <StarRating
                  rating={podcast.overallRating}
                  onChange={(r) => setOverallRating(podcast.itunesId, r)}
                  size={24}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Custom Ratings</label>
                <CustomRatings itunesId={podcast.itunesId} ratings={podcast.customRatings} />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Review</label>
                <textarea
                  value={reviewDraft}
                  onChange={(e) => setReviewDraft(e.target.value)}
                  onBlur={() => setReviewText(podcast.itunesId, reviewDraft)}
                  placeholder="Write your thoughts..."
                  className="w-full text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Favorite Episodes</label>
              <FavoriteEpisodes
                itunesId={podcast.itunesId}
                podcastName={podcast.title}
                episodes={podcast.favoriteEpisodes}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <button
              onClick={() => toggleFavorite(podcast.itunesId)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                podcast.isFavorite ? 'text-accent' : 'text-foreground hover:text-accent'
              }`}
            >
              <Star size={16} fill={podcast.isFavorite ? 'currentColor' : 'none'} />
              {podcast.isFavorite ? 'Favorited' : 'Add to Favorites'}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={14} />
              Remove from library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
