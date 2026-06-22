import React from 'react';
import { Users, Hospital, Building2, Droplet, FileText, Download, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, Button, SectionCard, Table } from './UIComponents';
import { BarChart, LineChart } from './Charts';

export const AdminDashboard = ({ nav }) => {
  const growth = [
    { label: 'Jan', value: 320 }, { label: 'Feb', value: 410 }, { label: 'Mar', value: 480 },
    { label: 'Apr', value: 520 }, { label: 'May', value: 640 }, { label: 'Jun', value: 712 },
  ];
  const donationsTrend = [
    { label: 'Jan', value: 980 }, { label: 'Feb', value: 1020 }, { label: 'Mar', value: 1120 },
    { label: 'Apr', value: 1080 }, { label: 'May', value: 1190 }, { label: 'Jun', value: 1240 },
  ];
  const entities = [
    { type: 'Donors', count: '5,012', icon: Users, accent: 'red' },
    { type: 'Hospitals', count: '52', icon: Hospital, accent: 'blue' },
    { type: 'Blood Banks', count: '14', icon: Building2, accent: 'green' },
    { type: 'Donations (YTD)', count: '6,630', icon: Droplet, accent: 'pink' },
  ];
  const recentUsers = [
    { name: 'Kandy Teaching Hospital', type: 'Hospital', status: 'Active', date: 'Jun 14' },
    { name: 'Tharindu Gamage', type: 'Donor', status: 'Active', date: 'Jun 14' },
    { name: 'Galle RBC', type: 'Blood Bank', status: 'Pending', date: 'Jun 13' },
    { name: 'Dilani Wickrama', type: 'Donor', status: 'Active', date: 'Jun 12' },
  ];

  return (
    <DashboardLayout {...nav} title="Admin Dashboard" subtitle="National system overview" userName="System Admin" role="Administrator">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {entities.map(e => <StatCard key={e.type} icon={e.icon} value={e.count} label={e.type} accent={e.accent} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SectionCard title="User Growth" action={<Badge color="green">+11% MoM</Badge>}>
          <LineChart data={growth} stroke="#dc2626" />
        </SectionCard>
        <SectionCard title="Donations Trend" action={<Badge color="gray">6 months</Badge>}>
          <BarChart data={donationsTrend} />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Recent Registrations" className="lg:col-span-2" action={<Button variant="ghost" className="text-sm text-red-600">Manage users</Button>}>
          <Table columns={['Name', 'Type', 'Status', 'Joined']}>
            {recentUsers.map((u, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-4 py-3"><Badge color={u.type === 'Donor' ? 'red' : u.type === 'Hospital' ? 'blue' : 'green'}>{u.type}</Badge></td>
                <td className="px-4 py-3"><Badge color={u.status === 'Active' ? 'green' : 'yellow'}>{u.status}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.date}</td>
              </tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Reports">
          <div className="space-y-3">
            {['National Inventory Report', 'Donor Activity Report', 'Hospital Usage Report', 'AI Forecast Summary'].map((r, i) => (
              <button key={i} className="w-full flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50 text-sm">
                <span className="flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4 text-red-600" /> {r}</span>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
          <div className="mt-4 bg-red-50 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <ShieldCheck className="w-5 h-5" /> All systems operational
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};
