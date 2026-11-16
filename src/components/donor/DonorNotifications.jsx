import React, { useRef, useState } from 'react';
import { Bell, Eye, CalendarClock, Check, ArrowRight } from 'lucide-react';
import { Button, Badge, SectionCard, CompactAction } from '../UIComponents';
import * as donor from '../../services/donorService';
import { DonorLayout, useDonorResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, ErrorPanel, inputClass, disabledClass } from './DonorUI';
import { NOTIFICATION_TYPES, notificationLabel, formatDateTime } from './donorUtils';

// Only known donor routes are accepted. An external URL or another role's route
// returned in a future notification payload must never become an action link.
const ACTIONS = {
  'donor-appointments': 'My Appointments', 'donor-appointment': 'Book Appointment',
  'donor-campaigns': 'Campaigns', 'donor-my-campaigns': 'My Campaigns',
  'donor-emergency-alerts': 'Emergency Alerts', 'donor-history': 'Donation History',
};
export const DonorNotifications = ({ nav }) => {
  const resource = useDonorResource(donor.getNotifications);
  const [type, setType] = useState('');
  const [read, setRead] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lock = useRef(false);
  const records = resource.data?.items || [];
  const unread = typeof resource.data?.unreadCount === 'number' ? resource.data.unreadCount : records.filter((n) => n.isRead === false).length;
  const filtered = records.filter((n) => (!type || n.type === type) && (!read || (read === 'read' ? n.isRead === true : n.isRead === false)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const action = (n) => ACTIONS[n.actionRoute] && <CompactAction tone="schedule" icon={n.actionRoute.includes('appointment') ? CalendarClock : ArrowRight} onClick={() => nav.onNavigate(n.actionRoute)}>{ACTIONS[n.actionRoute]}</CompactAction>;
  const runAction = async (actionFn) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      await actionFn();
      resource.refresh();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      lock.current = false; setBusy(false);
    }
  };
  const markRead = (id) => runAction(() => donor.markNotificationRead(id));
  const markAllRead = () => runAction(() => donor.markAllNotificationsRead());
  return <DonorLayout nav={nav} title="Notifications" subtitle="Your donor notification centre">
    {error && <div className="mb-4"><ErrorPanel message={error} /></div>}
    <SectionCard title="Notification centre" action={<Badge color="blue">{unread} unread</Badge>}>
      <div className="flex flex-wrap gap-3 mb-5"><Button icon={Bell} disabled={busy || unread === 0} className={disabledClass} onClick={markAllRead} title="Mark every notification as read">{busy ? 'Processing…' : 'Mark all as read'}</Button><CompactAction tone="schedule" icon={CalendarClock} onClick={() => nav.onNavigate('donor-appointments')}>My Appointments</CompactAction></div>
      <Filters>
        <Field label="Notification type"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{NOTIFICATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Read status"><select className={inputClass} value={read} onChange={(e) => setRead(e.target.value)}><option value="">All notifications</option><option value="unread">Unread</option><option value="read">Read</option></select></Field>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No notifications">
        {filtered.length === 0 ? <EmptyState title="No notifications match your filters" /> : <div className="divide-y divide-gray-100">
          {filtered.map((n) => <article key={n.id} className={`py-4 px-3 rounded-lg ${n.isRead === false ? 'bg-red-50' : ''}`}>
            <div className="flex flex-wrap gap-2 justify-between"><h2 className="font-semibold text-gray-800">{n.title}</h2><Badge color={n.isRead === false ? 'red' : 'gray'}>{n.isRead ? 'Read' : 'Unread'}</Badge></div>
            <p className="text-xs text-gray-500 mt-1">{notificationLabel(n.type)} · {formatDateTime(n.createdAt)}</p>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{n.description}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-3"><CompactAction icon={Eye} onClick={() => setSelected(n)}>View details</CompactAction>{action(n)}{!n.isRead && <CompactAction tone="success" icon={Check} disabled={busy} onClick={() => markRead(n.id)}>Mark as read</CompactAction>}</div>
          </article>)}
        </div>}
      </ResourceState>
    </SectionCard>
    {selected && <Dialog title={selected.title} onClose={() => setSelected(null)}>
      <Details entries={[[ 'Type', notificationLabel(selected.type) ], ['Date and time', formatDateTime(selected.createdAt)],
        ['Read status', selected.isRead ? 'Read' : 'Unread'], ['Description', selected.description]]} />
      <div className="flex flex-wrap gap-3 mt-5">{action(selected)}{!selected.isRead && <CompactAction tone="success" icon={Check} disabled={busy} onClick={() => { markRead(selected.id); setSelected(null); }}>Mark as read</CompactAction>}</div>
    </Dialog>}
  </DonorLayout>;
};
