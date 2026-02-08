'use client';

import { useState } from 'react';

interface SensitivitySliderProps {
  value: number; // current emaAlpha
  onChange: (alpha: number) => void;
}

/**
 * Collapsible sensitivity control for tuning the scoring algorithm.
 * Maps emaAlpha (0.05-0.4) to a "Steady" <-> "Responsive" slider.
 */
export default function SensitivitySlider({
  value,
  onChange,
}: SensitivitySliderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-warmBorder bg-warmSurface">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-warmBrown transition-colors hover:text-warmCoral"
      >
        <span>Sensitivity</span>
        <span className="text-xs text-warmBrownMuted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-warmBorder px-4 pb-4 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-warmBrownMuted">Steady</span>
            <input
              type="range"
              min={0.05}
              max={0.4}
              step={0.01}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-warmBorder accent-warmCoral"
            />
            <span className="text-xs text-warmBrownMuted">Responsive</span>
          </div>
          <p className="mt-2 text-center text-xs text-warmBrownMuted">
            Alpha: {value.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
