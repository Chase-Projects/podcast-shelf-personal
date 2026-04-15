'use client';

import { useMemo, useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import type { CustomRating } from '@/types';
import StarRating from './StarRating';
import { useLibrary } from '@/lib/library';

interface Props {
  itunesId: string;
  ratings: CustomRating[];
}

export default function CustomRatings({ itunesId, ratings }: Props) {
  const { library, addCustomRating, updateCustomRating, removeCustomRating } = useLibrary();
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const previousCategories = useMemo(() => {
    const current = new Set(ratings.map((r) => r.category));
    const all = new Set<string>();
    for (const p of library.podcasts) {
      for (const cr of p.customRatings) all.add(cr.category);
    }
    return [...all].filter((c) => !current.has(c)).sort();
  }, [library, ratings]);

  const handleAdd = (name?: string) => {
    const cat = (name ?? newCategory).trim();
    if (!cat) return;
    addCustomRating(itunesId, cat);
    setNewCategory('');
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const filteredSuggestions = previousCategories.filter((c) =>
    c.toLowerCase().includes(newCategory.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {ratings.map((rating) => (
        <div key={rating.category} className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">{rating.category}</span>
          <div className="flex items-center gap-2">
            <StarRating
              rating={rating.rating}
              onChange={(r) => updateCustomRating(itunesId, rating.category, r)}
              size={16}
            />
            <button
              onClick={() => removeCustomRating(itunesId, rating.category)}
              className="p-1 text-foreground hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {isAdding ? (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Category name..."
                className="w-full text-sm py-1.5"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                  {filteredSuggestions.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleAdd(cat)}
                      className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-tertiary hover:text-foreground-bright transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAdd()}
              disabled={!newCategory.trim()}
              className="p-1.5 bg-accent text-background rounded disabled:opacity-50"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewCategory('');
                setShowSuggestions(false);
              }}
              className="p-1.5 text-foreground hover:text-foreground-bright"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            <Plus size={14} />
            Add custom rating
          </button>
          {previousCategories.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright transition-colors"
              >
                <ChevronDown size={14} />
              </button>
              {showSuggestions && (
                <div className="absolute top-full right-0 mt-1 bg-background-secondary border border-border rounded shadow-lg z-10 min-w-40 max-h-32 overflow-y-auto">
                  {previousCategories.slice(0, 10).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleAdd(cat)}
                      className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-tertiary hover:text-foreground-bright transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
