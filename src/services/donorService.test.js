import * as api from './api';
import * as donor from './donorService';
jest.mock('./api');

beforeEach(() => jest.clearAllMocks());

test('donation history comes from the server-recorded donation endpoint', async () => {
  api.listDonationHistory.mockResolvedValue({
    items: [{ id: 1, donationDate: '2026-04-10', status: 'completed' }],
    totalCompleted: 1,
    pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
  });
  const result = await donor.getDonationHistory();
  expect(result).toMatchObject({ available: true, totalCompleted: 1 });
  expect(result.items).toHaveLength(1);
  expect(result.items[0].appointmentDate).toBe('2026-04-10');
  expect(api.listMyAppointments).not.toHaveBeenCalled();
});

test('donation history never accepts client-supplied donor identifiers', async () => {
  api.listDonationHistory.mockResolvedValue({ items: [], totalCompleted: 0 });
  await donor.getDonationHistory({ year: '2026' });
  expect(api.listDonationHistory).toHaveBeenCalledWith({ year: '2026' });
  expect(api.listDonationHistory.mock.calls[0][0]).not.toHaveProperty('donor_id');
});

test('alerts use the published emergency-alert endpoint and stay donor-safe', async () => {
  api.listEmergencyAlerts.mockResolvedValue({
    bloodGroup: 'O+',
    alerts: [{ id: 2, bloodGroup: 'O+', title: 'Emergency alert', district: 'Colombo', responseCount: 'internal' }],
  });
  const result = await donor.getEmergencyAlerts();
  expect(result.bloodGroup).toBe('O+');
  expect(result.items[0]).toMatchObject({ id: 2, bloodGroup: 'O+', title: 'Emergency alert' });
  expect(result.items[0]).not.toHaveProperty('responseCount');
  expect(api.getMatchingRequests).not.toHaveBeenCalled();
});

test('campaign browse and registration use the real campaigns API', async () => {
  api.listCampaigns.mockResolvedValue({ campaigns: [{ id: 7, name: 'Community Drive' }] });
  api.listMyCampaignRegistrations.mockResolvedValue({ registrations: [{ id: 3, status: 'registered', campaign: { id: 7 } }] });
  expect(await donor.getCampaigns()).toMatchObject({ available: true, items: [{ id: 7 }] });
  expect(await donor.getMyCampaigns()).toMatchObject({ available: true, items: [{ id: 3, status: 'registered' }] });
  expect(api.registerForCampaign).toBe(donor.registerForCampaign);
});

test('notifications come from the real notifications API', async () => {
  api.listNotifications.mockResolvedValue({ notifications: [{ id: 4, title: 'Appointment booked', isRead: false }], unreadCount: 1 });
  const result = await donor.getNotifications();
  expect(result).toMatchObject({ available: true, unreadCount: 1 });
  expect(result.items[0]).toMatchObject({ id: 4, isRead: false });
});

test('resource errors are propagated instead of replaced by empty success data', async () => {
  api.listDonationHistory.mockRejectedValue(new Error('Server unavailable'));
  await expect(donor.getDonationHistory()).rejects.toThrow('Server unavailable');
});
