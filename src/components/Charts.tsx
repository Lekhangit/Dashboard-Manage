/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

// Common interfaces
interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

// 1. Double Bar Chart Component (e.g. Budget vs Spent, Planned vs Actual)
export const BarChart: React.FC<{
  data: ChartDataPoint[];
  title?: string;
  valueSuffix?: string;
  height?: number;
  colors?: { primary: string; secondary: string };
  labels?: { primary: string; secondary: string };
}> = ({
  data,
  valueSuffix = ' VND',
  height = 240,
  colors = { primary: 'bg-indigo-600', secondary: 'bg-emerald-500' },
  labels = { primary: 'Ngân sách', secondary: 'Đã sử dụng' }
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<'primary' | 'secondary' | null>(null);

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.value, d.secondaryValue || 0))
  ) || 1;

  // Format currency
  const formatValue = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(1) + ' tỷ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' triệu';
    return val.toLocaleString();
  };

  return (
    <div className="relative w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${colors.primary}`} />
            <span>{labels.primary}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${colors.secondary}`} />
            <span>{labels.secondary}</span>
          </div>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="relative flex items-end w-full gap-4 pt-6 border-b border-slate-100">
        {/* Grid lines */}
        <div className="absolute inset-x-0 top-0 flex flex-col justify-between h-full pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio, i) => (
            <div key={i} className="relative w-full border-t border-slate-100/60">
              <span className="absolute right-0 -top-2 px-1 text-[9px] text-slate-400 font-mono">
                {formatValue(maxValue * ratio)}
              </span>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="relative z-10 flex justify-around items-end w-full h-full px-2">
          {data.map((item, idx) => {
            const primaryHeight = (item.value / maxValue) * 100;
            const secondaryHeight = ((item.secondaryValue || 0) / maxValue) * 100;

            return (
              <div
                key={idx}
                className="flex flex-col items-center flex-1 max-w-[80px]"
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  setHoveredBar(null);
                }}
              >
                <div className="flex items-end justify-center w-full gap-1.5 h-[160px]">
                  {/* Primary Bar */}
                  <div
                    className={`w-4 sm:w-5 rounded-t-sm transition-all duration-300 ${colors.primary} ${
                      hoveredIdx === idx && hoveredBar === 'primary' ? 'brightness-110 shadow-md scale-x-105' : 'opacity-90'
                    }`}
                    style={{ height: `${Math.max(primaryHeight, 2)}%` }}
                    onMouseEnter={() => {
                      setHoveredIdx(idx);
                      setHoveredBar('primary');
                    }}
                  />
                  {/* Secondary Bar */}
                  <div
                    className={`w-4 sm:w-5 rounded-t-sm transition-all duration-300 ${colors.secondary} ${
                      hoveredIdx === idx && hoveredBar === 'secondary' ? 'brightness-110 shadow-md scale-x-105' : 'opacity-90'
                    }`}
                    style={{ height: `${Math.max(secondaryHeight, 2)}%` }}
                    onMouseEnter={() => {
                      setHoveredIdx(idx);
                      setHoveredBar('secondary');
                    }}
                  />
                </div>

                {/* X-Axis Label */}
                <span className="mt-2 text-[11px] font-medium text-slate-500 text-center truncate w-full max-w-[70px]">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {hoveredIdx !== null && (
          <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20 bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg border border-slate-800 transition-opacity duration-200">
            <p className="font-semibold text-[11px] border-b border-slate-800 pb-1 mb-1 text-slate-300">
              {data[hoveredIdx].label}
            </p>
            <div className="space-y-0.5 font-mono">
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-400">{labels.primary}:</span>
                <span className="text-indigo-300 font-bold">
                  {data[hoveredIdx].value.toLocaleString()} {valueSuffix}
                </span>
              </p>
              {data[hoveredIdx].secondaryValue !== undefined && (
                <p className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">{labels.secondary}:</span>
                  <span className="text-emerald-300 font-bold">
                    {data[hoveredIdx].secondaryValue?.toLocaleString()} {valueSuffix}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Interactive Area/Line Chart Component (e.g. Financial trends, Cash Flow)
export interface LineChartPoint {
  label: string;
  planned: number;
  actual: number;
}

export const LineAreaChart: React.FC<{
  data: LineChartPoint[];
  height?: number;
  labels?: { planned: string; actual: string };
  valueSuffix?: string;
}> = ({
  data,
  height = 200,
  labels = { planned: 'Dòng tiền Kế hoạch', actual: 'Dòng tiền Thực tế' },
  valueSuffix = ' VND'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.map(d => Math.max(d.planned, d.actual))) || 1;
  const count = data.length;
  const width = 600;
  const chartHeight = 160;

  // Generate SVG path for Planned (dashed line)
  const getPath = (key: 'planned' | 'actual') => {
    if (count === 0) return '';
    return data.map((d, i) => {
      const x = (i / (count - 1)) * width;
      const y = chartHeight - (d[key] / maxVal) * chartHeight + 10;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getAreaPath = (key: 'planned' | 'actual') => {
    if (count === 0) return '';
    const linePath = getPath(key);
    const startX = 0;
    const endX = width;
    const baseY = chartHeight + 10;
    return `${linePath} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
  };

  const formatCurrencyAbbr = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + 'M';
    return val.toLocaleString();
  };

  return (
    <div className="w-full">
      <div className="flex gap-4 mb-3 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed border-indigo-500" />
          <span>{labels.planned}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-emerald-500 rounded" />
          <span>{labels.actual}</span>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${height}px` }}>
        {/* Y-Axis scale marks */}
        <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-[9px] text-slate-400 font-mono select-none h-[170px] pointer-events-none">
          {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((v, i) => (
            <div key={i} className="flex items-center">
              <span>{formatCurrencyAbbr(v)}</span>
            </div>
          ))}
        </div>

        {/* Chart SVG */}
        <div className="pl-12 w-full h-[170px]">
          <svg viewBox={`0 0 ${width} ${chartHeight + 20}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gradientActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradientPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={chartHeight - ratio * chartHeight + 10}
                x2={width}
                y2={chartHeight - ratio * chartHeight + 10}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            ))}

            {/* Area under curves */}
            <path d={getAreaPath('planned')} fill="url(#gradientPlanned)" />
            <path d={getAreaPath('actual')} fill="url(#gradientActual)" />

            {/* Lines */}
            <path
              d={getPath('planned')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <path
              d={getPath('actual')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />

            {/* Interactive hit zones and helper circles */}
            {data.map((d, i) => {
              const x = (i / (count - 1)) * width;
              const yPlanned = chartHeight - (d.planned / maxVal) * chartHeight + 10;
              const yActual = chartHeight - (d.actual / maxVal) * chartHeight + 10;

              return (
                <g key={i} className="cursor-pointer">
                  {/* Vertical hover lines */}
                  {hoveredIdx === i && (
                    <line
                      x1={x}
                      y1="10"
                      x2={x}
                      y2={chartHeight + 10}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Planned Dot */}
                  <circle
                    cx={x}
                    cy={yPlanned}
                    r={hoveredIdx === i ? 5 : 3.5}
                    fill="#ffffff"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                  />

                  {/* Actual Dot */}
                  <circle
                    cx={x}
                    cy={yActual}
                    r={hoveredIdx === i ? 5 : 4}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  {/* Invisible wide vertical hover bars */}
                  <rect
                    x={x - (width / (count - 1)) / 2}
                    y="0"
                    width={width / (count - 1)}
                    height={chartHeight + 20}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* X Axis Labels */}
        <div className="absolute inset-x-0 bottom-0 pl-12 flex justify-between text-[10px] text-slate-500 select-none font-medium pointer-events-none">
          {data.map((d, i) => (
            <span key={i} className="text-center w-12 truncate">{d.label}</span>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredIdx !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-800 font-sans pointer-events-none transition-all">
            <p className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-300">
              Tháng: {data[hoveredIdx].label}
            </p>
            <div className="space-y-1 font-mono">
              <p className="flex justify-between gap-4">
                <span className="text-indigo-400">Kế hoạch:</span>
                <span className="font-bold text-slate-200">
                  {data[hoveredIdx].planned.toLocaleString()}{valueSuffix}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-emerald-400">Thực tế:</span>
                <span className="font-bold text-slate-200">
                  {data[hoveredIdx].actual.toLocaleString()}{valueSuffix}
                </span>
              </p>
              <p className="flex justify-between gap-4 border-t border-slate-800 pt-0.5 text-[11px]">
                <span className="text-slate-400">Chênh lệch:</span>
                <span className={`font-bold ${data[hoveredIdx].actual >= data[hoveredIdx].planned ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(data[hoveredIdx].actual - data[hoveredIdx].planned).toLocaleString()}{valueSuffix}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Donut Chart (e.g. Budget Breakdown)
interface DonutData {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  data: DonutData[];
  title?: string;
  totalLabel?: string;
}> = ({ data, totalLabel = 'Tổng cộng' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 50;
  const strokeWidth = 14;
  const circ = 2 * Math.PI * radius;

  // Format money or number
  const formatVal = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + ' tỷ';
    if (v >= 1e6) return (v / 1e6).toFixed(0) + ' triệu';
    return v.toLocaleString();
  };

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2 w-full">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((slice, idx) => {
            const percent = slice.value / total;
            const strokeLength = percent * circ;
            const strokeOffset = circ - (cumulativePercent * circ);
            cumulativePercent += percent;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${strokeLength} ${circ}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Central Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {hoveredIdx !== null ? data[hoveredIdx].label : totalLabel}
          </span>
          <span className="text-sm font-extrabold text-slate-800 font-mono">
            {formatVal(hoveredIdx !== null ? data[hoveredIdx].value : total)}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            {hoveredIdx !== null ? `${((data[hoveredIdx].value / total) * 100).toFixed(1)}%` : '100%'}
          </span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="flex-1 space-y-2 max-w-[200px]">
        {data.map((slice, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-1.5 rounded transition-all cursor-pointer ${
                isHovered ? 'bg-slate-50 border-l-4' : 'border-l-4 border-transparent'
              }`}
              style={{ borderLeftColor: slice.color }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span className="text-xs font-semibold text-slate-600 truncate mr-2">{slice.label}</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {((slice.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Circular Progress Ring (Percentage indicator)
export const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  label?: string;
}> = ({ progress, size = 60, strokeWidth = 6, colorClass = 'stroke-indigo-600', label }) => {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (Math.min(progress, 100) / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Active Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            strokeWidth={strokeWidth}
            className={`transition-all duration-500 ease-out ${colorClass}`}
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-800 font-mono">{progress}%</span>
        </div>
      </div>
      {label && (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400">Tiến độ thực tế</span>
        </div>
      )}
    </div>
  );
};

// 5. Heatmap Component (Resource Utilization/Allocation heatmap)
export const ResourceHeatmap: React.FC<{ projects?: any[] }> = ({ projects }) => {
  // Columns (Departments / Roles)
  const columns = projects && projects.length > 0 
    ? projects.slice(0, 9).map(p => p.name.substring(0, 8)) 
    : ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'];
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  // Matrix showing utilization percentages
  const matrix = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // Sat (lower)
  ];

  const getColorClass = (val: number) => {
    if (val >= 95) return 'bg-indigo-600 text-white';
    if (val >= 80) return 'bg-indigo-400 text-white';
    if (val >= 60) return 'bg-indigo-200 text-indigo-950';
    if (val >= 40) return 'bg-indigo-100 text-indigo-900';
    return 'bg-slate-50 text-slate-500';
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px] p-1">
        <div className="flex mb-2 border-b border-slate-100 pb-2">
          <div className="w-16 flex-shrink-0" />
          <div className="flex flex-1 justify-around">
            {columns.map((col, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-500 text-center flex-1">
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {days.map((day, dIdx) => (
            <div key={dIdx} className="flex items-center">
              <span className="w-16 text-xs font-medium text-slate-500">{day}</span>
              <div className="flex flex-1 justify-around gap-1.5">
                {columns.map((col, cIdx) => {
                  const val = matrix[dIdx][cIdx];
                  return (
                    <div
                      key={cIdx}
                      className={`flex-1 aspect-square md:aspect-auto md:h-8 flex items-center justify-center rounded-sm text-[10px] font-bold font-mono transition-all hover:scale-105 hover:shadow-sm cursor-pointer ${getColorClass(
                        val
                      )}`}
                      title={`${day} - ${col}: Phân bổ ${val}%`}
                    >
                      {val}%
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-3 text-[10px] font-medium text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-slate-50 rounded-sm border border-slate-100" />
            <span>&lt;40% (Nhàn rỗi)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-indigo-100 rounded-sm" />
            <span>40% - 60%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-indigo-200 rounded-sm" />
            <span>60% - 80%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-sm" />
            <span>80% - 95%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm" />
            <span>&ge;95% (Tối đa)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
