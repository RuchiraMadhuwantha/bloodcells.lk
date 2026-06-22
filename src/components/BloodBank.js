import React, { useState } from 'react';
import {
  Database, AlertTriangle, Users, Clock, Edit, Phone, Mail, Bell, Plus, Search, Filter, CheckCircle,
  TrendingUp, Sparkles, AlertCircle, Zap, X
} from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card, Table, ProgressBar } from './UIComponents';
import { BarChart, LineChart, Donut } from './Charts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const BankDashboard = ({ nav }) => {
  const inventory = BLOOD_GROUPS.map((g, i) => ({ group: g, units: [62, 14, 41, 11, 78, 8, 23, 5][i] }));
  const donations = [
    { donor: 'Nimal Perera', group: 'O+', date: 'Jun 16', units: 1 },
    { donor: 'Kasun Fernando', group: 'A+', date: 'Jun 16', units: 1 },
    { donor: ' Amali Jay.', group: 'B-', date: 'Jun 15', units: 1 },
  ];
  const queue = [
    { hospital: 'Colombo General', group: 'O+', units: 3, priority: 'Emergency' },
    { hospital: 'Kandy Teaching', group: 'A+', units: 2, priority: 'Normal' },
    { hospital: 'Galle DGH', group: 'AB+', units: 1, priority: 'Urgent' },
  ];
  const trend = [
    { label: 'W1', value: 210 }, { label: 'W2', value: 245 }, { label: 'W3', value: 198 },
    { label: 'W4', value: 268 }, { label: 'W5', value: 242 }, { label: 'W6', value: 289 },
  ];

  return (
    <DashboardLayout {...nav} title="Blood Bank Dashboard" subtitle="NBTS Colombo Regional Center" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="242" label="Total Units" accent="red" trend={{ up: true, value: '+18 this week' }} />
        <StatCard icon={AlertTriangle} value="9" label="Expiring ≤3 days" accent="amber" />
        <StatCard icon={Users} value="5,012" label="Active Donors" accent="blue" />
        <StatCard icon={Clock} value="3" label="Pending Requests" accent="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Inventory overview donut */}
        <SectionCard title="Inventory Overview">
          <div className="flex items-center justify-center">
            <Donut segments={[
              { value: 130, color: '#dc2626' }, { value: 62, color: '#f59e0b' }, { value: 50, color: '#3b82f6' },
            ]} />
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" /> O/A</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> B</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> AB</span>
          </div>
        </SectionCard>

        {/* Collection trend */}
        <SectionCard title="Collection Trend" className="lg:col-span-2" action={<Badge color="gray">6 weeks</Badge>}>
          <LineChart data={trend} />
        </SectionCard>
      </div>

      {/* Stock by group */}
      <SectionCard title="Stock by Blood Group" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {inventory.map(a => (
            <div key={a.group} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={a.group} size="sm" />
                <span className={`text-sm font-bold ${a.units < 15 ? 'text-red-600' : 'text-gray-800'}`}>{a.units}</span>
              </div>
              <ProgressBar value={a.units} max={80} />
              {a.units < 15 && <p className="text-[11px] text-red-600 mt-1">Low stock</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Donations" action={<Button variant="ghost" className="text-sm text-red-600" onClick={() => nav.onNavigate('bank-donors')}>View all</Button>}>
          <Table columns={['Donor', 'Group', 'Date', 'Units']}>
            {donations.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{d.donor}</td>
                <td className="px-4 py-3"><Badge color="red">{d.group}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.date}</td>
                <td className="px-4 py-3 text-sm">{d.units}</td>
              </tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Hospital Request Queue">
          <div className="space-y-3">
            {queue.map((q, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <BloodTypeBadge group={q.group} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.hospital}</p>
                    <p className="text-xs text-gray-500">{q.units} units requested</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={q.priority === 'Emergency' ? 'red' : q.priority === 'Urgent' ? 'amber' : 'blue'}>{q.priority}</Badge>
                  <Button className="text-xs px-3 py-1.5">Fulfil</Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

export const InventoryManagement = ({ nav }) => {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  const units = [
    { id: 'U-7781', group: 'O+', collected: 'Jun 10', expires: 'Jul 22', status: 'Available', donor: 'Nimal P.' },
    { id: 'U-7782', group: 'A+', collected: 'Jun 08', expires: 'Jun 18', status: 'Expiring', donor: 'Kasun F.' },
    { id: 'U-7783', group: 'O-', collected: 'Jun 12', expires: 'Jul 24', status: 'Available', donor: 'Amali J.' },
    { id: 'U-7784', group: 'B+', collected: 'May 30', expires: 'Jun 16', status: 'Expiring', donor: 'Sunil R.' },
    { id: 'U-7785', group: 'AB-', collected: 'Jun 14', expires: 'Jul 26', status: 'Reserved', donor: 'Dilani W.' },
    { id: 'U-7786', group: 'O+', collected: 'Jun 13', expires: 'Jul 25', status: 'Available', donor: 'Tharindu G.' },
  ];
  const filtered = units.filter(u =>
    (groupFilter === 'All' || u.group === groupFilter) &&
    (u.id.toLowerCase().includes(search.toLowerCase()) || u.donor.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout {...nav} title="Inventory Management" subtitle="Blood unit tracking & expiry" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="242" label="Total Units" accent="red" />
        <StatCard icon={CheckCircle} value="206" label="Available" accent="green" />
        <StatCard icon={AlertTriangle} value="9" label="Expiring Soon" accent="amber" />
      </div>

      <SectionCard
        title="Blood Units"
        action={<Button icon={Plus} onClick={() => setShowAdd(true)}>Add Blood Unit</Button>}
      >
        {/* Filters / search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by unit ID or donor…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <Table columns={['Unit ID', 'Group', 'Donor', 'Collected', 'Expires', 'Status', '']}>
          {filtered.map(u => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{u.id}</td>
              <td className="px-4 py-3"><Badge color="red">{u.group}</Badge></td>
              <td className="px-4 py-3 text-sm">{u.donor}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{u.collected}</td>
              <td className="px-4 py-3 text-sm text-gray-500 flex items-center gap-1">
                {u.status === 'Expiring' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}{u.expires}
              </td>
              <td className="px-4 py-3"><Badge color={u.status === 'Available' ? 'green' : u.status === 'Expiring' ? 'amber' : 'blue'}>{u.status}</Badge></td>
              <td className="px-4 py-3 text-right"><button className="text-gray-400 hover:text-red-600"><Edit className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </Table>
      </SectionCard>

      {/* Add unit modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add Blood Unit</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                  {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donor ID / Name</label>
                <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="D-1234" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collected</label>
                  <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml)</label>
                  <input type="number" defaultValue="450" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => setShowAdd(false)}>Save Unit</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export const DonorManagement = ({ nav }) => {
  const [search, setSearch] = useState('');
  const donors = [
    { id: 'D-1001', name: 'Nimal Perera', group: 'O+', last: 'Mar 12, 2026', donations: 12, eligible: true },
    { id: 'D-1002', name: 'Kasun Fernando', group: 'A+', last: 'May 02, 2026', donations: 4, eligible: false },
    { id: 'D-1003', name: 'Amali Jayawardena', group: 'B-', last: 'Jun 15, 2026', donations: 8, eligible: false },
    { id: 'D-1004', name: 'Sunil Rathnayake', group: 'O-', last: 'Feb 20, 2026', donations: 21, eligible: true },
    { id: 'D-1005', name: 'Dilani Wickrama', group: 'AB-', last: 'Jan 10, 2026', donations: 6, eligible: true },
  ];
  const filtered = donors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout {...nav} title="Donor Management" subtitle="Registered donor directory" userName="Ruwan Jayasuriya" role="Bank Manager">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} value="5,012" label="Total Donors" accent="red" />
        <StatCard icon={CheckCircle} value="3,841" label="Eligible Now" accent="green" />
      </div>

      <SectionCard
        title="Donors"
        action={<Button variant="outline" icon={Bell}>Notify Eligible</Button>}
      >
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donors by name or ID…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
        </div>

        <Table columns={['Donor', 'Group', 'Last Donation', 'Donations', 'Eligibility', 'Actions']}>
          {filtered.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {d.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><Badge color="red">{d.group}</Badge></td>
              <td className="px-4 py-3 text-sm text-gray-500">{d.last}</td>
              <td className="px-4 py-3 text-sm">{d.donations}</td>
              <td className="px-4 py-3"><Badge color={d.eligible ? 'green' : 'gray'}>{d.eligible ? 'Eligible' : 'Resting'}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-red-600" title="Call"><Phone className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-600" title="Email"><Mail className="w-4 h-4" /></button>
                  <button className="text-gray-400 hover:text-red-600" title="Notify"><Bell className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </SectionCard>
    </DashboardLayout>
  );
};

export const AIPrediction = ({ nav }) => {
  const weekly = [
    { label: 'Mon', value: 38 }, { label: 'Tue', value: 42 }, { label: 'Wed', value: 35 },
    { label: 'Thu', value: 50 }, { label: 'Fri', value: 61 }, { label: 'Sat', value: 47 }, { label: 'Sun', value: 33 },
  ];
  const monthly = [
    { label: 'Jan', value: 980 }, { label: 'Feb', value: 1020 }, { label: 'Mar', value: 1120 },
    { label: 'Apr', value: 1080 }, { label: 'May', value: 1190 }, { label: 'Jun', value: 1240 },
    { label: 'Jul*', value: 1320 }, { label: 'Aug*', value: 1380 },
  ];
  const risk = [
    { group: 'O-', level: 'Critical', forecast: '+38% demand', color: 'red' },
    { group: 'B-', level: 'High', forecast: '+24% demand', color: 'amber' },
    { group: 'AB-', level: 'High', forecast: '+19% demand', color: 'amber' },
    { group: 'O+', level: 'Moderate', forecast: '+11% demand', color: 'yellow' },
  ];

  return (
    <DashboardLayout {...nav} title="AI Demand Prediction" subtitle="Forecasting & shortage alerts" userName="Ruwan Jayasuriya" role="Bank Manager">
      {/* AI insight banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg p-6 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold">AI Insight</h2>
          <p className="text-white/90 text-sm mt-1">
            Demand for <strong>O−</strong> is projected to rise <strong>38%</strong> over the next 7 days driven by scheduled
            trauma surgeries and a regional festival. Current stock covers only <strong>2.3 days</strong>. Launch a targeted
            O− campaign and notify 420 eligible O− donors now.
          </p>
        </div>
      </div>

      {/* Inventory metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} value="+27%" label="Forecast Demand (7d)" accent="red" trend={{ up: true, value: 'vs last week' }} />
        <StatCard icon={AlertTriangle} value="3" label="At-Risk Groups" accent="amber" />
        <StatCard icon={Clock} value="2.3d" label="O− Days of Cover" accent="red" />
        <StatCard icon={Zap} value="94%" label="Model Accuracy" accent="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="Weekly Demand Forecast" action={<Badge color="red">AI</Badge>}>
          <BarChart data={weekly} />
        </SectionCard>
        <SectionCard title="Monthly Trend & Projection" action={<Badge color="gray">* projected</Badge>}>
          <LineChart data={monthly} forecastFrom={6} />
          <p className="text-xs text-gray-400 mt-2">Hollow points indicate AI-projected months.</p>
        </SectionCard>
      </div>

      {/* Risk blood groups */}
      <SectionCard title="At-Risk Blood Groups" action={<Button variant="outline" icon={Bell}>Trigger Campaign</Button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {risk.map(r => (
            <div key={r.group} className={`border-2 rounded-lg p-4 ${r.color === 'red' ? 'border-red-200 bg-red-50' : r.color === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <BloodTypeBadge group={r.group} size="sm" />
                <Badge color={r.color}>{r.level}</Badge>
              </div>
              <p className="text-sm font-medium text-gray-800">{r.forecast}</p>
              <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
            </div>
          ))}
        </div>
        {/* Shortage alerts */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-3 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> <span><strong>Shortage alert:</strong> O− will drop below safe threshold in ~2 days at current usage.</span>
          </div>
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 rounded-lg p-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" /> <span><strong>Watch:</strong> B− and AB− trending toward shortage by end of week.</span>
          </div>
        </div>
      </SectionCard>
    </DashboardLayout>
  );
};
