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
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:text-white"
      >
        <span>Sensitivity</span>
        <span className="text-xs text-gray-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Steady</span>
            <input
              type="range"
              min={0.05}
              max={0.4}
              step={0.01}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
            />
            <span className="text-xs text-gray-500">Responsive</span>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Alpha: {value.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
