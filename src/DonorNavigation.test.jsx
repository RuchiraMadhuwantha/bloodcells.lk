import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as api from './services/api';
import { canAccess } from './context/AuthContext';

jest.mock('./services/api');

const donorUser = { username: 'testdonor', role: 'donor', account_status: 'active', email: 'test@example.invalid' };
const profile = { full_name: 'Test Donor', blood_group: 'O+', district: 'Colombo', phone: '0770000000', gender: 'Male', nic: 'TEST', date_of_birth: '1990-01-01', weight: 65 };
beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  api.login.mockResolvedValue({ token: 'test-token', user: donorUser });
  api.me.mockResolvedValue({ user: donorUser, profile });
  api.getMyDonorSummary.mockResolvedValue({ summary: { fullName: 'Test Donor', bloodGroup: 'O+', totalDonations: 0, upcomingAppointments: 0, eligibleNow: true } });
  api.listMyAppointments.mockResolvedValue({ appointments: [] });
  api.getMatchingRequests.mockResolvedValue({ bloodGroup: 'O+', requests: [] });
  api.listActiveHospitals.mockResolvedValue({ hospitals: [] });
});
const login = async () => {
  render(<App />);
  fireEvent.click((await screen.findAllByRole('button', { name: /^login$/i }))[0]);
  fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'testdonor' } });
  fireEvent.change(screen.getByPlaceholderText(/•/), { target: { value: 'test-password' } });
  fireEvent.click(screen.getAllByRole('button', { name: /^login$/i }).at(-1));
  await screen.findByRole('heading', { name: 'Donor Dashboard', level: 1 });
};

test('existing login reaches donor dashboard and all nine sidebar destinations work', async () => {
  await login();
  expect(api.login).toHaveBeenCalledWith('testdonor', 'test-password');
  const destinations = [
    ['My Profile', 'My Profile'], ['Book Appointment', 'Book Appointment'],
    ['My Appointments', 'My Appointments'], ['Donation History', 'Donation History'],
    ['Blood Donation Campaigns', 'Blood Donation Campaigns'], ['My Campaigns', 'My Campaigns'],
    ['Notifications', 'Notifications'], ['Emergency Donation Alerts', 'Emergency Donation Alerts'],
    ['Dashboard', 'Donor Dashboard'],
  ];
  for (const [label, title] of destinations) {
    fireEvent.click(screen.getAllByRole('button', { name: label, exact: true })[0]);
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByLabelText('Notifications'));
  expect(await screen.findByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Logout'));
  expect(await screen.findByText(/welcome to/i)).toBeInTheDocument();
  expect(localStorage.getItem('authToken')).toBeNull();
});

test('existing profile editing still persists through the existing API and refreshes authentication', async () => {
  api.updateProfile.mockResolvedValue({ user: donorUser, profile: { ...profile, phone: '0770000001' } });
  await login();
  fireEvent.click(screen.getByRole('button', { name: 'My Profile' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Profile' }));
  fireEvent.change(screen.getByDisplayValue('0770000000'), { target: { value: '0770000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument();
  expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phone: '0770000001' }));
  expect(screen.getByText('0770000001')).toBeInTheDocument();
});

test('expired sessions remove the donor portal and show login', async () => {
  await login();
  fireEvent(window, new CustomEvent('auth:expired'));
  expect(await screen.findByRole('heading', { name: 'Login to your portal' })).toBeInTheDocument();
  expect(screen.queryByText('Donor Portal')).not.toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
});

test.each(['donor-history', 'donor-appointments', 'donor-campaigns', 'donor-my-campaigns', 'donor-notifications', 'donor-emergency-alerts'])('route %s retains the existing donor-only guard', (route) => {
  expect(canAccess('donor', route)).toBe(true);
  for (const role of [null, 'hospital', 'blood_bank', 'admin']) expect(canAccess(role, route)).toBe(false);
});



test('donors explicitly opt in to email announcements through their own profile',async()=>{
 api.updateProfile.mockResolvedValue({user:donorUser,profile:{...profile,email_opt_in:1}});await login();
 fireEvent.click(screen.getByRole('button',{name:'My Profile'}));fireEvent.click(await screen.findByRole('button',{name:'Edit Profile'}));
 const choice=screen.getByRole('checkbox',{name:'Receive blood bank announcements by email'});expect(choice).not.toBeChecked();fireEvent.click(choice);
 fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
 await waitFor(()=>expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({email_opt_in:true})));
 expect(await screen.findByText('Email announcements: Enabled')).toBeInTheDocument();
});
