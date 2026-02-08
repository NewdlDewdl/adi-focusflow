'use client';

import { HeatmapCell } from '@/lib/analytics-engine';

interface FocusHeatmapProps {
  data: HeatmapCell[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function FocusHeatmap({ data }: FocusHeatmapProps) {
  const getColor = (score: number): string => {
    if (score === 0) return '#F5F2EB'; // warmSurface (no data)
    if (score >= 85) return '#6F7D65'; // warmGreen (excellent)
    if (score >= 70) return '#C06C4C'; // warmCoral (good)
    if (score >= 50) return '#E07856'; // warmCoralLight (moderate)
    return '#8D7F7D'; // warmBrownMuted (low)
  };

  const getCellData = (day: number, hour: number): { score: number; count: number } => {
    const cell = data.find(c => c.dayOfWeek === day && c.hour === hour);
    return cell ? { score: cell.avgScore, count: cell.sessionCount } : { score: 0, count: 0 };
  };

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="grid grid-cols-[40px_1fr] gap-2">
        {/* Y-axis (days) */}
        <div className="flex flex-col justify-between text-xs text-warmBrownMuted">
          {DAYS.map(day => (
            <div key={day} className="h-3 flex items-center">
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex flex-col gap-0.5">
          {DAYS.map((_, dayIndex) => (
            <div key={dayIndex} className="flex gap-0.5">
              {HOURS.filter(h => h >= 6 && h <= 23).map(hour => {
                const { score, count } = getCellData(dayIndex, hour);
                return (
                  <div
                    key={hour}
                    className="w-3 h-3 rounded-sm transition-all hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: getColor(score) }}
                    title={`${DAYS[dayIndex]} ${hour}:00 - Avg: ${Math.round(score)} (${count} sessions)`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* X-axis (hours) */}
      <div className="grid grid-cols-[40px_1fr]">
        <div />
        <div className="flex justify-between text-xs text-warmBrownMuted px-1">
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>11pm</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-warmBrownMuted">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F5F2EB' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E07856' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#C06C4C' }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#6F7D65' }} />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
