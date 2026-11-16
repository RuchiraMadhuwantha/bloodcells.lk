import React, { useRef, useState } from 'react';
import { Database, Clock, CheckCircle, AlertCircle, ClipboardList, Plus, Send, User } from 'lucide-react';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card, ProgressBar } from './components/UIComponents';
import * as service from './services/hospitalService';
import { HospitalLayout, useHospital, useHospitalResource, Loading, ErrorPanel, EmptyState, Notice, Field, Details, inputClass, disabledClass } from './components/hospital/HospitalUI';
import { BLOOD_GROUPS, URGENCIES, todayStr, isValidDate, formatDate, titleCase, statusColor, summarizeRequests, filterRequests } from './components/hospital/hospitalUtils';
import { RequestTable, useRequestDialogs } from './components/hospital/HospitalRequests';

export const HospitalDashboard = ({ nav }) => {
  const { hospital } = useHospital();
  const dashboard=useHospitalResource(service.getDashboard);
  const requests={loading:dashboard.loading,error:dashboard.error,refresh:dashboard.refresh,data:dashboard.data?{items:dashboard.data.summary.recentRequests}:null};
  const stock = useHospitalResource(service.getNetworkStock);
  const appointments = useHospitalResource(service.getAppointments);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const approvalLock = useRef(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const approve = async (id) => {
    if (approvalLock.current) return;
    approvalLock.current = true; setApprovalBusy(true); setApprovalMessage('');
    try {
      await service.approveAppointment(id);
      setApprovalMessage('Appointment approved. The donor and blood bank have been notified.');
      appointments.refresh();
    } catch (error) { setApprovalMessage(error.message || 'Could not approve this appointment.'); }
    finally { approvalLock.current = false; setApprovalBusy(false); }
  };
  const actions = useRequestDialogs(requests.refresh);
  const items = requests.data?.items || [];
  const counts = dashboard.data?.summary.requests || summarizeRequests([]);
  const inventory = stock.data?.items || [];
  const maxUnits = Math.max(1, ...inventory.map((i) => i.availableUnits));
  const upcoming = (appointments.data?.items || []).filter((a) => a.appointmentDate >= todayStr() && ['pending', 'approved'].includes(a.status))
    .sort((a, b) => (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
  return <HospitalLayout nav={nav} title="Hospital Dashboard" subtitle={hospital.hospitalName}>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      {[[ClipboardList, 'Total Blood Requests', counts.total, 'red'], [Clock, 'Pending Requests', counts.pending, 'amber'],
        [AlertCircle, 'Emergency Open', counts.emergency, 'red'], [CheckCircle, 'Approved Requests', counts.approved, 'blue'],
        [CheckCircle, 'Fulfilled Requests', counts.fulfilled, 'green']].map(([icon, label, value, accent]) =>
        <StatCard key={label} icon={icon} label={label} value={requests.loading ? 'Loading...' : requests.error ? 'Unavailable' : value} accent={accent} />)}
      <StatCard icon={Database} label="Hospital usable units" value={dashboard.loading ? 'Loading...' : dashboard.data?.summary.inventory.available ? dashboard.data.summary.inventory.totalAvailable : 'Unavailable'} accent="green" />
    </div>
    <div className="grid lg:grid-cols-3 gap-6 mb-6">
      <SectionCard title="Blood Availability" className="lg:col-span-2" action={<Button variant="ghost" onClick={() => nav.onNavigate('hospital-availability')}>Check stock</Button>}>
        <p className="text-xs text-gray-500 mb-4">Verified unreserved, non-expired stock at blood bank locations. Legacy aggregate stock is excluded. Viewing does not reserve units.</p>
        {stock.loading ? <Loading /> : stock.error ? <ErrorPanel message={stock.error} onRetry={stock.refresh} /> : !inventory.length ? <EmptyState title="No network inventory returned" /> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{inventory.map((i) => <div key={String(i.id)+i.bloodGroup} className="border border-gray-100 rounded-lg p-3"><div className="flex justify-between items-center gap-2 mb-2"><BloodTypeBadge group={i.bloodGroup} size="sm" /><span className="font-bold text-sm">{i.availableUnits}</span></div><ProgressBar value={i.availableUnits} max={maxUnits} /><p className="text-xs text-gray-500 mt-2">{i.centreName} / {i.district}</p></div>)}</div>}
      </SectionCard>
      <SectionCard title="Donor Appointments" action={!appointments.loading && !appointments.error && <Badge color="gray">{upcoming.length} upcoming</Badge>}>
        {approvalMessage && <Notice>{approvalMessage}</Notice>}
        {appointments.loading ? <Loading /> : appointments.error ? <ErrorPanel message={appointments.error} onRetry={appointments.refresh} /> : !upcoming.length ? <EmptyState title="No upcoming donor appointments" /> : <div className="space-y-3">{upcoming.map((a) => <div key={a.id} className="border border-gray-100 rounded-lg p-3"><p className="flex items-center gap-2 font-medium text-sm"><User className="w-4 h-4" />{a.donorName}</p><p className="text-xs text-gray-500 my-2">{formatDate(a.appointmentDate)} | {a.timeSlot} | {a.bloodGroup}</p><Badge color={a.status === 'approved' ? 'green' : 'yellow'}>{a.statusLabel}</Badge>{a.status === 'pending' && <Button className="mt-2" disabled={approvalBusy} onClick={() => approve(a.id)} aria-label={'Approve ' + a.reference}>Approve</Button>}</div>)}</div>}
      </SectionCard>
    </div>
    {actions.content}
    <SectionCard title="Recent Blood Requests" action={<div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => nav.onNavigate('hospital-requests')}>View all requests</Button><Button icon={Plus} onClick={() => nav.onNavigate('hospital-request')}>New Request</Button></div>}>
      {requests.loading ? <Loading /> : requests.error ? <ErrorPanel message={requests.error} onRetry={requests.refresh} /> : !items.length ? <EmptyState title="No blood requests recorded" /> : <RequestTable items={filterRequests(items).slice(0, 6)} onView={actions.view} onCancel={actions.askCancel} busy={actions.busy} />}
    </SectionCard>
    <div className="grid md:grid-cols-2 gap-6 mt-6">
      <SectionCard title="Hospital Inventory" action={<Button variant="ghost" onClick={() => nav.onNavigate('hospital-inventory')}>View inventory</Button>}><p className="text-sm text-gray-500">{dashboard.data?.summary.inventory.available ? dashboard.data.summary.inventory.totalAvailable+' usable, unreserved units in owned hospital batches.' : 'Hospital stock requires the approved hospital migration.'}</p></SectionCard>
      <SectionCard title="Recent Blood Usage" action={<Button variant="ghost" onClick={() => nav.onNavigate('hospital-usage')}>Blood usage</Button>}><p className="text-sm text-gray-500">{dashboard.data?.summary.usage.available ? dashboard.data.summary.usage.totalUsage+' recorded units used. Open Blood Usage for records and details.' : 'Hospital usage requires the approved hospital migration.'}</p></SectionCard>
    </div>
  </HospitalLayout>;
};

export const BloodRequestPage = ({ nav, initialGroup = 'O+' }) => {
  const [form, setForm] = useState({ group: BLOOD_GROUPS.includes(initialGroup) ? initialGroup : 'O+', units: '', priority: 'normal', date: '', dept: 'Emergency', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    const quantity = Number(form.units);
    if (!BLOOD_GROUPS.includes(form.group) || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) { setError('Choose a blood group and a whole quantity from 1 to 500 units.'); return; }
    if (form.date && (!isValidDate(form.date) || form.date < todayStr())) { setError('Required date must be today or a valid future date.'); return; }
    if (!URGENCIES.includes(form.priority) || form.reason.trim().length > 2000 || form.dept.length > 100) { setError('Check the urgency, department and reason.'); return; }
    lock.current = true; setSubmitting(true); setError(null);
    try {
      const data = await service.createRequest({ blood_group: form.group, quantity, urgency: form.priority, required_date: form.date || undefined, department: form.dept || undefined, reason: form.reason.trim() || undefined });
      if (!data?.request?.reference) throw new Error('Submission was not confirmed. Check My Blood Requests before trying again.');
      setResult(data);
    } catch (e) { setError(e.message || 'Could not submit the request.'); }
    finally { lock.current = false; setSubmitting(false); }
  };
  if (result) return <HospitalLayout nav={nav} title="Blood Request">
    <Card className="max-w-xl mx-auto"><CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" /><h2 className="text-xl font-bold text-center mb-3">Request Submitted</h2>
      <p role="status" className="text-sm text-gray-600 mb-4">Your blood request has been saved and sent to the Blood Bank. Its current status is shown below.</p>
      <Details entries={[[ 'Reference', result.request.reference ], ['Blood group', result.request.bloodGroup], ['Quantity', `${result.request.quantity} unit(s)`], ['Urgency', titleCase(result.request.urgency)], ['Required date', formatDate(result.request.requiredDate)], ['Status', result.request.statusLabel || titleCase(result.request.status)]]} />
      {result.stockWarning && <div className="mt-4"><Notice>{result.stockWarning}</Notice></div>}
      <div className="flex flex-wrap gap-3 mt-5"><Button onClick={() => nav.onNavigate('hospital-requests')}>My Blood Requests</Button><Button variant="outline" onClick={() => { setResult(null); setForm((f) => ({ ...f, units: '', date: '', reason: '' })); }}>Raise another</Button></div>
    </Card>
  </HospitalLayout>;
  return <HospitalLayout nav={nav} title="New Blood Request" subtitle="Request blood units from the blood bank">
    {error && <div className="mb-4"><ErrorPanel message={error} /></div>}
    <form aria-label="Blood request" onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
      <fieldset disabled={submitting} className="lg:col-span-2 min-w-0"><legend className="sr-only">Blood request details</legend>
        <SectionCard title="Request Details"><div className="space-y-5">
          <Field label="Blood group"><select className={inputClass} value={form.group} onChange={(e) => set('group', e.target.value)} required>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Quantity (units)"><input type="number" min="1" max="500" step="1" required className={inputClass} value={form.units} onChange={(e) => set('units', e.target.value)} /></Field>
            <Field label="Required date (optional)"><input type="date" min={todayStr()} className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Field label="Urgency"><select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>{URGENCIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</select></Field>
          <Field label="Department (optional)"><select className={inputClass} value={form.dept} onChange={(e) => set('dept', e.target.value)}><option value="">Not specified</option>{['Emergency', 'Surgery', 'ICU', 'Oncology', 'Maternity', 'General Ward'].map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Reason (optional)"><textarea rows={4} maxLength={2000} className={inputClass} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Hospital-level reason; avoid patient-identifying information" /></Field>
          <p className="text-xs text-gray-500">Additional notes are not a separate field in the current service. Include relevant non-identifying information in the reason.</p>
        </div></SectionCard>
      </fieldset>
      <div><SectionCard title="Request Summary" className="lg:sticky lg:top-20">
        <div className="flex justify-center mb-4"><BloodTypeBadge group={form.group} size="lg" /></div>
        <Details entries={[[ 'Quantity', form.units ? `${form.units} units` : 'Enter quantity' ], ['Urgency', <Badge color={statusColor(form.priority)}>{titleCase(form.priority)}</Badge>], ['Required date', formatDate(form.date)], ['Department', form.dept || 'Not specified']]} />
        {form.priority === 'emergency' && <div className="mt-4"><Notice>Flagged as an emergency for blood bank review. Urgency does not automatically approve or fulfil the request.</Notice></div>}
        <Button type="submit" disabled={submitting} icon={Send} className={`w-full mt-5 ${disabledClass}`}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
      </SectionCard></div>
    </form>
  </HospitalLayout>;
};
