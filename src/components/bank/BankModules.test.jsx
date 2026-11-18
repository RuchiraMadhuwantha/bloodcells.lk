import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { InventoryManagement } from './BankInventory';
import { BloodRequestQueue, BankAppointments } from './BankOperations';
import { DonorManagement } from './BankDonors';
import { BankNotifications } from './BankNotifications';
import { BankSelectionProvider } from './BankUI';
import { BloodExpiry, BloodTransfers, RegionalCoordination } from './BankRegional';
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
  bank.getInbox.mockResolvedValue({available:true,items:[],unreadCount:0,hasMore:false});
  bank.getNotificationRecipients.mockResolvedValue({available:true,complete:true,items:[{donorId:1,fullName:'Test Donor',bloodGroup:'O+',district:'Colombo'}]});
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

test('packet adjustments save one confirmed versioned mutation while pending',async()=>{
 let resolve;bank.updateBatch.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 renderBank(<InventoryManagement nav={nav}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Update / remove'}));
 fireEvent.change(screen.getByLabelText('Total units'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Adjustment or disposal reason'),{target:{value:'Physical count'}});
 const confirm=screen.getByRole('button',{name:'Confirm and save'});fireEvent.click(confirm);fireEvent.click(confirm);
 expect(bank.updateBatch).toHaveBeenCalledTimes(1);
 expect(bank.updateBatch).toHaveBeenCalledWith(1,{quantity:3,status:'usable',reason:'Physical count',version:1},expect.any(String));
 expect(bank.adjustStock).not.toHaveBeenCalled();resolve({id:1});expect(await screen.findByRole('status')).toHaveTextContent('Changes saved');
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
  fireEvent.click(await screen.findByRole('button', { name: 'Issue blood BR-TEST' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(bank.adjustStock).not.toHaveBeenCalled();
});
test('bank appointment actions allow cancellation while hospitals record collections', async () => {
  bank.getAppointments.mockResolvedValue({ available: true, complete: true, items: [appointment, { ...appointment, id: 2, reference: 'AP-LOCKED', status: 'approved' }] });
  bank.changeAppointment.mockResolvedValue({ appointment: { ...appointment, status: 'cancelled' }, message: 'Cancelled by server' });
  renderBank(<BankAppointments nav={nav} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel AP-TEST' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByText('Cancelled by server')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve AP-TEST' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark completed AP-TEST' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel AP-LOCKED' })).toBeEnabled();
  expect(screen.getAllByRole('button', { name: 'Reschedule' })[0]).toBeEnabled();
});

test('bank appointments show recorded units and volume and preserve unknown historical quantities',async()=>{
 bank.getAppointments.mockResolvedValue({available:true,items:[{...appointment,status:'completed',collectedUnits:1,collectedVolumeMl:450},{...appointment,id:2,reference:'AP-OLD',status:'completed'}]});
 renderBank(<BankAppointments nav={nav}/>);
 expect(await screen.findByText('450 mL')).toBeInTheDocument();
 expect(screen.getByText('1 unit(s)')).toBeInTheDocument();
 expect(screen.getByText('Not recorded')).toBeInTheDocument();
 expect(screen.getByText('Recorded collected volume (mL)')).toBeInTheDocument();
});
test('donor candidates are labelled for screening, expose authorized details and retain selection', async () => {
  renderBank(<DonorManagement nav={nav} candidates />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select donor D-1' }));
  expect(screen.getByText('1 donor(s) selected in this session')).toBeInTheDocument();
  expect(screen.getByText('Waiting period completed; health check needed')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View donor D-1' }));
  expect(await within(screen.getByRole('dialog')).findByText('A health check is needed at the donation centre')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Update account status' })).toBeEnabled();
});
test('notifications preview message text without simulating sending or delivery', async () => {
  renderBank(<BankNotifications nav={nav} />);
  fireEvent.click(screen.getByRole('tab',{name:'Compose notification'}));
  fireEvent.change(screen.getByLabelText('Notification title'),{target:{value:'Test title'}});
  fireEvent.change(screen.getByLabelText('Notification message'), { target: { value: 'Test announcement' } });
  const preview = screen.getByRole('button', { name: 'Preview message' });
  await waitFor(() => expect(preview).toBeEnabled());fireEvent.click(preview);
  expect(screen.getByRole('dialog')).toHaveTextContent('Test announcement');
  expect(screen.getByRole('button',{name:'Confirm and save'})).toBeEnabled();
  expect(bank.sendNotification).not.toHaveBeenCalled();
});

test.each([BloodExpiry, BloodTransfers, RegionalCoordination])('unsupported regional/expiry modules show honest unavailable states', async (Page) => {
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
  expect(await screen.findByText('No current or expiring blood packets recorded')).toBeInTheDocument();
});

test('selected donor outreach saves actual in-app notifications after confirmation',async()=>{
 bank.sendNotification.mockResolvedValue({id:1,recipientCount:1,deliveryStatus:'Stored in donor inbox'});
 renderBank(<BankNotifications nav={nav}/>);fireEvent.click(screen.getByRole('tab',{name:'Compose notification'}));
 fireEvent.change(screen.getByLabelText('Notification title'),{target:{value:'Authorized announcement'}});
 fireEvent.change(screen.getByLabelText('Notification message'),{target:{value:'Donation outreach'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Preview message'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Preview message'}));fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.sendNotification).toHaveBeenCalledWith({title:'Authorized announcement',type:'general',channel:'in_app',message:'Donation outreach',donorIds:[1]},expect.any(String)));
 expect(await screen.findByText('Announcement saved to 1 donor inbox(es).')).toBeInTheDocument();
});

test('destination receiving checks send an explicit quarantine decision',async()=>{
 bank.getTransfers.mockResolvedValue({available:true,items:[{id:2,reference:'TR-2',status:'dispatched',quantity:2}]});bank.transferAction.mockResolvedValue({id:2,status:'received'});
 renderBank(<BloodTransfers nav={nav}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Confirm arrival'}));
 fireEvent.change(screen.getByLabelText('Decision or receiving checks'),{target:{value:'Physical receipt pending checks'}});
 fireEvent.change(screen.getByLabelText('Receiving decision'),{target:{value:'quarantined'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.transferAction).toHaveBeenCalledWith(2,{action:'receive',note:'Physical receipt pending checks',accepted:false},expect.any(String)));
});
test('approved request allocation submits selected real packet quantities',async()=>{
 bank.getRequests.mockResolvedValue({available:true,items:[{...request,status:'approved'}]});bank.allocateRequest.mockResolvedValue({id:1,status:'reserved'});
 renderBank(<BloodRequestQueue nav={nav}/>);fireEvent.click(await screen.findByRole('button',{name:'Allocate packet'}));
 fireEvent.change(screen.getByLabelText('Fixture centre / BATCH-1 / 5 available'),{target:{value:'3'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.allocateRequest).toHaveBeenCalledWith(1,{items:[{batchId:1,quantity:3}]},expect.any(String)));
});


test('campaign management displays saved donation amounts separately from participants',async()=>{
 bank.getCampaigns.mockResolvedValue({available:true,items:[{id:1,name:'Recorded drive',date:'2026-11-17',participants:10,completedDonations:2,collectedUnits:2,collectedVolumeMl:880,status:'Completed'}]});
 renderBank(<CampaignManagement nav={nav}/>);
 expect(await screen.findByText('2 completed')).toBeInTheDocument();expect(screen.getByText('2 unit(s)')).toBeInTheDocument();expect(screen.getByText('880 mL')).toBeInTheDocument();
});
test('bank reports reject a reversed date range before requesting an export',async()=>{
 renderBank(<BankReports nav={nav}/>);
 await screen.findByRole('option',{name:'Fixture centre'});
 fireEvent.change(screen.getByLabelText('Collection date from'),{target:{value:'2026-11-20'}});fireEvent.change(screen.getByLabelText('Collection date to'),{target:{value:'2026-11-17'}});
 expect(screen.getByRole('button',{name:'Preview report'})).toBeDisabled();expect(screen.getByRole('button',{name:'Download PDF'})).toBeDisabled();expect(bank.getReport).not.toHaveBeenCalled();
});


test('bank inbox marks one notification read and refreshes saved state',async()=>{
 bank.getInbox.mockResolvedValueOnce({available:true,items:[{id:1,title:'Transfer arrived',message:'Blood received',isRead:false}],unreadCount:1}).mockResolvedValue({available:true,items:[{id:1,title:'Transfer arrived',message:'Blood received',isRead:true}],unreadCount:0});
 bank.markInboxRead.mockResolvedValue({message:'Notification marked as read.'});renderBank(<BankNotifications nav={nav}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Mark as read'}));
 expect(await screen.findByText('Notification marked as read.')).toBeInTheDocument();expect(bank.markInboxRead).toHaveBeenCalledWith(1);
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Mark as read'})).not.toBeInTheDocument());
});
test('campaign targeting previews registered donor audience and enforces the recipient limit',async()=>{
 bank.getCampaigns.mockResolvedValue({available:true,items:[{id:7,name:'Campaign audience',status:'Upcoming'}]});
 bank.getNotificationRecipients.mockResolvedValue({available:true,items:[],complete:false,overLimit:true});renderBank(<BankNotifications nav={nav}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Compose notification'}));await screen.findByRole('option',{name:'Campaign audience'});
 fireEvent.change(screen.getByLabelText('Campaign participants'),{target:{value:'7'}});
 await waitFor(()=>expect(bank.getNotificationRecipients).toHaveBeenLastCalledWith(expect.objectContaining({campaignId:'7'})));
 expect(await screen.findByText('More than 500 donors match. Use the filters to choose a smaller group before sending.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Preview message'})).toBeDisabled();
 expect(screen.getByRole('option',{name:'Email - not connected'})).toBeDisabled();
});
test('failed announcement retries reuse the same submission key',async()=>{
 bank.sendNotification.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({id:1,recipientCount:1});renderBank(<BankNotifications nav={nav}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Compose notification'}));fireEvent.change(screen.getByLabelText('Notification title'),{target:{value:'Retry title'}});fireEvent.change(screen.getByLabelText('Notification message'),{target:{value:'Retry message'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Preview message'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Preview message'}));fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await screen.findByText('Connection interrupted');fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.sendNotification).toHaveBeenCalledTimes(2));expect(bank.sendNotification.mock.calls[0][1]).toBe(bank.sendNotification.mock.calls[1][1]);
});


test('sent history opens recipient delivery and read details',async()=>{
 bank.getNotifications.mockResolvedValue({available:true,items:[{id:7,title:'Campaign reminder',type:'campaign',channel:'in_app',recipientCount:1,storedCount:1,readCount:1}]});
 bank.getNotificationDetails.mockResolvedValue({items:[{id:7}],item:{id:7,title:'Campaign reminder',type:'campaign',channel:'in_app',message:'Visit your campaign',deliveries:[{id:2,donorName:'Test Donor',bloodGroup:'O+',district:'Colombo',status:'stored',readAt:'2026-11-17 09:00:00'}]}});
 renderBank(<BankNotifications nav={nav}/>);fireEvent.click(screen.getByRole('tab',{name:'Sent history'}));
 fireEvent.click(await screen.findByRole('button',{name:'View delivery details'}));
 expect(await within(screen.getByRole('dialog')).findByText('Test Donor')).toBeInTheDocument();expect(screen.getByRole('dialog')).toHaveTextContent('Read');expect(bank.getNotificationDetails).toHaveBeenCalledWith(7);
});


test('configured email announcements use opted-in audience and queue the email channel',async()=>{
 bank.getNotificationChannels.mockResolvedValue({email:{available:true}});
 bank.getNotificationRecipients.mockResolvedValue({available:true,complete:true,items:[{donorId:1,fullName:'Opted-in Donor',bloodGroup:'O+',district:'Colombo'}]});
 bank.sendNotification.mockResolvedValue({id:8,channel:'email',recipientCount:1});
 renderBank(<BankNotifications nav={nav}/>);fireEvent.click(screen.getByRole('tab',{name:'Compose notification'}));
 await waitFor(()=>expect(screen.getByRole('option',{name:'Email',exact:true})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Send through'),{target:{value:'email'}});
 fireEvent.change(screen.getByLabelText('Notification title'),{target:{value:'Email title'}});fireEvent.change(screen.getByLabelText('Notification message'),{target:{value:'Email message'}});
 await waitFor(()=>expect(bank.getNotificationRecipients).toHaveBeenLastCalledWith(expect.objectContaining({channel:'email'})));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Preview message'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Preview message'}));fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.sendNotification).toHaveBeenCalledWith(expect.objectContaining({channel:'email',donorIds:[1]}),expect.any(String)));
 expect(await screen.findByText('Email announcement queued for 1 donor(s).')).toBeInTheDocument();
});


test('inventory lists current and expiring packets and moves expired ones to the blood expiry section',async()=>{
 const base={...stock,locationId:1,locationName:'Fixture centre',quantity:2,reservedUnits:0,status:'usable',asOfDate:'2026-11-17',level:'Usable'};
 bank.getBatches.mockResolvedValue({available:true,items:[{...base,id:1,reference:'SOON',expiryDate:'2026-11-20'},{...base,id:2,reference:'EXPIRED',expiryDate:'2026-11-16',level:'Expired',availableUnits:0},{...base,id:3,reference:'LATER',expiryDate:'2026-11-25'},{...base,id:4,reference:'DISCARDED',expiryDate:'2026-11-18',status:'discarded',availableUnits:0},{...base,id:5,reference:'DISC-EXP',expiryDate:'2026-11-15',status:'discarded',availableUnits:0,quantity:5}]});
 renderBank(<InventoryManagement nav={nav}/>);
 const soon=(await screen.findByText('SOON')).closest('tr');expect(soon).toHaveClass('bg-amber-50');expect(within(soon).getByText('3 days left')).toBeInTheDocument();
 expect(screen.queryByText('EXPIRED')).not.toBeInTheDocument();expect(screen.queryByText('DISC-EXP')).not.toBeInTheDocument();expect(screen.getByText('LATER').closest('tr')).not.toHaveClass('bg-amber-50');expect(screen.getByText('DISCARDED').closest('tr')).not.toHaveClass('bg-amber-50');
 expect(screen.getByText('1 packet(s), 2 unit(s) expire within 7 days')).toBeInTheDocument();
 expect(screen.getByText('2 expired packet(s), 7 unit(s)')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Open Blood Expiry'}));expect(nav.onNavigate).toHaveBeenCalledWith('bank-expiry');
});

test('blood expiry lists expired packets and saves an audited disposal',async()=>{
 bank.getExpiry.mockResolvedValue({available:true,complete:true,items:[{...stock,id:9,reference:'EXPIRY-1',locationId:1,locationName:'Fixture centre',storageLocation:'Fixture centre',quantity:2,reservedUnits:0,version:3,status:'usable',asOfDate:'2026-11-17',expiryDate:'2026-11-16',level:'Expired',availableUnits:0,expiryStatus:'expired',volumeMl:900,component:'Whole blood'}]});
 bank.updateBatch.mockResolvedValue({id:9});
 renderBank(<BloodExpiry nav={nav}/>);
 expect(await screen.findByText('EXPIRY-1')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Expiry period'),{target:{value:'expiring'}});expect(screen.queryByText('EXPIRY-1')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Expiry period'),{target:{value:'expired'}});expect(screen.getByText('EXPIRY-1')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Update / remove'}));
 fireEvent.change(screen.getByLabelText('Total units'),{target:{value:'0'}});
 fireEvent.change(screen.getByLabelText('Packet status'),{target:{value:'discarded'}});
 fireEvent.change(screen.getByLabelText('Adjustment or disposal reason'),{target:{value:'Expired on the shelf'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm and save'}));
 await waitFor(()=>expect(bank.updateBatch).toHaveBeenCalledWith(9,{quantity:0,volumeMl:900,status:'discarded',reason:'Expired on the shelf',version:3},expect.any(String)));
 expect(await screen.findByText('Changes saved. Refresh the list to see the latest expiry classification.')).toBeInTheDocument();
});

test('inventory sorting combines with blood group filtering without refetching records',async()=>{
 bank.getBatches.mockResolvedValue({available:true,items:[{...stock,id:1,reference:'SORT-SMALL',bloodGroup:'O+',availableUnits:2,quantity:2},{...stock,id:2,reference:'SORT-LARGE',bloodGroup:'O+',availableUnits:10,quantity:10},{...stock,id:3,reference:'SORT-OTHER',bloodGroup:'A+',availableUnits:1,quantity:1}]});
 renderBank(<InventoryManagement nav={nav}/>);await screen.findByText('SORT-SMALL');
 fireEvent.change(screen.getByLabelText('Inventory blood group'),{target:{value:'O+'}});
 fireEvent.change(screen.getByLabelText('Sort inventory'),{target:{value:'high'}});
 const names=screen.getAllByRole('row').slice(1).map(row=>row.textContent);
 expect(names).toHaveLength(2);expect(names[0]).toContain('SORT-LARGE');expect(names[1]).toContain('SORT-SMALL');expect(screen.queryByText('SORT-OTHER')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Inventory blood group')).toHaveValue('O+');expect(bank.getBatches).toHaveBeenCalledTimes(1);
});

test('donor sorting preserves search, blood group filters and selected recipient identities',async()=>{
 bank.getDonors.mockResolvedValue({available:true,items:[{...donor,id:'D-2',donorId:2,fullName:'Zara Match'},{...donor,id:'D-3',donorId:3,fullName:'Adam Match'},{...donor,id:'D-4',donorId:4,fullName:'Other',bloodGroup:'A+'}]});
 renderBank(<DonorManagement nav={nav}/>);await screen.findByText('Zara Match');
 fireEvent.click(screen.getByLabelText('Select donor D-2'));
 fireEvent.change(screen.getByLabelText('Search donors'),{target:{value:'Match'}});
 fireEvent.change(screen.getByLabelText('Donor blood group'),{target:{value:'O+'}});
 fireEvent.change(screen.getByLabelText('Sort donors'),{target:{value:'name'}});
 const rows=screen.getAllByRole('row').slice(1);expect(rows).toHaveLength(2);expect(rows[0]).toHaveTextContent('Adam Match');expect(rows[1]).toHaveTextContent('Zara Match');
 expect(screen.getByLabelText('Select donor D-2')).toBeChecked();expect(bank.getDonors).toHaveBeenCalledTimes(1);
});

test('transfer page shows approved requests before issue and links issued transfers to their request',async()=>{
 bank.getRequests.mockResolvedValue({available:true,items:[{...request,status:'approved'}]});bank.getTransfers.mockResolvedValue({available:true,items:[{id:49,reference:'TR-49',requestId:54,requestReference:'BR-00054',status:'dispatched',destinationKind:'hospital',sourceCentre:'Main Blood Bank',destinationCentre:'OSRO',batchCode:'B-0003',quantity:12}]});
 renderBank(<BloodTransfers nav={nav}/>);expect(await screen.findByText('Approved - not sent yet')).toBeInTheDocument();expect(await screen.findByText('BR-00054')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Open blood request'}));expect(nav.onNavigate).toHaveBeenCalledWith('bank-requests');expect(screen.queryByRole('button',{name:'Send blood'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Confirm arrival'})).not.toBeInTheDocument();
});
