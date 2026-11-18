import React, { useEffect, useRef, useState } from 'react';
import {sortRecords} from '../recordSorting';
import {SortControl} from '../SortControl';
import { Calendar, Heart, Eye, CalendarClock, X, RefreshCw } from 'lucide-react';
import { Button, Badge, SectionCard, Table, StatCard, CompactAction } from '../UIComponents';
import * as donor from '../../services/donorService';
import { DonorLayout, useDonorResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, ErrorPanel, inputClass, disabledClass } from './DonorUI';
import { formatDate, statusColor, searchRecords, todayStr } from './donorUtils';

const RESCHEDULE_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

export const AppointmentDetails = ({ appointment: a }) => <Details entries={[
  ['Reference', a.reference || a.id], ['Hospital', a.hospitalName], ['District', a.district],
  ['Date', formatDate(a.appointmentDate)], ['Time', a.timeSlot],
  ['Blood group', a.bloodGroup], ['Status', a.statusLabel || a.status],
  ...(a.campaignName ? [['Campaign',a.campaignName]] : []),
  ...(a.nic ? [['NIC', a.nic]] : []),
  ...(a.collectedUnits != null ? [['Collected units', a.collectedUnits], ['Collected volume', a.collectedVolumeMl + ' mL']] : a.quantity != null ? [['Quantity', a.quantity]] : []), ['Notes', a.notes || 'No notes provided'],
]} />;

export const DonationHistory = ({ nav }) => {
  const resource = useDonorResource(donor.getDonationHistory);
  const refreshHistory = resource.refresh;
  useEffect(() => {
    window.addEventListener('focus', refreshHistory);
    const timer = window.setInterval(() => { if (!document.hidden) refreshHistory(); }, 30000);
    return () => { window.removeEventListener('focus', refreshHistory); window.clearInterval(timer); };
  }, [refreshHistory]);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(null);
  const records = resource.data?.items || [];
  const years = [...new Set(records.map((a) => a.appointmentDate?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const filtered = searchRecords(records, query, ['reference', 'hospitalName', 'district', 'bloodGroup', 'statusLabel'])
    .filter((a) => (!year || a.appointmentDate?.startsWith(year)) && (!date || a.appointmentDate === date))
    .sort((a, b) => (sort === 'recent' ? -1 : 1) * (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
  return <DonorLayout nav={nav} title="Donation History" subtitle="Your recorded completed donations">
    {!resource.loading && !resource.error && <div className="max-w-sm mb-5"><StatCard icon={Heart} label="Recorded completed donations" value={resource.data?.totalCompleted ?? records.length} /></div>}
    <SectionCard title="Donation records" action={<div className="flex flex-wrap gap-1.5"><Button variant="ghost" disabled={resource.loading} onClick={() => { setQuery(''); setYear(''); setDate(''); setSort('recent'); refreshHistory(); }}>Show all donations</Button><Button icon={RefreshCw} disabled={resource.loading} onClick={refreshHistory}>Refresh history</Button></div>}>
      <Filters>
        <Field label="Search donations"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reference, centre or blood group" /></Field>
        <Field label="Year"><select className={inputClass} value={year} onChange={(e) => setYear(e.target.value)}><option value="">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select></Field>
        <Field label="Donation date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Sort donations"><select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Most recent first</option><option value="oldest">Oldest first</option></select></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No completed donations recorded">
        {filtered.length === 0 ? <EmptyState title="No donations match your filters" /> : <Table columns={['Reference', 'Date', 'Location', 'Blood group', 'Status', 'Collected units', 'Collected volume (mL)', 'Details']}>
          {filtered.map((a) => <tr key={a.id}>
            <td className="p-3 text-sm">{a.reference || a.id}</td><td className="p-3 text-sm whitespace-nowrap">{formatDate(a.appointmentDate)}</td>
            <td className="p-3 text-sm">{a.hospitalName}<span className="block text-gray-500">{a.district}</span></td>
            <td className="p-3 text-sm">{a.bloodGroup || 'Not provided'}</td><td className="p-3"><Badge color="green">{a.statusLabel || a.status}</Badge></td>
            <td className="p-3 text-sm">{a.collectedUnits ?? a.quantity ?? 'Not recorded'}</td>
            <td className="p-3 text-sm">{a.collectedVolumeMl ?? 'Not recorded'}</td>
            <td className="p-3"><Button variant="ghost" onClick={() => setSelected(a)} aria-label={`View donation ${a.reference || a.id}`}>View details</Button></td>
          </tr>)}
        </Table>}
      </ResourceState>
    </SectionCard>
    {selected && <Dialog title="Donation details" onClose={() => setSelected(null)}><AppointmentDetails appointment={selected} /></Dialog>}
  </DonorLayout>;
};

export const MyAppointments = ({ nav }) => {
  const [sort,setSort]=useState('latest');
  const resource = useDonorResource(donor.getAppointments);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const appointments = sortRecords(searchRecords(resource.data?.items || [], query, ['reference', 'hospitalName', 'district'])
    .filter((a) => !status || a.status === status),'myAppointments',sort);
  const cancel = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await donor.cancelAppointment(cancelling.id);
      setSuccess(result.message);
      setCancelling(null); setSelected(null); resource.refresh();
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const reschedule = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await donor.rescheduleAppointment(rescheduling.id, { appointment_date: newDate, time_slot: newSlot });
      setSuccess(result.message);
      setRescheduling(null); setSelected(null); resource.refresh();
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  return <DonorLayout nav={nav} title="My Appointments" subtitle="Track and manage your bookings">
    <div className="flex justify-end mb-5"><Button icon={Calendar} onClick={() => nav.onNavigate('donor-appointment')}>Book appointment</Button></div>
    {success && <p role="status" className="p-4 mb-4 rounded-lg bg-green-50 text-green-800">{success}</p>}
    <SectionCard title="Appointments">
      <Filters>
        <Field label="Search appointments"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reference, hospital or district" /></Field>
        <Field label="Appointment status"><select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}><option value="">All statuses</option>{['pending', 'approved', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></Field>
        <SortControl label="Sort appointments" profile="myAppointments" value={sort} onChange={setSort} className={inputClass}/>
      </Filters>
      <ResourceState resource={resource} emptyTitle="You have no appointments yet">
        {appointments.length === 0 ? <EmptyState title="No appointments match your filters" /> : <Table columns={['Reference', 'Hospital / District', 'Date / Time', 'Status', 'Actions']}>
          {appointments.map((a) => <tr key={a.id}>
            <td className="p-3 text-sm">{a.reference || a.id}</td><td className="p-3 text-sm">{a.hospitalName}<span className="block text-gray-500">{a.district}</span></td>
            <td className="p-3 text-sm whitespace-nowrap">{formatDate(a.appointmentDate)}<span className="block text-gray-500">{a.timeSlot}</span></td>
            <td className="p-3"><Badge color={statusColor(a.status)}>{a.statusLabel || a.status}</Badge></td>
            <td className="p-3"><div className="flex flex-wrap items-center gap-1.5">
              <CompactAction icon={Eye} onClick={() => setSelected(a)} aria-label={`View appointment ${a.reference || a.id}`}>View details</CompactAction>
              <CompactAction tone="schedule" icon={CalendarClock} disabled={busy || !['pending', 'approved'].includes(a.status)} className={disabledClass}
                onClick={() => { setRescheduling(a); setNewDate(a.appointmentDate); setNewSlot(a.timeSlot); setError(null); setSuccess(null); }} aria-label={`Reschedule appointment ${a.reference || a.id}`}>Reschedule</CompactAction>
              <CompactAction tone="danger" icon={X} disabled={busy || !['pending', 'approved'].includes(a.status)} className={disabledClass}
                onClick={() => { setCancelling(a); setError(null); }} aria-label={`Cancel appointment ${a.reference || a.id}`}>Cancel</CompactAction>
            </div></td>
          </tr>)}
        </Table>}
      </ResourceState>
    </SectionCard>
    {selected && <Dialog title="Appointment details" onClose={() => setSelected(null)}><AppointmentDetails appointment={selected} /></Dialog>}
    {cancelling && <Dialog title="Cancel appointment?" busy={busy} onClose={() => setCancelling(null)}>
      <p className="text-sm text-gray-600 mb-4">Cancel {cancelling.reference} at {cancelling.hospitalName} on {formatDate(cancelling.appointmentDate)} at {cancelling.timeSlot}? Your slot will be released.</p>
      {error && <ErrorPanel message={error} />}
      <div className="flex flex-wrap justify-end gap-3 mt-5"><Button variant="ghost" disabled={busy} onClick={() => setCancelling(null)}>Keep appointment</Button><Button disabled={busy} className={disabledClass} onClick={cancel}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</Button></div>
    </Dialog>}
    {rescheduling && <Dialog title="Reschedule appointment?" busy={busy} onClose={() => setRescheduling(null)}>
      <p className="text-sm text-gray-600 mb-4">Move {rescheduling.reference} at {rescheduling.hospitalName} to a new date and time. The new slot is checked for availability before it is saved.</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-4"><label className="block text-sm text-gray-700"><span className="block mb-1 font-medium">New date</span><input type="date" className={inputClass} value={newDate} min={todayStr()} onChange={(e) => setNewDate(e.target.value)} /></label>
        <label className="block text-sm text-gray-700"><span className="block mb-1 font-medium">New time</span><select className={inputClass} value={newSlot} onChange={(e) => setNewSlot(e.target.value)}><option value="">Select a time</option>{RESCHEDULE_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label></div>
      {error && <ErrorPanel message={error} />}
      <div className="flex flex-wrap justify-end gap-3 mt-5"><Button variant="ghost" disabled={busy} onClick={() => setRescheduling(null)}>Keep current</Button><Button disabled={busy || !newDate || !newSlot} className={disabledClass} onClick={reschedule}>{busy ? 'Rescheduling…' : 'Confirm reschedule'}</Button></div>
    </Dialog>}
  </DonorLayout>;
};

