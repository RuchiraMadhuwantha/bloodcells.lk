import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DonationHistory, MyAppointments } from './DonorRecords';
import { AppointmentBooking } from './AppointmentBooking';
import { DonorDashboard } from './DonorDashboard';
import { DonorCampaigns } from './DonorCampaigns';
import { DonorNotifications } from './DonorNotifications';
import { EmergencyAlerts } from './EmergencyAlerts';
import * as donor from '../../services/donorService';
import { todayStr } from './donorUtils';

jest.mock('../../services/donorService');
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'Test donor' } }) }));
const nav = { portal: 'Donor Portal', items: [], onNavigate: jest.fn(), onLogout: jest.fn() };
const record = { id: 1, reference: 'AP-TEST1', hospitalName: 'Test centre', district: 'Colombo', appointmentDate: '2025-04-10', timeSlot: '09:00', status: 'completed', statusLabel: 'Completed', bloodGroup: 'O+' };

beforeEach(() => {
  jest.resetAllMocks();
  donor.getDonationHistory.mockResolvedValue({ available: true, items: [record, { ...record, id: 2, reference: 'AP-TEST2', hospitalName: 'Other centre', appointmentDate: '2024-03-10' }] });
  donor.getAppointments.mockResolvedValue({ available: true, items: [{ ...record, status: 'pending', statusLabel: 'Pending' }] });
  donor.getHospitals.mockResolvedValue([{ hospitalId: 1, name: 'Test centre', district: 'Colombo' }, { hospitalId: 2, name: 'Other centre', district: 'Kandy' }]);
  donor.getBookedSlots.mockResolvedValue([]);
  donor.getCampaigns.mockResolvedValue({ available: true, items: [{ id: 11, name: 'Community Drive', status: 'Upcoming', date: '2026-12-01', startTime: '09:00', endTime: '12:00', district: 'Colombo', organizerName: 'Blood bank', shortDescription: 'Help your community.', targetDonors: 100, participants: 5 }] });
  donor.getMyCampaigns.mockResolvedValue({ available: true, items: [{ id: 31, status: 'registered', campaign: { id: 11, name: 'Community Drive', status: 'Upcoming', date: '2026-12-01', district: 'Colombo', organizerName: 'Blood bank' } }] });
  donor.getNotifications.mockResolvedValue({ available: true, items: [{ id: 41, title: 'Appointment booked', type: 'appointment_confirmation', description: 'Your booking was recorded.', isRead: false, createdAt: '2026-04-01 10:00' }], unreadCount: 1 });
});

test('donor dashboard shows completed donations and recorded collection totals',async()=>{
 donor.getSummary.mockResolvedValue({fullName:'Test donor',totalDonations:2,bloodGroup:'O+',upcomingAppointments:0});
 donor.getEmergencyAlerts.mockResolvedValue({items:[]});
 donor.getAppointments.mockResolvedValue({items:[{...record,collectedUnits:1,collectedVolumeMl:450},{...record,id:2,reference:'AP-OLD',appointmentDate:'2024-01-01'}, {...record,id:3,reference:'AP-PENDING',status:'approved',appointmentDate:'2099-01-01',collectedUnits:99,collectedVolumeMl:9999}]});
 render(<DonorDashboard nav={nav}/>);
 expect(await screen.findByText('1 unit(s), 450 mL collected')).toBeInTheDocument();
 expect(screen.getByText('Collected blood not recorded')).toBeInTheDocument();
 expect(screen.getByText('Recorded collected units').parentElement).toHaveTextContent('1');
 expect(screen.getByText('Recorded collected volume (mL)').parentElement).toHaveTextContent('450');
 donor.getAppointments.mockResolvedValue({items:[{...record,collectedUnits:2,collectedVolumeMl:900}]});
 fireEvent.click(screen.getByRole('button',{name:'Refresh dashboard'}));
 expect(await screen.findByText('2 unit(s), 900 mL collected')).toBeInTheDocument();
});

test('history supports search, year, date, sorting and keyboard-dismissable details', async () => {
  render(<DonationHistory nav={nav} />);
  await screen.findByText('AP-TEST1');
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('AP-TEST1');
  fireEvent.change(screen.getByLabelText('Sort donations'), { target: { value: 'oldest' } });
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('AP-TEST2');
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
  expect(screen.queryByText('AP-TEST2')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Donation date'), { target: { value: '2025-04-10' } });
  fireEvent.change(screen.getByLabelText('Search donations'), { target: { value: '  test centre  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'View donation AP-TEST1' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Colombo');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search donations'), { target: { value: 'no match' } });
  expect(screen.getByText('No donations match your filters')).toBeInTheDocument();
});

test('history exposes loading, API failure, retry and empty states', async () => {
  donor.getDonationHistory.mockRejectedValueOnce(new Error('History unavailable')).mockResolvedValueOnce({ available: true, items: [] });
  render(<DonationHistory nav={nav} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No completed donations recorded')).toBeInTheDocument();
});

test('donation history refresh shows a newly completed donation with both collected amounts',async()=>{
 donor.getDonationHistory.mockResolvedValueOnce({available:true,items:[],totalCompleted:0});
 render(<DonationHistory nav={nav}/>);
 await screen.findByText('No completed donations recorded');
 donor.getDonationHistory.mockResolvedValue({available:true,totalCompleted:1,items:[{...record,collectedUnits:1,collectedVolumeMl:450}]});
 fireEvent.click(screen.getByRole('button',{name:'Refresh history'}));
 const row=(await screen.findByText('AP-TEST1')).closest('tr');
 expect(row).toHaveTextContent('450');expect(row).toHaveTextContent('Completed');
 expect(screen.getByRole('columnheader',{name:'Collected units'})).toBeInTheDocument();
 expect(screen.getByRole('columnheader',{name:'Collected volume (mL)'})).toBeInTheDocument();
});

test('cancellation requires confirmation and duplicate clicks cannot submit twice', async () => {
  let resolve;
  donor.cancelAppointment.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<MyAppointments nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel appointment AP-TEST1' }));
  expect(donor.cancelAppointment).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep appointment' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment AP-TEST1' }));
  const confirm = screen.getByRole('button', { name: 'Confirm cancellation' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(donor.cancelAppointment).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
  resolve({ message: 'Cancelled by server' });
  expect(await screen.findByText('Cancelled by server')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('cancellation failure stays visible without claiming success', async () => {
  donor.cancelAppointment.mockRejectedValue(new Error('Cancellation failed'));
  render(<MyAppointments nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel appointment AP-TEST1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Cancellation failed');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('reschedule is offered for pending appointments and submits the chosen slot', async () => {
  let resolve;
  donor.rescheduleAppointment.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<MyAppointments nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reschedule appointment AP-TEST1' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('New date')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('New date'), { target: { value: '2099-05-10' } });
  fireEvent.change(within(dialog).getByLabelText('New time'), { target: { value: '09:30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm reschedule' }));
  expect(donor.rescheduleAppointment).toHaveBeenCalledWith(1, { appointment_date: '2099-05-10', time_slot: '09:30' });
  resolve({ message: 'Appointment AP-TEST1 rescheduled' });
  expect(await screen.findByText('Appointment AP-TEST1 rescheduled')).toBeInTheDocument();
});

const selectBooking = async () => {
  await screen.findByRole('option', { name: 'Colombo' });
  fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Colombo' } });
  fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: '1' } });
  const time = await screen.findByRole('radio', { name: '09:00' });
  await waitFor(() => expect(time).toBeEnabled());
  fireEvent.click(time);
};

test('booking resets centre and selected time when the district changes', async () => {
  render(<AppointmentBooking nav={nav} />);
  await selectBooking();
  expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Kandy' } });
  expect(screen.getByLabelText('Hospital')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeDisabled();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

test('past or missing dates block booking, and failed availability never enables slots', async () => {
  donor.getBookedSlots.mockRejectedValue(new Error('Slots unavailable'));
  render(<AppointmentBooking nav={nav} />);
  await screen.findByRole('option', { name: 'Colombo' });
  fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Colombo' } });
  fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: '1' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Slots unavailable');
  expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeDisabled();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Appointment date'), { target: { value: '2000-01-01' } });
  expect(screen.getByText('Choose today or a future date.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Appointment date'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeDisabled();
});

test('booking uses the actual payload and shows returned status only after success', async () => {
  donor.bookAppointment.mockResolvedValue({ appointment: { ...record, appointmentDate: todayStr(1), status: 'pending', statusLabel: 'Pending' } });
  render(<AppointmentBooking nav={nav} />);
  await selectBooking();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm booking' }));
  expect(await screen.findByText('Appointment booked')).toBeInTheDocument();
  expect(donor.bookAppointment).toHaveBeenCalledWith({ hospital_id: 1, appointment_date: todayStr(1), time_slot: '09:00', notes: undefined });
  expect(screen.getByText('Pending')).toBeInTheDocument();
});

test('booking accepts an optional NIC and sends its normalized value',async()=>{
 donor.bookAppointment.mockResolvedValue({appointment:{...record,status:'pending',nic:'901234567V'}});
 render(<AppointmentBooking nav={nav}/>);
 await selectBooking();
 fireEvent.change(screen.getByLabelText('NIC (optional)'),{target:{value:'901234567v'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm booking'}));
 expect(await screen.findByText('Appointment booked')).toBeInTheDocument();
 expect(donor.bookAppointment).toHaveBeenCalledWith(expect.objectContaining({nic:'901234567V'}));
});

test('invalid booking NIC is rejected before submitting',async()=>{
 render(<AppointmentBooking nav={nav}/>);
 await selectBooking();
 fireEvent.change(screen.getByLabelText('NIC (optional)'),{target:{value:'invalid'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm booking'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid NIC');
 expect(donor.bookAppointment).not.toHaveBeenCalled();
});

test('late availability responses cannot overwrite the newly selected centre', async () => {
  let resolveOld;
  donor.getBookedSlots.mockImplementationOnce(() => new Promise((done) => { resolveOld = done; })).mockResolvedValueOnce(['09:00']);
  render(<AppointmentBooking nav={nav} />);
  await screen.findByRole('option', { name: 'Colombo' });
  fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Colombo' } });
  fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: '1' } });
  await waitFor(() => expect(donor.getBookedSlots).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Kandy' } });
  fireEvent.change(screen.getByLabelText('Hospital'), { target: { value: '2' } });
  expect(await screen.findByRole('radio', { name: '09:00 Booked' })).toBeDisabled();
  resolveOld([]);
  await waitFor(() => expect(screen.getByRole('radio', { name: '09:00 Booked' })).toBeDisabled());
});

test('campaigns render real records and notifications render unread entries', async () => {
  render(<DonorCampaigns nav={nav} />);
  expect(await screen.findByText('Community Drive')).toBeInTheDocument();
  render(<DonorNotifications nav={nav} />);
  expect(await screen.findByText('Appointment booked')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeEnabled();
});

test('campaign registration calls the service and surfaces the server message', async () => {
  donor.registerForCampaign.mockResolvedValue({ message: 'Registered for "Community Drive".' });
  render(<DonorCampaigns nav={nav} />);
  await screen.findByText('Community Drive');
  fireEvent.click(screen.getByRole('button', { name: /view details/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Register' }));
  expect(donor.registerForCampaign).toHaveBeenCalledWith(11);
  expect(await screen.findByText('Registered for "Community Drive".')).toBeInTheDocument();
});

test('alerts filter authorized alerts and details exclude sensitive information', async () => {
  donor.getEmergencyAlerts.mockResolvedValue({ available: true, bloodGroup: 'O+', items: [{ id: 1, reference: 'EA-00001', title: 'Emergency O+ blood needed', bloodGroup: 'O+', district: 'Colombo', urgency: 'emergency', urgencyLabel: 'Emergency', quantity: 2, requiredDate: '2026-12-01', description: 'A verified emergency request', responseInstructions: 'Call the centre', responded: false, reason: 'private text' }] });
  render(<EmergencyAlerts nav={nav} />);
  await screen.findByText('Emergency O+ blood needed');
  fireEvent.change(screen.getByLabelText('Required blood group'), { target: { value: 'A+' } });
  expect(screen.getByText('No alerts match your filters')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Required blood group'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'View details' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('EA-00001');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('private text');
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Register interest' })).toBeEnabled();
});


test('appointment sorting keeps donor search and status filters applied',async()=>{
 donor.getAppointments.mockResolvedValue({available:true,items:[{...record,id:1,reference:'AP-EARLY',status:'pending',appointmentDate:'2099-01-01'},{...record,id:2,reference:'AP-LATE',status:'pending',appointmentDate:'2099-02-01'},{...record,id:3,reference:'AP-DONE',status:'completed'}]});
 render(<MyAppointments nav={nav}/>);await screen.findByText('AP-EARLY');
 fireEvent.change(screen.getByLabelText('Search appointments'),{target:{value:'Test centre'}});fireEvent.change(screen.getByLabelText('Appointment status'),{target:{value:'pending'}});fireEvent.change(screen.getByLabelText('Sort appointments'),{target:{value:'date'}});
 const rows=screen.getAllByRole('row').slice(1);expect(rows).toHaveLength(2);expect(rows[0]).toHaveTextContent('AP-EARLY');expect(rows[1]).toHaveTextContent('AP-LATE');expect(donor.getAppointments).toHaveBeenCalledTimes(1);
});

test('campaign sorting preserves district and period filters',async()=>{
 donor.getCampaigns.mockResolvedValue({available:true,items:[{id:1,name:'Zulu Drive',date:'2099-01-01',district:'Colombo',status:'Upcoming'},{id:2,name:'Alpha Drive',date:'2099-02-01',district:'Colombo',status:'Upcoming'},{id:3,name:'Other District Drive',date:'2099-03-01',district:'Kandy',status:'Upcoming'}]});
 render(<DonorCampaigns nav={nav}/>);await screen.findByText('Zulu Drive');
 fireEvent.change(screen.getByLabelText('Campaign district'),{target:{value:'Colombo'}});fireEvent.change(screen.getByLabelText('Sort campaigns'),{target:{value:'name'}});
 const cards=screen.getAllByText(/^(Alpha Drive|Zulu Drive)$/);expect(cards.map(c=>c.textContent)).toEqual(['Alpha Drive','Zulu Drive']);expect(screen.queryByText('Other District Drive')).not.toBeInTheDocument();expect(screen.getByLabelText('Campaign period')).toHaveValue('upcoming');expect(donor.getCampaigns).toHaveBeenCalledTimes(1);
});
