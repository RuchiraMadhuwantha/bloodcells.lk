import React, { useEffect, useRef, useState } from 'react';
import { Check, Eye, Megaphone, RefreshCw } from 'lucide-react';
import { Badge, Button, CompactAction, SectionCard } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospital, useHospitalResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, ErrorPanel, inputClass } from './HospitalUI';
import { formatDate } from './hospitalUtils';
import { formatDateTime } from '../donor/donorUtils';

const useUpdates = refresh => {
  useEffect(() => {
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [refresh]);
};

export const HospitalCampaigns = ({ nav }) => {
  const resource = useHospitalResource(service.getCampaigns);
  useUpdates(resource.refresh);
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [selected, setSelected] = useState(null);
  const records = resource.data?.items || [];
  const items = records.filter(c => (!district || c.district === district) && [c.name,c.venueName,c.organizerName,c.district].some(v => String(v || '').toLowerCase().includes(query.trim().toLowerCase())));
  return <HospitalLayout nav={nav} title="Blood Donation Campaigns" subtitle="Published campaigns from the blood bank">
    <SectionCard title="Upcoming and active campaigns" action={<Button icon={RefreshCw} disabled={resource.loading} onClick={resource.refresh}>Refresh campaigns</Button>}>
      <Filters>
        <Field label="Search campaigns"><input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Campaign, venue or organizer" /></Field>
        <Field label="Campaign district"><select className={inputClass} value={district} onChange={e => setDistrict(e.target.value)}><option value="">All districts</option>{[...new Set(records.map(c => c.district).filter(Boolean))].sort().map(d => <option key={d}>{d}</option>)}</select></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No published campaigns">
        {!items.length ? <EmptyState title="No campaigns match your filters" /> : <div className="grid md:grid-cols-2 gap-4">{items.map(c => <article key={c.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-start gap-3"><h2 className="font-semibold">{c.name}</h2><Badge color={c.status === 'Active' ? 'green' : 'blue'}>{c.status}</Badge></div>
          <p className="text-sm text-gray-600 mt-2">{formatDate(c.date)} · {c.startTime}–{c.endTime}</p>
          <p className="text-sm text-gray-600">{[c.venueName,c.district].filter(Boolean).join(' · ')}</p>
          <p className="text-sm text-gray-500 mt-2">{c.shortDescription}</p>
          <div className="mt-3"><CompactAction icon={Eye} onClick={() => setSelected(c)}>View campaign</CompactAction></div>
        </article>)}</div>}
      </ResourceState>
    </SectionCard>
    {selected && <Dialog title={selected.name} onClose={() => setSelected(null)}><Details entries={[
      ['Date',formatDate(selected.date)],['Time',selected.startTime+'–'+selected.endTime],['Venue',selected.venueName],['Address',selected.address],['District',selected.district],['Organizer',selected.organizerName],
      ['Contact person',selected.contactPerson],['Contact number',selected.contactNumber],['Contact email',selected.contactEmail],['Needed blood groups',(selected.neededBloodGroups || []).join(', ')],['Target donors',selected.targetDonors],['Description',selected.detailedDescription || selected.shortDescription],
    ]} /></Dialog>}
  </HospitalLayout>;
};

export const HospitalNotifications = ({ nav }) => {
  const { inbox: resource } = useHospital();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const records = resource.data?.notifications || [];
  const markRead = async id => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await service.markNotificationRead(id); resource.refresh(); }
    catch (e) { setError(e.message || 'Could not mark this notification as read.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <HospitalLayout nav={nav} title="Hospital Notifications" subtitle="Updates from the blood bank">
    {error && <ErrorPanel message={error} />}
    <SectionCard title="Notifications" action={<Button icon={RefreshCw} disabled={resource.loading} onClick={resource.refresh}>Refresh notifications</Button>}>
      {resource.loading ? <ResourceState resource={resource} /> : resource.error ? <ErrorPanel message={resource.error} onRetry={resource.refresh} /> : !records.length ? <EmptyState title="No hospital notifications" /> : <div className="space-y-3">{records.map(n => <article key={n.id} className={`rounded-lg border p-4 ${n.isRead ? 'border-gray-200' : 'border-red-100 bg-red-50'}`}>
        <div className="flex justify-between gap-3"><h2 className="font-semibold">{n.title}</h2>{!n.isRead && <Badge color="red">Unread</Badge>}</div>
        <p className="text-xs text-gray-500 mt-1">{formatDateTime(n.createdAt)}</p><p className="text-sm text-gray-600 mt-2">{n.message || n.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">{n.actionRoute === 'hospital-campaigns' && <CompactAction tone="schedule" icon={Megaphone} onClick={() => nav.onNavigate('hospital-campaigns')}>View campaigns</CompactAction>}{!n.isRead && <CompactAction tone="success" icon={Check} disabled={busy} onClick={() => markRead(n.id)}>Mark as read</CompactAction>}</div>
      </article>)}</div>}
    </SectionCard>
  </HospitalLayout>;
};
