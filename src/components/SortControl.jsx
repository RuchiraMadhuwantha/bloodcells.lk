import React from 'react';
import {ArrowDownWideNarrow} from 'lucide-react';
import {SORT_OPTIONS} from './recordSorting';

export const SortControl=({label,profile,value,onChange,className})=><label className="block text-sm text-gray-700 min-w-0">
  <span className="flex items-center gap-1.5 mb-1 font-medium"><ArrowDownWideNarrow className="w-3.5 h-3.5" aria-hidden="true"/>{label}</span>
  <select className={className} value={value} onChange={e=>onChange(e.target.value)}>{SORT_OPTIONS[profile].map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
</label>;
