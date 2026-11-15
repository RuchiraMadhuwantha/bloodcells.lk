import * as api from './api';
import * as bank from './bankService';
import {apiGet,apiPost,apiPut} from './apiClient';
jest.mock('./api');
jest.mock('./apiClient');
beforeEach(() => jest.resetAllMocks());
test('bank resources use authorized existing APIs and flag incomplete report data', async () => {
  api.listInventory.mockResolvedValue({ inventory: [{ bloodGroup: 'O+', availableUnits: 5 }] });
  expect(await bank.getStock()).toMatchObject({ available: true, complete: true, items: [{ bloodGroup: 'O+', availableUnits: 5 }] });
  api.listAllRequests.mockResolvedValue({ requests: [{ id: 1 }], pagination: { total: 20 } });
  expect((await bank.getRequests()).complete).toBe(false);
  api.listAllAppointments.mockResolvedValue({ appointments: [] });
  expect((await bank.getAppointments()).items).toEqual([]);
});
test('new bank resources call authorized real endpoints and preserve migration states',async()=>{
 apiGet.mockResolvedValue({available:true,complete:true,items:[]});
 for(const [load,path]of [[bank.getExpiry,'/bank/expiry'],[bank.getRegionalStock,'/bank/regional-stock'],[bank.getTransfers,'/bank/transfers'],[bank.getNotifications,'/bank/notifications']]){
  expect(await load()).toMatchObject({available:true,items:[]});expect(apiGet).toHaveBeenLastCalledWith(path);
 }
 apiGet.mockRejectedValue(Object.assign(new Error('Migration required'),{status:503}));
 expect(await bank.getBatches()).toMatchObject({available:false,complete:false,items:[]});
});
test('stock and transfer writes carry durable submission keys',async()=>{
 await bank.createBatch({quantity:5},'fixture-key');expect(apiPost).toHaveBeenCalledWith('/bank/inventory',{quantity:5},{idempotencyKey:'fixture-key'});
 await bank.transferAction(3,{action:'receive',accepted:false,note:'Quarantine'},'fixture-receipt');expect(apiPut).toHaveBeenCalledWith('/bank/transfers/3',{action:'receive',accepted:false,note:'Quarantine'},{idempotencyKey:'fixture-receipt'});
});

test('campaigns use the real backend list', async () => {
  api.listCampaigns.mockResolvedValue({ campaigns: [{ id: 1, name: 'Community Drive', status: 'Upcoming' }] });
  expect(await bank.getCampaigns()).toMatchObject({ available: true, complete: true, items: [{ id: 1, name: 'Community Drive', status: 'Upcoming' }] });
});
test('malformed source responses remain errors', async () => {
  api.listDonors.mockResolvedValue({});
  await expect(bank.getDonors()).rejects.toThrow('did not return donors');
});
