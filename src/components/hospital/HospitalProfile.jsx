import React,{useState} from 'react';
import { Button,SectionCard } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout,useHospital,Details,Notice,Field,inputClass,ErrorPanel,disabledClass } from './HospitalUI';
import { formatDate } from './hospitalUtils';
export const HospitalProfile=({nav})=>{
  const {hospital:h,refresh}=useHospital();
  const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null);
  const fields={hospitalName:'Hospital name',hospitalType:'Hospital type',district:'District',address:'Address',contactNumber:'Official phone',contactPersonName:'Contact person',contactPersonDesignation:'Designation',contactPersonPhone:'Contact phone',contactPersonEmail:'Contact email'};
  return <HospitalLayout nav={nav} title="Hospital Profile" subtitle="Verified registration and contact details">
    <SectionCard title={h.hospitalName}>
      {error&&<ErrorPanel message={error}/>}
      {form?<form aria-label="Hospital profile" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError(null);try{await service.updateHospital(form);setForm(null);refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}}>
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">{Object.entries(fields).map(([key,label])=><Field key={key} label={label}><input required={key==='hospitalName'} type={key==='contactPersonEmail'?'email':'text'} className={inputClass} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></Field>)}</fieldset>
        <div className="flex gap-3 mt-5"><Button type="submit" disabled={busy} className={disabledClass}>{busy?'Saving...':'Save profile'}</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>setForm(null)}>Cancel</Button></div>
      </form>:<>
        <Details entries={[[ 'Hospital code',h.hospitalCode ],['Account status',h.status],...Object.entries(fields).map(([key,label])=>[label,h[key]]),['Registration date',formatDate(h.registrationDate)],['Approval date',formatDate(h.approvalDate)]]}/>
        <div className="mt-5"><Notice>Account role, approval status and hospital code cannot be changed through this profile form.</Notice><Button onClick={()=>setForm(Object.fromEntries(Object.keys(fields).map(key=>[key,h[key]||''])))}>Edit profile</Button></div>
      </>}
    </SectionCard>
  </HospitalLayout>;
};
