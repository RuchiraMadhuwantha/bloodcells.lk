import React,{useCallback,useRef,useState} from 'react';
import {Eye} from 'lucide-react';
import {Badge,Button,CompactAction,SectionCard,Table} from '../UIComponents';
import {useBankResource,ResourceState,Field,Filters,Dialog,Details,ErrorPanel,inputClass} from './BankUI';
import {notificationLabel,formatDateTime} from '../donor/donorUtils';
import * as service from '../../services/bankService';
const emailErrors={CONSENT_REVOKED:'Email notifications are disabled or the donor account is inactive',EMAIL_CHANGED:'Recipient email address changed',EAUTH:'Could not sign in to the sending email account',EENVELOPE:'Mail server rejected the recipient',RECIPIENT_REJECTED:'Mail server rejected the recipient',INVALID_EMAIL:'Invalid recipient email',CONNECTION_FAILED:'Email connection failed'};
const AnnouncementDetails=({id,onClose,onRetried})=>{
  const [error,setError]=useState(''),[retrying,setRetrying]=useState(false);const retryKey=useRef(null);
  const load=useCallback(()=>service.getNotificationDetails(id),[id]);
  const resource=useBankResource(load),item=resource.data?.item;
  return <Dialog title="Announcement details" onClose={onClose}><ResourceState resource={resource} emptyTitle="Announcement unavailable">
    {item&&<><Details entries={[[ 'Title',item.title],['Category',notificationLabel(item.type)],['Channel',item.channel==='in_app'?'In-app inbox':item.channel],['Campaign',item.campaignName||'No campaign filter'],['Created',formatDateTime(item.createdAt)],['Message',item.message]]}/>
      {item.channel==='email'&&item.deliveries.some(d=>d.status==='failed'&&d.errorCode!=='DELIVERY_UNCERTAIN'&&d.attempts<3)&&<Button className="mt-3" disabled={retrying} onClick={async()=>{if(retrying)return;setRetrying(true);setError('');retryKey.current=retryKey.current||window.crypto?.randomUUID?.()||Date.now().toString(36)+'-email-retry';try{await service.retryNotificationEmail(id,retryKey.current);resource.refresh();onRetried();}catch(e){setError(e.message);}finally{setRetrying(false);}}}>{retrying?'Queuing...':'Retry failed emails'}</Button>}{error&&<ErrorPanel message={error}/>}
      {item.channel==='email'&&<p className="text-xs text-gray-500 mt-3">The email service accepting a message does not mean it reached the inbox. If delivery is unclear, check with your email provider before sending again to avoid duplicates.</p>}
      <div className="mt-4"><Table columns={['Donor','Blood group','District','Delivery / Read status']}>{item.deliveries.map(d=><tr key={d.id}><td className="p-3 text-sm">{d.donorName||'Former account'}</td><td className="p-3 text-sm">{d.bloodGroup}</td><td className="p-3 text-sm">{d.district}</td><td className="p-3 text-sm">{d.status==='stored'?d.readAt?'Read':'Stored in inbox':d.status==='delivered'?'Accepted by email service':d.status==='queued'?'Queued':d.status==='sending'?'Sending':d.errorCode==='DELIVERY_UNCERTAIN'?'Delivery not confirmed - check before resending':d.status==='failed'?'Failed':'Not sent'}{emailErrors[d.errorCode]&&<span className="block text-xs text-amber-700">{emailErrors[d.errorCode]}</span>}{d.acceptedAt&&<span className="block text-xs text-gray-500">{formatDateTime(d.acceptedAt)}</span>}{d.readAt&&<span className="block text-xs text-gray-500">{formatDateTime(d.readAt)}</span>}</td></tr>)}</Table></div>
    </>}
  </ResourceState></Dialog>;
};
export const BankNotificationHistory=({resource})=>{
  const [query,setQuery]=useState(''),[type,setType]=useState(''),[detail,setDetail]=useState(null);
  const records=resource.data?.items||[];
  const items=records.filter(r=>(!type||r.type===type)&&[r.title,r.message].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())));
  return <SectionCard title="Notification History">
    <Filters><Field label="Search sent announcements"><input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title or message"/></Field><Field label="History notification type"><select className={inputClass} value={type} onChange={e=>setType(e.target.value)}><option value="">All categories</option>{[...new Set(records.map(r=>r.type))].map(t=><option key={t} value={t}>{notificationLabel(t)}</option>)}</select></Field></Filters>
    <ResourceState resource={resource} emptyTitle="No sent announcements"><Table columns={['Announcement','Sent','Recipients','Delivery status','Progress / Read','Actions']}>
      {items.map(r=><tr key={r.id}><td className="p-3 text-sm"><p className="font-medium">{r.title}</p><p className="text-xs text-gray-500">{notificationLabel(r.type)}</p></td><td className="p-3 text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</td><td className="p-3 text-sm">{r.recipientCount}</td><td className="p-3"><Badge color={r.channel==='in_app'?'green':'amber'}>{r.channel==='in_app'?'Stored in donor inbox':r.channel==='email'?'Email progress':'Not sent - sending option unavailable'}</Badge></td><td className="p-3 text-sm">{r.channel==='email'?<><span className="block text-xs">{Number(r.queuedCount||0)} queued / {Number(r.sendingCount||0)} sending</span><span className="block text-xs">{Number(r.deliveredCount||0)} accepted / {Number(r.failedCount||0)} failed</span></>:<>{Number(r.readCount||0)} / {Number(r.storedCount||0)}</>}</td><td className="p-3"><CompactAction icon={Eye} onClick={()=>setDetail(r.id)}>View delivery details</CompactAction></td></tr>)}
    </Table>{!items.length&&<p className="text-sm text-gray-500 py-4">No announcements match these filters.</p>}</ResourceState>
    <p className="text-xs text-gray-500 mt-4">Showing the latest 1,000 announcements sent by your account. Stored and read are separate statuses.</p>
    {detail&&<AnnouncementDetails id={detail} onRetried={resource.refresh} onClose={()=>setDetail(null)}/>}
  </SectionCard>;
};
