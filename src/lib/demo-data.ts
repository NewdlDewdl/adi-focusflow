/**
 * Demo Data Generator - Enhanced Realistic Patterns
 * Creates 45 minutes of session data with realistic focus behavior
 */

import { Session, DistractionEvent, DistractionType, FocusSnapshot } from './analytics-engine';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateDistractionEvent(timestamp: number, userPattern: 'focused' | 'moderate' | 'distracted'): DistractionEvent {
  const types: DistractionType[] = ['head_left', 'head_right', 'look_up', 'look_down', 'face_lost'];

  // Realistic distribution based on user pattern
  const weights = userPattern === 'focused'
    ? [40, 40, 10, 5, 5]  // Mostly head turns when focused
    : userPattern === 'moderate'
    ? [30, 30, 15, 15, 10]  // More varied when moderate
    : [25, 25, 20, 20, 10]; // Very varied when distracted

  const random = Math.random() * 100;
  let sum = 0;
  let selectedType: DistractionType = 'head_left';

  for (let i = 0; i < types.length; i++) {
    sum += weights[i];
    if (random <= sum) {
      selectedType = types[i];
      break;
    }
  }

  // Duration varies by pattern
  const baseDuration = userPattern === 'focused' ? 3000 : userPattern === 'moderate' ? 5000 : 8000;
  const duration = randomBetween(baseDuration - 1000, baseDuration + 2000);

  const baseRecovery = userPattern === 'focused' ? 2000 : userPattern === 'moderate' ? 3500 : 6000;
  const recoveryTime = randomBetween(baseRecovery - 500, baseRecovery + 1500);

  return {
    timestamp,
    type: selectedType,
    duration,
    recoveryTime
  };
}

function generateRealisticFocusSnapshots(
  startTime: number,
  durationMinutes: number,
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  userEnergy: 'high' | 'medium' | 'low'
): { snapshots: FocusSnapshot[], events: DistractionEvent[] } {
  const snapshots: FocusSnapshot[] = [];
  const events: DistractionEvent[] = [];
  const totalSnapshots = durationMinutes * 30; // Every 2 seconds

  // Realistic starting score based on time and energy
  let currentScore = timeOfDay === 'morning' && userEnergy === 'high'
    ? randomBetween(90, 100)
    : timeOfDay === 'afternoon' && userEnergy === 'medium'
    ? randomBetween(75, 90)
    : randomBetween(60, 80);

  let consecutiveFocus = 0;
  let consecutiveDistraction = 0;
  let currentPattern: 'focused' | 'moderate' | 'distracted' =
    currentScore >= 80 ? 'focused' : currentScore >= 50 ? 'moderate' : 'distracted';

  for (let i = 0; i < totalSnapshots; i++) {
    const timestamp = startTime + (i * 2000);
    const progress = i / totalSnapshots; // 0 to 1

    // Natural energy curve: high start, slight dip middle, recovery end
    const energyCurve = 1 - (Math.sin(progress * Math.PI) * 0.2);

    // Time-based fatigue (later in session = more fatigue)
    const fatigueFactor = 1 - (progress * 0.3);

    const random = Math.random();

    // Deep focus state (score 80-100)
    if (currentScore >= 80) {
      consecutiveFocus++;
      consecutiveDistraction = 0;

      if (random < 0.75) {
        // Maintain deep focus with micro-fluctuations
        const microChange = randomFloat(-1, 2) * energyCurve;
        currentScore = Math.min(100, currentScore + microChange);
      } else if (random < 0.90) {
        // Minor distraction
        currentScore = Math.max(65, currentScore - randomBetween(8, 15));
        currentPattern = 'focused';
      } else {
        // Rare major distraction even when focused
        currentScore = randomBetween(35, 55);
        events.push(generateDistractionEvent(timestamp, 'focused'));
        currentPattern = 'moderate';
        consecutiveFocus = 0;
      }
    }
    // Moderate focus (score 50-79)
    else if (currentScore >= 50) {
      consecutiveDistraction = 0;

      if (random < 0.50) {
        // Recovery to deep focus
        const recovery = randomBetween(5, 12) * energyCurve * fatigueFactor;
        currentScore = Math.min(100, currentScore + recovery);
        if (currentScore >= 80) currentPattern = 'focused';
      } else if (random < 0.75) {
        // Maintain moderate with fluctuation
        currentScore = Math.max(45, currentScore + randomBetween(-8, 8));
        currentPattern = 'moderate';
      } else {
        // Drop to distracted
        currentScore = Math.max(20, currentScore - randomBetween(15, 25));
        events.push(generateDistractionEvent(timestamp, 'moderate'));
        currentPattern = 'distracted';
      }
    }
    // Distracted state (score < 50)
    else {
      consecutiveDistraction++;
      consecutiveFocus = 0;

      if (random < 0.55) {
        // Quick recovery (typical for brief distractions)
        const recovery = randomBetween(15, 30);
        currentScore = Math.min(100, currentScore + recovery);
        if (currentScore >= 80) currentPattern = 'focused';
        else currentPattern = 'moderate';
      } else if (random < 0.80) {
        // Slow recovery
        currentScore = Math.min(100, currentScore + randomBetween(5, 12));
      } else {
        // Stay distracted or get worse
        currentScore = Math.max(10, currentScore - randomBetween(5, 10));
        if (consecutiveDistraction % 5 === 0) {
          events.push(generateDistractionEvent(timestamp, 'distracted'));
        }
        currentPattern = 'distracted';
      }
    }

    // Add natural noise
    currentScore += randomFloat(-0.5, 0.5);
    currentScore = Math.max(0, Math.min(100, currentScore));

    snapshots.push({
      timestamp,
      score: Math.round(currentScore * 10) / 10 // One decimal precision
    });
  }

  return { snapshots, events };
}

function generateSession(
  startTime: number,
  durationMinutes: number,
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  userEnergy: 'high' | 'medium' | 'low',
  status: 'completed' | 'abandoned' = 'completed'
): Session {
  const { snapshots, events } = generateRealisticFocusSnapshots(
    startTime,
    durationMinutes,
    timeOfDay,
    userEnergy
  );

  const avgScore = Math.round(
    snapshots.reduce((sum, s) => sum + s.score, 0) / snapshots.length
  );

  const peakScore = Math.round(Math.max(...snapshots.map(s => s.score)));
  const focusedTime = snapshots.filter(s => s.score >= 80).length * 2;

  return {
    id: `session-${startTime}`,
    startTime,
    endTime: startTime + (durationMinutes * 60 * 1000),
    duration: durationMinutes * 60 * 1000,
    status,
    focusSnapshots: snapshots,
    distractionEvents: events,
    avgScore,
    peakScore,
    focusedTime,
    distractionCount: events.length
  };
}

/**
 * Generate 45 minutes of realistic demo data
 * Varied patterns across multiple sessions
 */
export function generateDemoData(): Session[] {
  const sessions: Session[] = [];
  const now = Date.now();

  // Today - Morning session (10 min, high energy)
  sessions.push(generateSession(
    now - (4 * 60 * 60 * 1000), // 4 hours ago (9 AM)
    10,
    'morning',
    'high',
    'completed'
  ));

  // Yesterday - Two sessions
  // Morning: focused, high energy (8 min)
  sessions.push(generateSession(
    now - (1 * 24 * 60 * 60 * 1000) - (3 * 60 * 60 * 1000), // Yesterday 10 AM
    8,
    'morning',
    'high',
    'completed'
  ));

  // Afternoon: moderate energy (7 min)
  sessions.push(generateSession(
    now - (1 * 24 * 60 * 60 * 1000) - (7 * 60 * 60 * 1000), // Yesterday 2 PM
    7,
    'afternoon',
    'medium',
    'completed'
  ));

  // 2 days ago - Afternoon, medium energy (12 min)
  sessions.push(generateSession(
    now - (2 * 24 * 60 * 60 * 1000) - (5 * 60 * 60 * 1000),
    12,
    'afternoon',
    'medium',
    'completed'
  ));

  // 3 days ago - Evening, lower energy (8 min)
  sessions.push(generateSession(
    now - (3 * 24 * 60 * 60 * 1000) - (8 * 60 * 60 * 1000),
    8,
    'evening',
    'low',
    'completed'
  ));

  // 6 days ago - Abandoned session (low energy)
  sessions.push(generateSession(
    now - (6 * 24 * 60 * 60 * 1000) - (4 * 60 * 60 * 1000),
    5,
    'afternoon',
    'low',
    'abandoned'
  ));

  return sessions;
}

/**
 * Seed demo data to localStorage if empty
 */
export function seedDemoDataIfEmpty(): void {
  if (typeof window === 'undefined') return;

  const existing = localStorage.getItem('focus-sessions');
  if (!existing || JSON.parse(existing).length === 0) {
    const demoSessions = generateDemoData();
    localStorage.setItem('focus-sessions', JSON.stringify(demoSessions));
    console.log('✅ Seeded realistic demo data:', {
      sessions: demoSessions.length,
      totalMinutes: Math.round(demoSessions.reduce((sum, s) => sum + s.duration, 0) / 60000),
      avgScore: Math.round(demoSessions.reduce((sum, s) => sum + s.avgScore, 0) / demoSessions.length),
      totalDistractions: demoSessions.reduce((sum, s) => sum + s.distractionCount, 0)
    });
  }
}
