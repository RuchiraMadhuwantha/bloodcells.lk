import React,{useCallback,useRef,useState} from 'react';
import {Send,Users,RefreshCw} from 'lucide-react';
import {Button,SectionCard,Table,Badge} from '../UIComponents';
import {useBankResource,ResourceState,Field,Dialog,Details,ErrorPanel,inputClass,BLOOD_GROUPS} from './BankUI';
import {DISTRICTS} from '../../data/districts';
import * as service from '../../services/bankService';
const categories=[['general','General announcement'],['campaign','Campaign announcement'],['emergency','Emergency announcement'],['appointment_reminder','Appointment reminder']];
export const BankNotificationComposer=({form,setForm,selectedIds,onSent})=>{
  const campaigns=useBankResource(service.getCampaigns);
  const signature=selectedIds.join(',');
  const audienceKey=JSON.stringify([form.mode,form.group,form.district,form.campaignId,signature]);
  const load=useCallback(()=>service.getNotificationRecipients({mode:form.mode,bloodGroup:form.group,district:form.district,campaignId:form.campaignId,donorIds:signature?signature.split(',').map(Number):[]}).then(result=>({...result,audienceKey})),[form.mode,form.group,form.district,form.campaignId,signature,audienceKey]);
  const audience=useBankResource(load);
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),retry=useRef(null);
  const set=(key,value)=>setForm(f=>({...f,[key]:value}));
  const recipients=audience.data?.items||[];
  const ready=audience.data?.audienceKey===audienceKey&&!audience.loading&&!audience.error&&audience.data?.available!==false&&audience.data?.complete!==false&&!audience.data?.overLimit&&recipients.length>0&&recipients.length<=500;
  const confirm=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    const payload={title:preview.title,type:preview.type,channel:'in_app',message:preview.message,donorIds:preview.donorIds,...(preview.campaignId?{campaignId:Number(preview.campaignId)}:{})};
    const body=JSON.stringify(payload);
    if(retry.current?.body!==body)retry.current={body,key:window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};
    try{const result=await service.sendNotification(payload,retry.current.key);if(!result?.id)throw new Error('The server did not confirm this announcement. Retry the same message.');onSent(result);}
    catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
  };
  return <div className="grid lg:grid-cols-3 gap-5">
    <SectionCard title="Compose Notification" className="lg:col-span-2">
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!ready)return;setError('');setPreview({...form,title:form.title.trim(),message:form.message.trim(),donorIds:recipients.map(d=>d.donorId)});}}>
        <Field label="Notification title"><input required maxLength={150} className={inputClass} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Give your announcement a clear title"/></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Notification category"><select className={inputClass} value={form.type} onChange={e=>set('type',e.target.value)}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Message channel"><select className={inputClass} value="in_app" onChange={()=>{}}><option value="in_app">In-app inbox</option><option disabled value="email">Email - not connected</option><option disabled value="sms">SMS - not connected</option></select></Field>
        </div>
        <Field label="Notification message"><textarea required maxLength={1000} rows={5} className={inputClass} value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Write the announcement donors will see"/></Field>
        <p className="text-xs text-gray-500 text-right">{form.message.length}/1000 characters</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Recipient selection"><select className={inputClass} value={form.mode} onChange={e=>set('mode',e.target.value)}><option value="filters">Filtered registered donors</option><option value="selected">Previously selected donors ({selectedIds.length})</option></select></Field>
          <Field label="Campaign participation"><select className={inputClass} disabled={campaigns.loading||!!campaigns.error} value={form.campaignId} onChange={e=>set('campaignId',e.target.value)}><option value="">All donors / no campaign filter</option>{(campaigns.data?.items||[]).filter(c=>['Upcoming','Active','Completed'].includes(c.status)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Recipient blood group"><select className={inputClass} value={form.group} onChange={e=>set('group',e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="Recipient district"><select className={inputClass} value={form.district} onChange={e=>set('district',e.target.value)}><option value="">All districts</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></Field>
        </div>
        {campaigns.error&&<ErrorPanel message={campaigns.error} onRetry={campaigns.refresh}/>}
        <p className="text-xs text-gray-500">Only active donor accounts receive announcements. Email and SMS require a connected delivery provider.</p>
        <Button type="submit" icon={Send} disabled={!ready||!form.title.trim()||!form.message.trim()}>Preview message</Button>
      </form>
    </SectionCard>
    <SectionCard title="Recipients" action={<Button icon={RefreshCw} disabled={audience.loading} onClick={audience.refresh}>Refresh recipients</Button>}>
      {audience.data?.overLimit?<p role="alert" className="text-sm text-amber-700">More than 500 donors match. Narrow the audience before sending.</p>:<ResourceState resource={audience} emptyTitle="No active donors match these filters">
        <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-red-600"/><p className="font-semibold">{recipients.length} active donor(s)</p></div>
        <div className="space-y-3">{recipients.slice(0,8).map(d=><div key={d.donorId} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2"><div><p className="text-sm font-medium">{d.fullName}</p><p className="text-xs text-gray-500">{d.district||'District not recorded'}</p></div><Badge color="red">{d.bloodGroup}</Badge></div>)}</div>
        {recipients.length>8&&<p className="mt-3 text-xs text-gray-500">Review all {recipients.length} recipients in the message preview.</p>}
      </ResourceState>}
    </SectionCard>
    {preview&&<Dialog title="Unsent message preview" busy={busy} onClose={()=>setPreview(null)}>
      <Details entries={[[ 'Title',preview.title],['Channel','In-app inbox'],['Recipients',preview.donorIds.length],['Message',preview.message]]}/>
      <details className="my-4"><summary className="cursor-pointer text-sm font-medium">Review recipient list</summary><div className="max-h-56 overflow-y-auto mt-3"><Table columns={['Donor','Blood group','District']}>{recipients.filter(d=>preview.donorIds.includes(d.donorId)).map(d=><tr key={d.donorId}><td className="p-2 text-sm">{d.fullName}</td><td className="p-2 text-sm">{d.bloodGroup}</td><td className="p-2 text-sm">{d.district}</td></tr>)}</Table></div></details>
      {error&&<ErrorPanel message={error}/>}
      <div className="flex justify-end gap-2 mt-4"><Button disabled={busy} variant="ghost" onClick={()=>setPreview(null)}>Back to editing</Button><Button icon={Send} disabled={busy} onClick={confirm}>{busy?'Sending...':'Confirm and save'}</Button></div>
    </Dialog>}
  </div>;
};
