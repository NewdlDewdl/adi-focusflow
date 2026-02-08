'use client';

import { StreakCalendarDay } from '@/lib/analytics-engine';

interface StreakCalendarProps {
  data: StreakCalendarDay[];
  currentStreak: number;
}

export function StreakCalendar({ data, currentStreak }: StreakCalendarProps) {
  const getColor = (level: number): string => {
    if (level === 0) return '#F5F2EB'; // warmSurface (no activity)
    if (level === 1) return '#E8DCC4'; // lightest
    if (level === 2) return '#E07856'; // warmCoralLight
    if (level === 3) return '#C06C4C'; // warmCoral
    return '#6F7D65'; // warmGreen (most active)
  };

  // Group by weeks
  const weeks: StreakCalendarDay[][] = [];
  let currentWeek: StreakCalendarDay[] = [];

  data.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    // Fill empty days at start of first week
    if (index === 0 && dayOfWeek !== 0) {
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({
          date: '',
          sessionCount: 0,
          totalFocusTime: 0,
          avgScore: 0,
          level: 0
        });
      }
    }

    currentWeek.push(day);

    // Start new week on Sunday
    if (dayOfWeek === 6 || index === data.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Streak badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-4xl">🔥</div>
          <div>
            <div className="text-2xl font-bold text-warmBrown">{currentStreak} days</div>
            <div className="text-sm text-warmBrownMuted">Current Streak</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-semibold text-warmCoral">
            {data.filter(d => d.sessionCount > 0).length}
          </div>
          <div className="text-xs text-warmBrownMuted">days active</div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAYS.map((day, i) => (
            <div
              key={i}
              className="w-4 h-3 flex items-center justify-center text-[10px] text-warmBrownMuted"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="w-3 h-3 rounded-sm transition-all hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: getColor(day.level) }}
                  title={
                    day.date
                      ? `${day.date}\n${day.sessionCount} sessions\n${Math.round(day.totalFocusTime)}min focused\nAvg: ${Math.round(day.avgScore)}`
                      : ''
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-warmBrownMuted">
        <span>Last 90 days</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(level) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
