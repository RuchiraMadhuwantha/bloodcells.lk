import React from 'react';

// BarChart — lightweight SVG bar chart
export const BarChart = ({ data, height = 160, color = '#dc2626' }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-xs font-medium text-gray-700 mb-1">{d.value}</span>
          <div
            className="w-full rounded-t-md transition-all hover:opacity-80"
            style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: 4 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-xs text-gray-500 mt-2">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// LineChart — lightweight SVG line chart with forecast support
export const LineChart = ({ data, height = 180, stroke = '#dc2626', forecastFrom }) => {
  const w = 520, pad = 24;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const x = i => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = v => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={height - pad - g * (height - pad * 2)} y2={height - pad - g * (height - pad * 2)} stroke="#f3f4f6" />
      ))}
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={forecastFrom != null && i >= forecastFrom ? '#fff' : stroke} stroke={stroke} strokeWidth="2" />
          <text x={x(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

// Donut — lightweight SVG donut chart
export const Donut = ({ segments, size = 140 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
        offset += len;
        return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1f2937">{total}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="9" fill="#6b7280">units</text>
    </svg>
  );
};
