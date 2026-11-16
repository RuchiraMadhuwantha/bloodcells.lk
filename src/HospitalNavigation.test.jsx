import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import HospitalRegistrationForm from './components/registration/HospitalRegistrationForm';
import * as api from './services/api';
import {apiGet,apiPut} from './services/apiClient';
jest.mock('./services/api');
jest.mock('./services/apiClient',()=>({...jest.requireActual('./services/apiClient'),apiGet:jest.fn(),apiPut:jest.fn()}));
const user = { username: 'testhospital', role: 'hospital', account_status: 'active' };
beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
  apiGet.mockImplementation(async path=>{
    if(path.endsWith('/dashboard'))return {summary:{requests:{total:0},recentRequests:[],inventory:{available:false},usage:{available:false}}};
    if(path.endsWith('/availability'))return {available:true,items:[{id:1,centreName:'Fixture bank',bloodGroup:'AB-',availableUnits:2,level:'Usable recorded stock',district:'Colombo'}]};
    return {available:false,items:[],reason:'Pending migration'};
  });
  api.login.mockResolvedValue({ token: 'test-token', user });
  api.me.mockResolvedValue({ user });
  api.getMyHospital.mockResolvedValue({ hospital: { hospitalName: 'Test Hospital', hospitalCode: 'TEST', accountStatus: 'active', status: 'Active' } });
  api.listActiveHospitals.mockResolvedValue({ hospitals: [] });
  api.listMyRequests.mockResolvedValue({ requests: [], counts: { pending: 999 } });
  api.listInventory.mockResolvedValue({ inventory: [] });
  api.listHospitalAppointments.mockResolvedValue({ appointments: [] });
  api.listCampaigns.mockResolvedValue({campaigns:[]});
  api.listNotifications.mockResolvedValue({notifications:[],unreadCount:0});
});
const login = async () => {
  render(<App />);
  fireEvent.click((await screen.findAllByRole('button', { name: /^login$/i }))[0]);
  fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'testhospital' } });
  fireEvent.change(screen.getByPlaceholderText(/\u2022/), { target: { value: 'test-password' } });
  fireEvent.click(screen.getAllByRole('button', { name: /^login$/i }).at(-1));
};

test('hospital approves a pending appointment and shows notification confirmation', async () => {
  api.listHospitalAppointments.mockResolvedValueOnce({appointments:[{id:12,reference:'AP-00012',donorName:'Test Donor',appointmentDate:'2099-01-01',timeSlot:'09:00',status:'pending',statusLabel:'Pending',bloodGroup:'O+'}]})
    .mockResolvedValue({appointments:[{id:12,reference:'AP-00012',donorName:'Test Donor',appointmentDate:'2099-01-01',timeSlot:'09:00',status:'approved',statusLabel:'Approved',bloodGroup:'O+'}]});
  apiPut.mockResolvedValue({success:true});
  await login();
  fireEvent.click(await screen.findByRole('button',{name:'Approve AP-00012'}));
  expect(await screen.findByText('Appointment approved. The donor and blood bank have been notified.')).toBeInTheDocument();
  expect(apiPut).toHaveBeenCalledWith('/appointments/12/approve',{});
  expect(await screen.findByText('Approved')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Approve AP-00012'})).not.toBeInTheDocument();
});

test('hospital sidebar appointment page records units and millilitres',async()=>{
 const appointment={id:12,reference:'AP-00012',donorName:'Test Donor',appointmentDate:'2020-01-01',timeSlot:'09:00',status:'approved',statusLabel:'Approved',bloodGroup:'O+'};
 api.listHospitalAppointments.mockResolvedValue({appointments:[appointment]});
 apiPut.mockResolvedValue({success:true});
 await login();
 fireEvent.click(await screen.findByRole('button',{name:'Appointment Management'}));
 fireEvent.click(await screen.findByRole('button',{name:'Record collection'}));
 fireEvent.change(screen.getByLabelText('Collected units'),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Collected volume (mL)'),{target:{value:'450'}});
 api.listHospitalAppointments.mockResolvedValue({appointments:[{...appointment,status:'completed',statusLabel:'Completed',collectedUnits:1,collectedVolumeMl:450}]});
 fireEvent.click(screen.getByRole('button',{name:'Save collection and complete'}));
 expect(await screen.findByText('Collection saved. The donor and blood bank have been notified.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/appointments/12/collection',{collectedUnits:1,collectedVolumeMl:450});
 expect(await screen.findByText('450 mL')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Record collection'})).not.toBeInTheDocument();
});

test('hospital can browse campaigns and open its campaign notifications from the bell',async()=>{
 api.listCampaigns.mockResolvedValue({campaigns:[{id:20,name:'Hospital blood drive',status:'Upcoming',date:'2099-01-01',startTime:'09:00',endTime:'12:00',district:'Colombo',venueName:'Community Hall',organizerName:'Blood Bank',shortDescription:'Published campaign',neededBloodGroups:['O+']}]});
 api.listNotifications.mockResolvedValue({notifications:[{id:25,title:'New blood donation campaign',message:'Hospital blood drive is published.',type:'campaign',isRead:false,actionRoute:'hospital-campaigns',createdAt:'2026-11-17 09:00:00'}],unreadCount:1});
 await login();
 await screen.findByRole('heading',{name:'Hospital Dashboard',level:1});
 fireEvent.click(screen.getByTitle('Notifications'));
 expect(await screen.findByText('Hospital blood drive is published.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View campaigns'}));
 expect(await screen.findByText('Hospital blood drive')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View campaign'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('Community Hall');
 expect(api.listCampaigns).toHaveBeenCalledWith({period:'upcoming'});
});
test('hospital login, all sidebar routes and logout retain existing navigation and auth', async () => {
  await login();
  await screen.findByRole('heading', { name: 'Hospital Dashboard', level: 1 });
  for (const [label, title] of [
    ['Appointment Management', 'Appointment Management'], ['Blood Donation Campaigns','Blood Donation Campaigns'], ['New Blood Request', 'New Blood Request'], ['My Blood Requests', 'My Blood Requests'],
    ['Blood Availability', 'Blood Availability'], ['Hospital Inventory', 'Hospital Inventory'],
    ['Blood Usage', 'Blood Usage'], ['Reports', 'Hospital Reports'],
    ['Hospital Profile', 'Hospital Profile'], ['Dashboard', 'Hospital Dashboard'],
  ]) {
    fireEvent.click(screen.getAllByRole('button', { name: label, exact: true })[0]);
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByTitle('Logout'));
  expect(await screen.findByText(/welcome to/i)).toBeInTheDocument();
  expect(localStorage.getItem('authToken')).toBeNull();
});
test('availability request action preselects the requested blood group in the existing form', async () => {
  api.listInventory.mockResolvedValue({ inventory: [{ id: 1, bloodGroup: 'AB-', availableUnits: 2, level: 'Low' }] });
  await login();
  fireEvent.click(await screen.findByRole('button', { name: 'Blood Availability' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Request blood AB-' }));
  expect(await screen.findByLabelText('Blood group')).toHaveValue('AB-');
});
test.each(['pending', 'inactive', 'suspended'])('a %s session never renders hospital data or starts hospital requests', async (status) => {
  api.login.mockResolvedValue({ token: 'test-token', user: { ...user, account_status: status } });
  await login();
  expect(await screen.findByRole('heading', { name: 'Hospital approval required' })).toBeInTheDocument();
  expect(api.getMyHospital).not.toHaveBeenCalled();
  expect(api.listMyRequests).not.toHaveBeenCalled();
});
test('login shows the actual approval/rejection response without opening a dashboard', async () => {
  api.login.mockRejectedValue(new Error('Your hospital registration is awaiting approval from the Blood Bank.'));
  await login();
  expect(await screen.findByText('Your hospital registration is awaiting approval from the Blood Bank.')).toBeInTheDocument();
  expect(screen.queryByText('Hospital Portal')).not.toBeInTheDocument();
});

const fillRegistration = () => {
  const values = {
    Username: 'testhospital', 'Official Email Address': 'hospital@example.invalid', Password: 'TestPassword123', 'Confirm Password': 'TestPassword123',
    'Hospital Name': 'Test Hospital', 'Hospital Registration Number / Code': 'TEST-REG', 'Hospital Type': 'Government Hospital',
    'Hospital Address': 'Test address', 'Official Contact Number': '0112345678', 'Contact Person Name': 'Test Contact',
    Designation: 'Medical Officer', 'Contact Person Phone': '0771234567', 'Contact Person Email': 'contact@example.invalid',
  };
  for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
test('hospital registration uses the shared API client, locks duplicate submits and explains approval', async () => {
  let resolve;
  api.registerHospital.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<HospitalRegistrationForm onCancel={jest.fn()} />);
  fillRegistration();
  fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Hospital registration' }));
  expect(api.registerHospital).toHaveBeenCalledTimes(1);
  expect(api.registerHospital).toHaveBeenCalledWith(expect.objectContaining({ hospital_name: 'Test Hospital', hospital_code: 'TEST-REG', official_phone: '0112345678' }));
  expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  resolve({ success: true, message: 'Registration saved, awaiting Blood Bank approval.' });
  expect(await screen.findByText('Registration saved, awaiting Blood Bank approval.')).toBeInTheDocument();
  expect(screen.getByText('Hospital accounts require verification and approval before access to the Hospital Dashboard is granted.')).toBeInTheDocument();
});
test('registration failure is inline and preserves entered values for correction', async () => {
  api.registerHospital.mockRejectedValue(new Error('Hospital code already registered'));
  render(<HospitalRegistrationForm onCancel={jest.fn()} />);
  fillRegistration();
  fireEvent.click(screen.getByRole('button', { name: 'Submit Registration' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Hospital code already registered');
  expect(screen.getByLabelText('Hospital Name')).toHaveValue('Test Hospital');
  expect(screen.getByRole('button', { name: 'Submit Registration' })).toBeEnabled();
});
