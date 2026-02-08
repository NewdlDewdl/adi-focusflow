/**
 * Analytics Engine for FocusFlow Dashboard
 * Pure functions to calculate analytics from session data
 */

export type DistractionType =
  | 'head_left'
  | 'head_right'
  | 'look_up'
  | 'look_down'
  | 'face_lost';

export interface DistractionEvent {
  timestamp: number;
  type: DistractionType;
  duration: number;
  recoveryTime: number;
}

export interface FocusSnapshot {
  timestamp: number;
  score: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'completed' | 'abandoned';
  focusSnapshots: FocusSnapshot[];
  distractionEvents?: DistractionEvent[];
  avgScore: number;
  peakScore: number;
  focusedTime: number;
  distractionCount: number;
}

// ========================================
// #1: Focus Score Heatmap
// ========================================
export interface HeatmapCell {
  hour: number;
  dayOfWeek: number;
  avgScore: number;
  sessionCount: number;
}

export function calculateHeatmap(sessions: Session[]): HeatmapCell[] {
  const grid = new Map<string, { total: number; count: number }>();

  sessions.forEach(session => {
    session.focusSnapshots.forEach(snapshot => {
      const date = new Date(snapshot.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;

      const cell = grid.get(key) || { total: 0, count: 0 };
      cell.total += snapshot.score;
      cell.count += 1;
      grid.set(key, cell);
    });
  });

  return Array.from(grid.entries()).map(([key, data]) => {
    const [day, hour] = key.split('-').map(Number);
    return {
      dayOfWeek: day,
      hour,
      avgScore: data.total / data.count,
      sessionCount: data.count
    };
  });
}

// ========================================
// #4: Focus Zone Distribution
// ========================================
export interface ZoneDistribution {
  deepFocus: number;
  moderate: number;
  distracted: number;
}

export function calculateZoneDistribution(sessions: Session[]): ZoneDistribution {
  const allSnapshots = sessions.flatMap(s => s.focusSnapshots);
  const total = allSnapshots.length;

  if (total === 0) return { deepFocus: 0, moderate: 0, distracted: 0 };

  const deep = allSnapshots.filter(s => s.score >= 80).length;
  const moderate = allSnapshots.filter(s => s.score >= 50 && s.score < 80).length;
  const distracted = allSnapshots.filter(s => s.score < 50).length;

  return {
    deepFocus: Math.round((deep / total) * 100),
    moderate: Math.round((moderate / total) * 100),
    distracted: Math.round((distracted / total) * 100)
  };
}

// ========================================
// #6: Productivity Score
// ========================================
export interface ProductivityScore {
  overall: number;
  breakdown: {
    avgFocus: number;
    completionRate: number;
    streak: number;
    improvement: number;
  };
}

export function calculateProductivityScore(
  sessions: Session[],
  currentStreak: number
): ProductivityScore {
  if (sessions.length === 0) {
    return {
      overall: 0,
      breakdown: { avgFocus: 0, completionRate: 0, streak: 0, improvement: 0 }
    };
  }

  // 1. Average Focus Score (40%)
  const allSnapshots = sessions.flatMap(s => s.focusSnapshots);
  const avgFocus = allSnapshots.reduce((sum, s) => sum + s.score, 0) / allSnapshots.length;

  // 2. Completion Rate (30%)
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const completionRate = (completedSessions / sessions.length) * 100;

  // 3. Streak Score (20%)
  const streakScore = Math.min(100, (currentStreak / 30) * 100);

  // 4. Improvement Trend (10%)
  const now = Date.now();
  const last7Days = sessions.filter(s => now - s.startTime < 7 * 24 * 60 * 60 * 1000);
  const prev7Days = sessions.filter(s => {
    const age = now - s.startTime;
    return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
  });

  const last7Avg = last7Days.length > 0
    ? last7Days.flatMap(s => s.focusSnapshots).reduce((sum, s) => sum + s.score, 0) / last7Days.flatMap(s => s.focusSnapshots).length
    : avgFocus;
  const prev7Avg = prev7Days.length > 0
    ? prev7Days.flatMap(s => s.focusSnapshots).reduce((sum, s) => sum + s.score, 0) / prev7Days.flatMap(s => s.focusSnapshots).length
    : avgFocus;

  const improvement = Math.max(0, Math.min(100, ((last7Avg - prev7Avg) / prev7Avg) * 100 + 50));

  // Weighted composite
  const overall =
    (avgFocus * 0.4) +
    (completionRate * 0.3) +
    (streakScore * 0.2) +
    (improvement * 0.1);

  return {
    overall: Math.round(overall),
    breakdown: {
      avgFocus: Math.round(avgFocus),
      completionRate: Math.round(completionRate),
      streak: Math.round(streakScore),
      improvement: Math.round(improvement)
    }
  };
}

// ========================================
// #7: Distraction Pattern Analysis
// ========================================
export interface DistractionPattern {
  type: DistractionType;
  label: string;
  count: number;
  avgDuration: number;
  avgRecoveryTime: number;
  percentage: number;
}

export function analyzeDistractionPatterns(sessions: Session[]): DistractionPattern[] {
  const allEvents = sessions.flatMap(s => s.distractionEvents || []);
  if (allEvents.length === 0) return [];

  const grouped = new Map<DistractionType, DistractionEvent[]>();
  allEvents.forEach(event => {
    const group = grouped.get(event.type) || [];
    group.push(event);
    grouped.set(event.type, group);
  });

  const labels: Record<DistractionType, string> = {
    head_left: 'Head Left',
    head_right: 'Head Right',
    look_up: 'Look Up',
    look_down: 'Look Down',
    face_lost: 'Face Lost'
  };

  return Array.from(grouped.entries()).map(([type, events]) => ({
    type,
    label: labels[type],
    count: events.length,
    avgDuration: events.reduce((sum, e) => sum + e.duration, 0) / events.length,
    avgRecoveryTime: events.reduce((sum, e) => sum + e.recoveryTime, 0) / events.length,
    percentage: Math.round((events.length / allEvents.length) * 100)
  })).sort((a, b) => b.count - a.count);
}

// ========================================
// #10: Streak Calendar
// ========================================
export interface StreakCalendarDay {
  date: string;
  sessionCount: number;
  totalFocusTime: number;
  avgScore: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function generateStreakCalendar(
  sessions: Session[],
  days: number = 90
): StreakCalendarDay[] {
  const calendar: StreakCalendarDay[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.toISOString().split('T')[0] === dateStr;
    });

    const totalFocusTime = daySessions.reduce((sum, s) => {
      const focused = s.focusSnapshots.filter(snap => snap.score >= 80).length;
      return sum + (focused * 2);
    }, 0) / 60;

    const avgScore = daySessions.length > 0
      ? daySessions.flatMap(s => s.focusSnapshots).reduce((sum, s) => sum + s.score, 0)
        / daySessions.flatMap(s => s.focusSnapshots).length
      : 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (totalFocusTime > 60) level = 4;
    else if (totalFocusTime > 30) level = 3;
    else if (totalFocusTime > 15) level = 2;
    else if (totalFocusTime > 0) level = 1;

    calendar.push({
      date: dateStr,
      sessionCount: daySessions.length,
      totalFocusTime,
      avgScore,
      level
    });
  }

  return calendar;
}

// ========================================
// Helper: Calculate Streak
// ========================================
export function calculateStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const sortedSessions = [...sessions].sort((a, b) => b.startTime - a.startTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasSession = sortedSessions.some(s => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.toISOString().split('T')[0] === dateStr;
    });

    if (hasSession) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      if (i === 0) {
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}
