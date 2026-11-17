import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Users, Clock, Loader2,
  AlertCircle, User,
  Droplets, TrendingDown, ClipboardList, Megaphone, Truck, Hourglass, Hospital, CalendarCheck, ShieldCheck, Siren
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, ProgressBar } from './components/UIComponents';
import { Donut } from './components/Charts';
import { useAuth } from './context/AuthContext';
import * as api from './services/api';
import * as bankService from './services/bankService';
import {Dialog,useBankResource,ResourceState} from './components/bank/BankUI';
import {SavedForm} from './components/bank/BankForms';

const BankProfileEditor=({onClose})=>{
 const resource=useBankResource(bankService.getProfile);
 return <Dialog title="Blood Bank Profile" onClose={onClose}><ResourceState resource={resource} emptyTitle="Profile unavailable">{resource.data?.profile&&<SavedForm initial={{email:resource.data.profile.email}} fields={[{key:'email',label:'Account email',type:'email',maxLength:100}]} onSave={body=>bankService.saveProfile(body)} onSaved={onClose}/>}</ResourceState></Dialog>;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(iso);
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

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
  const [stats, setStats] = useState(null);
  const [editProfile,setEditProfile]=useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        api.getBloodBankStats(),
        api.listAllRequests({ status: 'pending' }),
      ]);
      if (!s?.stats || !Array.isArray(r?.requests)) throw new Error('The server did not return blood bank statistics and request records.');
      setStats(s.stats);
      setRequests(r.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const pendingCount = stats?.hospitals?.pending;
  const byGroup = stats?.inventory?.byBloodGroup || [];
  const maxUnits = Math.max(50, ...byGroup.map((g) => g.availableUnits || 0));
  const lowStock = stats?.alerts?.lowStock || [];

  // O/A vs B vs AB split for the donut, derived from live stock.
  const oaUnits = byGroup.filter((g) => ['O+', 'O-', 'A+', 'A-'].includes(g.bloodGroup))
    .reduce((s, g) => s + g.availableUnits, 0);
  const bUnits = byGroup.filter((g) => g.bloodGroup.startsWith('B')).reduce((s, g) => s + g.availableUnits, 0);
  const abUnits = byGroup.filter((g) => g.bloodGroup.startsWith('AB')).reduce((s, g) => s + g.availableUnits, 0);
  const totalUnits = stats?.inventory?.available===false?'Unavailable':stats?.inventory?.totalUnits ?? 0;

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
      onNotifications={()=>nav.onNavigate('bank-notifications')}
      subtitle="Assigned-centre inventory & request coordination"
      userName={user?.username || 'Blood Bank'}
      role="Bank Manager"
      notifications={notifications}
    >
      <Button variant="outline" onClick={()=>setEditProfile(true)}>Edit bank profile</Button>
      {editProfile&&<BankProfileEditor onClose={()=>setEditProfile(false)}/>}
      {stats?.inventory?.available===false&&<p role="status" className="p-4 bg-amber-50">Verified stock is unavailable until the approved bank migrations are applied. Legacy aggregate stock is excluded.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Droplets} value={totalUnits} label="Usable Unreserved Units" accent="red" />
        <StatCard icon={TrendingDown} value={stats?.inventory?.available===false?'Unavailable':lowStock.length} label="Centre / Groups Below Threshold" accent="amber" />
        <StatCard icon={Users} value={stats?.donors?.totalDonors ?? 0} label="Registered Donors" accent="blue" />
        <StatCard icon={ClipboardList} value={stats?.requests?.pending ?? 0} label="Pending Requests" accent="green" />
      </div>


      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Megaphone} value={stats?.operations?.activeCampaigns ?? 'Unavailable'} label="Active / Upcoming Campaigns" accent="green" />
        <StatCard icon={Truck} value={stats?.operations?.pendingTransfers ?? 'Unavailable'} label="Pending Assigned Transfers" accent="amber" />
        <StatCard icon={Hourglass} value={stats?.operations?.expiringUnits ?? 'Unavailable'} label="Units Expiring Within 7 Days" accent="red" />
        <StatCard icon={Hospital} value={stats?.accounts?.hospitals ?? 'Unavailable'} label="Registered Hospitals" accent="blue" />
        <StatCard icon={CalendarCheck} value={stats?.appointments?.upcoming ?? 'Unavailable'} label="Upcoming Appointments" accent="green" />
        <StatCard icon={AlertTriangle} value={stats?.inventory?.criticalStockGroups ?? 'Unavailable'} label="Critical Stock Groups" accent="red" />
        <StatCard icon={ShieldCheck} value={stats?.hospitals?.pending ?? 'Unavailable'} label="Pending Hospital Approvals" accent="amber" />
        <StatCard icon={Siren} value={requests.filter(r => r.urgency === 'emergency').length} label="Pending Emergency Requests" accent="red" />
      </div>

      <SectionCard
        title="Pending Hospital Approvals"
        className="mb-6"
        action={<Button variant="outline" icon={ShieldCheck} onClick={() => nav.onNavigate('bank-hospitals')}>Review Applications</Button>}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{pendingCount ?? 'Unavailable'}</p>
            <p className="text-sm text-gray-500">Hospital{pendingCount === 1 ? '' : 's'} awaiting Blood Bank approval</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Inventory Overview">
          {totalUnits === 'Unavailable' ? <p>Verified batch inventory unavailable.</p> : totalUnits === 0 ? (
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

        <SectionCard title="Recorded Donor Interval Summary" className="lg:col-span-2" action={<Badge color="gray">Recorded interval flags</Badge>}>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.donors?.eligibleNow ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Interval flag met; screening needed</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats?.donors?.resting ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Interval flag not met</p>
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
          <p className="text-xs text-gray-500 mt-3">Interval flags do not confirm medical eligibility or willingness to donate. Stock figures are a retrieved snapshot; expiry data is not supplied.</p>
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
                  <Button className="text-xs px-3 py-1.5" onClick={() => nav.onNavigate('bank-requests')}>Review</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          ['Expiring blood', 'Expiry data unavailable', 'bank-expiry'],
          ['Active campaigns', 'Campaign source unavailable', 'bank-campaigns'],
          ['Pending transfers', 'Transfer source unavailable', 'bank-transfers'],
          ['Emergency requests', 'Review the complete request queue', 'bank-requests'],
        ].map(([label, message, route]) => <SectionCard key={route} title={label}><p className="text-sm text-gray-500">{message}</p><Button variant="ghost" className="mt-3" onClick={() => nav.onNavigate(route)}>View</Button></SectionCard>)}
      </div>
    </DashboardLayout>
  );
};

/* ===================================================================================
   INVENTORY MANAGEMENT — real stock levels, real adjustments, real thresholds
   =================================================================================== */

export { InventoryManagement } from './components/bank/BankInventory';
export { DonorManagement } from './components/bank/BankDonors';
export { BloodRequestQueue } from './components/bank/BankOperations';
