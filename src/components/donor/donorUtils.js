export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
export const todayStr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const formatDate = (value) => {
  if (!value) return 'Not provided';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 'Not provided' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const formatDateTime = (value) => {
  if (!value) return 'Not provided';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Not provided' : d.toLocaleString('en-GB');
};
export const statusColor = (status) => ({ pending: 'yellow', approved: 'blue', completed: 'green', cancelled: 'gray', emergency: 'red', urgent: 'amber', normal: 'blue' }[status] || 'gray');
export const searchRecords = (records, query, keys) => {
  const q = query.trim().toLowerCase();
  return records.filter((record) => keys.some((key) => String(record[key] ?? '').toLowerCase().includes(q)));
};
export const isFutureSlot = (date, slot) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  date >= todayStr() && (date !== todayStr() || slot > new Date().toTimeString().slice(0, 5));

export const NOTIFICATION_TYPES = [
  ['appointment_confirmation', 'Appointment confirmation'], ['appointment_reminder', 'Appointment reminder'],
  ['appointment_approved', 'Appointment approval'], ['appointment_rejected', 'Appointment rejection'],
  ['appointment_rescheduled', 'Appointment rescheduling'], ['appointment_cancelled', 'Appointment cancellation'],
  ['appointment_completed', 'Donation recorded'],
  ['campaign', 'Campaign announcement'], ['emergency', 'Emergency request'], ['general', 'System announcement'],
];
export const notificationLabel = (type) => NOTIFICATION_TYPES.find(([key]) => key === type)?.[1] || type;
