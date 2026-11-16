import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { InventoryManagement } from './BankInventory';
import { BloodRequestQueue, BankAppointments } from './BankOperations';
import { DonorManagement } from './BankDonors';
import { BankNotifications } from './BankNotifications';
import { BankSelectionProvider } from './BankUI';
import { BloodExpiry, RegionalStock, BloodTransfers, RegionalCoordination } from './BankRegional';
import { BankReports } from './BankReports.js';
import { CampaignManagement } from '../CampaignManagement';
import * as bank from '../../services/bankService';
jest.mock('../../services/bankService');
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'Test bank', role: 'blood_bank' } }) }));
const nav = { portal: 'Blood Bank Portal', items: [], onNavigate: jest.fn(), onLogout: jest.fn() };
const stock = { id: 1, bloodGroup: 'O+', availableUnits: 5, level: 'Low', lowStockThreshold: 10, criticalStockThreshold: 2 };
const request = { id: 1, reference: 'BR-TEST', hospitalName: 'Test Hospital', district: 'Colombo', bloodGroup: 'O+', quantity: 3, urgency: 'emergency', status: 'pending', requiredDate: '2026-01-03', createdAt: '2026-01-01' };
const appointment = { id: 1, reference: 'AP-TEST', donorName: 'Test Donor', hospitalName: 'Test Centre', district: 'Colombo', appointmentDate: '2026-01-03', timeSlot: '09:00', bloodGroup: 'O+', status: 'pending' };
const donor = { id: 'D-1', donorId: 1, fullName: 'Test Donor', accountStatus: 'active', bloodGroup: 'O+', district: 'Colombo', eligible: true };
const unavailable = { available: false, complete: false, items: [], reason: 'Service not available yet.' };
beforeEach(() => {
  jest.resetAllMocks();
  bank.getBatches.mockResolvedValue({available:true,complete:true,items:[{...stock,reference:'BATCH-1',locationId:1,locationName:'Fixture centre',quantity:5,reservedUnits:0,version:1,status:'usable',expiryDate:'2099-01-01'}]});
  bank.getCentres.mockResolvedValue({available:true,items:[{id:1,name:'Fixture centre'}]});
  bank.getCentreDirectory.mockResolvedValue({available:true,items:[{id:1,name:'Fixture centre'},{id:2,name:'Destination centre'}]});
  bank.getHistory.mockResolvedValue({available:true,items:[]});
  bank.getStock.mockResolvedValue({ available: true, complete: true, items: [stock] });
  bank.getRequests.mockResolvedValue({ available: true, complete: true, items: [request] });
  bank.getAppointments.mockResolvedValue({ available: true, complete: true, items: [appointment] });
  bank.getDonationCentres.mockResolvedValue({ available: true, complete: true, items: [{ hospitalId: 7, name: 'Approved donation centre', code: 'DC7', address: '7 Centre Road', district: 'Kandy' }] });
  bank.getDonors.mockResolvedValue({ available: true, complete: true, items: [donor] });
  bank.getDonorDetails.mockResolvedValue({ donor, appointments: [] });
  bank.getInbox.mockResolvedValue({available:true,items:[]});
  for (const method of ['getExpiry', 'getRegionalStock', 'getTransfers', 'getNotifications', 'getCampaigns','getCoordination']) bank[method].mockResolvedValue(unavailable);
});
const renderBank = (page) => render(<BankSelectionProvider>{page}</BankSelectionProvider>);

test('bank inbox displays hospital approval and opens appointments',async()=>{
 bank.getInbox.mockResolvedValue({available:true,items:[{id:1,title:'Hospital approved a donor appointment',message:'Test Hospital approved AP-00012.',relatedType:'appointment'}]});
 renderBank(<BankNotifications nav={nav}/>);
 expect(await screen.findByText('Test Hospital approved AP-00012.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View appointments'}));
 expect(nav.onNavigate).toHaveBeenCalledWith('bank-appointments');
});

test('batch adjustments save one confirmed versioned mutation while pending',async()=>{
 let resolve;bank.updateBatch.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 renderBank(<InventoryManagement nav={nav}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Adjust / dispose'}));
 fireEvent.change(screen.getByLabelText('Physical units'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Adjustment or disposal reason'),{target:{value:'Physical count'}});
 const confirm=screen.getByRole('button',{name:'Confirm and save'});fireEvent.click(confirm);fireEvent.click(confirm);
 expect(bank.updateBatch).toHaveBeenCalledTimes(1);
 expect(bank.updateBatch).toHaveBeenCalledWith(1,{quantity:3,status:'usable',reason:'Physical count',version:1},expect.any(String));
 expect(bank.adjustStock).not.toHaveBeenCalled();resolve({id:1});expect(await screen.findByRole('status')).toHaveTextContent('Operation saved');
});
test('threshold edits target the selected actual centre',async()=>{
 bank.saveCentreThresholds.mockResolvedValue({id:1});renderBank(<InventoryManagement nav={nav}/>);
 const button=screen.getByRole('button',{name:'Thresholds'});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);
 fireEvent.change(screen.getAllByLabelText('Storage centre').at(-1),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Blood group'),{target:{value:'O+'}});
 fireEvent.change(screen.getByLabelText('Low threshold'),{target:{value:'10'}});
 fireEvent.change(screen.getByLabelText('Critical threshold'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.saveCentreThresholds).toHaveBeenCalledWith('1',{bloodGroup:'O+',lowStockThreshold:10,criticalStockThreshold:2},expect.any(String)));
});
test('request decisions require confirmation and rejection needs a reason', async () => {
  bank.changeRequest.mockResolvedValue({ request: { ...request, status: 'rejected' }, message: 'Rejected by server' });
  renderBank(<BloodRequestQueue nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reject BR-TEST' }));
  expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Decision reason'), { target: { value: 'No suitable stock' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByText('Rejected by server')).toBeInTheDocument();
  expect(bank.changeRequest).toHaveBeenCalledWith(1, 'rejected', 'No suitable stock');
});
test('failed fulfillment stays in its dialog without frontend stock deduction', async () => {
  bank.getRequests.mockResolvedValue({ available: true, complete: true, items: [{ ...request, status: 'approved' }] });
  bank.changeRequest.mockRejectedValue(new Error('Insufficient stock'));
  renderBank(<BloodRequestQueue nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Fulfill BR-TEST' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(bank.adjustStock).not.toHaveBeenCalled();
});
test('appointment decisions allow approved records to be completed or cancelled', async () => {
  bank.getAppointments.mockResolvedValue({ available: true, complete: true, items: [appointment, { ...appointment, id: 2, reference: 'AP-LOCKED', status: 'approved' }] });
  bank.changeAppointment.mockResolvedValue({ appointment: { ...appointment, status: 'approved' }, message: 'Approved by server' });
  renderBank(<BankAppointments nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve AP-TEST' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByText('Approved by server')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel AP-LOCKED' })).toBeEnabled();
  expect(screen.getAllByRole('button', { name: 'Reschedule' })[0]).toBeEnabled();
});
test('donor candidates are labelled for screening, expose authorized details and retain selection', async () => {
  renderBank(<DonorManagement nav={nav} candidates />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select donor D-1' }));
  expect(screen.getByText('1 donor(s) selected in this session')).toBeInTheDocument();
  expect(screen.getByText('Flag met; screening required')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View donor D-1' }));
  expect(await within(screen.getByRole('dialog')).findByText('Not verified by this directory')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Update account status' })).toBeEnabled();
});
test('notifications preview message text without simulating sending or delivery', async () => {
  renderBank(<BankNotifications nav={nav} />);
  fireEvent.change(screen.getByLabelText('Notification message'), { target: { value: 'Test announcement' } });
  const preview = screen.getByRole('button', { name: 'Preview message' });
  await waitFor(() => expect(preview).toBeEnabled());
  fireEvent.click(preview);
  expect(screen.getByRole('dialog')).toHaveTextContent('Test announcement');
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm and save' })).toBeEnabled();
  expect(bank.sendNotification).not.toHaveBeenCalled();
});
test.each([BloodExpiry, RegionalStock, BloodTransfers, RegionalCoordination])('unsupported regional/expiry modules show honest unavailable states', async (Page) => {
  renderBank(<Page nav={nav} />);
  expect((await screen.findAllByText('Service not available yet.')).length).toBeGreaterThan(0);
});
test('campaign preview stays unsaved and successful creation refreshes the list and clears filters', async () => {
  renderBank(<CampaignManagement nav={nav} />);
  await screen.findByText('Service not available yet.');
  expect(screen.queryByText('Community Blood Donation Drive')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search campaigns'), { target: { value: 'Other campaign' } });
  fireEvent.change(screen.getByLabelText('Campaign status'), { target: { value: 'Active' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }));
  await screen.findByRole('option', { name: 'Approved donation centre (DC7) — Kandy' });
  fireEvent.change(screen.getByLabelText('Select Donation Centre'), { target: { value: '7' } });
  expect(screen.getByLabelText('Venue Name')).toHaveValue('Approved donation centre');
  expect(screen.getByLabelText('Address')).toHaveValue('7 Centre Road');
  expect(screen.getByLabelText('District')).toHaveValue('Kandy');
  const values = { 'Campaign Name': 'Unsaved test campaign', 'Short Description': 'Test description', 'Campaign Date': '2026-12-20', 'Start Time': '09:00', 'End Time': '12:00', 'Venue Name': 'User entered venue', District: 'Colombo', 'Organizer Name': 'User entered organizer' };
  for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview Campaign' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Unsaved test campaign');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Create campaign' })).toBeEnabled();
  expect(bank.saveCampaign).not.toHaveBeenCalled();
  bank.saveCampaign.mockRejectedValueOnce(new Error('Enter a valid contact email.'));
  fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid contact email.');
  const saved = { id: 42, reference: 'CM-00042', name: 'Unsaved test campaign', status: 'Draft', date: '2026-12-20' };
  bank.saveCampaign.mockResolvedValueOnce({ campaign: saved });
  bank.getCampaigns.mockResolvedValue({ available: true, complete: true, items: [saved] });
  fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }));
  await screen.findByRole('button', { name: 'Create campaign' });
  await waitFor(() => expect(screen.queryByLabelText('Campaign Name')).not.toBeInTheDocument());
  expect(await screen.findByText('Unsaved test campaign', { selector: 'td' })).toBeInTheDocument();
  expect(screen.getByText(/saved successfully/)).toHaveTextContent('CM-00042');
  expect(screen.getByLabelText('Search campaigns')).toHaveValue('');
  expect(screen.getByLabelText('Campaign status')).toHaveValue('');
  expect(bank.saveCampaign).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Unsaved test campaign', venueName: 'User entered venue', status: 'Draft' }), undefined);
});
test('reports use the protected server preview and PDF endpoint',async()=>{
 bank.getReport.mockResolvedValue({title:'Verified Bank Report',period:'All',generatedAt:'Now',summary:{Units:5},columns:['Units'],rows:[[5]],sourceNote:'Verified data'});
 bank.downloadReport.mockResolvedValue();renderBank(<BankReports nav={nav}/>);
 fireEvent.click(screen.getByRole('button',{name:'Preview report'}));
 expect(await screen.findByRole('heading',{name:'Verified Bank Report'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Download PDF'}));
 await waitFor(()=>expect(bank.downloadReport).toHaveBeenCalledWith(expect.objectContaining({type:'inventory'}),'pdf'));
 fireEvent.change(screen.getByLabelText('Bank report type'),{target:{value:'expiry'}});
 expect(screen.queryByRole('heading',{name:'Verified Bank Report'})).not.toBeInTheDocument();
});

test('loading errors retry to empty records without fabricated stock', async () => {
  bank.getBatches.mockRejectedValueOnce(new Error('Stock unavailable')).mockResolvedValueOnce({ available: true, complete: true, items: [] });
  renderBank(<InventoryManagement nav={nav} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Stock unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No verified batches recorded')).toBeInTheDocument();
});

test('selected donor outreach saves actual in-app notifications after confirmation',async()=>{
 bank.sendNotification.mockResolvedValue({id:1,deliveryStatus:'Stored in donor inbox'});
 renderBank(<BankNotifications nav={nav}/>);
 fireEvent.change(screen.getByLabelText('Notification message'),{target:{value:'Donation outreach'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Preview message'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Preview message'}));
 fireEvent.change(screen.getByLabelText('Notification title'),{target:{value:'Authorized announcement'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.sendNotification).toHaveBeenCalledWith({title:'Authorized announcement',type:'general',channel:'in_app',message:'Donation outreach',donorIds:[1]},expect.any(String)));
});
test('destination receiving checks send an explicit quarantine decision',async()=>{
 bank.getTransfers.mockResolvedValue({available:true,items:[{id:2,reference:'TR-2',status:'dispatched',quantity:2}]});bank.transferAction.mockResolvedValue({id:2,status:'received'});
 renderBank(<BloodTransfers nav={nav}/>);
 fireEvent.click(await screen.findByRole('button',{name:'receive'}));
 fireEvent.change(screen.getByLabelText('Decision or receiving checks'),{target:{value:'Physical receipt pending checks'}});
 fireEvent.change(screen.getByLabelText('Receiving decision'),{target:{value:'quarantined'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.transferAction).toHaveBeenCalledWith(2,{action:'receive',note:'Physical receipt pending checks',accepted:false},expect.any(String)));
});
test('approved request allocation submits selected real batch quantities',async()=>{
 bank.getRequests.mockResolvedValue({available:true,items:[{...request,status:'approved'}]});bank.allocateRequest.mockResolvedValue({id:1,status:'reserved'});
 renderBank(<BloodRequestQueue nav={nav}/>);fireEvent.click(await screen.findByRole('button',{name:'Allocate batch'}));
 fireEvent.change(screen.getByLabelText('Fixture centre / BATCH-1 / 5 available'),{target:{value:'3'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.allocateRequest).toHaveBeenCalledWith(1,{items:[{batchId:1,quantity:3}]},expect.any(String)));
});
