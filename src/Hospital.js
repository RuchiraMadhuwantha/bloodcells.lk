import React, { useState } from 'react';
import {
  Database, Clock, CheckCircle, AlertCircle, Stethoscope, ClipboardList, Plus, Send, LayoutDashboard
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card, Table } from './components/UIComponents';
import { BarChart } from './components/Charts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const HospitalDashboard = ({ nav }) => {
  const requests = [
    { id: 1024, type: 'Emergency', group: 'O+', units: 3, status: 'Pending', date: 'Jun 16' },
    { id: 1023, type: 'Normal', group: 'A+', units: 2, status: 'Approved', date: 'Jun 15' },
    { id: 1022, type: 'Normal', group: 'B-', units: 1, status: 'Approved', date: 'Jun 14' },
    { id: 1021, type: 'Emergency', group: 'AB+', units: 2, status: 'Rejected', date: 'Jun 13' },
  ];
  const availability = [
    { group: 'O+', units: 48 }, { group: 'O-', units: 12 }, { group: 'A+', units: 33 }, { group: 'A-', units: 9 },
    { group: 'B+', units: 27 }, { group: 'B-', units: 6 }, { group: 'AB+', units: 15 }, { group: 'AB-', units: 4 },
  ];
  const surgeries = [
    { time: '08:00', proc: 'Cardiac bypass', group: 'O+', units: 2 },
    { time: '11:30', proc: 'Orthopedic', group: 'A+', units: 1 },
    { time: '15:00', proc: 'Trauma (ER)', group: 'O-', units: 3 },
  ];
  const usage = [
    { label: 'Mon', value: 6 }, { label: 'Tue', value: 9 }, { label: 'Wed', value: 4 },
    { label: 'Thu', value: 11 }, { label: 'Fri', value: 7 }, { label: 'Sat', value: 5 }, { label: 'Sun', value: 3 },
  ];

  return (
    <DashboardLayout {...nav} title="Hospital Dashboard" subtitle="Colombo General Hospital" userName="Dr. Samanthi Silva" role="Hospital Admin">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Database} value="158" label="Units In Stock" accent="green" />
        <StatCard icon={Clock} value="1" label="Pending Requests" accent="amber" />
        <StatCard icon={CheckCircle} value="2" label="Approved" accent="blue" />
        <StatCard icon={AlertCircle} value="1" label="Emergency" accent="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <SectionCard title="Weekly Transfusion Usage" className="lg:col-span-2">
          <BarChart data={usage} />
        </SectionCard>
        <SectionCard title="Surgery Schedule" action={<Badge color="gray">Today</Badge>}>
          <div className="space-y-3">
            {surgeries.map((s, i) => (
              <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                <div className="text-sm font-semibold text-red-600 w-12">{s.time}</div>
                <Stethoscope className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.proc}</p>
                  <p className="text-xs text-gray-500">{s.group} · {s.units} units</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Blood Availability" className="mb-6" action={<Badge color="gray">Linked blood bank</Badge>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {availability.map(a => (
            <div key={a.group} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <BloodTypeBadge group={a.group} size="sm" />
                <span className="text-sm font-bold text-gray-800">{a.units}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Requests" action={<Button icon={Plus} onClick={() => nav.onNavigate('hospital-request')}>New Request</Button>}>
        <Table columns={['Request', 'Type', 'Blood Group', 'Units', 'Status', 'Date']}>
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">#{r.id}</td>
              <td className="px-4 py-3"><Badge color={r.type === 'Emergency' ? 'red' : 'blue'}>{r.type}</Badge></td>
              <td className="px-4 py-3 font-medium">{r.group}</td>
              <td className="px-4 py-3 text-sm">{r.units}</td>
              <td className="px-4 py-3"><Badge color={r.status === 'Approved' ? 'green' : r.status === 'Pending' ? 'yellow' : 'red'}>{r.status}</Badge></td>
              <td className="px-4 py-3 text-sm text-gray-500">{r.date}</td>
            </tr>
          ))}
        </Table>
      </SectionCard>
    </DashboardLayout>
  );
};

export const BloodRequestPage = ({ nav }) => {
  const [form, setForm] = useState({ group: 'O+', units: 2, priority: 'Normal', date: '', dept: 'Emergency', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <DashboardLayout {...nav} title="Blood Request" userName="Dr. Samanthi Silva" role="Hospital Admin">
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted</h2>
          <p className="text-gray-600 mb-6">Request <span className="font-semibold">#1025</span> sent to the regional blood bank{form.priority === 'Emergency' && ' and broadcast as an emergency'}.</p>
          <Button onClick={() => nav.onNavigate('hospital-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="New Blood Request" subtitle="Request blood units from the regional bank" userName="Dr. Samanthi Silva" role="Hospital Admin">
      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Request Details" className="lg:col-span-2">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BLOOD_GROUPS.map(g => (
                  <button key={g} onClick={() => setForm({ ...form, group: g })}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${form.group === g ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (units)</label>
                <input type="number" min="1" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {['Normal', 'Urgent', 'Emergency'].map(p => (
                  <button key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors
                      ${form.priority === p ? (p === 'Emergency' ? 'bg-red-600 text-white border-red-600' : p === 'Urgent' ? 'bg-amber-500 text-white border-amber-500' : 'bg-blue-600 text-white border-blue-600') : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                {['Emergency', 'Surgery', 'ICU', 'Oncology', 'Maternity', 'General Ward'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
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
                <Badge color={form.priority === 'Emergency' ? 'red' : form.priority === 'Urgent' ? 'amber' : 'blue'}>{form.priority}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Required</span><span className="font-medium">{form.date || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{form.dept}</span></div>
            </div>
            {form.priority === 'Emergency' && (
              <div className="mt-4 bg-red-50 text-red-700 text-xs rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> Emergency requests are broadcast instantly to all regional banks.
              </div>
            )}
            <Button onClick={() => setSubmitted(true)} className="w-full mt-6" icon={Send}>Submit Request</Button>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};
