import React, {useState} from 'react';
import {RiskLevel} from '../types';
import {RISK_COLORS} from '../utils/gisUtils';

interface DonutData {
  level: RiskLevel;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface DonutRiskChartProps {
  data: DonutData[];
  total: number;
  title?: string;
}

export const DonutRiskChart: React.FC<DonutRiskChartProps> = ({data, total, title}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 64;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and stroke-dashoffset for each slice
  let accumulatedPercent = 0;
  const slices = data.map((item, idx) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      index: idx,
    };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="flex flex-col h-full justify-between">
      {title && <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h3>}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Donut Slices */}
            {slices.map((slice) => {
              const isHovered = hoveredIndex === slice.index;
              return (
                <circle
                  key={slice.level}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Central Counter Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            {activeItem ? (
              <>
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{color: activeItem.color}}>
                  {activeItem.label}
                </span>
                <span className="text-xl font-extrabold font-mono text-slate-900 leading-tight">
                  {activeItem.count}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  {activeItem.percentage}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Total
                </span>
                <span className="text-2xl font-extrabold font-mono text-slate-900 leading-tight">
                  {total}
                </span>
                <span className="text-[10px] font-medium text-slate-400">Features</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 w-full sm:w-auto text-xs">
          {data.map((item, idx) => (
            <div
              key={item.level}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between gap-4 p-1.5 rounded-md transition-colors cursor-pointer ${
                hoveredIndex === idx ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{backgroundColor: item.color}}
                  aria-hidden="true"
                />
                <span className="text-slate-700">{item.label}</span>
              </div>
              <div className="font-mono tabular-nums text-slate-900 font-semibold">
                {item.count} <span className="text-slate-400 text-[11px]">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BarItem {
  label: string;
  count: number;
  color?: string;
  secondaryText?: string;
}

interface RiskBarChartProps {
  title?: string;
  items: BarItem[];
  maxVal?: number;
}

export const RiskBarChart: React.FC<RiskBarChartProps> = ({title, items, maxVal}) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const highest = maxVal || Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="flex flex-col h-full justify-between">
      {title && <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h3>}

      <div className="space-y-3 my-auto py-1">
        {items.map((item) => {
          const pct = Math.round((item.count / highest) * 100);
          const isHovered = hoveredLabel === item.label;

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className="group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${isHovered ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                  {item.label}
                </span>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  {item.secondaryText && (
                    <span className="text-[11px] text-slate-400">{item.secondaryText}</span>
                  )}
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
              </div>

              {/* Bar Track */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(4, pct)}%`,
                    backgroundColor: item.color || '#0284C7',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface VulnerabilityIndicatorProps {
  zoneName: string;
  riskLevel: RiskLevel;
  houses: number;
  totalHouses: number;
  drains: number;
  totalDrains: number;
  areaSqMeters: number;
}

export const VulnerabilityIndicator: React.FC<VulnerabilityIndicatorProps> = ({
  zoneName,
  riskLevel,
  houses,
  totalHouses,
  drains,
  totalDrains,
  areaSqMeters,
}) => {
  const housePct = totalHouses > 0 ? Math.round((houses / totalHouses) * 100) : 0;
  const drainPct = totalDrains > 0 ? Math.round((drains / totalDrains) * 100) : 0;
  const color = RISK_COLORS[riskLevel];

  return (
    <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 truncate pr-2">{zoneName}</h4>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{backgroundColor: `${color.hex}15`, color: color.hex}}
        >
          {riskLevel}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div>
          <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
            <span>Mapped Houses</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {houses} ({housePct}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-slate-800" style={{width: `${housePct}%`}} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
            <span>Drainage Segments</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {drains} ({drainPct}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-sky-600" style={{width: `${drainPct}%`}} />
          </div>
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
          <span>Footprint Area:</span>
          <span className="font-bold text-slate-800">{areaSqMeters.toLocaleString()} m²</span>
        </div>
      </div>
    </div>
  );
};
