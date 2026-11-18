import {displayStatus} from '../userLanguage';
export { BLOOD_GROUPS, todayStr, formatDate } from '../donor/donorUtils';
export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
export const URGENCIES = ['normal', 'urgent', 'emergency'];
export const titleCase = (s) => s ? displayStatus(s[0].toUpperCase() + s.slice(1)) : 'Not provided';
export const statusColor = (s) => ({ pending: 'yellow', approved: 'blue', rejected: 'red', fulfilled: 'green', cancelled: 'gray', emergency: 'red', urgent: 'amber', normal: 'blue' }[s] || 'gray');
export const summarizeRequests = (requests) => ({
  total: requests.length,
  ...Object.fromEntries(REQUEST_STATUSES.map((status) => [status, requests.filter((r) => r.status === status).length])),
  emergency: requests.filter((r) => r.urgency === 'emergency' && ['pending', 'approved'].includes(r.status)).length,
});
export const filterRequests = (items, { query = '', group = '', urgency = '', status = '', start = '', end = '', sort = 'priority' } = {}) => {
  const priority = { emergency: 0, urgent: 1, normal: 2 };
  const q = query.trim().toLowerCase();
  return items.filter((r) => (!q || String(r.reference || r.id).toLowerCase().includes(q)) &&
    (!group || r.bloodGroup === group) && (!urgency || r.urgency === urgency) && (!status || r.status === status) &&
    (!start || r.createdAt?.slice(0, 10) >= start) && (!end || (r.createdAt && r.createdAt.slice(0, 10) <= end)))
    .sort((a, b) => {
      const dateOrder = String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || Number(b.id) - Number(a.id);
      return sort === 'priority' ? (priority[a.urgency] ?? 3) - (priority[b.urgency] ?? 3) || dateOrder : sort === 'oldest' ? -dateOrder : dateOrder;
    });
};
export const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00');
  return !Number.isNaN(d.getTime()) && d.getFullYear() === Number(value.slice(0, 4)) &&
    d.getMonth() + 1 === Number(value.slice(5, 7)) && d.getDate() === Number(value.slice(8, 10));
};
export const accountMessage = (status) => ({
  pending: 'Your hospital registration is awaiting approval from the Blood Bank. Dashboard access remains locked.',
  inactive: 'Your hospital registration was rejected or your account is inactive. Please contact the Blood Bank.',
  suspended: 'Your hospital account is suspended. Please contact the Blood Bank.',
}[status] || 'Your hospital account status could not be verified. Sign in again or contact the Blood Bank.');

export const newSubmissionKey = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
