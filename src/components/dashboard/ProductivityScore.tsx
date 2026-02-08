'use client';

import { ProductivityScore as ProductivityData } from '@/lib/analytics-engine';

interface ProductivityScoreProps {
  data: ProductivityData;
}

export function ProductivityScore({ data }: ProductivityScoreProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-[#6F7D65]'; // warmGreen
    if (score >= 60) return 'text-[#C06C4C]'; // warmCoral
    if (score >= 40) return 'text-[#E07856]'; // warmCoralLight
    return 'text-[#8D7F7D]'; // warmBrownMuted
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      {/* Main score */}
      <div className="flex flex-col items-center">
        <div className={`text-7xl font-bold ${getScoreColor(data.overall)}`}>
          {data.overall}
        </div>
        <div className="text-2xl text-warmBrownMuted mt-2">
          {getScoreLabel(data.overall)}
        </div>
        <div className="text-sm text-warmBrownMuted mt-1">
          Productivity Score
        </div>
      </div>

      {/* Breakdown */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="bg-warmSurface rounded-lg p-3 border border-warmBorder">
          <div className="text-xs text-warmBrownMuted mb-1">Avg Focus</div>
          <div className="text-2xl font-semibold text-warmBrown">
            {data.breakdown.avgFocus}
            <span className="text-sm text-warmBrownMuted ml-1">/ 100</span>
          </div>
        </div>

        <div className="bg-warmSurface rounded-lg p-3 border border-warmBorder">
          <div className="text-xs text-warmBrownMuted mb-1">Completion</div>
          <div className="text-2xl font-semibold text-warmBrown">
            {data.breakdown.completionRate}%
          </div>
        </div>

        <div className="bg-warmSurface rounded-lg p-3 border border-warmBorder">
          <div className="text-xs text-warmBrownMuted mb-1">Streak</div>
          <div className="text-2xl font-semibold text-warmBrown">
            {data.breakdown.streak}
            <span className="text-sm text-warmBrownMuted ml-1">days</span>
          </div>
        </div>

        <div className="bg-warmSurface rounded-lg p-3 border border-warmBorder">
          <div className="text-xs text-warmBrownMuted mb-1">Growth</div>
          <div className="text-2xl font-semibold text-warmBrown">
            {data.breakdown.improvement > 50 ? '+' : ''}
            {data.breakdown.improvement - 50}%
          </div>
        </div>
      </div>
    </div>
  );
}
