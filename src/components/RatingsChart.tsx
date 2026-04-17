'use client';

interface RatingsChartProps {
  ratings: (number | null)[];
  title?: string;
  height?: number;
}

export default function RatingsChart({ ratings, title, height = 120 }: RatingsChartProps) {
  const validRatings = ratings.filter((r): r is number => r !== null);
  if (validRatings.length === 0) return null;

  const average = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
  const totalCount = validRatings.length;

  const starLevels = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const distribution = starLevels.map((star) => ({ star, count: 0, percentage: 0 }));
  validRatings.forEach((r) => {
    const rounded = Math.round(r * 2) / 2;
    const i = starLevels.indexOf(rounded);
    if (i !== -1) distribution[i].count++;
  });
  distribution.forEach((d) => {
    d.percentage = totalCount > 0 ? (d.count / totalCount) * 100 : 0;
  });
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  const formatStar = (s: number) => (s % 1 === 0.5 ? `${Math.floor(s)}½` : s.toString());

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        {title && <h3 className="text-sm font-medium text-foreground-bright">{title}</h3>}
        <div className="text-right">
          <span className="text-2xl font-bold text-accent">{average.toFixed(1)}</span>
          <span className="text-sm text-foreground ml-1">avg</span>
        </div>
      </div>
      <div className="flex-1 flex items-end justify-between gap-1" style={{ minHeight: height }}>
        {distribution.map(({ star, count, percentage }) => {
          const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={star} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-background-tertiary border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <div className="text-foreground-bright font-medium">{formatStar(star)} stars</div>
                  <div className="text-foreground">
                    {count} ({percentage.toFixed(0)}%)
                  </div>
                </div>
              </div>
              <div
                className="w-full bg-border rounded-t overflow-hidden flex flex-col justify-end transition-colors group-hover:bg-foreground/30"
                style={{ height: `${height}px` }}
              >
                <div
                  className="w-full bg-accent transition-all duration-300 rounded-t group-hover:bg-accent-hover"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <div className="text-[10px] text-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatStar(star)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-foreground text-center mt-2">
        {totalCount} {totalCount === 1 ? 'rating' : 'ratings'}
      </div>
    </div>
  );
}
