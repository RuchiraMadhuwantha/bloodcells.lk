import * as api from './api';
import { apiGet,apiPost,apiPut,ApiError } from './apiClient';
import * as hospital from './hospitalService';
jest.mock('./api');
jest.mock('./apiClient',()=>({apiGet:jest.fn(),apiPost:jest.fn(),apiPut:jest.fn(),apiDownload:jest.fn(),ApiError:class extends Error{constructor(message,status){super(message);this.status=status;}}}));
beforeEach(()=>jest.resetAllMocks());
test('hospital request source remains owned and detects incomplete results',async()=>{
  api.listMyRequests.mockResolvedValue({requests:[{id:1}],counts:{pending:999},pagination:{total:10}});
  expect(await hospital.getRequests()).toEqual({available:true,items:[{id:1}],complete:false});
  expect(api.listAllRequests).not.toHaveBeenCalled();
});
test('owned stock and usage use implemented hospital endpoints',async()=>{
  apiGet.mockResolvedValue({available:true,items:[],complete:true});
  await hospital.getHospitalStock();expect(apiGet).toHaveBeenCalledWith('/hospitals/mine/inventory');
  await hospital.getUsage();expect(apiGet).toHaveBeenCalledWith('/hospitals/mine/blood-usage');
});
test('pending migration is unavailable, while authorization errors are not hidden',async()=>{
  apiGet.mockRejectedValueOnce(new ApiError('Migration pending',503)).mockRejectedValueOnce(new ApiError('Forbidden',403));
  expect(await hospital.getHospitalStock()).toMatchObject({available:false,reason:'Migration pending'});
  await expect(hospital.getUsage()).rejects.toThrow('Forbidden');
});
test('stock and usage writes carry durable retry keys through existing client',async()=>{
  await hospital.saveUsage({quantity:2},'test-key');
  expect(apiPost).toHaveBeenCalledWith('/hospitals/mine/blood-usage',{quantity:2},{idempotencyKey:'test-key'});
  await hospital.saveStock({quantity:3},'other-key',5);
  expect(apiPut).toHaveBeenCalledWith('/hospitals/mine/inventory/5',{quantity:3},{idempotencyKey:'other-key'});
});
test('availability uses verified location batches instead of aggregate stock',async()=>{
  apiGet.mockResolvedValue({available:true,items:[]});await hospital.getNetworkStock();
  expect(apiGet).toHaveBeenCalledWith('/hospitals/mine/availability');
  expect(api.listInventory).not.toHaveBeenCalled();
});
