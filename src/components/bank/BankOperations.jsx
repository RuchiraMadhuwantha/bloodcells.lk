import React, { useState, useCallback } from 'react';
import { Button, Badge, Table, SectionCard } from '../UIComponents';
import {SavedForm,EventHistory} from './BankForms';
import * as service from '../../services/bankService';
import { BankLayout, useBankResource, useBankPermissions, useConfirmedAction, ResourceState, EmptyState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass, BLOOD_GROUPS, formatDate, statusColor, titleCase } from './BankUI';
import { RequestDetails } from '../hospital/HospitalRequests';
import { AppointmentDetails } from '../donor/DonorRecords';
const RequestHistory=({id})=>{const load=useCallback(()=>service.getEventHistory('requests',id),[id]);return <EventHistory load={load}/>;};
const actionLabel = (status) => ({ approved: 'Approve', rejected: 'Reject', fulfilled: 'Fulfill', cancelled: 'Cancel', completed: 'Mark completed' }[status] || status);
const REQUEST_TRANSITIONS = { pending: ['approved', 'rejected', 'cancelled'], approved: ['fulfilled', 'cancelled'] };
export const requestActions = (status) => REQUEST_TRANSITIONS[status] || [];
export const appointmentActions = (status) => status === 'pending' ? ['approved', 'completed', 'cancelled'] : status==='approved'?['completed','cancelled']:[];

export const BankOperations = ({ nav, appointments = false }) => {
  const resource = useBankResource(appointments ? service.getAppointments : service.getRequests);
  const permitted = useBankPermissions();
  const actions = useConfirmedAction(resource.refresh);
  const [filters, setFilters] = useState({ search: '', group: '', hospital: '', district: '', urgency: '', status: '', date: '', sort: appointments ? 'date' : 'priority' });
  const [selected, setSelected] = useState(null);
  const [allocation,setAllocation]=useState(null);
  const batches=useBankResource(service.getBatches);
  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const records = resource.data?.items || [];
  const statuses = appointments ? ['pending', 'approved', 'completed', 'cancelled'] : ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
  const priority = { emergency: 0, urgent: 1, normal: 2 };
  const dateOf = (r) => appointments ? r.appointmentDate : r.requiredDate;
  const filtered = records.filter((r) => (!filters.group || r.bloodGroup === filters.group) &&
    (!filters.hospital || r.hospitalName === filters.hospital) && (!filters.district || r.district === filters.district) &&
    (!filters.urgency || r.urgency === filters.urgency) && (!filters.status || r.status === filters.status) &&
    (!filters.date || dateOf(r) === filters.date) &&
    [r.reference, r.hospitalName, r.hospitalCode, appointments ? r.donorName : r.bloodGroup].some((v) => String(v || '').toLowerCase().includes(filters.search.trim().toLowerCase())))
    .sort((a, b) => {
      const deadline = (dateOf(a) || '9999').localeCompare(dateOf(b) || '9999') || String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
      if (filters.sort === 'priority') return (priority[a.urgency] ?? 3) - (priority[b.urgency] ?? 3) || deadline;
      if (filters.sort === 'date') return deadline;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || Number(b.id) - Number(a.id);
    });
  const decide = (r, status) => actions.ask({
    title: actionLabel(status) + ': ' + r.reference + '?',
    description: appointments ? 'Save this appointment decision? Only the server can confirm a status change.' : status === 'fulfilled' ? 'Issue ' + r.quantity + ' units of ' + r.bloodGroup + ' to ' + r.hospitalName + '? Fulfillment and stock deduction are performed atomically by the backend.' : 'Record ' + status + ' for this request? Approval alone does not issue blood.',
    requireNote: status === 'rejected',
    run: async (note) => {
      const result = appointments ? await service.changeAppointment(r.id, status) : await service.changeRequest(r.id, status, note || undefined);
      const confirmed = appointments ? result?.appointment : result?.request;
      if (!confirmed || confirmed.status !== status) throw new Error('The server did not confirm the requested status. Refresh before retrying.');
      return result.message || 'Decision saved.';
    },
  });
  return <BankLayout nav={nav} title={appointments ? 'Appointment Management' : 'Blood Requests'} subtitle={appointments ? 'Review donation appointments and recorded history' : 'Review, approve and fulfill hospital requests'}>
    <Notice>{appointments ? 'Pending appointments may be approved or cancelled; pending and approved appointments may be completed or rescheduled. Updates and donor notifications are saved together.' : 'Emergency priority is displayed for review; it does not automatically approve requests. Approval and fulfillment are separate actions. On-hold and full processing-event history are not supported.'}</Notice>
    {actions.content}
    <SectionCard title={appointments ? 'Appointments' : 'All Blood Requests'} action={<Button variant="outline" disabled={resource.loading || actions.busy} onClick={resource.refresh}>Refresh</Button>}>
      <Filters>
        <Field label="Search records"><input className={inputClass} value={filters.search} onChange={(e) => set('search', e.target.value)} placeholder="Reference, hospital or donor" /></Field>
        <Field label="Record blood group"><select className={inputClass} value={filters.group} onChange={(e) => set('group', e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Hospital / donation centre"><select className={inputClass} value={filters.hospital} onChange={(e) => set('hospital', e.target.value)}><option value="">All hospitals</option>{[...new Set(records.map((r) => r.hospitalName).filter(Boolean))].sort().map((h) => <option key={h}>{h}</option>)}</select></Field>
        <Field label="Record status"><select className={inputClass} value={filters.status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        <Field label={appointments ? 'Appointment date' : 'Required date'}><input type="date" className={inputClass} value={filters.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Record district"><select className={inputClass} value={filters.district} onChange={(e) => set('district', e.target.value)}><option value="">All districts</option>{[...new Set(records.map((r) => r.district).filter(Boolean))].sort().map((d) => <option key={d}>{d}</option>)}</select></Field>
        {!appointments && <Field label="Request urgency"><select className={inputClass} value={filters.urgency} onChange={(e) => set('urgency', e.target.value)}><option value="">All priorities</option>{['normal', 'urgent', 'emergency'].map((u) => <option key={u} value={u}>{titleCase(u)}</option>)}</select></Field>}
        <Field label="Sort records"><select className={inputClass} value={filters.sort} onChange={(e) => set('sort', e.target.value)}>{!appointments && <option value="priority">Priority, then required date</option>}<option value="date">{appointments ? 'Appointment date' : 'Nearest required date'}</option><option value="newest">Newest submission</option></select></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No records returned">
        {!filtered.length ? <EmptyState title="No records match your filters" /> : <Table columns={appointments ? ['Reference / Donor', 'Hospital / District', 'Date / Time', 'Status', 'Actions'] : ['Reference / Hospital', 'Group / Quantity', 'Urgency', 'Required / Submitted', 'Status', 'Actions']}>
          {filtered.map((r) => <tr key={r.id} className={r.urgency === 'emergency' ? 'bg-red-50' : ''}>
            <td className="p-3 text-sm">{r.reference}<span className="block text-gray-500">{appointments ? r.donorName : r.hospitalName}</span></td>
            <td className="p-3 text-sm">{appointments ? r.hospitalName : r.bloodGroup}<span className="block text-gray-500">{appointments ? r.district : r.quantity + ' units'}</span></td>
            {appointments ? <td className="p-3 text-sm whitespace-nowrap">{formatDate(r.appointmentDate)}<span className="block">{r.timeSlot}</span></td> : <><td className="p-3"><Badge color={statusColor(r.urgency)}>{r.urgencyLabel || titleCase(r.urgency)}</Badge></td><td className="p-3 text-sm whitespace-nowrap">{formatDate(r.requiredDate)}<span className="block text-gray-500">{formatDate(r.createdAt)}</span></td></>}
            <td className="p-3"><Badge color={statusColor(r.status)}>{r.statusLabel || titleCase(r.status)}</Badge></td>
            <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setSelected(r)} aria-label={'View ' + r.reference}>Details</Button>
              {(appointments ? appointmentActions(r.status) : requestActions(r.status)).map((status) => <Button key={status} variant={status === 'rejected' || status === 'cancelled' ? 'outline' : 'primary'} disabled={!permitted || actions.busy} className={disabledClass} onClick={() => decide(r, status)} aria-label={actionLabel(status) + ' ' + r.reference}>{actionLabel(status)}</Button>)}
              {!appointments&&r.status==='approved'&&<Button onClick={()=>setAllocation(r)}>Allocate batch</Button>}{appointments&&['pending','approved'].includes(r.status)&&<Button onClick={()=>setAllocation(r)}>Reschedule</Button>}
            </div></td>
          </tr>)}
        </Table>}
      </ResourceState>
      {appointments && <p className="text-sm text-gray-500 mt-4">Appointment rejection is unavailable. Recorded completed appointments also provide the current donation history source; a separate collected-volume ledger is not supplied.</p>}
    </SectionCard>
    {allocation&&<Dialog title={appointments?'Reschedule appointment':'Reserve verified batch'} onClose={()=>setAllocation(null)}><SavedForm fields={appointments?[{key:'newDate',label:'New appointment date',type:'date'},{key:'newTimeSlot',label:'New appointment time',type:'time'}]:(batches.data?.items||[]).filter(b=>b.bloodGroup===allocation.bloodGroup&&b.availableUnits>0).map(b=>({key:'batch_'+b.id,label:b.locationName+' / '+b.reference+' / '+b.availableUnits+' available',type:'number',min:0,max:b.availableUnits,required:false}))} onSave={(data,key)=>appointments?service.rescheduleAppointment(allocation.id,data,key):service.allocateRequest(allocation.id,{items:Object.entries(data).filter(([name,quantity])=>name.startsWith('batch_')&&Number(quantity)>0).map(([name,quantity])=>({batchId:Number(name.slice(6)),quantity:Number(quantity)}))},key)} onSaved={()=>{setAllocation(null);resource.refresh();batches.refresh();}}/></Dialog>}
    {selected && <Dialog title={appointments ? 'Appointment details' : 'Blood request details'} onClose={() => setSelected(null)}>
      {appointments ? <AppointmentDetails appointment={selected} /> : <RequestDetails request={selected} />}
      {!appointments && <div className="mt-4"><Details entries={[[ 'Hospital', selected.hospitalName ], ['District', selected.district]]} /></div>}
      {!appointments&&<RequestHistory id={selected.id}/>}
    </Dialog>}
  </BankLayout>;
};
export const BloodRequestQueue = (props) => <BankOperations {...props} />;
export const BankAppointments = (props) => <BankOperations {...props} appointments />;
