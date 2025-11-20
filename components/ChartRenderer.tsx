
import React, { useMemo } from 'react';
import { ChartData } from '../types';

interface ChartRendererProps {
  data: ChartData;
}

const COLORS = [
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#a855f7', // purple-500
];

const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const { type, title, categories, series } = data;

  if (!series || series.length === 0) return null;

  const safeSeries = series.map((s, i) => ({
    ...s,
    color: s.color || COLORS[i % COLORS.length]
  }));

  if (type === 'radar') {
    return <RadarChart title={title} categories={categories} series={safeSeries} />;
  }

  return <BarChart title={title} categories={categories} series={safeSeries} />;
};

// --- BAR CHART COMPONENT ---
const BarChart: React.FC<{ title?: string; categories: string[]; series: any[] }> = ({ title, categories, series }) => {
  // Determine max value for scaling
  const allValues = series.flatMap(s => s.data);
  const maxValue = Math.max(...allValues) * 1.1 || 10; // 10% headroom

  return (
    <div className="w-full bg-white rounded-xl border border-primary-200 p-4 shadow-sm mb-6 overflow-hidden">
      {title && <h4 className="text-center font-bold text-gray-800 mb-4">{title}</h4>}
      
      <div className="flex items-end justify-between gap-4 h-48 md:h-64 pb-6 relative">
        {/* Grid Lines (Visual Only) */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 z-0">
          {[...Array(5)].map((_, i) => <div key={i} className="w-full border-b border-black h-0" />)}
        </div>

        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="flex-1 flex flex-col items-center justify-end h-full gap-1 z-10 group">
             <div className="flex items-end justify-center gap-1 w-full h-full px-1">
                {series.map((s, sIdx) => {
                  const value = s.data[catIdx] || 0;
                  const heightPct = Math.min((value / maxValue) * 100, 100);
                  return (
                    <div 
                      key={sIdx} 
                      className="w-full max-w-[20px] rounded-t-sm transition-all duration-500 hover:opacity-80 relative group/bar"
                      style={{ height: `${heightPct}%`, backgroundColor: s.color }}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                           {s.label}: {value}
                        </div>
                    </div>
                  );
                })}
             </div>
             <span className="text-[10px] md:text-xs text-gray-600 text-center font-medium leading-tight line-clamp-2 mt-1">{cat}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
            <span className="text-xs text-gray-600 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- RADAR CHART COMPONENT ---
const RadarChart: React.FC<{ title?: string; categories: string[]; series: any[] }> = ({ title, categories, series }) => {
  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 40; // Padding
  const angleSlice = (Math.PI * 2) / categories.length;

  // Helper to get coordinates
  const getCoords = (value: number, index: number, maxVal: number) => {
    const angle = index * angleSlice - Math.PI / 2; // Start from top
    const r = (value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Normalize data to 0-10 scale mostly for radar
  const maxValue = 10; 

  // Generate polygons
  const polygons = series.map(s => {
    const points = s.data.map((val: number, i: number) => {
      // Normalize value roughly if it looks large, otherwise assume 1-10 scale
      let v = val;
      if (val > 20) v = (val / 10000) * 10; // Rough heuristic for prices
      if (val > 10 && val <= 100) v = (val / 100) * 10;
      
      const { x, y } = getCoords(Math.min(v, maxValue), i, maxValue);
      return `${x},${y}`;
    }).join(' ');
    return { points, color: s.color, label: s.label };
  });

  // Generate axis lines and labels
  const axes = categories.map((cat, i) => {
    const { x, y } = getCoords(maxValue, i, maxValue);
    const labelCoords = getCoords(maxValue * 1.15, i, maxValue);
    return { x, y, label: cat, lx: labelCoords.x, ly: labelCoords.y };
  });

  // Generate grid levels (spider web)
  const levels = [0.25, 0.5, 0.75, 1].map(pct => {
     return categories.map((_, i) => {
        const { x, y } = getCoords(maxValue * pct, i, maxValue);
        return `${x},${y}`;
     }).join(' ');
  });

  return (
    <div className="w-full bg-white rounded-xl border border-primary-200 p-4 shadow-sm mb-6 flex flex-col items-center">
       {title && <h4 className="text-center font-bold text-gray-800 mb-2">{title}</h4>}
       
       <div className="relative w-full max-w-[350px] aspect-square">
         <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            {/* Grid Levels */}
            {levels.map((points, i) => (
              <polygon key={i} points={points} fill="none" stroke="#e5e7eb" strokeWidth="1" />
            ))}
            
            {/* Axes */}
            {axes.map((axis, i) => (
               <line key={i} x1={center} y1={center} x2={axis.x} y2={axis.y} stroke="#e5e7eb" strokeWidth="1" />
            ))}

            {/* Data Polygons */}
            {polygons.map((poly, i) => (
              <polygon 
                key={i} 
                points={poly.points} 
                fill={poly.color} 
                fillOpacity="0.2" 
                stroke={poly.color} 
                strokeWidth="2" 
                className="hover:fill-opacity-40 transition-all duration-300"
              />
            ))}
            
            {/* Labels */}
            {axes.map((axis, i) => (
              <text 
                key={i} 
                x={axis.lx} 
                y={axis.ly} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-[10px] fill-gray-500 font-medium"
                style={{ fontSize: '10px' }}
              >
                {axis.label}
              </text>
            ))}
         </svg>
       </div>

       {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2 pt-3 border-t border-gray-100 w-full">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
            <span className="text-xs text-gray-600 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartRenderer;
