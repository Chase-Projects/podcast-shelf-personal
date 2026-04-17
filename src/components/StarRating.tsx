'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 20,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? rating ?? 0;

  const handleClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onChange) return;
    onChange(isHalf ? starIndex + 0.5 : starIndex + 1);
  };

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHoverRating(isHalf ? starIndex + 0.5 : starIndex + 1);
  };

  return (
    <div className="flex" onMouseLeave={() => setHoverRating(null)}>
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const filled = displayRating >= starIndex + 1;
        const halfFilled = !filled && displayRating >= starIndex + 0.5;
        return (
          <div
            key={starIndex}
            className={`relative ${readonly ? '' : 'cursor-pointer'}`}
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isHalf = e.clientX - rect.left < rect.width / 2;
              handleClick(starIndex, isHalf);
            }}
          >
            {halfFilled ? (
              <div className="relative">
                <Star size={size} className="text-star-empty" fill="currentColor" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star size={size} className="text-star" fill="currentColor" />
                </div>
              </div>
            ) : (
              <Star
                size={size}
                className={filled ? 'text-star' : 'text-star-empty'}
                fill="currentColor"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
