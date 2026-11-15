import * as api from './api';

// Donor capabilities are now backed by real persisted APIs (see DONOR_BACKEND.md).
export const donorCapabilities = Object.freeze({
  reschedule: true, campaignRegistration: true, campaignCancellation: true,
  notificationRead: true, notificationReadAll: true, alertResponse: true,
});

/**
 * Donation history is sourced exclusively from server-recorded completed
 * appointments (the only recorded donation event in the current schema).
 * The backend maps them to donation records; the items are handed to the UI
 * both under `donations`/`pagination` and as `items` for list rendering.
 */
export const getDonationHistory = async (params) => {
  const data = await api.listDonationHistory(params);
  const items = (data.items || data.donations || []).map((d) => ({
    ...d,
    appointmentDate: d.appointmentDate || d.donationDate,
  }));
  return {
    available: true,
    items,
    pagination: data.pagination,
    totalCompleted: data.totalCompleted ?? items.length,
  };
};

export const getAppointments = async () => {
  const { appointments } = await api.listMyAppointments();
  return { items: appointments, available: true };
};

export const getSummary = async () => (await api.getMyDonorSummary()).summary;
export const getHospitals = async () => (await api.listActiveHospitals()).hospitals;
export const getBookedSlots = async (hospitalId, date) => (await api.listBookedSlots(hospitalId, date)).booked;
export const bookAppointment = api.bookAppointment;
export const cancelAppointment = api.cancelAppointment;
export const rescheduleAppointment = api.rescheduleAppointment;

export const getEmergencyAlerts = async () => {
  const data = await api.listEmergencyAlerts({ mine: 'true' });
  return {
    available: true,
    bloodGroup: data.bloodGroup,
    items: (data.alerts || []).map((a) => ({
      id: a.id,
      reference: a.reference,
      bloodGroup: a.bloodGroup,
      quantity: a.quantity,
      urgency: a.urgency,
      urgencyLabel: a.urgencyLabel,
      district: a.district,
      requiredDate: a.requiredDate,
      title: a.title,
      description: a.description,
      responseInstructions: a.responseInstructions,
      status: a.status,
      responded: a.responded,
    })),
  };
};

export const respondToEmergencyAlert = api.respondToEmergencyAlert;

/* Campaigns — real published records. Registration is ownership-scoped and
 * enforced server-side (capacity, duplicates, status). */
export const getCampaigns = async () => {
  const data = await api.listCampaigns();
  return { available: true, items: data.campaigns || [] };
};

export const getMyCampaigns = async () => {
  const data = await api.listMyCampaignRegistrations();
  return { available: true, items: data.registrations || [] };
};

export const registerForCampaign = api.registerForCampaign;
export const cancelCampaignRegistration = api.cancelCampaignRegistration;

/* Notifications — real persisted records with server-side read state. */
export const getNotifications = async () => {
  const data = await api.listNotifications();
  return {
    available: true,
    items: data.notifications || [],
    unreadCount: data.unreadCount ?? 0,
  };
};

export const getUnreadNotificationCount = async () =>
  (await api.getUnreadNotificationCount()).unreadCount ?? 0;

export const markNotificationRead = api.markNotificationRead;
export const markAllNotificationsRead = api.markAllNotificationsRead;
