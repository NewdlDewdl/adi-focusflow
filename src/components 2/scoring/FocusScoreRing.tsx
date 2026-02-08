'use client';

import { motion } from 'framer-motion';

interface FocusScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

/**
 * SVG circular progress ring that displays the current focus score.
 * Color changes based on score level: green >= 70, yellow >= 40, red < 40.
 * Uses framer-motion spring animation for smooth arc transitions.
 */
export default function FocusScoreRing({
  score,
  size = 200,
  strokeWidth = 12,
}: FocusScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score level
  const color =
    score >= 70
      ? '#22c55e' // green-500
      : score >= 40
        ? '#eab308' // yellow-500
        : '#ef4444'; // red-500

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          style={{ willChange: 'stroke-dashoffset' }}
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(score)}
          className="text-4xl font-bold text-white"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-sm text-gray-400">Focus Score</span>
      </div>
    </div>
  );
}
