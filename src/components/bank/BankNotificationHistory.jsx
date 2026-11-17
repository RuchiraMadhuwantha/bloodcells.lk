import React,{useCallback,useState} from 'react';
import {Eye} from 'lucide-react';
import {Badge,CompactAction,SectionCard,Table} from '../UIComponents';
import {useBankResource,ResourceState,Field,Filters,Dialog,Details,inputClass} from './BankUI';
import {notificationLabel,formatDateTime} from '../donor/donorUtils';
import * as service from '../../services/bankService';
const AnnouncementDetails=({id,onClose})=>{
  const load=useCallback(()=>service.getNotificationDetails(id),[id]);
  const resource=useBankResource(load),item=resource.data?.item;
  return <Dialog title="Announcement details" onClose={onClose}><ResourceState resource={resource} emptyTitle="Announcement unavailable">
    {item&&<><Details entries={[[ 'Title',item.title],['Category',notificationLabel(item.type)],['Channel',item.channel==='in_app'?'In-app inbox':item.channel],['Campaign',item.campaignName||'No campaign filter'],['Created',formatDateTime(item.createdAt)],['Message',item.message]]}/>
      <div className="mt-4"><Table columns={['Donor','Blood group','District','Delivery / Read status']}>{item.deliveries.map(d=><tr key={d.id}><td className="p-3 text-sm">{d.donorName||'Former account'}</td><td className="p-3 text-sm">{d.bloodGroup}</td><td className="p-3 text-sm">{d.district}</td><td className="p-3 text-sm">{d.status==='stored'?d.readAt?'Read':'Stored in inbox':'Not sent'}{d.readAt&&<span className="block text-xs text-gray-500">{formatDateTime(d.readAt)}</span>}</td></tr>)}</Table></div>
    </>}
  </ResourceState></Dialog>;
};
export const BankNotificationHistory=({resource})=>{
  const [query,setQuery]=useState(''),[type,setType]=useState(''),[detail,setDetail]=useState(null);
  const records=resource.data?.items||[];
  const items=records.filter(r=>(!type||r.type===type)&&[r.title,r.message].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())));
  return <SectionCard title="Notification History">
    <Filters><Field label="Search sent announcements"><input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title or message"/></Field><Field label="History notification type"><select className={inputClass} value={type} onChange={e=>setType(e.target.value)}><option value="">All categories</option>{[...new Set(records.map(r=>r.type))].map(t=><option key={t} value={t}>{notificationLabel(t)}</option>)}</select></Field></Filters>
    <ResourceState resource={resource} emptyTitle="No sent announcements"><Table columns={['Announcement','Sent','Recipients','Delivery status','Read','Actions']}>
      {items.map(r=><tr key={r.id}><td className="p-3 text-sm"><p className="font-medium">{r.title}</p><p className="text-xs text-gray-500">{notificationLabel(r.type)}</p></td><td className="p-3 text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</td><td className="p-3 text-sm">{r.recipientCount}</td><td className="p-3"><Badge color={r.channel==='in_app'?'green':'amber'}>{r.channel==='in_app'?'Stored in donor inbox':'Not sent - channel unavailable'}</Badge></td><td className="p-3 text-sm">{Number(r.readCount||0)} / {Number(r.storedCount||0)}</td><td className="p-3"><CompactAction icon={Eye} onClick={()=>setDetail(r.id)}>View delivery details</CompactAction></td></tr>)}
    </Table>{!items.length&&<p className="text-sm text-gray-500 py-4">No announcements match these filters.</p>}</ResourceState>
    <p className="text-xs text-gray-500 mt-4">Showing the latest 1,000 announcements sent by your account. Stored and read are separate statuses.</p>
    {detail&&<AnnouncementDetails id={detail} onClose={()=>setDetail(null)}/>}
  </SectionCard>;
};
