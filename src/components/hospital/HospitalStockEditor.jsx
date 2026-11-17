import React, { useRef, useState } from 'react';
import { Button } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { Dialog,Field,ErrorPanel,inputClass,disabledClass } from './HospitalUI';
import { BLOOD_GROUPS,todayStr,newSubmissionKey } from './hospitalUtils';
export const HospitalStockEditor=({item,onClose,onSaved})=>{
  const [form,setForm]=useState(item?{volumeMl:item.volumeMl??'',quantity:item.quantity,reservedUnits:item.reservedUnits,status:item.status,version:item.version,reason:''}:{volumeMl:'',reference:'',component:'',bloodGroup:'',quantity:'',reservedUnits:0,collectionDate:todayStr(),expiryDate:'',status:'usable',reason:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(null);
  const lock=useRef(false),attempt=useRef(null);
  const set=(key,value)=>setForm(f=>({...f,[key]:value}));
  const submit=async e=>{
    e.preventDefault();if(lock.current)return;
    lock.current=true;setBusy(true);setError(null);
    const payload={...form,volumeMl:form.volumeMl===''?null:Number(form.volumeMl),quantity:Number(form.quantity),reservedUnits:Number(form.reservedUnits)};
    const signature=JSON.stringify(payload);
    if(attempt.current?.signature!==signature)attempt.current={signature,key:newSubmissionKey()};
    try{await service.saveStock(payload,attempt.current.key,item?.id);onSaved();}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
  };
  return <Dialog title={item?'Update hospital stock':'Add hospital stock receipt'} busy={busy} onClose={onClose}>
    {error&&<ErrorPanel message={error}/>}
    <form aria-label="Hospital stock entry" onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        {!item&&<>
          <Field label="Batch reference"><input required maxLength={100} className={inputClass} value={form.reference} onChange={e=>set('reference',e.target.value)}/></Field>
          <Field label="Blood component"><input required maxLength={100} className={inputClass} value={form.component} onChange={e=>set('component',e.target.value)} placeholder="As recorded by the supplying centre"/></Field>
          <Field label="Batch blood group"><select required className={inputClass} value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}><option value="">Select group</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="Collection date"><input required type="date" max={todayStr()} className={inputClass} value={form.collectionDate} onChange={e=>set('collectionDate',e.target.value)}/></Field>
          <Field label="Verified expiry date"><input required type="date" min={form.collectionDate} className={inputClass} value={form.expiryDate} onChange={e=>set('expiryDate',e.target.value)}/></Field>
        </>}
        <Field label="Recorded quantity"><input required type="number" min="0" max="100000" step="1" className={inputClass} value={form.quantity} onChange={e=>set('quantity',e.target.value)}/></Field>
        <Field label="Recorded volume (mL)"><input type="number" min="0" max="1000000000" step="0.01" required={item?.volumeMl!=null} className={inputClass} value={form.volumeMl} onChange={e=>set('volumeMl',e.target.value)}/></Field>
        <Field label="Reserved quantity"><input required type="number" min="0" max={form.quantity} step="1" className={inputClass} value={form.reservedUnits} onChange={e=>set('reservedUnits',e.target.value)}/></Field>
        <Field label="Batch status"><select className={inputClass} value={form.status} onChange={e=>set('status',e.target.value)}><option value="usable">Usable</option><option value="quarantined">Quarantined</option><option value="discarded">Discarded</option></select></Field>
        <Field label="Stock change reason"><textarea required maxLength={500} className={inputClass} value={form.reason} onChange={e=>set('reason',e.target.value)}/></Field>
      </fieldset>
      <p className="text-xs text-gray-500">Use the actual batch/component expiry supplied by the centre. No shelf life is assumed. All changes are audited.</p>
      <Button type="submit" disabled={busy} className={disabledClass}>{busy?'Saving...':'Save hospital stock'}</Button>
    </form>
  </Dialog>;
};
