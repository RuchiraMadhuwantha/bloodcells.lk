import React, { useCallback, useEffect, useState } from 'react';
import { Users, Hospital, Building2, Droplet, AlertCircle, Loader2, FileText, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, Button, SectionCard, Table } from './components/UIComponents';
import { BarChart, LineChart } from './components/Charts';
import { useAuth } from './context/AuthContext';
import * as api from './services/api';

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

/**
 * National system overview. Every figure is read from MySQL through
 * /api/stats/blood-bank — nothing on this screen is a placeholder.
 */
export const AdminDashboard = ({ nav }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h, d] = await Promise.all([
        api.getBloodBankStats(),
        api.listAllHospitals(),
        api.listDonors(),
      ]);
      setStats(s.stats);
      setHospitals(h.hospitals || []);
      setDonors(d.donors || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Admin Dashboard" userName={user?.username || 'Administrator'}>
        <Loading label="Loading system overview…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Admin Dashboard" userName={user?.username || 'Administrator'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const accounts = stats?.accounts || {};
  const requests = stats?.requests || {};
  const trends = stats?.trends || { registrations: [], donations: [] };
  const donationsYtd = trends.donations.reduce((sum, m) => sum + m.value, 0);

  const entities = [
    { type: 'Donors', count: accounts.donors ?? 0, icon: Users, accent: 'red' },
    { type: 'Hospitals', count: accounts.hospitals ?? 0, icon: Hospital, accent: 'blue' },
    { type: 'Blood Banks', count: accounts.bloodBanks ?? 0, icon: Building2, accent: 'green' },
    { type: 'Donations (6 mo)', count: donationsYtd, icon: Droplet, accent: 'pink' },
  ];

  // Most recently created accounts, straight from the users table.
  const recentRegistrations = [
    ...hospitals.map((h) => ({
      key: `h-${h.id}`,
      name: h.hospitalName,
      type: 'Hospital',
      status: h.status,
      date: h.registrationDate || '',
    })),
    ...donors.map((d) => ({
      key: `d-${d.id}`,
      name: d.fullName,
      type: 'Donor',
      status: { active: 'Active', pending: 'Pending', inactive: 'Rejected', suspended: 'Suspended' }[d.accountStatus]
        || d.accountStatus,
      date: d.registeredAt || '',
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);

  const accountTone = (status) => ({
    Active: 'green', active: 'green', Pending: 'yellow', pending: 'yellow',
    Rejected: 'red', rejected: 'red', inactive: 'red', suspended: 'red',
  }[status] || 'gray');

  const accountLabel = (status) => ({ inactive: 'Rejected' }[status] || status);

  const reports = [
    { name: `National Inventory (${stats?.inventory?.totalUnits ?? 0} units)`, href: '#/bank-inventory' },
    { name: `Donor Directory (${accounts.donors ?? 0} accounts)`, href: '#/bank-donors' },
    { name: `Blood Requests (${requests.total ?? 0} total)`, href: '#/bank-requests' },
    { name: `Demand Planning Summary`, href: '#/bank-prediction' },
  ];

  const attention = [
    { label: 'Hospital approvals pending', value: stats?.hospitals?.pending ?? 0, tone: 'amber' },
    { label: 'Blood requests pending', value: requests.pending ?? 0, tone: 'amber' },
    { label: 'Hospitals rejected', value: stats?.hospitals?.rejected ?? 0, tone: 'red' },
    { label: 'Blood groups at critical level', value: stats?.inventory?.criticalStockGroups ?? 0, tone: 'red' },
    { label: 'Suspended accounts', value: stats?.hospitals?.suspended ?? 0, tone: 'red' },
    { label: 'Donors missing a district', value: stats?.donors?.missingDistrict ?? 0, tone: 'blue' },
  ];

  return (
    <DashboardLayout
      {...nav}
      title="Admin Dashboard"
      subtitle="National system overview"
      userName={user?.username || 'Administrator'}
      role="Administrator"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {entities.map((e) => <StatCard key={e.type} icon={e.icon} value={e.count} label={e.type} accent={e.accent} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard
          title="Registrations"
          action={<Badge color="gray">Last {trends.registrations.length} months</Badge>}
        >
          {trends.registrations.every((m) => m.value === 0) ? (
            <p className="text-sm text-gray-500 py-10 text-center">No accounts were registered in this period.</p>
          ) : (
            <LineChart data={trends.registrations} stroke="#dc2626" />
          )}
        </SectionCard>

        <SectionCard
          title="Completed Donations"
          action={<Badge color="gray">Last {trends.donations.length} months</Badge>}
        >
          {donationsYtd === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No appointments have been marked completed yet, so there is nothing to chart.
            </p>
          ) : (
            <BarChart data={trends.donations} />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Needs Attention" className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {attention.map((a) => (
            <div key={a.label} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
              <span className="text-sm text-gray-600">{a.label}</span>
              <Badge color={a.tone}>{a.value}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard
          title="Recent Registrations"
          className="lg:col-span-2"
          action={<Badge color="gray">{recentRegistrations.length} shown</Badge>}
        >
          {recentRegistrations.length === 0 ? (
            <p className="text-sm text-gray-500">No donor or hospital accounts exist yet.</p>
          ) : (
            <Table columns={['Name', 'Type', 'Status', 'Joined']}>
              {recentRegistrations.map((u) => (
                <tr key={u.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.type === 'Donor' ? 'red' : 'blue'}>{u.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={accountTone(u.status)}>{accountLabel(u.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.date || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </SectionCard>

        <SectionCard title="Navigate to Reports">
          <div className="space-y-3">
            {reports.map((r) => (
              <button
                key={r.name}
                onClick={() => nav.onNavigate(r.href.replace('#/', ''))}
                className="w-full flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50 text-sm"
              >
                <span className="flex items-center gap-2 text-gray-700">
                  <FileText className="w-4 h-4 text-red-600" /> {r.name}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500 leading-relaxed">
            These links open the live screens that produce each report. Server-side PDF/CSV export is not
            implemented yet.
          </p>
          <div className="mt-4 bg-red-50 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <ShieldCheck className="w-5 h-5" /> {stats?.inventory?.criticalStockGroups ?? 0} group(s) need restocking
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};
