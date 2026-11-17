import * as api from './api';
import { apiGet,apiPost,apiPut,apiDownload } from './apiClient';
const BASE='/hospitals/mine';
const integration = async (load) => {
  try { return await load(); }
  catch(e) { if(e.status===503) return {available:false,items:[],complete:false,reason:e.message}; throw e; }
};
const submit = async(load) => {
  try { return await load(); } catch(e) {
    if(e.body?.errors?.length) e.message=e.body.errors.map(r=>r.message).join(' ');
    throw e;
  }
};
export const getHospital=async()=>(await api.getMyHospital()).hospital;
export const getRequests=async()=>{
  const response=await api.listMyRequests();
  if(!Array.isArray(response.requests)) throw new Error('The server did not return hospital request records.');
  return {available:true,items:response.requests,complete:response.hasMore!==true && (!response.pagination || Number(response.pagination.total)===response.requests.length)};
};
export const getHospitalStock=()=>integration(()=>apiGet(BASE+'/inventory'));
export const getUsage=()=>integration(()=>apiGet(BASE+'/blood-usage'));
export const getStockChanges=()=>integration(()=>apiGet(BASE+'/inventory/changes'));
export const getTransfers=()=>integration(()=>apiGet(BASE+'/transfers'));
export const getTransferDestinations=()=>integration(()=>apiGet(BASE+'/transfer-destinations'));
export const sendTransfer=(payload,key)=>submit(()=>apiPost(BASE+'/transfers',payload,{idempotencyKey:key}));
export const receiveTransfer=(id,payload,key)=>submit(()=>apiPut(BASE+'/transfers/'+id+'/receive',payload,{idempotencyKey:key}));
export const getDashboard=()=>apiGet(BASE+'/dashboard');
export const getAppointments=async()=>({available:true,items:(await api.listHospitalAppointments()).appointments});
export const getCampaigns=async()=>({available:true,items:(await api.listCampaigns({period:'upcoming'})).campaigns});
export const getNotifications=async()=>({available:true,...(await api.listNotifications())});
export const markNotificationRead=api.markNotificationRead;
export const approveAppointment=id=>apiPut('/appointments/'+id+'/approve',{});
export const rescheduleAppointment=(id,payload)=>apiPut('/appointments/'+id+'/hospital-reschedule',payload);
export const cancelAppointment=id=>apiPut('/appointments/'+id+'/hospital-cancel',{});
export const getAppointmentSlots=(id,date)=>apiGet('/appointments/slots/'+id+'?date='+date);
export const getCollectionCampaigns=date=>apiGet(BASE+'/collection-campaigns'+(date?'?date='+date:''));
export const linkDonationCampaign=(id,campaignId,note)=>apiPut('/appointments/'+id+'/campaign',{campaignId,note});
export const recordCollection=(id,payload)=>apiPut('/appointments/'+id+'/collection',payload);
export const createRequest=payload=>submit(()=>api.createBloodRequest(payload));
export const cancelRequest=api.cancelMyRequest;
export const saveStock=(payload,key,id)=>submit(()=>id?apiPut(BASE+'/inventory/'+id,payload,{idempotencyKey:key}):apiPost(BASE+'/inventory',payload,{idempotencyKey:key}));
export const saveUsage=(payload,key)=>submit(()=>apiPost(BASE+'/blood-usage',payload,{idempotencyKey:key}));
export const updateHospital=payload=>submit(()=>apiPut(BASE+'/profile',payload));
const reportQuery=filters=>new URLSearchParams({type:filters.type,...(filters.start?{start:filters.start}:{}),...(filters.end?{end:filters.end}:{}),...(filters.group?{bloodGroup:filters.group}:{}),...(filters.status?{status:filters.status}:{})});
export const getReport=async filters=>(await apiGet(BASE+'/reports?'+reportQuery(filters))).report;
export const downloadReport=async(filters,format)=>{
  const query=reportQuery(filters);query.set('format',format);
  const blob=await apiDownload(BASE+'/reports?'+query);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='hospital-report.'+format;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
