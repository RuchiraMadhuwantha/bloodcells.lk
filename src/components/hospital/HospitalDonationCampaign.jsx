import React,{useCallback,useRef,useState} from 'react';
import {Button} from '../UIComponents';
import {Dialog,Field,ErrorPanel,useHospitalResource,inputClass} from './HospitalUI';
import * as service from '../../services/hospitalService';
export const CollectionCampaignField=({appointment,value,onChange,disabled})=>{
  const load=useCallback(()=>service.getCollectionCampaigns(appointment.appointmentDate),[appointment.appointmentDate]);
  const resource=useHospitalResource(load);
  const items=resource.data?.items||[];
  return <>
    <Field label="Donation campaign (optional)"><select className={inputClass} disabled={disabled||resource.loading||!!resource.error} value={value} onChange={e=>onChange(e.target.value)}>
      <option value="">{resource.loading?'Loading campaigns...':'No campaign / routine donation'}</option>
      {appointment.campaignId&&!items.some(c=>c.id===appointment.campaignId)&&<option value={appointment.campaignId}>{appointment.campaignName||'Current campaign'}</option>}
      {items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select></Field>
    {resource.error&&<ErrorPanel message={resource.error} onRetry={resource.refresh}/>}
  </>;
};
export const HospitalDonationCampaign=({appointment,onClose,onSaved})=>{
  const [campaign,setCampaign]=useState(appointment.campaignId?String(appointment.campaignId):''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  return <Dialog title={'Donation campaign - '+appointment.reference} busy={busy} onClose={onClose}>
    {error&&<ErrorPanel message={error}/>}
    <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
      await service.linkDonationCampaign(appointment.id,campaign?Number(campaign):null,note);onSaved();
    }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}}}>
      <CollectionCampaignField appointment={appointment} value={campaign} onChange={setCampaign} disabled={busy}/>
      <Field label="Campaign link reason"><textarea required maxLength={500} disabled={busy} className={inputClass} value={note} onChange={e=>setNote(e.target.value)}/></Field>
      <Button type="submit" disabled={busy}>{busy?'Saving...':'Save campaign link'}</Button>
    </form>
  </Dialog>;
};
