import React, { useCallback, useEffect, useState } from 'react';
import {
  Database, Clock, CheckCircle, AlertCircle, Plus, Send, LayoutDashboard,
  Calendar, User, Loader2
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card, Table, ProgressBar } from './components/UIComponents';
import { useAuth } from './context/AuthContext';
import * as api from './services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(iso);
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const requestStatusColor = (s) => ({
  pending: 'yellow', approved: 'blue', fulfilled: 'green', rejected: 'gray', cancelled: 'gray',
}[s] || 'gray');

const urgencyColor = (u) => ({ emergency: 'red', urgent: 'amber', normal: 'blue' }[u] || 'blue');

const Loading = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center py-20 text-gray-500">
    <Loader2 className="w-6 h-6 animate-spin mr-2" /> {label}
  </div>
);

const ErrorPanel = ({ message, onRetry }) => (
  <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-6 text-center">
    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
    <p>{message}</p>
    {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>}
  </div>
);

/* ===================================================================================
   HOSPITAL DASHBOARD — own record, own requests, bank-wide stock levels
   =================================================================================== */

export const HospitalDashboard = ({ nav }) => {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, r, inv, ap] = await Promise.all([
        api.getMyHospital(),
        api.listMyRequests(),
        api.listInventory(),
        api.listHospitalAppointments(),
      ]);
      setHospital(h.hospital || null);
      setRequests(r.requests || []);
      setCounts(r.counts || null);
      setInventory(inv.inventory || []);
      setAppointments(ap.appointments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    setBusyId(id);
    setActionError(null);
    try {
      await api.cancelMyRequest(id);
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Hospital Dashboard" userName={user?.username || 'Hospital'}>
        <Loading label="Loading your hospital record…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Hospital Dashboard" userName={user?.username || 'Hospital'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const totalUnits = inventory.reduce((sum, i) => sum + (i.availableUnits || 0), 0);
  const emergency = requests.filter((r) => r.urgency === 'emergency' && ['pending', 'approved'].includes(r.status)).length;
  const maxUnits = Math.max(50, ...inventory.map((i) => i.availableUnits || 0));
  const today = todayStr();
  const upcomingAppointments = appointments
    .filter((a) => a.appointmentDate >= today && ['pending', 'approved'].includes(a.status))
    .sort((a, b) => (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
  const hospitalName = hospital?.hospitalName || 'Your Hospital';

  return (
    <DashboardLayout {...nav} title="Hospital Dashboard" subtitle={hospitalName} userName={hospital?.username || user?.username || 'Hospital'} role="Hospital Admin">
      {/* Approval state comes from the users table, not the local UI. */}
      {hospital?.status && hospital.status !== 'Active' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 text-sm">
          <strong>Account status: {hospital.status}.</strong>{' '}
          {hospital.status === 'Pending'
            ? 'Your registration is awaiting Blood Bank approval.'
            : hospital.rejectionReason || 'Please contact the Blood Bank.'}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value={totalUnits} label="Units In Stock (network)" accent="green" />
        <StatCard icon={Clock} value={counts?.pending ?? 0} label="Pending Requests" accent="amber" />
        <StatCard icon={CheckCircle} value={counts?.approved ?? 0} label="Approved" accent="blue" />
        <StatCard icon={AlertCircle} value={emergency} label="Emergency Open" accent="red" />
      </div>

      {actionError && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Blood Availability" className="lg:col-span-2" action={<Badge color="gray">Live inventory</Badge>}>
          {inventory.length === 0 ? (
            <p className="text-sm text-gray-500">No inventory data available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {inventory.map((a) => (
                <div key={a.bloodGroup} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <BloodTypeBadge group={a.bloodGroup} size="sm" />
                    <span className={`text-sm font-bold ${a.isLow ? 'text-red-600' : 'text-gray-800'}`}>{a.availableUnits}</span>
                  </div>
                  <ProgressBar value={a.availableUnits} max={maxUnits} />
                  {a.isLow && <p className="text-[11px] text-red-600 mt-1">Low stock</p>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Donor Appointments" action={<Badge color="gray">{upcomingAppointments.length} upcoming</Badge>}>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming donor appointments at your centre.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" /> {a.donorName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(a.appointmentDate)} · {a.timeSlot} · <span className="font-medium">{a.bloodGroup}</span>
                    </p>
                  </div>
                  <Badge color={a.status === 'approved' ? 'green' : 'yellow'}>{a.statusLabel}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="My Blood Requests" action={<Button icon={Plus} onClick={() => nav.onNavigate('hospital-request')}>New Request</Button>}>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">
            You have not raised any blood requests yet.{' '}
            <button onClick={() => nav.onNavigate('hospital-request')} className="text-brand-600 hover:underline font-medium">
              Create the first one
            </button>.
          </p>
        ) : (
          <Table columns={['Request', 'Priority', 'Blood Group', 'Units', 'Status', 'Required', '']}>
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{r.reference}</td>
                <td className="px-4 py-3"><Badge color={urgencyColor(r.urgency)}>{r.urgencyLabel}</Badge></td>
                <td className="px-4 py-3 font-medium">{r.bloodGroup}</td>
                <td className="px-4 py-3 text-sm">{r.quantity}</td>
                <td className="px-4 py-3">
                  <Badge color={requestStatusColor(r.status)}>{r.statusLabel}</Badge>
                  {r.decisionNote && <p className="text-[11px] text-gray-500 mt-1 max-w-[180px]">{r.decisionNote}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.requiredDate)}</td>
                <td className="px-4 py-3 text-right">
                  {['pending', 'approved'].includes(r.status) && (
                    <Button
                      variant="ghost"
                      className="text-xs text-brand-600"
                      disabled={busyId === r.id}
                      onClick={() => cancel(r.id)}
                    >
                      {busyId === r.id ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

/* ===================================================================================
   NEW BLOOD REQUEST — persisted through the backend
   =================================================================================== */

export const BloodRequestPage = ({ nav }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    group: 'O+', units: 2, priority: 'normal', date: '', dept: 'Emergency', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.createBloodRequest({
        blood_group: form.group,
        quantity: Number(form.units),
        urgency: form.priority,
        required_date: form.date || undefined,
        department: form.dept,
        reason: form.notes.trim() || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <DashboardLayout {...nav} title="Blood Request" userName={user?.username || 'Hospital'}>
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted</h2>
          <p className="text-gray-600 mb-6">
            Request <span className="font-semibold">{result.request?.reference}</span> for{' '}
            {result.request?.quantity} unit(s) of {result.request?.bloodGroup} has been sent to the Blood Bank
            {result.request?.urgency === 'emergency' ? ' and flagged as an emergency' : ''}.
          </p>
          {result.stockWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-6 text-left">
              <AlertCircle className="w-4 h-4 inline mr-1" /> {result.stockWarning}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => nav.onNavigate('hospital-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => setResult(null)}>Raise another</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const minDate = todayStr();

  return (
    <DashboardLayout {...nav} title="New Blood Request" subtitle="Request blood units from the blood bank" userName={user?.username || 'Hospital'}>
      {error && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Request Details" className="lg:col-span-2">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, group: g })}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${form.group === g ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (units)</label>
                <input type="number" min="1" max="500" value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
                <input type="date" min={minDate} value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'normal', label: 'Normal' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'emergency', label: 'Emergency' },
                ].map((p) => (
                  <button key={p.value} onClick={() => setForm({ ...form, priority: p.value })}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors
                      ${form.priority === p.value
                        ? (p.value === 'emergency' ? 'bg-red-600 text-white border-red-600'
                          : p.value === 'urgent' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-600 text-white border-blue-600')
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {['Emergency', 'Surgery', 'ICU', 'Oncology', 'Maternity', 'General Ward'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
              <textarea rows="3" value={form.notes} maxLength={500}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Patient condition, special handling…"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
        </SectionCard>

        <div>
          <SectionCard title="Request Summary" className="sticky top-20">
            <div className="flex justify-center mb-4"><BloodTypeBadge group={form.group} size="lg" /></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-medium">{form.units} units</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span>
                <Badge color={urgencyColor(form.priority)}>{form.priority[0].toUpperCase() + form.priority.slice(1)}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Required</span><span className="font-medium">{form.date ? formatDate(form.date) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{form.dept}</span></div>
            </div>
            {form.priority === 'emergency' && (
              <div className="mt-4 bg-red-50 text-red-700 text-xs rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> Emergency requests are shown first in the Blood Bank queue.
              </div>
            )}
            <Button onClick={submit} disabled={submitting || !form.units}
              className={`w-full mt-6 ${submitting || !form.units ? 'opacity-50 cursor-not-allowed' : ''}`} icon={Send}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};
