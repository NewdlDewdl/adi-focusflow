"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Volume2 } from "lucide-react";

interface NudgeIndicatorProps {
  isActive: boolean;
  tier: "gentle" | "medium" | "direct" | null;
  message: string | null;
}

/**
 * Tier-specific styling and labels for the nudge indicator.
 */
const TIER_STYLES = {
  gentle: {
    bg: "bg-blue-900/60",
    text: "text-blue-300",
    border: "border-blue-700/50",
    dot: "bg-blue-400",
    icon: "text-blue-400",
    label: "AI Coach",
  },
  medium: {
    bg: "bg-amber-900/60",
    text: "text-amber-300",
    border: "border-amber-700/50",
    dot: "bg-amber-400",
    icon: "text-amber-400",
    label: "Focus Alert",
  },
  direct: {
    bg: "bg-red-900/60",
    text: "text-red-300",
    border: "border-red-700/50",
    dot: "bg-red-400",
    icon: "text-red-400",
    label: "Focus Now!",
  },
};

/**
 * Visual nudge indicator that appears during AI coaching voice playback.
 * Displays tier-colored styling with pulse animation, label, and coaching text.
 * Uses framer-motion for enter/exit animations.
 */
export default function NudgeIndicator({
  isActive,
  tier,
  message,
}: NudgeIndicatorProps) {
  const styles = tier ? TIER_STYLES[tier] : null;

  return (
    <AnimatePresence>
      {isActive && styles && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`w-full max-w-sm self-center rounded-lg border ${styles.border} ${styles.bg} px-4 py-3 backdrop-blur-sm`}
        >
          {/* Header: dot + icon + label */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 animate-pulse rounded-full ${styles.dot}`}
            />
            <Volume2 className={`h-4 w-4 ${styles.icon}`} />
            <span
              className={`text-sm font-semibold ${styles.text}`}
            >
              {styles.label}
            </span>
          </div>

          {/* Coaching message text */}
          {message && (
            <p className={`mt-1.5 text-xs leading-relaxed ${styles.text} opacity-80`}>
              {message}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
