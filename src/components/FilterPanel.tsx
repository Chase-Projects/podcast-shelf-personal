'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, ArrowDown, ArrowUp, X } from 'lucide-react';

export type BaseSort = 'recent' | 'name' | 'rating';

export interface CustomSort {
  category: string;
  direction: 'desc' | 'asc';
}

interface Props {
  baseSort: BaseSort;
  onBaseSortChange: (s: BaseSort) => void;
  customCategories: string[];
  customSorts: CustomSort[];
  onCustomSortsChange: (next: CustomSort[]) => void;
}

export default function FilterPanel({
  baseSort,
  onBaseSortChange,
  customCategories,
  customSorts,
  onCustomSortsChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = new Set(customSorts.map((s) => s.category));

  const toggleCategory = (cat: string) => {
    if (selected.has(cat)) {
      onCustomSortsChange(customSorts.filter((s) => s.category !== cat));
    } else {
      onCustomSortsChange([...customSorts, { category: cat, direction: 'desc' }]);
    }
  };

  const flipDirection = (cat: string) => {
    onCustomSortsChange(
      customSorts.map((s) =>
        s.category === cat
          ? { ...s, direction: s.direction === 'desc' ? 'asc' : 'desc' }
          : s
      )
    );
  };

  const move = (cat: string, delta: number) => {
    const idx = customSorts.findIndex((s) => s.category === cat);
    const next = [...customSorts];
    const [item] = next.splice(idx, 1);
    next.splice(Math.max(0, Math.min(next.length, idx + delta)), 0, item);
    onCustomSortsChange(next);
  };

  const totalActive = customSorts.length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <select
          value={baseSort}
          onChange={(e) => onBaseSortChange(e.target.value as BaseSort)}
          className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
        >
          <option value="recent">Recently Updated</option>
          <option value="name">Name (A–Z)</option>
          <option value="rating">Overall Rating</option>
        </select>
      </div>

      {customCategories.length > 0 && (
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded border transition-colors ${
              totalActive > 0
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-background-secondary border-border text-foreground hover:text-foreground-bright'
            }`}
          >
            <SlidersHorizontal size={14} />
            Custom ratings
            {totalActive > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent text-background">
                {totalActive}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-background-secondary border border-border rounded-lg shadow-xl z-50 p-3">
              {customSorts.length > 0 && (
                <>
                  <p className="text-xs text-foreground mb-2 uppercase tracking-wide">
                    Sort order
                  </p>
                  <div className="space-y-1 mb-3">
                    {customSorts.map((s, i) => (
                      <div
                        key={s.category}
                        className="flex items-center gap-2 px-2 py-1.5 bg-background-tertiary rounded text-sm"
                      >
                        <span className="text-foreground w-5 text-right">{i + 1}.</span>
                        <span className="flex-1 text-foreground-bright truncate">
                          {s.category}
                        </span>
                        <button
                          onClick={() => flipDirection(s.category)}
                          className="p-1 text-foreground hover:text-accent"
                          title={s.direction === 'desc' ? 'High → Low' : 'Low → High'}
                        >
                          {s.direction === 'desc' ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUp size={14} />
                          )}
                        </button>
                        {i > 0 && (
                          <button
                            onClick={() => move(s.category, -1)}
                            className="text-xs text-foreground hover:text-accent"
                          >
                            ↑
                          </button>
                        )}
                        {i < customSorts.length - 1 && (
                          <button
                            onClick={() => move(s.category, 1)}
                            className="text-xs text-foreground hover:text-accent"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => toggleCategory(s.category)}
                          className="p-1 text-foreground hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="text-xs text-foreground mb-2 uppercase tracking-wide">
                Available
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customCategories
                  .filter((c) => !selected.has(c))
                  .map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="text-xs px-2 py-1 rounded bg-background-tertiary hover:bg-accent hover:text-background text-foreground transition-colors"
                    >
                      + {cat}
                    </button>
                  ))}
                {customCategories.every((c) => selected.has(c)) && (
                  <p className="text-xs text-foreground italic">All selected</p>
                )}
              </div>
              {customSorts.length > 0 && (
                <button
                  onClick={() => onCustomSortsChange([])}
                  className="mt-3 text-xs text-foreground hover:text-red-400"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
