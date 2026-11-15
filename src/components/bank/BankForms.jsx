import React,{useRef,useState} from 'react';
import {Button} from '../UIComponents';
import {Field,ErrorPanel,inputClass,useBankResource,ResourceState} from './BankUI';
export const SavedForm=({fields,initial={},onSave,onSaved})=>{
 const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(null);
 const lock=useRef(false),retry=useRef(null);
 const submit=async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError(null);
  const payload={...values};fields.forEach(f=>{if(f.type==='number'&&payload[f.key]!==undefined)payload[f.key]=Number(payload[f.key]);});
  const signature=JSON.stringify(payload);if(retry.current?.signature!==signature)retry.current={signature,key:window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};
  try{const result=await onSave(payload,retry.current.key);if(!result||(!result.id&&!result.profile&&!result.campaign))throw new Error('The server did not confirm the saved record. Refresh before retrying.');onSaved(result);}catch(err){setError(err.message);}finally{lock.current=false;setBusy(false);}
 };
 return <form className="space-y-4" onSubmit={submit}>{error&&<ErrorPanel message={error}/>} {fields.map(f=><Field key={f.key} label={f.label}>{f.options?<select required={f.required!==false} disabled={busy} className={inputClass} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}><option value="">Choose</option>{f.options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>:<input required={f.required!==false} type={f.type||'text'} min={f.min} max={f.max} maxLength={f.maxLength||500} disabled={busy} className={inputClass} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}/>}</Field>)}<Button type="submit" disabled={busy}>{busy?'Saving...':'Confirm and save'}</Button></form>;
};

export const EventHistory=({load})=>{
 const resource=useBankResource(load);
 return <ResourceState resource={resource} emptyTitle="No processing history"><div className="space-y-2">{(resource.data?.items||[]).map(r=><div className="border rounded p-3" key={r.id}><p>{r.event} - {r.createdAt}</p><p>{typeof r.details==='string'?r.details:JSON.stringify(r.details)}</p></div>)}<p className="text-sm">Latest 1000 recorded events.</p></div></ResourceState>;
};
