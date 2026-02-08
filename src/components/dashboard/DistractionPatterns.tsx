'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState } from 'react';
import { DistractionPattern } from '@/lib/analytics-engine';

interface DistractionPatternsProps {
  data: DistractionPattern[];
}

export function DistractionPatterns({ data }: DistractionPatternsProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = data.map(d => ({
    name: d.label,
    count: d.count,
    avgRecovery: Math.round(d.avgRecoveryTime / 1000),
    percentage: d.percentage
  }));

  const COLORS = ['#C06C4C', '#E07856', '#8D7F7D', '#6F7D65', '#F5F2EB'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-warmBeige border-2 border-warmBorder rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-warmBrown">{payload[0].payload.name}</p>
          <p className="text-sm text-warmBrownMuted mt-1">
            Occurred: <span className="font-semibold text-warmCoral">{payload[0].value} times</span>
          </p>
          <p className="text-sm text-warmBrownMuted">
            Avg Recovery: <span className="font-semibold text-warmGreen">{payload[0].payload.avgRecovery}s</span>
          </p>
          <p className="text-xs text-warmBrownMuted mt-1">
            {payload[0].payload.percentage}% of all distractions
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
            onMouseMove={(state: any) => {
              if (state.isTooltipActive) {
                setActiveIndex(state.activeTooltipIndex);
              } else {
                setActiveIndex(undefined);
              }
            }}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#EBE5DA"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#8D7F7D', fontSize: 13 }}
              angle={-20}
              textAnchor="end"
              height={80}
              stroke="#EBE5DA"
            />
            <YAxis
              tick={{ fill: '#8D7F7D', fontSize: 13 }}
              stroke="#EBE5DA"
              label={{
                value: 'Frequency',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#8D7F7D', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#C06C4C', opacity: 0.1 }} />
            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{
                    filter: activeIndex === index ? 'brightness(1.2)' : 'brightness(1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats with animations */}
      <div className="grid grid-cols-3 gap-4 px-4">
        <div className="bg-warmSurface rounded-lg p-4 border border-warmBorder hover:shadow-md transition-all duration-300">
          <div className="text-xs text-warmBrownMuted mb-1">Total</div>
          <div className="text-2xl font-bold text-warmBrown">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </div>
          <div className="text-xs text-warmBrownMuted mt-0.5">distractions</div>
        </div>

        <div className="bg-warmSurface rounded-lg p-4 border border-warmBorder hover:shadow-md transition-all duration-300">
          <div className="text-xs text-warmBrownMuted mb-1">Most Common</div>
          <div className="text-xl font-bold text-warmCoral truncate">
            {data[0]?.label || 'None'}
          </div>
          <div className="text-xs text-warmBrownMuted mt-0.5">
            {data[0]?.count || 0} times
          </div>
        </div>

        <div className="bg-warmSurface rounded-lg p-4 border border-warmBorder hover:shadow-md transition-all duration-300">
          <div className="text-xs text-warmBrownMuted mb-1">Avg Recovery</div>
          <div className="text-2xl font-bold text-warmGreen">
            {data.length > 0
              ? Math.round(
                  data.reduce((sum, d) => sum + d.avgRecoveryTime, 0) /
                    data.length /
                    1000
                )
              : 0}s
          </div>
          <div className="text-xs text-warmBrownMuted mt-0.5">to refocus</div>
        </div>
      </div>
    </div>
  );
}
