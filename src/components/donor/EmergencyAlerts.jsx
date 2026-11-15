import React, { useRef, useState } from 'react';
import { Button, Badge, BloodTypeBadge, SectionCard } from '../UIComponents';
import * as donor from '../../services/donorService';
import { DISTRICTS } from '../../data/districts';
import { DonorLayout, useDonorResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, Notice, ErrorPanel, inputClass, disabledClass } from './DonorUI';
import { BLOOD_GROUPS, formatDate, statusColor } from './donorUtils';

export const EmergencyAlerts = ({ nav }) => {
  const resource = useDonorResource(donor.getEmergencyAlerts);
  const [district, setDistrict] = useState('');
  const [group, setGroup] = useState('');
  const [urgency, setUrgency] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const lock = useRef(false);
  const alerts = (resource.data?.items || []).filter((r) => (!district || r.district === district) && (!group || r.bloodGroup === group) && (!urgency || r.urgency === urgency));
  const respond = async (alert) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await donor.respondToEmergencyAlert(alert.id);
      setSuccess(result.message || 'Your interest has been recorded.');
      setSelected(null);
      resource.refresh();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      lock.current = false; setBusy(false);
    }
  };
  return <DonorLayout nav={nav} title="Emergency Donation Alerts" subtitle="Active alerts published by the blood bank for matching registered blood groups">
    <Notice>Alerts are published only by authorized blood bank personnel for genuine requests. A matching blood group does not establish medical eligibility — the donation centre screens you before donation. Your identity and clinical details are never shown to other donors.</Notice>
    {success && <p role="status" className="p-4 mb-4 rounded-lg bg-green-50 text-green-800">{success}</p>}
    {error && <div className="mb-4"><ErrorPanel message={error} /></div>}
    <SectionCard title="Active donation alerts">
      <Filters>
        <Field label="Alert district"><select className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">All districts</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Required blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All authorized groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Urgency"><select className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value)}><option value="">All urgency levels</option><option value="emergency">Emergency</option><option value="urgent">Urgent</option><option value="normal">Normal</option></select></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No active alerts for your registered blood group">
        {alerts.length === 0 ? <EmptyState title="No alerts match your filters" /> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {alerts.map((r) => <article key={r.id} className="rounded-lg border border-gray-200 p-4 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-3"><BloodTypeBadge group={r.bloodGroup} /><Badge color={statusColor(r.urgency)}>{r.urgencyLabel || r.urgency}</Badge></div>
            <h2 className="font-bold text-gray-800">{r.title || r.hospitalName || 'Emergency donation alert'}</h2>
            <p className="text-sm text-gray-500 mt-1">{r.district || 'District not provided'}</p>
            <p className="text-sm text-gray-700 mt-3">Required date: {formatDate(r.requiredDate)}</p>
            {r.quantity != null && <p className="text-sm text-gray-700">Requested quantity: {r.quantity} unit(s)</p>}
            <p className="text-xs text-gray-500 mt-2">{r.description || 'Description not provided by the publisher.'}</p>
            <div className="mt-auto pt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSelected(r)}>View details</Button>{r.responded
              ? <Badge color="green">Interest registered</Badge>
              : <Button disabled={busy} className={disabledClass} onClick={() => respond(r)}>Respond</Button>}</div>
          </article>)}
        </div>}
      </ResourceState>
    </SectionCard>
    <p className="text-sm text-gray-500 mt-4">Changing the blood group filter only filters the alerts you are authorized to see; it does not retrieve other groups' alerts. Registering interest is not a medical eligibility decision.</p>
    {selected && <Dialog title={`Alert ${selected.reference || selected.id}`} onClose={() => setSelected(null)} busy={busy}>
      <Details entries={[[ 'Blood group', selected.bloodGroup ], ['Title', selected.title], ['District', selected.district],
        ['Urgency', selected.urgencyLabel || selected.urgency], ['Required date', formatDate(selected.requiredDate)], ['Requested quantity', selected.quantity == null ? undefined : `${selected.quantity} unit(s)`],
        ['Description', selected.description || 'Not provided'], ['Response instructions', selected.responseInstructions || 'Not provided']]} />
      <p className="text-sm text-gray-600 mt-5">Registering your interest notifies the blood bank — it is not a completed donation and does not guarantee eligibility.</p>
      <div className="flex flex-wrap gap-3 mt-4">{selected.responded
        ? <Badge color="green">Interest registered</Badge>
        : <Button disabled={busy} className={disabledClass} onClick={() => respond(selected)}>{busy ? 'Processing…' : 'Register interest'}</Button>}<Button variant="outline" onClick={() => nav.onNavigate('donor-appointment')}>Book donation appointment</Button></div>
    </Dialog>}
  </DonorLayout>;
};
