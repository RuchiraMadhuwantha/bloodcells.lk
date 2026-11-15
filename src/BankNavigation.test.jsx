import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import * as api from './services/api';
import { canAccess } from './context/AuthContext';
jest.mock('./services/api');
jest.mock('./services/apiClient',()=>({...jest.requireActual('./services/apiClient'),apiGet:jest.fn(),apiPost:jest.fn(),apiPut:jest.fn(),apiDownload:jest.fn()}));
const user = { username: 'testbank', role: 'blood_bank', account_status: 'active' };
const hospital = { id: 'H-1', hospitalId: 1, userId: 4, hospitalName: 'Test Hospital', hospitalCode: 'TEST', district: 'Colombo', status: 'Pending', registrationDate: '2026-01-01' };
const stats = { inventory: { totalUnits: 0, byBloodGroup: [], lowStockGroups: 0, criticalStockGroups: 0 }, donors: { totalDonors: 0 }, requests: { pending: 0 }, appointments: { upcoming: 0, next: [] }, hospitals: { pending: 0 }, accounts: { hospitals: 0 }, alerts: { lowStock: [] } };
beforeEach(() => {
  localStorage.clear(); jest.resetAllMocks();
  require('./services/apiClient').apiGet.mockResolvedValue({available:true,complete:true,items:[]});
  api.login.mockResolvedValue({ token: 'test-token', user });
  api.me.mockResolvedValue({ user });
  api.getBloodBankStats.mockResolvedValue({ stats });
  api.listAllHospitals.mockResolvedValue({ hospitals: [], stats: { pending: 0 } });
  api.listAllRequests.mockResolvedValue({ requests: [], counts: {} });
  api.listInventory.mockResolvedValue({ inventory: [] });
  api.getInventoryStats.mockResolvedValue({ stats: {} });
  api.listDonors.mockResolvedValue({ donors: [] });
  api.listAllAppointments.mockResolvedValue({ appointments: [] });
});
const login = async () => {
  render(<App />);
  fireEvent.click((await screen.findAllByRole('button', { name: /^login$/i }))[0]);
  fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'testbank' } });
  fireEvent.change(screen.getByPlaceholderText(new RegExp(String.fromCharCode(8226))), { target: { value: 'test-password' } });
  fireEvent.click(screen.getAllByRole('button', { name: /^login$/i }).at(-1));
  await screen.findByRole('heading', { name: 'Blood Bank Dashboard', level: 1 });
};
test('blood bank navigation opens every module without changing donor or hospital routes', async () => {
  await login();
  for (const [label, title] of [
    ['Hospital Management', 'Hospital Management'], ['Blood Inventory', 'Inventory Management'],
    ['Blood Expiry', 'Blood Expiry'], ['Blood Shortages', 'Blood Shortages'],
    ['Blood Requests', 'Blood Requests'], ['Donor Management', 'Donor Management'],
    ['Eligible Donor Search', 'Eligible Donor Search'], ['Appointment Management', 'Appointment Management'],
    ['Campaign Management', 'Campaign Management'], ['Notification Management', 'Notification Management'],
    ['Regional Stock', 'Regional Stock'], ['Blood Transfers', 'Blood Transfers'],
    ['Regional Coordination', 'Regional Coordination'], ['Reports', 'Blood Bank Reports'],
    ['Demand Planning', 'Demand Planning'], ['Dashboard', 'Blood Bank Dashboard'],
  ]) {
    fireEvent.click(screen.getAllByRole('button', { name: label, exact: true })[0]);
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByTitle('Logout'));
  expect(await screen.findByText(/welcome to/i)).toBeInTheDocument();
},20000);
test('hospital approval requires confirmation and refreshes records and the pending badge', async () => {
  let current = hospital;
  api.listAllHospitals.mockImplementation(async () => ({ hospitals: [current], stats: { pending: current.status === 'Pending' ? 1 : 0 } }));
  api.approveHospital.mockImplementation(async () => { current = { ...hospital, status: 'Active' }; return { success: true }; });
  await login();
  fireEvent.click(screen.getByRole('button', { name: /Hospital Management/ }));
  fireEvent.click(await screen.findByTitle('Approve'));
  expect(api.approveHospital).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve Hospital' }));
  expect(await screen.findByText('Hospital registration approved successfully.')).toBeInTheDocument();
  expect(api.approveHospital).toHaveBeenCalledWith(4);
  expect(await screen.findByRole('button', { name: 'Hospital Management' })).toBeInTheDocument();
  expect(screen.getByText('Active', { selector: 'span' })).toBeInTheDocument();
});
test('hospital rejection enforces a persisted reason and shows failures as errors', async () => {
  api.listAllHospitals.mockResolvedValue({ hospitals: [hospital], stats: { pending: 1 } });
  api.rejectHospital.mockRejectedValue(new Error('Decision could not be saved'));
  await login();
  fireEvent.click(screen.getByRole('button', { name: /Hospital Management/ }));
  fireEvent.click(await screen.findByTitle('Reject'));
  const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject Application' });
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Rejection Reason'), { target: { value: 'Registration needs correction' } });
  fireEvent.click(confirm);
  expect(await screen.findByRole('alert')).toHaveTextContent('Decision could not be saved');
  expect(api.rejectHospital).toHaveBeenCalledWith(4, 'Registration needs correction');
});
test.each(['bank-expiry', 'bank-shortages', 'bank-eligible', 'bank-appointments', 'bank-notifications', 'bank-regional-stock', 'bank-transfers', 'bank-coordination', 'bank-reports'])('route %s retains existing bank role protection', (route) => {
  expect(canAccess('blood_bank', route)).toBe(true);
  expect(canAccess('donor', route)).toBe(false);
  expect(canAccess('hospital', route)).toBe(false);
  expect(canAccess(null, route)).toBe(false);
});
