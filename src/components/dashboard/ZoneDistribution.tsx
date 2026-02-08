'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { useState } from 'react';
import { ZoneDistribution as ZoneData } from '@/lib/analytics-engine';

interface ZoneDistributionProps {
  data: ZoneData;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

export function ZoneDistribution({ data }: ZoneDistributionProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(0);

  const chartData = [
    { name: 'Deep Focus', value: data.deepFocus, color: '#6F7D65', icon: '🎯' },
    { name: 'Moderate', value: data.moderate, color: '#E07856', icon: '⚡' },
    { name: 'Distracted', value: data.distracted, color: '#8D7F7D', icon: '💫' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6">
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="none"
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Enhanced legend with hover effects */}
      <div className="flex flex-col gap-3 w-full px-4">
        {chartData.map((zone, index) => (
          <div
            key={zone.name}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 cursor-pointer ${
              activeIndex === index
                ? 'bg-warmCoral/10 scale-105 shadow-md'
                : 'bg-warmSurface hover:bg-warmCoral/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warmBeige border-2 transition-all duration-300" style={{
                borderColor: zone.color,
                transform: activeIndex === index ? 'scale(1.1)' : 'scale(1)'
              }}>
                <span className="text-lg">{zone.icon}</span>
              </div>
              <span className="text-base font-medium text-warmBrown">{zone.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-2xl font-bold text-warmBrown transition-transform duration-300" style={{
                  transform: activeIndex === index ? 'scale(1.1)' : 'scale(1)'
                }}>
                  {zone.value}%
                </div>
                <div className="text-xs text-warmBrownMuted">of time</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
