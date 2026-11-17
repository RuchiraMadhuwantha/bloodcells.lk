import {Eye,X} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Button, CompactAction, Badge, Table, SectionCard } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Field, Filters, Dialog, Details, ErrorPanel, inputClass, disabledClass } from './HospitalUI';
import { BLOOD_GROUPS, REQUEST_STATUSES, URGENCIES, filterRequests, titleCase, statusColor, formatDate } from './hospitalUtils';

export const RequestDetails = ({ request: r }) => <Details entries={[
  ['Reference', r.reference || r.id], ['Blood group', r.bloodGroup], ['Requested quantity', `${r.quantity} unit(s)`],
  ['Urgency', r.urgencyLabel || titleCase(r.urgency)], ['Required date', formatDate(r.requiredDate)],
  ['Submission date', formatDate(r.createdAt)], ['Status', r.statusLabel || titleCase(r.status)],
  ['Department', r.department || 'Not provided'], ['Reason', r.reason || 'Not provided'],
  ['Blood bank response', r.decisionNote || 'No response recorded'], ['Reviewed date', formatDate(r.reviewedAt)], ['Fulfilled date', formatDate(r.fulfilledAt)],
]} />;

export const RequestTable = ({ items, onView, onCancel, busy = false }) => <Table columns={['Request', 'Blood group', 'Quantity', 'Urgency', 'Required', 'Submitted', 'Status / Response', 'Actions']}>
  {items.map((r) => <tr key={r.id} className={r.urgency === 'emergency' ? 'bg-red-50' : 'hover:bg-gray-50'}>
    <td className="p-3 text-sm font-medium">{r.reference || r.id}</td><td className="p-3 text-sm">{r.bloodGroup}</td>
    <td className="p-3 text-sm">{r.quantity} units</td><td className="p-3"><Badge color={statusColor(r.urgency)}>{r.urgencyLabel || titleCase(r.urgency)}</Badge></td>
    <td className="p-3 text-sm whitespace-nowrap">{formatDate(r.requiredDate)}</td><td className="p-3 text-sm whitespace-nowrap">{formatDate(r.createdAt)}</td>
    <td className="p-3"><Badge color={statusColor(r.status)}>{r.statusLabel || titleCase(r.status)}</Badge>{r.decisionNote && <p className="text-xs text-gray-500 mt-2 max-w-56 break-words">{r.decisionNote}</p>}</td>
    <td className="p-3"><div className="flex flex-wrap gap-2"><CompactAction icon={Eye} onClick={() => onView(r)} aria-label={`View request ${r.reference || r.id}`}>Details</CompactAction>
      {onCancel && ['pending', 'approved'].includes(r.status) && <CompactAction icon={X} tone="danger" disabled={busy} onClick={() => onCancel(r)} aria-label={`Cancel request ${r.reference || r.id}`}>Cancel</CompactAction>}</div></td>
  </tr>)}
</Table>;

export const useRequestDialogs = (refresh) => {
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const cancel = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await service.cancelRequest(cancelTarget.id);
      if (!result?.request) throw new Error('Cancellation was not confirmed. Refresh the request list before retrying.');
      setSuccess(result.message || 'Request cancelled.'); setCancelTarget(null); setSelected(null); refresh();
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  return {
    view: setSelected, busy,
    askCancel: (r) => { setError(null); setCancelTarget(r); },
    content: <>
      {success && <p role="status" className="bg-green-50 text-green-800 p-3 rounded-lg mb-4">{success}</p>}
      {selected && <Dialog title="Blood request details" onClose={() => setSelected(null)}><RequestDetails request={selected} /></Dialog>}
      {cancelTarget && <Dialog title="Cancel blood request?" onClose={() => setCancelTarget(null)} busy={busy}>
        <p className="text-sm text-gray-600 mb-4">Cancel {cancelTarget.reference} for {cancelTarget.quantity} unit(s) of {cancelTarget.bloodGroup}? This releases your request from the blood bank queue.</p>
        {error && <ErrorPanel message={error} />}
        <div className="flex flex-wrap gap-3 justify-end mt-5"><Button variant="ghost" disabled={busy} onClick={() => setCancelTarget(null)}>Keep request</Button><Button disabled={busy} className={disabledClass} onClick={cancel}>{busy ? 'Cancelling...' : 'Confirm cancellation'}</Button></div>
      </Dialog>}
    </>,
  };
};

export const MyBloodRequests = ({ nav }) => {
  const resource = useHospitalResource(service.getRequests);
  const [filters, setFilters] = useState({ query: '', group: '', urgency: '', status: '', sort: 'priority' });
  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = filterRequests(resource.data?.items || [], filters);
  const actions = useRequestDialogs(resource.refresh);
  return <HospitalLayout nav={nav} title="My Blood Requests" subtitle="Requests belonging to your hospital">
    <SectionCard title="Request tracking" action={<Button onClick={() => nav.onNavigate('hospital-request')}>New Blood Request</Button>}>
      <Filters>
        <Field label="Search request ID"><input className={inputClass} value={filters.query} onChange={(e) => set('query', e.target.value)} placeholder="Request reference" /></Field>
        <Field label="Blood group"><select className={inputClass} value={filters.group} onChange={(e) => set('group', e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Urgency"><select className={inputClass} value={filters.urgency} onChange={(e) => set('urgency', e.target.value)}><option value="">All urgency levels</option>{URGENCIES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        <Field label="Request status"><select className={inputClass} value={filters.status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option>{REQUEST_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        <Field label="Sort requests"><select className={inputClass} value={filters.sort} onChange={(e) => set('sort', e.target.value)}><option value="priority">Priority, then newest</option><option value="newest">Newest submission first</option><option value="oldest">Oldest submission first</option></select></Field>
      </Filters>
      {actions.content}
      <ResourceState resource={resource} emptyTitle="No blood requests recorded">
        {filtered.length ? <RequestTable items={filtered} onView={actions.view} onCancel={actions.askCancel} busy={actions.busy} /> : <EmptyState title="No requests match your filters" />}
      </ResourceState>
      <p className="text-xs text-gray-500 mt-4">Priority sorting is a display aid. The blood bank controls request processing and approval.</p>
    </SectionCard>
  </HospitalLayout>;
};
