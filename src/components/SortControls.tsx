'use client';

export type Ordering =
  | 'dateAdded'
  | 'dateAltered'
  | 'alphabetical'
  | 'bestToWorst'
  | 'worstToBest';

export type RatingType = 'overall' | string;

interface Props {
  ordering: Ordering;
  onOrderingChange: (o: Ordering) => void;
  ratingType: RatingType;
  onRatingTypeChange: (t: RatingType) => void;
  customCategories: string[];
}

const ORDER_OPTIONS: { value: Ordering; label: string }[] = [
  { value: 'dateAdded', label: 'Date added' },
  { value: 'dateAltered', label: 'Date altered' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'bestToWorst', label: 'Best to worst' },
  { value: 'worstToBest', label: 'Worst to best' },
];

export default function SortControls({
  ordering,
  onOrderingChange,
  ratingType,
  onRatingTypeChange,
  customCategories,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-foreground">
        Order
        <select
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value as Ordering)}
          className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-foreground">
        Rating
        <select
          value={ratingType}
          onChange={(e) => onRatingTypeChange(e.target.value)}
          className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
        >
          <option value="overall">Overall</option>
          {customCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
