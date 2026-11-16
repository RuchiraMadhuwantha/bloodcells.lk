import React, { useRef, useState } from 'react';
import { Eye, Check, Droplets, CalendarCheck } from 'lucide-react';
import { Badge, Button, CompactAction, SectionCard, StatCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Filters, Field, Dialog, ErrorPanel, inputClass } from './HospitalUI';
import { AppointmentDetails } from '../donor/DonorRecords';
import { formatDate, todayStr, statusColor, titleCase } from './hospitalUtils';

export const HospitalAppointments = ({ nav }) => {
  const resource = useHospitalResource(service.getAppointments);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [collection, setCollection] = useState(null);
  const [units, setUnits] = useState('');
  const [volume, setVolume] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const records = resource.data?.items || [];
  const filtered = records.filter(a => (!status || a.status === status) && (!date || a.appointmentDate === date) &&
    [a.reference, a.donorName, a.nic, a.bloodGroup].some(v => String(v || '').toLowerCase().includes(search.trim().toLowerCase())));
  const completed = filtered.filter(a => a.status === 'completed');
  const save = async (appointment, payload) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (payload) await service.recordCollection(appointment.id, payload);
      else await service.approveAppointment(appointment.id);
      setCollection(null);
      setMessage(payload ? 'Collection saved. The donor and blood bank have been notified.' : 'Appointment approved. The donor and blood bank have been notified.');
      resource.refresh();
    } catch (e) { setError(e.message || 'Could not save this appointment.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <HospitalLayout nav={nav} title="Appointment Management" subtitle="Approve appointments and record collected blood">
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {error && !collection && <ErrorPanel message={error} />}
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <StatCard icon={CalendarCheck} label="Pending appointments" value={resource.loading ? 'Loading...' : resource.error ? 'Unavailable' : filtered.filter(a => a.status === 'pending').length} accent="amber" />
      <StatCard icon={Droplets} label="Collected units" value={resource.loading ? 'Loading...' : resource.error ? 'Unavailable' : completed.reduce((n,a) => n + (a.collectedUnits || 0), 0)} />
      <StatCard icon={Droplets} label="Collected volume (mL)" value={resource.loading ? 'Loading...' : resource.error ? 'Unavailable' : completed.reduce((n,a) => n + (a.collectedVolumeMl || 0), 0)} accent="blue" />
    </div>
    <SectionCard title="Donor appointments" action={<Button onClick={resource.refresh} disabled={busy || resource.loading}>Refresh</Button>}>
      <Filters>
        <Field label="Search appointments"><input className={inputClass} value={search} onChange={e => setSearch(e.target.value)} placeholder="Reference, donor, NIC or blood group" /></Field>
        <Field label="Appointment status"><select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['pending','approved','completed','cancelled'].map(s => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        <Field label="Appointment date"><input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No donor appointments">
        {!filtered.length ? <EmptyState title="No appointments match your filters" /> : <Table columns={['Reference / Donor', 'NIC', 'Blood group', 'Date / Time', 'Status', 'Collected blood', 'Actions']}>
          {filtered.map(a => <tr key={a.id}>
            <td className="p-3 text-sm">{a.reference}<span className="block text-gray-500">{a.donorName}</span></td>
            <td className="p-3 text-sm whitespace-nowrap">{a.nic || 'Not provided'}</td>
            <td className="p-3 text-sm">{a.bloodGroup}</td>
            <td className="p-3 text-sm whitespace-nowrap">{formatDate(a.appointmentDate)}<span className="block text-gray-500">{a.timeSlot}</span></td>
            <td className="p-3"><Badge color={statusColor(a.status)}>{a.statusLabel || titleCase(a.status)}</Badge></td>
            <td className="p-3 text-sm">{a.collectedUnits != null ? <>{a.collectedUnits} unit(s)<span className="block text-gray-500">{a.collectedVolumeMl} mL</span></> : a.status === 'completed' ? 'Not recorded' : '—'}</td>
            <td className="p-3"><div className="flex flex-wrap gap-1.5">
              <CompactAction icon={Eye} onClick={() => setSelected(a)}>Details</CompactAction>
              {a.status === 'pending' && <CompactAction tone="success" icon={Check} disabled={busy} onClick={() => save(a)} aria-label={'Approve ' + a.reference}>Approve</CompactAction>}
              {a.status === 'approved' && <div className="space-y-1"><CompactAction tone="schedule" icon={Droplets} disabled={busy || a.appointmentDate > todayStr()} title={a.appointmentDate > todayStr() ? 'Available on the appointment date' : 'Record actual collected blood'} onClick={() => { setCollection(a); setUnits(''); setVolume(''); setError(''); }}>Record collection</CompactAction>{a.appointmentDate > todayStr() && <p className="text-xs text-gray-500">Available {formatDate(a.appointmentDate)}</p>}</div>}
            </div></td>
          </tr>)}
        </Table>}
      </ResourceState>
    </SectionCard>
    {selected && <Dialog title="Appointment details" onClose={() => setSelected(null)}><AppointmentDetails appointment={selected} /></Dialog>}
    {collection && <Dialog title={'Record collection · ' + collection.reference} busy={busy} onClose={() => { if (!busy) { setCollection(null); setError(''); } }}>
      <p className="text-sm mb-4">{collection.donorName} · {collection.bloodGroup} · {formatDate(collection.appointmentDate)}</p>
      {error && <ErrorPanel message={error} />}
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); save(collection, {collectedUnits:Number(units), collectedVolumeMl:Number(volume)}); }}>
        <Field label="Collected units"><input required type="number" min="1" max="1000" step="1" className={inputClass} value={units} onChange={e => setUnits(e.target.value)} /></Field>
        <Field label="Collected volume (mL)"><input required type="number" min="1" max="100000" step="1" className={inputClass} value={volume} onChange={e => setVolume(e.target.value)} /></Field>
        <Button type="submit" icon={Check} disabled={busy}>{busy ? 'Saving...' : 'Save collection and complete'}</Button>
      </form>
    </Dialog>}
  </HospitalLayout>;
};
