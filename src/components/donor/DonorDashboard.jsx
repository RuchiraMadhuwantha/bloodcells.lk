import React from 'react';
import { Heart, Droplet, Calendar, Clock } from 'lucide-react';
import { Button, Badge, StatCard, SectionCard } from '../UIComponents';
import { useAuth } from '../../context/AuthContext';
import * as donor from '../../services/donorService';
import { DonorLayout, useDonorResource, Loading, ErrorPanel, EmptyState, Notice } from './DonorUI';
import { formatDate, todayStr, statusColor, notificationLabel, formatDateTime } from './donorUtils';

export const DonorDashboard = ({ nav }) => {
  const { user } = useAuth();
  const summary = useDonorResource(donor.getSummary);
  const appointments = useDonorResource(donor.getAppointments);
  const alerts = useDonorResource(donor.getEmergencyAlerts);
  const campaigns = useDonorResource(donor.getCampaigns);
  const notifications = useDonorResource(donor.getNotifications);
  const s = summary.data;
  const records = appointments.data?.items || [];
  const upcoming = records.filter((a) => ['pending', 'approved'].includes(a.status) && a.appointmentDate >= todayStr())
    .sort((a, b) => (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
  const history = records.filter((a) => a.status === 'completed').sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  const next = upcoming[0];
  const displayName = s?.fullName || user?.username || 'Donor';
  return <DonorLayout nav={nav} title="Donor Dashboard" subtitle={`Welcome back, ${displayName}`} userName={displayName} role={`Donor · ${s?.bloodGroup || 'Blood group unavailable'}`}>
    {summary.loading ? <Loading label="Loading your donor summary…" /> : summary.error ? <div className="mb-5"><ErrorPanel message={summary.error} onRetry={summary.refresh} /></div> : <>
      <Notice>{s?.eligibleNow
        ? 'Your recorded donation interval allows you to arrange a screening appointment.'
        : `Your recorded donation interval is ${s?.donationIntervalDays ?? 'not available'} days. Next date based on your record: ${formatDate(s?.nextEligibleDate)}.`}
        {' '}Final donation eligibility is determined by the centre after screening.
      </Notice>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Heart} value={s?.totalDonations ?? 'Unavailable'} label="Completed Donations" accent="red" />
        <StatCard icon={Droplet} value={s?.bloodGroup || 'Unavailable'} label="Blood Group" accent="pink" />
        <StatCard icon={Calendar} value={s?.upcomingAppointments ?? 'Unavailable'} label="Upcoming Appointments" accent="green" />
        <StatCard icon={Clock} value={s?.eligibleNow ? 'Screening due' : formatDate(s?.nextEligibleDate)} label="Donation interval" accent="amber" />
      </div>
    </>}
    <div className="grid lg:grid-cols-3 gap-6">
      <SectionCard title="Upcoming Appointment" action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-appointments')}>View all</Button>}>
        {appointments.loading ? <Loading /> : appointments.error ? <ErrorPanel message={appointments.error} onRetry={appointments.refresh} /> : !next ? <EmptyState title="No upcoming appointment"><Button variant="outline" className="mt-3" onClick={() => nav.onNavigate('donor-appointment')}>Book appointment</Button></EmptyState> : <div className="bg-brand-50 border border-red-100 rounded-lg p-4 text-sm space-y-2">
          <p className="font-semibold text-brand-700">{formatDate(next.appointmentDate)} · {next.timeSlot}</p><p>{next.hospitalName}</p><p className="text-gray-500">{next.district} · {next.reference}</p>
          <Badge color={statusColor(next.status)}>{next.statusLabel || next.status}</Badge>
          <div className="pt-3"><Button variant="outline" onClick={() => nav.onNavigate('donor-appointments')}>Manage appointment</Button></div>
        </div>}
      </SectionCard>
      <SectionCard title="Recent Donation History" className="lg:col-span-2" action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-history')}>View history</Button>}>
        {appointments.loading ? <Loading /> : appointments.error ? <ErrorPanel message={appointments.error} onRetry={appointments.refresh} /> : !history.length ? <EmptyState title="No completed donations recorded" /> : <div className="space-y-3">{history.slice(0, 4).map((a) => <div key={a.id} className="flex flex-wrap justify-between items-center gap-3 border border-gray-100 rounded-lg p-3"><div><p className="text-sm font-semibold">{formatDate(a.appointmentDate)}</p><p className="text-xs text-gray-500">{a.hospitalName} · {a.reference}</p></div><Badge color="green">{a.statusLabel || a.status}</Badge></div>)}</div>}
      </SectionCard>
      <SectionCard title="Emergency Donation Alerts" className="lg:col-span-3" action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-emergency-alerts')}>View alerts</Button>}>
        {alerts.loading ? <Loading /> : alerts.error ? <ErrorPanel message={alerts.error} onRetry={alerts.refresh} /> : !alerts.data.items.length ? <EmptyState title="No active alerts for your blood group" /> : <div className="grid md:grid-cols-2 gap-3">{alerts.data.items.slice(0, 4).map((r) => <div key={r.id} className="border border-gray-100 rounded-lg p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-sm">{r.title || 'Emergency alert'} · {r.bloodGroup}</h3><Badge color={statusColor(r.urgency)}>{r.urgencyLabel || r.urgency}</Badge></div><p className="text-xs text-gray-500 mt-2">{r.district || 'District not provided'} · {r.quantity != null ? `${r.quantity} unit(s) · ` : ''}Required: {formatDate(r.requiredDate)}</p></div>)}</div>}
      </SectionCard>
      <SectionCard title="Upcoming Campaigns" className="lg:col-span-2" action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-campaigns')}>Browse</Button>}>
        {campaigns.loading ? <Loading /> : campaigns.error ? <ErrorPanel message={campaigns.error} onRetry={campaigns.refresh} /> : !campaigns.data?.items?.length ? <EmptyState title="No upcoming campaigns"><Button variant="outline" className="mt-3" onClick={() => nav.onNavigate('donor-campaigns')}>Browse campaigns</Button></EmptyState> : <div className="grid md:grid-cols-2 gap-4">{campaigns.data.items.filter((c) => c.date >= todayStr()).slice(0, 4).map((c) => <div key={c.id} className="border border-gray-100 rounded-lg p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-sm">{c.name}</h3><Badge color="blue">{c.status}</Badge></div><p className="text-xs text-gray-500 mt-2">{formatDate(c.date)} · {[c.startTime, c.endTime].filter(Boolean).join(' – ')}</p><p className="text-xs text-gray-500">{c.venueName || c.district || 'Location not provided'} · Organizer: {c.organizerName || 'Not provided'}</p></div>)}</div>}
      </SectionCard>
      <SectionCard title="Recent Notifications" action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-notifications')}>View all{typeof notifications.data?.unreadCount === 'number' && notifications.data.unreadCount > 0 ? ` (${notifications.data.unreadCount} unread)` : ''}</Button>}>
        {notifications.loading ? <Loading /> : notifications.error ? <ErrorPanel message={notifications.error} onRetry={notifications.refresh} /> : !notifications.data?.items?.length ? <EmptyState title="No notifications yet" /> : <div className="space-y-3">{notifications.data.items.slice(0, 4).map((n) => <div key={n.id} className={`border border-gray-100 rounded-lg p-3 ${n.isRead === false ? 'bg-red-50' : ''}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{n.title}</p>{n.isRead === false && <Badge color="red">Unread</Badge>}</div><p className="text-xs text-gray-500 mt-1">{notificationLabel(n.type)} · {formatDateTime(n.createdAt)}</p></div>)}</div>}
      </SectionCard>
    </div>
  </DonorLayout>;
};

