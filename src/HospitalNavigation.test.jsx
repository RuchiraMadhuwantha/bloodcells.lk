import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from './App';
import HospitalRegistrationForm from './components/registration/HospitalRegistrationForm';
import * as api from './services/api';
import {apiGet,apiPut,apiPost} from './services/apiClient';
jest.mock('./services/api');
jest.mock('./services/apiClient',()=>({...jest.requireActual('./services/apiClient'),apiGet:jest.fn(),apiPut:jest.fn(),apiPost:jest.fn()}));
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
 const oldGet=apiGet.getMockImplementation();apiGet.mockImplementation(path=>path.includes('/collection-campaigns')?Promise.resolve({available:true,items:[{id:3,name:'Donation drive',date:'2020-01-01'}]}):oldGet(path));
 apiPut.mockResolvedValue({success:true});
 await login();
 fireEvent.click(await screen.findByRole('button',{name:'Appointment Management'}));
 fireEvent.click(await screen.findByRole('button',{name:'Record collection'}));
 fireEvent.change(screen.getByLabelText('Collected units'),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Collected volume (mL)'),{target:{value:'450'}});
 fireEvent.change(screen.getByLabelText('Collected blood component'),{target:{value:'Whole blood'}});
 fireEvent.change(screen.getByLabelText('Actual batch expiry date'),{target:{value:'2099-01-01'}});
 await screen.findByRole('option',{name:'Donation drive'});fireEvent.change(screen.getByLabelText('Donation campaign (optional)'),{target:{value:'3'}});
 api.listHospitalAppointments.mockResolvedValue({appointments:[{...appointment,status:'completed',statusLabel:'Completed',collectedUnits:1,collectedVolumeMl:450}]});
 fireEvent.click(screen.getByRole('button',{name:'Save collection and complete'}));
 expect(await screen.findByText('Collection saved. The donor and blood bank have been notified.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/appointments/12/collection',{collectedUnits:1,collectedVolumeMl:450,component:'Whole blood',expiryDate:'2099-01-01',campaignId:3});
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

test('hospital transfers show blood details and send a selected batch to a receiving bank',async()=>{
 const original=apiGet.getMockImplementation();
 apiGet.mockImplementation(async path=>{
  if(path.endsWith('/transfer-destinations'))return {available:true,items:[{id:2,name:'Receiving Bank',district:'Colombo'}]};
  if(path.endsWith('/transfers'))return {available:true,items:[]};
  if(path.endsWith('/inventory'))return {available:true,items:[{id:1,reference:'BATCH-1',bloodGroup:'O+',component:'Whole blood',quantity:5,reservedUnits:1,availableUnits:4,collectionDate:'2026-11-17',expiryDate:'2099-01-01',status:'usable'}]};
  return original(path);
 });
 apiPost.mockResolvedValue({id:55,success:true});
 await login();fireEvent.click(await screen.findByRole('button',{name:'Blood Transfers'}));
 fireEvent.click(await screen.findByRole('button',{name:'Transfer to Blood Bank'}));
 await screen.findByRole('option',{name:/BATCH-1/});
 fireEvent.change(screen.getByLabelText('Blood batch to transfer'),{target:{value:'1'}});
 expect(screen.getByRole('dialog')).toHaveTextContent('Whole blood');
 fireEvent.change(screen.getByLabelText('Receiving blood bank'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Units to transfer'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Transfer reason'),{target:{value:'Bank supply'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 expect(await screen.findByText('Blood transfer sent. The blood bank has been notified and will confirm receipt.')).toBeInTheDocument();
 expect(apiPost).toHaveBeenCalledWith('/hospitals/mine/transfers',{batchId:1,destinationId:2,quantity:2,reason:'Bank supply'},expect.objectContaining({idempotencyKey:expect.any(String)}));
});

test('transfer to bank remains discoverable when stock and receiving centres are empty',async()=>{
 const original=apiGet.getMockImplementation();
 apiGet.mockImplementation(async path=>/\/(inventory|transfers|transfer-destinations)$/.test(path)?{available:true,items:[]}:original(path));
 await login();fireEvent.click(await screen.findByRole('button',{name:'Blood Transfers'}));
 const transfer=await screen.findByRole('button',{name:'Transfer to Blood Bank'});
 expect(transfer).toBeEnabled();fireEvent.click(transfer);
 const dialog=screen.getByRole('dialog');
 expect(await within(dialog).findByText('Add hospital stock before transferring')).toBeInTheDocument();
 expect(await within(dialog).findByText('No receiving blood bank registered')).toBeInTheDocument();
 expect(within(dialog).queryByRole('button',{name:'Confirm and save'})).not.toBeInTheDocument();
 expect(apiPost).not.toHaveBeenCalled();
 fireEvent.click(within(dialog).getByRole('button',{name:'Add stock batch'}));
 expect(await screen.findByRole('heading',{name:'Hospital Inventory',level:1})).toBeInTheDocument();
});

test('hospital received blood section confirms an incoming transfer',async()=>{
 const original=apiGet.getMockImplementation();
 let received=false;
 const item={id:99,reference:'TR-99',direction:'incoming',sourceCentre:'Sending Blood Bank',destinationCentre:'Test Hospital',batchReference:'BANK-BATCH-1',bloodGroup:'A+',component:'Whole blood',quantity:2,collectionDate:'2026-11-10',expiryDate:'2099-01-01',createdAt:'2026-11-17 10:00',updatedAt:'2026-11-17 11:00'};
 apiGet.mockImplementation(async path=>path.endsWith('/transfers')?{available:true,items:[{...item,status:received?'received':'dispatched',receiptStatus:received?'usable':null}]}:original(path));
 apiPut.mockImplementation(async()=>{received=true;return {id:99,success:true};});
 await login();fireEvent.click(await screen.findByRole('button',{name:'Blood Transfers'}));
 expect(await screen.findByRole('heading',{name:'Received Blood'})).toBeInTheDocument();
 expect(await screen.findByText('Sending Blood Bank')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Confirm receipt TR-99'}));
 fireEvent.change(screen.getByLabelText('Receiving checks / note'),{target:{value:'Received and checked'}});
 fireEvent.change(screen.getByLabelText('Receiving decision'),{target:{value:'accepted'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 expect(await screen.findByText('Blood receipt confirmed. Hospital inventory and the sending blood bank have been updated.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/hospitals/mine/transfers/99/receive',{accepted:true,note:'Received and checked'},expect.objectContaining({idempotencyKey:expect.any(String)}));
 expect(await screen.findByText('Received')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Confirm receipt TR-99'})).not.toBeInTheDocument();
});
test('hospital login, all sidebar routes and logout retain existing navigation and auth', async () => {
  await login();
  await screen.findByRole('heading', { name: 'Hospital Dashboard', level: 1 });
  expect(screen.queryByRole('button', { name: 'Blood Availability', exact: true })).not.toBeInTheDocument();
  for (const [label, title] of [
    ['Appointment Management', 'Appointment Management'], ['Blood Donation Campaigns','Blood Donation Campaigns'], ['New Blood Request', 'New Blood Request'], ['My Blood Requests', 'My Blood Requests'],
    ['Hospital Inventory', 'Hospital Inventory'], ['Blood Transfers','Blood Transfers'],
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


test('hospital can reschedule a pending appointment using available slots',async()=>{
 const appointment={id:12,hospitalId:10,reference:'AP-00012',donorName:'Test Donor',appointmentDate:'2099-01-01',timeSlot:'09:00',status:'pending',statusLabel:'Pending',bloodGroup:'O+'};
 api.listHospitalAppointments.mockResolvedValue({appointments:[appointment]});
 const prior=apiGet.getMockImplementation();apiGet.mockImplementation(path=>path.includes('/appointments/slots/')?Promise.resolve({booked:['09:00']}):prior(path));
 apiPut.mockResolvedValue({success:true});await login();
 fireEvent.click(await screen.findByRole('button',{name:'Appointment Management'}));
 fireEvent.click(await screen.findByRole('button',{name:'Reschedule'}));
 fireEvent.change(screen.getByLabelText('New appointment date'),{target:{value:'2099-01-02'}});
 await waitFor(()=>expect(screen.getByRole('option',{name:'09:00'})).toBeDisabled());
 // Wait until slot loading completes.
 await screen.findByRole('option',{name:'10:00'});
 fireEvent.change(screen.getByLabelText('New time slot'),{target:{value:'10:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Save new appointment time'}));
 expect(await screen.findByText('Appointment rescheduled. The donor and blood bank have been notified.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/appointments/12/hospital-reschedule',{appointment_date:'2099-01-02',time_slot:'10:00'});
});
test('hospital appointment cancellation requires confirmation',async()=>{
 api.listHospitalAppointments.mockResolvedValue({appointments:[{id:12,reference:'AP-00012',donorName:'Test Donor',appointmentDate:'2099-01-01',timeSlot:'09:00',status:'pending',bloodGroup:'O+'}]});
 apiPut.mockResolvedValue({success:true});await login();
 fireEvent.click(await screen.findByRole('button',{name:'Appointment Management'}));
 fireEvent.click(await screen.findByRole('button',{name:'Cancel'}));
 expect(apiPut).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm cancellation'}));
 expect(await screen.findByText('Appointment cancelled. The donor and blood bank have been notified.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/appointments/12/hospital-cancel',{});
});


test('hospital links a past completed donation to its matching campaign',async()=>{
 const appointment={id:12,reference:'AP-00012',hospitalId:10,donorName:'Test Donor',appointmentDate:'2020-01-01',timeSlot:'09:00',status:'completed',collectedUnits:1,collectedVolumeMl:450,bloodGroup:'O+'};
 api.listHospitalAppointments.mockResolvedValue({appointments:[appointment]});
 const prior=apiGet.getMockImplementation();apiGet.mockImplementation(path=>path.includes('/collection-campaigns')?Promise.resolve({available:true,items:[{id:3,name:'Past donation drive',date:'2020-01-01'}]}):prior(path));
 apiPut.mockResolvedValue({success:true});await login();fireEvent.click(await screen.findByRole('button',{name:'Appointment Management'}));
 fireEvent.click(await screen.findByRole('button',{name:'Link campaign'}));await screen.findByRole('option',{name:'Past donation drive'});
 fireEvent.change(screen.getByLabelText('Donation campaign (optional)'),{target:{value:'3'}});fireEvent.change(screen.getByLabelText('Campaign link reason'),{target:{value:'Confirmed attendance'}});
 fireEvent.click(screen.getByRole('button',{name:'Save campaign link'}));
 expect(await screen.findByText('Donation campaign link saved. Campaign totals have been updated.')).toBeInTheDocument();
 expect(apiPut).toHaveBeenCalledWith('/appointments/12/campaign',{campaignId:3,note:'Confirmed attendance'});
 expect(apiPost).not.toHaveBeenCalled();
});
