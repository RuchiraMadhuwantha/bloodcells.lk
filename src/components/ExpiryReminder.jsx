import React from 'react';
import {AlertTriangle,Clock,CalendarClock} from 'lucide-react';
export const ExpiryBadge=({info})=>{
  if(!['expired','today','expiring'].includes(info.kind))return null;
  const colors=info.kind==='expired'?'border-rose-200 bg-rose-100 text-rose-900':info.kind==='today'?'border-orange-300 bg-orange-100 text-orange-900':'border-amber-300 bg-amber-100 text-amber-900';
  const Icon=info.kind==='expired'?AlertTriangle:info.kind==='today'?CalendarClock:Clock;
  const countdown=Number.isInteger(info.days)&&info.days>=0&&info.days<=7;
  return <span className={'inline-flex flex-col gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm '+colors}>
    <span className="inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true"/>{info.label}</span>
    {countdown&&<span className="flex gap-0.5" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i} className={'h-1 flex-1 rounded-full '+(i<Math.max(1,7-info.days)?'bg-current':'bg-white/70')}/>)}</span>}
  </span>;
};
export const ExpiryReminder=({summary})=>!summary.expiredCount&&!summary.expiringCount?null:<div role="status" className="flex flex-wrap gap-2 text-sm mb-4">
  {summary.expiringCount>0&&<ExpiryBadge info={{kind:summary.todayCount?'today':'expiring',days:summary.nearestDays,label:summary.expiringCount+' packet(s), '+summary.expiringUnits+' unit(s) expire within 7 days'}}/>}
  {summary.expiringCount>0&&<span className="self-center text-xs font-medium text-gray-700">{summary.nearestDays===0?'Next expiry: today':'Next expiry: '+summary.nearestDays+' day'+(summary.nearestDays===1?'':'s')+' left'}</span>}
  {summary.expiredCount>0&&<ExpiryBadge info={{kind:'expired',label:summary.expiredCount+' expired packet(s), '+summary.expiredUnits+' unit(s)'}}/>}
</div>;
