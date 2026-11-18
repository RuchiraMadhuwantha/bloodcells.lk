import {HospitalTransfers} from './HospitalTransfers';
import {HospitalAppointments} from './HospitalAppointments';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { HospitalDashboard, BloodRequestPage } from '../../Hospital';
import { HospitalPortal } from './HospitalUI';
import { MyBloodRequests } from './HospitalRequests';
import { HospitalInventory } from './HospitalStock';
import { HospitalUsage } from './HospitalUsage';
import { HospitalReports } from './HospitalReports';
import * as service from '../../services/hospitalService';
import { todayStr } from './hospitalUtils';
jest.mock('../../services/hospitalService');
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'Test hospital', role: 'hospital', account_status: 'active' } }) }));
const nav = { portal: 'Hospital Portal', items: [], onNavigate: jest.fn(), onLogout: jest.fn() };
const request = { id: 1, reference: 'BR-TEST1', bloodGroup: 'O+', quantity: 2, urgency: 'emergency', urgencyLabel: 'Emergency', status: 'pending', statusLabel: 'Pending', createdAt: '2026-01-02', requiredDate: '2026-01-03', decisionNote: 'Awaiting review', reason: 'Test reason' };
const renderPage = (element) => render(<HospitalPortal nav={nav}>{element}</HospitalPortal>);
beforeEach(() => {
  jest.resetAllMocks();
  service.getHospital.mockResolvedValue({ hospitalName: 'Test Hospital', hospitalCode: 'TEST', accountStatus: 'active' });
  service.getRequests.mockResolvedValue({ available: true, complete: true, items: [request, { ...request, id: 2, reference: 'BR-TEST2', bloodGroup: 'A-', urgency: 'normal', status: 'fulfilled', statusLabel: 'Fulfilled', createdAt: '2026-01-01' }] });
  service.getDashboard.mockResolvedValue({summary:{requests:{total:2,pending:1,approved:0,fulfilled:1,emergency:1},recentRequests:[request],inventory:{available:false},usage:{available:false}}});
  service.getReport.mockResolvedValue({title:'Hospital Blood Request Report',hospital:'Test Hospital',period:'All dates',generatedAt:'2026-01-01',group:'All groups',status:'All statuses',summary:{'Total requests':2},columns:['Reference'],rows:[['BR-TEST1']]});
  service.getAppointments.mockResolvedValue({ available: true, items: [] });
  service.getHospitalStock.mockResolvedValue({ available: false, items: [], reason: 'Hospital stock not available.' });
  service.getUsage.mockResolvedValue({ available: false, items: [], reason: 'Usage service not available.' });
});
test('request submission uses the existing contract and waits for server confirmation', async () => {
  let resolve;
  service.createRequest.mockImplementation(() => new Promise((done) => { resolve = done; }));
  renderPage(<BloodRequestPage nav={nav} />);
  fireEvent.change(await screen.findByLabelText('Quantity (units)'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Urgency'), { target: { value: 'emergency' } });
  fireEvent.change(screen.getByLabelText('Required date (optional)'), { target: { value: todayStr(1) } });
  fireEvent.change(screen.getByLabelText('Reason (optional)'), { target: { value: '  Test hospital reason  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Blood request' }));
  expect(service.createRequest).toHaveBeenCalledTimes(1);
  expect(service.createRequest).toHaveBeenCalledWith({ blood_group: 'O+', quantity: 3, urgency: 'emergency', required_date: todayStr(1), department: 'Emergency', reason: 'Test hospital reason' });
  expect(screen.queryByText('Request Submitted')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  resolve({ request, stockWarning: 'Stock is limited' });
  expect(await screen.findByText('Request Submitted')).toBeInTheDocument();
  expect(screen.getByText('Stock is limited')).toBeInTheDocument();
  expect(screen.getByText('Pending')).toBeInTheDocument();
});
test('invalid quantities and past dates cannot submit, and API errors remain visible', async () => {
  service.createRequest.mockRejectedValue(new Error('Permission denied'));
  renderPage(<BloodRequestPage nav={nav} />);
  const quantity = await screen.findByLabelText('Quantity (units)');
  for (const value of ['0', '-1', '1.5', '501', '']) {
    fireEvent.change(quantity, { target: { value } });
    fireEvent.submit(screen.getByRole('form', { name: 'Blood request' }));
  }
  expect(service.createRequest).not.toHaveBeenCalled();
  fireEvent.change(quantity, { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Required date (optional)'), { target: { value: '2000-01-01' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Blood request' }));
  expect(screen.getByRole('alert')).toHaveTextContent('valid future date');
  expect(service.createRequest).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Required date (optional)'), { target: { value: '' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Blood request' }));
  expect(await screen.findByText('Permission denied')).toBeInTheDocument();
});
test('request tracking filters, sorts, shows details and confirms cancellation', async () => {
  service.cancelRequest.mockResolvedValue({ request: { ...request, status: 'cancelled' }, message: 'Cancelled by server' });
  renderPage(<MyBloodRequests nav={nav} />);
  await screen.findByText('BR-TEST1');
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('BR-TEST1');
  fireEvent.change(screen.getByLabelText('Blood group'), { target: { value: 'A-' } });
  expect(screen.queryByText('BR-TEST1')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Blood group'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Urgency'), { target: { value: 'emergency' } });
  fireEvent.change(screen.getByLabelText('Request status'), { target: { value: 'pending' } });
  fireEvent.change(screen.getByLabelText('Search request ID'), { target: { value: 'TEST1' } });
  fireEvent.click(screen.getByRole('button', { name: 'View request BR-TEST1' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Test reason');
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel request BR-TEST1' }));
  expect(service.cancelRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  expect(await screen.findByText('Cancelled by server')).toBeInTheDocument();
});
test('request loading failures can be retried to an honest empty state', async () => {
  service.getRequests.mockRejectedValueOnce(new Error('Network failed')).mockResolvedValueOnce({ available: true, complete: true, items: [] });
  renderPage(<MyBloodRequests nav={nav} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Network failed');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No blood requests recorded')).toBeInTheDocument();
});
test('hospital inventory and usage cannot mutate network stock or imply saved records', async () => {
  const view = renderPage(<HospitalInventory nav={nav} />);
  expect(await screen.findByText('Hospital stock not available.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add inventory unavailable' })).toBeDisabled();
  view.unmount();
  renderPage(<HospitalUsage nav={nav} />);
  expect(await screen.findByText('Usage service not available.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save usage unavailable' })).toBeDisabled();
  expect(screen.getByText('Total recorded usage: unavailable')).toBeInTheDocument();
});

test('hospital inventory includes blood availability totals from its own packets',async()=>{
 service.getHospitalStock.mockResolvedValue({available:true,items:[{id:1,bloodGroup:'O+',availableUnits:4},{id:2,bloodGroup:'O+',availableUnits:3},{id:3,bloodGroup:'O+',availableUnits:0},{id:4,bloodGroup:'A+',availableUnits:2}]});
 renderPage(<HospitalInventory nav={nav}/>);
 expect(await screen.findByRole('heading',{name:'Blood Availability'})).toBeInTheDocument();
 expect(await screen.findByLabelText('Available O+')).toHaveTextContent('7');
 expect(screen.getByLabelText('Available A+')).toHaveTextContent('2');
 expect(screen.getByLabelText('Available AB-')).toHaveTextContent('0');
 expect(service.getHospitalStock).toHaveBeenCalled();
});
test('report preview uses real supplied records and unsupported sources disable generation', async () => {
  renderPage(<HospitalReports nav={nav} />);
  const preview = await screen.findByRole('button', { name: 'Preview report' });
  await waitFor(() => expect(preview).toBeEnabled());
  fireEvent.click(preview);
  expect(await screen.findByRole('heading', { name: 'Hospital Blood Request Report' })).toBeInTheDocument();
  expect(screen.getByText('Test Hospital', { selector: 'dd' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Submission date from'), { target: { value: '2026-03-01' } });
  fireEvent.change(screen.getByLabelText('Submission date to'), { target: { value: '2026-01-01' } });
  expect(screen.getByRole('button', { name: 'Preview report' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'inventory' } });
  expect(screen.getByRole('button', { name: 'Preview report' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
});
test('incomplete data prevents reporting and dashboard retains its request table', async () => {
  service.getReport.mockRejectedValue(new Error('The dataset is incomplete.'));
  const view = renderPage(<HospitalReports nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Preview report' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('incomplete');
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  view.unmount();
  renderPage(<HospitalDashboard nav={nav} />);
  expect(await screen.findByText('BR-TEST1')).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Blood Availability'})).not.toBeInTheDocument();
});
test.each(['pending', 'inactive', 'suspended'])('a fresh %s hospital profile blocks protected page content', async (status) => {
  service.getHospital.mockResolvedValue({ accountStatus: status });
  renderPage(<p>Protected hospital data</p>);
  expect(await screen.findByRole('heading', { name: 'Hospital approval required' })).toBeInTheDocument();
  expect(screen.queryByText('Protected hospital data')).not.toBeInTheDocument();
});
test('a forbidden hospital profile response never renders page data', async () => {
  service.getHospital.mockRejectedValue(new Error('Hospital registration was rejected'));
  renderPage(<p>Protected hospital data</p>);
  expect(await screen.findByRole('alert')).toHaveTextContent('rejected');
  expect(screen.queryByText('Protected hospital data')).not.toBeInTheDocument();
});

test('usage recording waits for server confirmation and sends a stable retry key', async () => {
  Object.defineProperty(window,'crypto',{configurable:true,value:{randomUUID:()=> 'fixture-usage-key'}});
  service.getUsage.mockResolvedValue({available:true,items:[]});
  service.getHospitalStock.mockResolvedValue({available:true,items:[{id:1,reference:'BATCH-FIX',bloodGroup:'O+',availableUnits:5}]});
  service.saveUsage.mockResolvedValue({item:{id:1},message:'Usage committed by server'});
  renderPage(<HospitalUsage nav={nav}/>);
  const batch=await screen.findByLabelText('Usable hospital stock packet');
  await screen.findByRole('option',{name:'BATCH-FIX - O+ (5 usable)'});
  fireEvent.change(batch,{target:{value:'1'}});
  fireEvent.change(screen.getByLabelText('Quantity used (units)'),{target:{value:'2'}});
  fireEvent.change(screen.getByLabelText('Usage category / reason'),{target:{value:'Fixture operational use'}});
  fireEvent.click(screen.getByRole('button',{name:'Save usage'}));
  expect(await screen.findByText('Usage committed by server')).toBeInTheDocument();
  expect(service.saveUsage).toHaveBeenCalledWith(expect.objectContaining({batchId:1,bloodGroup:'O+',quantity:2}),'fixture-usage-key');
});


test('hospital-owned stock groups blood types and retains individual packet controls',async()=>{
 service.getHospitalStock.mockResolvedValue({available:true,items:[
  {id:1,reference:'PACKET-O-1',bloodGroup:'O+',component:'Whole blood',quantity:5,availableUnits:4,reservedUnits:1,volumeMl:2250,expiryDate:'2099-01-01',status:'usable',level:'Usable'},
  {id:2,reference:'PACKET-O-2',bloodGroup:'O+',component:'Red cells',quantity:3,availableUnits:3,reservedUnits:0,volumeMl:1350,expiryDate:'2030-01-01',status:'usable',level:'Usable'},
  {id:3,reference:'PACKET-A-1',bloodGroup:'A+',component:'Whole blood',quantity:2,availableUnits:2,reservedUnits:0,volumeMl:null,status:'usable',level:'Usable'},
 ]});
 renderPage(<HospitalInventory nav={nav}/>);
 const table=await screen.findByRole('table');expect(within(table).getAllByRole('row')).toHaveLength(3);
 const row=screen.getByRole('button',{name:'View O+ packets'}).closest('tr');expect(row).toHaveTextContent('PACKET-O-1');expect(row).toHaveTextContent('PACKET-O-2');expect(row).toHaveTextContent('3600');expect(within(row).getByText('7')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Search hospital stock'),{target:{value:'PACKET-O-2'}});
 expect(within(table).getAllByRole('row')).toHaveLength(2);expect(within(table).getByText('PACKET-O-1')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View O+ packets'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('Whole blood');expect(screen.getByRole('dialog')).toHaveTextContent('Red cells');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Details PACKET-O-2'}));
 expect(screen.getAllByRole('dialog')).toHaveLength(1);expect(screen.getByRole('dialog')).toHaveTextContent('PACKET-O-2');
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Update stock'}));
 expect(screen.getByLabelText('Recorded quantity')).toHaveValue(3);expect(screen.getByLabelText('Recorded volume (mL)')).toHaveValue(1350);
});


test('hospital blood-group rows and packet details identify expiring packets',async()=>{
 const base={bloodGroup:'O+',quantity:2,availableUnits:2,reservedUnits:0,status:'usable',level:'Usable',asOfDate:'2026-11-17'};
 service.getHospitalStock.mockResolvedValue({available:true,items:[{...base,id:1,reference:'O-SOON',expiryDate:'2026-11-19'},{...base,id:2,reference:'O-LATER',expiryDate:'2026-12-01'},{...base,id:3,bloodGroup:'A+',reference:'A-EXPIRED',expiryDate:'2026-11-16',availableUnits:0,level:'Expired'}]});
 renderPage(<HospitalInventory nav={nav}/>);
 const open=await screen.findByRole('button',{name:'View O+ packets'});expect(open.closest('tr')).toHaveClass('bg-amber-50');expect(screen.getByRole('button',{name:'View A+ packets'}).closest('tr')).toHaveClass('bg-rose-50');
 fireEvent.click(open);const dialog=screen.getByRole('dialog');const soon=within(dialog).getByText('O-SOON').closest('tr');expect(soon).toHaveClass('bg-amber-50');expect(within(soon).getByText('2 days left')).toBeInTheDocument();expect(within(dialog).getByText('O-LATER').closest('tr')).not.toHaveClass('bg-amber-50');
});

test('hospital appointment sorting preserves search and status filters',async()=>{
 service.getAppointments.mockResolvedValue({available:true,items:[{id:1,reference:'AP-SORT-LATE',donorName:'Matching donor',appointmentDate:'2099-02-01',timeSlot:'09:00',status:'pending'},{id:2,reference:'AP-SORT-EARLY',donorName:'Matching donor',appointmentDate:'2099-01-01',timeSlot:'09:00',status:'pending'},{id:3,reference:'AP-SORT-COMPLETED',donorName:'Matching donor',appointmentDate:'2026-01-01',status:'completed'}]});
 renderPage(<HospitalAppointments nav={nav}/>);await screen.findByText('AP-SORT-LATE');
 fireEvent.change(screen.getByLabelText('Search appointments'),{target:{value:'Matching'}});fireEvent.change(screen.getByLabelText('Appointment status'),{target:{value:'pending'}});fireEvent.change(screen.getByLabelText('Sort appointments'),{target:{value:'latest'}});
 const rows=screen.getAllByRole('row').slice(1);expect(rows).toHaveLength(2);expect(rows[0]).toHaveTextContent('AP-SORT-LATE');expect(rows[1]).toHaveTextContent('AP-SORT-EARLY');expect(screen.getByLabelText('Search appointments')).toHaveValue('Matching');expect(service.getAppointments).toHaveBeenCalledTimes(1);
});

test('hospital inventory sorting retains complete blood-group totals during packet search',async()=>{
 service.getHospitalStock.mockResolvedValue({available:true,items:[{id:1,reference:'SORT-FIND-O',bloodGroup:'O+',availableUnits:2,quantity:2},{id:2,reference:'SORT-OTHER-O',bloodGroup:'O+',availableUnits:8,quantity:8},{id:3,reference:'SORT-FIND-A',bloodGroup:'A+',availableUnits:3,quantity:3}]});
 renderPage(<HospitalInventory nav={nav}/>);await screen.findByRole('button',{name:'View O+ packets'});
 fireEvent.change(screen.getByLabelText('Search hospital stock'),{target:{value:'SORT-FIND'}});fireEvent.change(screen.getByLabelText('Sort inventory'),{target:{value:'high'}});
 const rows=screen.getAllByRole('row').slice(1);expect(rows).toHaveLength(2);expect(rows[0]).toHaveTextContent('SORT-OTHER-O');expect(rows[0]).toHaveTextContent('10');expect(rows[1]).toHaveTextContent('SORT-FIND-A');expect(service.getHospitalStock).toHaveBeenCalledTimes(1);
});

test('short packet IDs remain searchable alongside original packet references',async()=>{
 service.getHospitalStock.mockResolvedValue({available:true,items:[{id:42,batchCode:'B-0042',reference:'ORIGINAL-LONG-PACKET-REFERENCE',bloodGroup:'O+',quantity:2,availableUnits:2,status:'usable'}]});
 renderPage(<HospitalInventory nav={nav}/>);await screen.findByRole('button',{name:'View packet B-0042'});
 expect(screen.queryByText('ORIGINAL-LONG-PACKET-REFERENCE')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Search hospital stock'),{target:{value:'B-0042'}});expect(screen.getByRole('button',{name:'View packet B-0042'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Search hospital stock'),{target:{value:'ORIGINAL-LONG'}});fireEvent.click(screen.getByRole('button',{name:'View packet B-0042'}));
 expect(within(screen.getByRole('dialog')).getByText('ORIGINAL-LONG-PACKET-REFERENCE')).toBeInTheDocument();
 expect(within(screen.getByRole('dialog')).getByText('B-0042')).toBeInTheDocument();
});

test('hospital sends to the main blood bank without choosing a district destination',async()=>{
 service.getHospital.mockResolvedValue({hospitalName:'Test Hospital',accountStatus:'active',district:'Colombo'});
 service.getHospitalStock.mockResolvedValue({available:true,items:[{id:42,batchCode:'B-0042',reference:'Packet-42',bloodGroup:'A+',quantity:2,availableUnits:2,reservedUnits:0,status:'usable'}]});
 service.getTransfers.mockResolvedValue({available:true,items:[]});
 service.getTransferDestinations.mockResolvedValue({available:true,items:[{id:2,name:'Main Blood Bank',district:'Galle',isMain:true}]});
 service.sendTransfer.mockResolvedValue({id:10});
 renderPage(<HospitalTransfers nav={nav}/>);
 const send=await screen.findByRole('button',{name:'Transfer B-0042'});await waitFor(()=>expect(send).toBeEnabled());fireEvent.click(send);
 expect(screen.queryByLabelText('Receiving blood bank')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Units to transfer'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Transfer reason'),{target:{value:'Return spare stock'}});
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(service.sendTransfer).toHaveBeenCalledWith({batchId:42,quantity:1,reason:'Return spare stock'},expect.any(String)));
});

test('issued request blood appears as incoming transfer and arrival confirmation is saved once',async()=>{
 service.getHospitalStock.mockResolvedValue({available:true,items:[]});service.getTransferDestinations.mockResolvedValue({available:true,items:[{id:3,name:'Main Blood Bank'}]});service.getTransfers.mockResolvedValue({available:true,items:[{id:49,reference:'TR-49',requestId:54,requestReference:'BR-00054',direction:'incoming',sourceCentre:'Main Blood Bank',batchCode:'B-0003',bloodGroup:'A+',quantity:12,status:'dispatched'}]});service.receiveTransfer.mockResolvedValue({id:49});
 renderPage(<HospitalTransfers nav={nav}/>);expect(await screen.findByText('BR-00054')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirm receipt TR-49'}));
 fireEvent.change(screen.getByLabelText('Receiving checks / note'),{target:{value:'Packets arrived and checked'}});fireEvent.change(screen.getByLabelText('Receiving decision'),{target:{value:'accepted'}});fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(service.receiveTransfer).toHaveBeenCalledWith(49,{accepted:true,note:'Packets arrived and checked'},expect.any(String)));
});
