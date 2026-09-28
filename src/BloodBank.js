import React, { useCallback, useEffect, useState } from 'react';
import {
  Database, AlertTriangle, Users, Clock, Search, Filter, CheckCircle, Loader2,
  X, Building2, Phone, Mail, TrendingUp, Sparkles, AlertCircle, Zap, User
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Table, ProgressBar } from './components/UIComponents';
import { BarChart, Donut } from './components/Charts';
import { useAuth } from './context/AuthContext';
import { useHospitals } from './data/hospitals';
import * as api from './services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(iso);
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusColor = (s) => ({
  pending: 'yellow', approved: 'blue', fulfilled: 'green', completed: 'green',
  rejected: 'red', cancelled: 'gray',
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
   BLOOD BANK DASHBOARD — all figures from /api/stats/blood-bank
   =================================================================================== */

export const BankDashboard = ({ nav }) => {
  const { user } = useAuth();
  const { pendingCount } = useHospitals();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        api.getBloodBankStats(),
        api.listAllRequests({ status: 'pending' }),
      ]);
      setStats(s.stats);
      setRequests(r.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, status, note) => {
    setBusyId(id);
    setActionError(null);
    try {
      await api.changeRequestStatus(id, status, note);
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Blood Bank Dashboard" userName={user?.username || 'Blood Bank'}>
        <Loading label="Loading national statistics…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Blood Bank Dashboard" userName={user?.username || 'Blood Bank'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const byGroup = stats?.inventory?.byBloodGroup || [];
  const maxUnits = Math.max(50, ...byGroup.map((g) => g.availableUnits || 0));
  const lowStock = stats?.alerts?.lowStock || [];

  // O/A vs B vs AB split for the donut, derived from live stock.
  const oaUnits = byGroup.filter((g) => g.bloodGroup.startsWith('O') || g.bloodGroup.startsWith('A'))
    .reduce((s, g) => s + g.availableUnits, 0);
  const bUnits = byGroup.filter((g) => g.bloodGroup.startsWith('B')).reduce((s, g) => s + g.availableUnits, 0);
  const abUnits = byGroup.filter((g) => g.bloodGroup.startsWith('AB')).reduce((s, g) => s + g.availableUnits, 0);
  const totalUnits = stats?.inventory?.totalUnits || 0;

  const nextAppointments = stats?.appointments?.next || [];

  // Real alerts derived from MySQL: low stock groups and the pending request queue.
  const notifications = [
    ...lowStock.slice(0, 3).map((g) => ({
      icon: g.level === 'Critical' ? AlertCircle : AlertTriangle,
      color: g.level === 'Critical' ? 'text-red-600' : 'text-amber-600',
      text: `${g.bloodGroup} stock is ${g.level.toLowerCase()} — ${g.availableUnits} unit(s) left`,
    })),
    ...(stats?.requests?.pending > 0
      ? [{
        icon: Clock,
        color: 'text-blue-600',
        text: `${stats.requests.pending} blood request(s) awaiting review`,
      }]
      : []),
  ];

  return (
    <DashboardLayout
      {...nav}
      title="Blood Bank Dashboard"
      subtitle="National inventory & request coordination"
      userName={user?.username || 'Blood Bank'}
      role="Bank Manager"
      notifications={notifications}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value={totalUnits} label="Total Units in Stock" accent="red" />
        <StatCard icon={AlertTriangle} value={lowStock.length} label="Groups Below Threshold" accent="amber" />
        <StatCard icon={Users} value={stats?.donors?.totalDonors ?? 0} label="Registered Donors" accent="blue" />
        <StatCard icon={Clock} value={stats?.requests?.pending ?? 0} label="Pending Requests" accent="green" />
      </div>

      {actionError && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      <SectionCard
        title="Pending Hospital Approvals"
        className="mb-6"
        action={<Button variant="outline" icon={Users} onClick={() => nav.onNavigate('bank-hospitals')}>Review Applications</Button>}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{pendingCount}</p>
            <p className="text-sm text-gray-500">Hospital{pendingCount === 1 ? '' : 's'} awaiting Blood Bank approval</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Inventory Overview">
          {totalUnits === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No stock recorded yet. Add units from the Inventory page.</p>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <Donut segments={[
                  { value: oaUnits, color: '#dc2626' },
                  { value: bUnits, color: '#f59e0b' },
                  { value: abUnits, color: '#3b82f6' },
                ]} />
              </div>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" /> O/A ({oaUnits})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> B ({bUnits})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> AB ({abUnits})</span>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Donor Availability" className="lg:col-span-2" action={<Badge color="gray">Live from MySQL</Badge>}>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.donors?.eligibleNow ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Eligible to donate now</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.donors?.resting ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">In resting period</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.donors?.neverDonated ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Never donated</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.appointments?.upcoming ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Upcoming appointments</p>
            </div>
          </div>
          {nextAppointments.length > 0 && (
            <div className="mt-4 space-y-2">
              {nextAppointments.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" /> {a.donorName}
                    <span className="text-xs text-gray-400">{a.hospitalName}</span>
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(a.date)} · {a.timeSlot}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Stock by Blood Group" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {byGroup.map((a) => (
            <div key={a.bloodGroup} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={a.bloodGroup} size="sm" />
                <span className={`text-sm font-bold ${a.isLow ? 'text-red-600' : 'text-gray-800'}`}>{a.availableUnits}</span>
              </div>
              <ProgressBar value={a.availableUnits} max={maxUnits} />
              <p className="text-[11px] text-gray-400 mt-1">
                {a.isLow ? <span className="text-red-600 font-medium">{a.level}</span> : 'Available'}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Pending Request Queue" action={<Badge color="gray">{requests.length} awaiting decision</Badge>}>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No pending blood requests. The queue is clear.</p>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 8).map((q) => (
              <div key={q.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <BloodTypeBadge group={q.bloodGroup} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.hospitalName}</p>
                    <p className="text-xs text-gray-500">
                      {q.reference} · {q.quantity} unit(s) requested
                      {q.requiredDate ? ` · by ${formatDate(q.requiredDate)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={urgencyColor(q.urgency)}>{q.urgencyLabel}</Badge>
                  <Button
                    className="text-xs px-3 py-1.5"
                    disabled={busyId === q.id}
                    onClick={() => act(q.id, 'approved', 'Allocation approved')}
                  >
                    {busyId === q.id ? '…' : 'Approve'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

/* ===================================================================================
   INVENTORY MANAGEMENT — real stock levels, real adjustments, real thresholds
   =================================================================================== */

export const InventoryManagement = ({ nav }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [groupFilter, setGroupFilter] = useState('All');
  const [showAdjust, setShowAdjust] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [form, setForm] = useState({ bloodGroup: 'O+', amount: 1, mode: 'add' });
  const [thresholds, setThresholds] = useState({ bloodGroup: 'O+', low: 20, critical: 8 });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, st] = await Promise.all([api.listInventory(), api.getInventoryStats()]);
      setInventory(inv.inventory || []);
      setStats(st.stats || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = groupFilter === 'All' ? inventory : inventory.filter((i) => i.bloodGroup === groupFilter);
  const maxUnits = Math.max(50, ...inventory.map((i) => i.availableUnits || 0));

  const submitAdjust = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await api.adjustInventory({
        bloodGroup: form.bloodGroup,
        amount: Number(form.amount),
        mode: form.mode,
      });
      setToast(res.message || 'Inventory updated.');
      setShowAdjust(false);
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitThresholds = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await api.updateInventoryThresholds({
        bloodGroup: thresholds.bloodGroup,
        lowStockThreshold: Number(thresholds.low),
        criticalStockThreshold: Number(thresholds.critical),
      });
      setToast(res.message || 'Thresholds updated.');
      setShowThresholds(false);
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Inventory Management" userName={user?.username || 'Blood Bank'}>
        <Loading label="Loading inventory…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Inventory Management" userName={user?.username || 'Blood Bank'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const Modal = ({ title, onClose, children, onSubmit, submitLabel }) => (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {formError && (
          <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {formError}
          </div>
        )}
        {children}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={onSubmit} disabled={saving}>{saving ? 'Saving…' : submitLabel}</Button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout {...nav} title="Inventory Management" subtitle="Blood stock levels & thresholds" userName={user?.username || 'Blood Bank'} role="Bank Manager">
      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {toast}</span>
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value={stats?.totalUnits ?? 0} label="Total Units" accent="red" />
        <StatCard icon={CheckCircle} value={stats?.availableUnits ?? 0} label="Above Threshold" accent="green" />
        <StatCard icon={AlertTriangle} value={stats?.lowStockGroups ?? 0} label="Low Stock Groups" accent="amber" />
        <StatCard icon={AlertCircle} value={stats?.criticalStockGroups ?? 0} label="Critical Groups" accent="red" />
      </div>

      <SectionCard
        title="Stock by Blood Group"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFormError(null); setShowThresholds(true); }}>Thresholds</Button>
            <Button onClick={() => { setFormError(null); setShowAdjust(true); }}>Adjust Stock</Button>
          </div>
        }
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
            <option value="All">All groups</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <Table columns={['Group', 'Available', 'Level', 'Low Threshold', 'Critical Threshold', 'Last Restock', '']}>
          {filtered.map((i) => (
            <tr key={i.bloodGroup} className="hover:bg-gray-50">
              <td className="px-4 py-3"><BloodTypeBadge group={i.bloodGroup} size="sm" /></td>
              <td className="px-4 py-3 text-sm font-bold">{i.availableUnits}</td>
              <td className="px-4 py-3">
                <Badge color={i.level === 'Critical' ? 'red' : i.level === 'Low' ? 'amber' : 'green'}>{i.level}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{i.lowStockThreshold}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{i.criticalStockThreshold}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{i.lastRestockedAt || '—'}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  className="text-xs text-brand-600"
                  onClick={() => {
                    setForm({ bloodGroup: i.bloodGroup, amount: 1, mode: 'add' });
                    setFormError(null);
                    setShowAdjust(true);
                  }}
                >
                  Adjust
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      </SectionCard>

      <SectionCard title="Stock Levels" className="mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {inventory.map((i) => (
            <div key={i.bloodGroup} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={i.bloodGroup} size="sm" />
                <span className={`text-sm font-bold ${i.isLow ? 'text-red-600' : 'text-gray-800'}`}>{i.availableUnits}</span>
              </div>
              <ProgressBar value={i.availableUnits} max={maxUnits} />
            </div>
          ))}
        </div>
      </SectionCard>

      {showAdjust && (
        <Modal title="Adjust Stock" onClose={() => setShowAdjust(false)} onSubmit={submitAdjust} submitLabel="Save Adjustment">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="add">Add units</option>
                  <option value="remove">Remove units</option>
                  <option value="set">Set exact count</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                <input type="number" min="1" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Current level: {inventory.find((i) => i.bloodGroup === form.bloodGroup)?.availableUnits ?? 0} unit(s).
              Stock can never go below zero.
            </p>
          </div>
        </Modal>
      )}

      {showThresholds && (
        <Modal title="Alert Thresholds" onClose={() => setShowThresholds(false)} onSubmit={submitThresholds} submitLabel="Save Thresholds">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select value={thresholds.bloodGroup}
                onChange={(e) => {
                  const g = inventory.find((i) => i.bloodGroup === e.target.value);
                  setThresholds({
                    bloodGroup: e.target.value,
                    low: g?.lowStockThreshold ?? 20,
                    critical: g?.criticalStockThreshold ?? 8,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low stock at or below</label>
                <input type="number" min="0" value={thresholds.low}
                  onChange={(e) => setThresholds({ ...thresholds, low: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critical at or below</label>
                <input type="number" min="0" value={thresholds.critical}
                  onChange={(e) => setThresholds({ ...thresholds, critical: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <p className="text-xs text-gray-500">The critical threshold must be lower than the low threshold.</p>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

/* ===================================================================================
   DONOR MANAGEMENT — real directory with search, filters and detail
   =================================================================================== */

export const DonorManagement = ({ nav }) => {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [stats, setStats] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [eligibleFilter, setEligibleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailAppointments, setDetailAppointments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDonors({
        search,
        bloodGroup: groupFilter,
        eligible: eligibleFilter,
      });
      setDonors(data.donors || []);
      setStats(data.stats || null);
      setBreakdown(data.breakdown || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, groupFilter, eligibleFilter]);

  // Debounced so typing does not spam the API.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (donor) => {
    setDetail(donor);
    setDetailAppointments([]);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await api.getDonor(donor.donorId);
      setDetail(data.donor);
      setDetailAppointments(data.appointments || []);
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Donor Management" userName={user?.username || 'Blood Bank'}>
        <Loading label="Loading donor directory…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Donor Management" userName={user?.username || 'Blood Bank'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="Donor Management" subtitle="Registered donor directory" userName={user?.username || 'Blood Bank'} role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} value={stats?.totalDonors ?? 0} label="Total Donors" accent="red" />
        <StatCard icon={CheckCircle} value={stats?.eligibleNow ?? 0} label="Eligible Now" accent="green" />
        <StatCard icon={Clock} value={stats?.resting ?? 0} label="In Resting Period" accent="amber" />
        <StatCard icon={AlertCircle} value={stats?.missingDistrict ?? 0} label="Missing District" accent="blue" />
      </div>

      <SectionCard title="Donors" action={<Badge color="gray">{donors.length} shown</Badge>}>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, NIC, phone or email…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="All">All groups</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={eligibleFilter} onChange={(e) => setEligibleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Any status</option>
              <option value="true">Eligible only</option>
              <option value="false">Resting only</option>
            </select>
          </div>
        </div>

        {donors.length === 0 ? (
          <p className="text-sm text-gray-500">No donors match the current filters.</p>
        ) : (
          <Table columns={['Donor', 'Group', 'District', 'Last Donation', 'Next Eligible', 'Status', '']}>
            {donors.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {(d.fullName || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.fullName}</p>
                      <p className="text-xs text-gray-400">{d.id} · {d.nic}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge color="red">{d.bloodGroup}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.district || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.lastDonationDate || 'Never'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.nextEligibleDate || '—'}</td>
                <td className="px-4 py-3"><Badge color={d.eligible ? 'green' : 'gray'}>{d.eligible ? 'Eligible' : 'Resting'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {d.phone && <a href={`tel:${d.phone}`} title="Call" className="text-gray-400 hover:text-red-600"><Phone className="w-4 h-4" /></a>}
                    {d.email && <a href={`mailto:${d.email}`} title="Email" className="text-gray-400 hover:text-red-600"><Mail className="w-4 h-4" /></a>}
                    <button onClick={() => openDetail(d)} className="text-xs text-brand-600 hover:underline font-medium">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </SectionCard>

      {breakdown.length > 0 && (
        <SectionCard title="Donors by Blood Group" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {breakdown.map((b) => (
              <div key={b.bloodGroup} className="text-center border border-gray-100 rounded-lg p-3">
                <BloodTypeBadge group={b.bloodGroup} size="sm" />
                <p className="text-lg font-bold text-gray-800 mt-2">{b.count}</p>
                <p className="text-[11px] text-gray-500">donors</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-800">Donor Details</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {detailLoading ? (
              <Loading label="Loading details…" />
            ) : detailError ? (
              <ErrorPanel message={detailError} onRetry={() => openDetail(detail)} />
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                    {(detail.fullName || '?').split(' ').map((s) => s[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-base">{detail.fullName}</p>
                    <p className="text-xs text-gray-500">{detail.id} · NIC {detail.nic}</p>
                  </div>
                  <div className="ml-auto"><BloodTypeBadge group={detail.bloodGroup} size="md" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-gray-400">Phone</p><p className="font-medium">{detail.phone || '—'}</p></div>
                  <div><p className="text-gray-400">Email</p><p className="font-medium break-all">{detail.email || '—'}</p></div>
                  <div><p className="text-gray-400">District</p><p className="font-medium">{detail.district || '—'}</p></div>
                  <div><p className="text-gray-400">Age</p><p className="font-medium">{detail.age ?? '—'}</p></div>
                  <div><p className="text-gray-400">Last donation</p><p className="font-medium">{detail.lastDonationDate || 'Never'}</p></div>
                  <div><p className="text-gray-400">Next eligible</p><p className="font-medium">{detail.nextEligibleDate || 'Now'}</p></div>
                </div>

                {detailAppointments.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-2">Appointments</p>
                    <div className="space-y-2">
                      {detailAppointments.slice(0, 6).map((a) => (
                        <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-2.5">
                          <span>{formatDate(a.appointmentDate)} · {a.timeSlot}</span>
                          <span className="flex items-center gap-2">
                            <Badge color={statusColor(a.status)}>{a.statusLabel}</Badge>
                            <span className="text-xs text-gray-400">{a.hospitalName}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* ===================================================================================
   BLOOD REQUEST PROCESSING — approve / reject / fulfil
   =================================================================================== */

export const BloodRequestQueue = ({ nav }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAllRequests({ search, status: statusFilter });
      setRequests(data.requests || []);
      setCounts(data.counts || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (id, status, note) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await api.changeRequestStatus(id, status, note);
      setToast(res.message || 'Request updated.');
      setRejecting(null);
      setReason('');
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Blood Requests" userName={user?.username || 'Blood Bank'}>
        <Loading label="Loading requests…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Blood Requests" userName={user?.username || 'Blood Bank'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="Blood Requests" subtitle="Approve, reject and fulfil hospital requests" userName={user?.username || 'Blood Bank'} role="Bank Manager">
      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {toast}</span>
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {actionError && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Clock} value={counts?.pending ?? 0} label="Pending" accent="amber" />
        <StatCard icon={CheckCircle} value={counts?.approved ?? 0} label="Approved" accent="blue" />
        <StatCard icon={Database} value={counts?.fulfilled ?? 0} label="Fulfilled" accent="green" />
        <StatCard icon={AlertCircle} value={counts?.rejected ?? 0} label="Rejected" accent="red" />
        <StatCard icon={X} value={counts?.cancelled ?? 0} label="Cancelled" accent="blue" />
      </div>

      <SectionCard title="All Requests">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by hospital, code, blood group or reason…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">No blood requests match the current filters.</p>
        ) : (
          <Table columns={['Request', 'Hospital', 'Group', 'Units', 'Priority', 'Status', 'Actions']}>
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{r.reference}</td>
                <td className="px-4 py-3 text-sm">
                  {r.hospitalName}
                  <p className="text-[11px] text-gray-400">{r.district || r.hospitalCode}</p>
                </td>
                <td className="px-4 py-3"><Badge color="red">{r.bloodGroup}</Badge></td>
                <td className="px-4 py-3 text-sm">{r.quantity}</td>
                <td className="px-4 py-3"><Badge color={urgencyColor(r.urgency)}>{r.urgencyLabel}</Badge></td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(r.status)}>{r.statusLabel}</Badge>
                  {r.decisionNote && <p className="text-[11px] text-gray-500 mt-1 max-w-[160px]">{r.decisionNote}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'pending' && (
                      <>
                        <Button className="text-xs px-2.5 py-1" disabled={busyId === r.id}
                          onClick={() => act(r.id, 'approved', 'Allocation approved')}>Approve</Button>
                        <Button variant="outline" className="text-xs px-2.5 py-1"
                          onClick={() => { setRejecting(r); setReason(''); }}>Reject</Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <Button className="text-xs px-2.5 py-1" disabled={busyId === r.id}
                        onClick={() => act(r.id, 'fulfilled', 'Stock issued')}>Fulfil</Button>
                    )}
                    {(r.status === 'fulfilled' || r.status === 'rejected' || r.status === 'cancelled') && (
                      <span className="text-xs text-gray-400">Closed</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </SectionCard>

      {rejecting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Reject {rejecting.reference}</h2>
              <button onClick={() => setRejecting(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {rejecting.hospitalName} requested {rejecting.quantity} unit(s) of {rejecting.bloodGroup}.
              A reason is required and will be shown to the hospital.
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stock unavailable; please request again next week"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {!reason.trim() && <p className="text-xs text-red-600 mt-1">A rejection reason is required.</p>}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setRejecting(null)} disabled={busyId === rejecting.id}>Cancel</Button>
              <Button className="flex-1" disabled={!reason.trim() || busyId === rejecting.id}
                onClick={() => act(rejecting.id, 'rejected', reason.trim())}>
                {busyId === rejecting.id ? 'Rejecting…' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* ===================================================================================
   DEMAND PLANNING — honest, rule-based analytics derived from MySQL.
   This is NOT a machine-learning model and is labelled as such in the UI.
   =================================================================================== */

export const AIPrediction = ({ nav }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [inv, st, req] = await Promise.all([
          api.listInventory(), api.getInventoryStats(), api.listAllRequests(),
        ]);
        setInventory(inv.inventory || []);
        setStats(st.stats || null);
        setRequests(req.requests || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Demand Planning" userName={user?.username || 'Blood Bank'}>
        <Loading label="Analysing inventory and demand…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Demand Planning" userName={user?.username || 'Blood Bank'}>
        <ErrorPanel message={error} onRetry={() => window.location.reload()} />
      </DashboardLayout>
    );
  }

  // Rule-based shortfall analysis: open demand minus stock on hand.
  const openByGroup = {};
  requests
    .filter((r) => ['pending', 'approved'].includes(r.status))
    .forEach((r) => {
      openByGroup[r.bloodGroup] = (openByGroup[r.bloodGroup] || 0) + r.quantity;
    });

  const analysis = inventory.map((i) => {
    const open = openByGroup[i.bloodGroup] || 0;
    const shortfall = Math.max(0, open - i.availableUnits);
    const ratio = i.availableUnits > 0 ? open / i.availableUnits : (open > 0 ? Infinity : 0);
    let level = 'Stable';
    if (i.availableUnits <= i.criticalStockThreshold) level = 'Critical';
    else if (i.availableUnits <= i.lowStockThreshold) level = 'Low';
    if (shortfall > 0 && level === 'Stable') level = 'Shortfall';
    return {
      bloodGroup: i.bloodGroup,
      availableUnits: i.availableUnits,
      openDemand: open,
      shortfall,
      ratio,
      level,
    };
  });

  const atRisk = analysis.filter((a) => a.level !== 'Stable').sort((a, b) => b.shortfall - a.shortfall || a.ratio - b.ratio);
  const totalOpen = Object.values(openByGroup).reduce((a, b) => a + b, 0);
  const lowStockCount = stats?.lowStockGroups ?? 0;
  const criticalCount = stats?.criticalStockGroups ?? 0;

  // Fulfilled requests per group give a real (if small) demand history.
  const fulfilledByGroup = {};
  requests.filter((r) => r.status === 'fulfilled').forEach((r) => {
    fulfilledByGroup[r.bloodGroup] = (fulfilledByGroup[r.bloodGroup] || 0) + r.quantity;
  });
  const fulfilledChart = BLOOD_GROUPS.map((g) => ({ label: g, value: fulfilledByGroup[g] || 0 }));

  return (
    <DashboardLayout {...nav} title="Demand Planning" subtitle="Stock cover & shortfall analysis" userName={user?.username || 'Blood Bank'} role="Bank Manager">
      {/* Honest labelling: this is a rule-based planner, not a trained model. */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold">How this page works</h2>
          <p className="text-white/90 text-sm mt-1">
            This is a <strong>rule-based planning tool</strong>, not a machine-learning model. It compares the
            units currently in stock ({stats?.totalUnits ?? 0}) with the {totalOpen} unit(s) requested by
            hospitals and flags any group that cannot cover its open demand or has fallen below its
            configured alert threshold.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} value={totalOpen} label="Open Demand (units)" accent="red" />
        <StatCard icon={AlertTriangle} value={atRisk.length} label="Groups Needing Attention" accent="amber" />
        <StatCard icon={Zap} value={lowStockCount} label="Below Low Threshold" accent="red" />
        <StatCard icon={AlertCircle} value={criticalCount} label="At Critical Level" accent="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Fulfilled Units by Blood Group" action={<Badge color="gray">All time</Badge>}>
          {Object.values(fulfilledByGroup).length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No fulfilled requests recorded yet.</p>
          ) : (
            <BarChart data={fulfilledChart} />
          )}
        </SectionCard>

        <SectionCard title="Stock Cover vs Open Demand">
          {totalOpen === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">There are no open blood requests right now.</p>
          ) : (
            <div className="space-y-2">
              {analysis.filter((a) => a.openDemand > 0).map((a) => (
                <div key={a.bloodGroup} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-medium">{a.bloodGroup}</span>
                  <div className="flex-1">
                    <ProgressBar value={a.availableUnits} max={Math.max(a.availableUnits, a.openDemand, 1)} />
                  </div>
                  <span className="text-xs text-gray-500 w-28 text-right">
                    {a.availableUnits} in stock / {a.openDemand} requested
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Groups Needing Attention">
        {atRisk.length === 0 ? (
          <p className="text-sm text-gray-500">
            No stock alerts and no open demand shortfalls. Inventory is healthy.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {atRisk.map((a) => (
              <div key={a.bloodGroup}
                className={`border-2 rounded-lg p-4 ${
                  a.level === 'Critical' || a.shortfall > 0
                    ? 'border-red-200 bg-red-50'
                    : a.level === 'Low' ? 'border-amber-200 bg-amber-50' : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <BloodTypeBadge group={a.bloodGroup} size="sm" />
                  <Badge color={a.level === 'Critical' || a.shortfall > 0 ? 'red' : 'amber'}>{a.level}</Badge>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {a.shortfall > 0 ? `Short by ${a.shortfall} unit(s)` : `${a.availableUnits} units in stock`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {a.openDemand} unit(s) requested{criticalCount > 0 && a.availableUnits === 0 ? ' · stock is zero' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-2">
          {atRisk.some((a) => a.shortfall > 0) && (
            <div className="flex items-center gap-3 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                <strong>Shortfall:</strong>{' '}
                {atRisk.filter((a) => a.shortfall > 0).map((a) => `${a.bloodGroup} (${a.shortfall})`).join(', ')}
                {' '}unit(s) requested exceed current stock. Fulfilment will be blocked until units are added.
              </span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 text-amber-700 rounded-lg p-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                <strong>Low stock:</strong> {lowStockCount} group(s) are at or below their low threshold
                {criticalCount > 0 ? `, and ${criticalCount} at the critical threshold` : ''}. Schedule a collection drive.
              </span>
            </div>
          )}
        </div>
      </SectionCard>
    </DashboardLayout>
  );
};
