import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

/* ───────────────────────── Auth ───────────────────────── */

export const login = (username, password) =>
  apiPost('/auth/login', { username, password }, { auth: false });

export const registerDonor = (payload) =>
  apiPost('/auth/register/donor', payload, { auth: false });

export const registerHospital = (payload) =>
  apiPost('/auth/register/hospital', payload, { auth: false });

export const me = () => apiGet('/auth/me');

export const updateProfile = (payload) => apiPut('/auth/me', payload);

export const forgotPassword = (email) =>
  apiPost('/auth/forgot-password', { email }, { auth: false });

export const resetPassword = (token, password) =>
  apiPost('/auth/reset-password', { token, password }, { auth: false });

/* ───────────────────────── Hospitals ───────────────────────── */

/** Blood bank: every hospital with DB statistics. */
export const listAllHospitals = () => apiGet('/hospitals');

/** Any signed-in role: only active hospitals (used for donor booking). */
export const listActiveHospitals = () => apiGet('/hospitals/active');

/** Hospital: its own record. */
export const getMyHospital = () => apiGet('/hospitals/mine');

export const getHospitalStats = () => apiGet('/hospitals/stats');

export const approveHospital = (userId) => apiPut(`/hospitals/${userId}/approve`);

export const rejectHospital = (userId, reason) =>
  apiPut(`/hospitals/${userId}/reject`, { reason });

export const reviewHospitalAgain = (userId) => apiPut(`/hospitals/${userId}/review-again`);

/* ───────────────────────── Inventory (blood bank manages) ───────────────────────── */

export const listInventory = () => apiGet('/inventory');

export const getInventoryStats = () => apiGet('/inventory/stats');

export const getInventoryForGroup = (bloodGroup) => apiGet(`/inventory/${encodeURIComponent(bloodGroup)}`);

export const adjustInventory = ({ bloodGroup, amount, mode }) =>
  apiPost('/inventory/adjust', { bloodGroup, amount, mode });

export const updateInventoryThresholds = (payload) =>
  apiPut('/inventory/thresholds', {
    bloodGroup: payload.bloodGroup,
    lowStockThreshold: payload.lowStockThreshold,
    criticalStockThreshold: payload.criticalStockThreshold,
  });

/* ───────────────────────── Blood requests ───────────────────────── */

export const createBloodRequest = (payload) => apiPost('/blood-requests', payload);

export const listMyRequests = () => apiGet('/blood-requests/mine');

export const cancelMyRequest = (id) => apiPut(`/blood-requests/${id}/cancel`);

export const listAllRequests = ({ status, search } = {}) => {
  const qs = new URLSearchParams();
  if (status && status !== 'all') qs.set('status', status);
  if (search) qs.set('search', search);
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/blood-requests${suffix}`);
};

export const getRequest = (id) => apiGet(`/blood-requests/${id}`);

export const changeRequestStatus = (id, status, note) =>
  apiPut(`/blood-requests/${id}/status`, { status, note });

/* ───────────────────────── Appointments ───────────────────────── */

export const bookAppointment = (payload) => apiPost('/appointments', payload);

export const listMyAppointments = () => apiGet('/appointments/mine');

export const getAppointment = (id) => apiGet(`/appointments/${id}`);

export const rescheduleAppointment = (id, payload) =>
  apiPut(`/appointments/${id}/reschedule`, payload);

export const cancelAppointment = (id) => apiPut(`/appointments/${id}/cancel`);

export const listHospitalAppointments = () => apiGet('/appointments/hospital');

export const listAllAppointments = () => apiGet('/appointments');

export const listBookedSlots = (hospitalId, date) =>
  apiGet(`/appointments/slots/${hospitalId}?date=${date}`);

export const changeAppointmentStatus = (id, status) =>
  apiPut(`/appointments/${id}/status`, { status });

/* ───────────────────────── Donors (blood bank directory) ───────────────────────── */

export const listDonors = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/donors${suffix}`);
};

export const getDonor = (donorId) => apiGet(`/donors/${donorId}`);

/** Donor: own dashboard summary (eligibility, donation counts). */
export const getMyDonorSummary = () => apiGet('/donors/me/summary');

/** Donor: open requests matching the donor's own blood group. */
export const getMatchingRequests = () => apiGet('/blood-requests/matching');

/* ─────────── Donation history (donor) ─────────── */

export const listDonationHistory = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/donors/me/donations${suffix}`);
};

export const getDonation = (id) => apiGet(`/donors/me/donations/${id}`);

/* ─────────── Campaigns ─────────── */

export const listCampaigns = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/campaigns${suffix}`);
};

export const getCampaign = (id) => apiGet(`/campaigns/${id}`);
export const listPublicCampaigns = () => apiGet('/campaigns/public', { auth: false });

export const registerForCampaign = (id, note) =>
  apiPost(`/campaigns/${id}/registrations`, note ? { note } : {});

export const listMyCampaignRegistrations = () =>
  apiGet('/campaigns/registrations/mine');

export const cancelCampaignRegistration = (id) =>
  apiDelete(`/campaigns/${id}/registrations`);

/* ─────────── Notifications ─────────── */

export const listNotifications = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/notifications${suffix}`);
};

export const getUnreadNotificationCount = () => apiGet('/notifications/unread-count');

export const markNotificationRead = (id) => apiPut(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => apiPut('/notifications/read-all');

/* ─────────── Emergency alerts ─────────── */

export const listEmergencyAlerts = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiGet(`/emergency-alerts${suffix}`);
};

export const getEmergencyAlert = (id) => apiGet(`/emergency-alerts/${id}`);

export const respondToEmergencyAlert = (id, note) =>
  apiPost(`/emergency-alerts/${id}/respond`, note ? { note } : {});

/* ───────────────────────── Dashboards ───────────────────────── */

export const getBloodBankStats = () => apiGet('/stats/blood-bank');
