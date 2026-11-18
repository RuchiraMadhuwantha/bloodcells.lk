import * as api from './api';
import {apiGet,apiPost,apiPut,apiDownload} from './apiClient';
const resource = (response, key) => {
  if (!Array.isArray(response?.[key])) throw new Error('The server did not return ' + key + ' records.');
  const items = response[key];
  const complete = response.hasMore !== true &&
    (!response.pagination || Number(response.pagination.total) === items.length) &&
    (response.total == null || Number(response.total) === items.length);
  return { available: true, items, complete, fetchedAt: new Date().toISOString() };
};
export const getStock = async () => resource(await api.listInventory(), 'inventory');
export const getRequests = async () => resource(await api.listAllRequests(), 'requests');
export const getAppointments = async () => resource(await api.listAllAppointments(), 'appointments');
export const getDonationCentres = async () => resource(await api.listActiveHospitals(), 'hospitals');
export const getDonors = async () => resource(await api.listDonors(), 'donors');
export const getDonorDetails = api.getDonor;
export const adjustStock = api.adjustInventory;
export const updateThresholds = api.updateInventoryThresholds;
export const changeRequest = api.changeRequestStatus;
export const changeAppointment = api.changeAppointmentStatus;
const bankRead = async path => {
  try { const response=await apiGet('/bank'+path);if(!Array.isArray(response?.items))throw new Error('The server did not return bank records.');return response; }
  catch(e) {if(e.status===503)return {available:false,items:[],complete:false,reason:e.message};throw e;}
};
export const getBatches=()=>bankRead('/inventory');
export const getCentres=()=>bankRead('/centres');
export const getCentreDirectory=()=>bankRead('/centres?directory=true');
export const getHistory=()=>bankRead('/inventory/history');
export const getExpiry=()=>bankRead('/expiry');
export const getRegionalStock=()=>bankRead('/regional-stock');
export const getTransfers=()=>bankRead('/transfers');
export const getNotifications=()=>bankRead('/notifications');
export const getInbox=async(filters={})=>{
 const query=new URLSearchParams(filters).toString();const response=await apiGet('/notifications'+(query?'?'+query:''));
 return {...response,...resource(response,'notifications')};
};
export const markInboxRead=id=>apiPut('/notifications/'+id+'/read',{});
export const markAllInboxRead=()=>apiPut('/notifications/read-all',{});
export const getNotificationDetails=async id=>{const response=await apiGet('/bank/notifications/'+id);return {...response,items:response.item?[response.item]:[]};};
export const getNotificationChannels=()=>apiGet('/bank/notification-channels');
export const verifyEmailConnection=()=>apiPost('/bank/email/verify',{});
export const retryNotificationEmail=(id,key)=>apiPut('/bank/notifications/'+id+'/retry-email',{}, {idempotencyKey:key});
export const getNotificationRecipients=async({mode='filters',bloodGroup,district,campaignId,channel,donorIds=[]})=>{
 if(mode==='selected'&&!donorIds.length)return {available:true,items:[],complete:true,recipientCount:0};
 if(mode==='selected'&&donorIds.length>500)return {available:true,items:[],complete:false,overLimit:true};
 const query=new URLSearchParams({mode,...(channel?{channel}:{}),...(bloodGroup?{bloodGroup}:{}),...(district?{district}:{}),...(campaignId?{campaignId}:{}),...(mode==='selected'?{donorIds:donorIds.join(',')}:{})});
 return apiGet('/bank/notification-recipients?'+query);
};
const save=async run=>{try{return await run();}catch(e){if(e.body?.errors?.length)e.message=e.body.errors.map(r=>r.message).join(' ');throw e;}};
export const createCentre=(body,key)=>save(()=>apiPost('/bank/centres',body,{idempotencyKey:key}));
export const createBatch=(body,key)=>save(()=>apiPost('/bank/inventory',body,{idempotencyKey:key}));
export const updateBatch=(id,body,key)=>save(()=>apiPut('/bank/inventory/'+id,body,{idempotencyKey:key}));
export const saveCentreThresholds=(id,body,key)=>save(()=>apiPut('/bank/centres/'+id+'/thresholds',body,{idempotencyKey:key}));
export const createTransfer=(body,key)=>save(()=>apiPost('/bank/transfers',body,{idempotencyKey:key}));
export const transferAction=(id,body,key)=>save(()=>apiPut('/bank/transfers/'+id,body,{idempotencyKey:key}));
export const allocateRequest=(id,body,key)=>save(()=>apiPost('/bank/requests/'+id+'/allocations',body,{idempotencyKey:key}));
export const sendNotification=(body,key)=>save(()=>apiPost('/bank/notifications',body,{idempotencyKey:key}));
export const setDonorStatus=(id,body,key)=>save(()=>apiPut('/bank/donors/'+id+'/status',body,{idempotencyKey:key}));
export const getParticipants=id=>apiGet('/bank/campaigns/'+id+'/participants');
export const saveCampaign=(body,id)=>save(()=>id?apiPut('/campaigns/'+id,body):apiPost('/campaigns',body));
const reportQuery=f=>new URLSearchParams({type:f.type,...(f.start?{start:f.start}:{}),...(f.end?{end:f.end}:{}),...(f.group?{bloodGroup:f.group}:{}),...(f.district?{district:f.district}:{}),...(f.centreId?{centreId:f.centreId}:{})});
export const getReport=async f=>(await apiGet('/bank/reports?'+reportQuery(f))).report;
export const downloadReport=async(f,format)=>{
  const q=reportQuery(f);q.set('format',format);const blob=await apiDownload('/bank/reports?'+q);
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='blood-bank-report.'+format;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export const getProfile=async()=>{const response=await apiGet('/bank/profile');return {...response,items:response.profile?[response.profile]:[]};};
export const saveProfile=body=>apiPut('/bank/profile',body);
// Campaigns are stored by the blood bank backend. The blood bank sees every
// status; donors only see published campaigns. Creation/editing stays in the
// backend API (POST/PUT /campaigns) — the management screen remains a preview UI.
export const getCampaigns = async () => ({
  ...(await resource({ campaigns: (await api.listCampaigns()).campaigns || [] }, 'campaigns')),
});

export const rescheduleAppointment=(id,body,key)=>save(()=>apiPut('/bank/appointments/'+id+'/reschedule',body,{idempotencyKey:key}));

export const getEventHistory=(kind,id)=>bankRead('/'+kind+'/'+id+'/history');
export const getCoordination=async()=>{try{const response=await apiGet('/bank/coordination');return {available:true,items:[response]};}catch(e){if(e.status===503)return {available:false,items:[],reason:e.message};throw e;}};
