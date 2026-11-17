import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Bell,Check,CheckCheck,Eye,Inbox,MailCheck,RefreshCw,Send} from 'lucide-react';
import {Button,Badge,CompactAction,SectionCard,StatCard} from '../UIComponents';
import * as service from '../../services/bankService';
import {NOTIFICATION_TYPES,notificationLabel,formatDateTime} from '../donor/donorUtils';
import {BankLayout,useBankResource,useBankSelection,ResourceState,Field,Filters,Dialog,Details,ErrorPanel,inputClass} from './BankUI';
import {BankNotificationComposer} from './BankNotificationComposer';
import {BankNotificationHistory} from './BankNotificationHistory';
const destinations={appointment:['bank-appointments','View appointments'],transfer:['bank-transfers','View transfers'],campaign:['bank-campaigns','View campaigns'],blood_request:['bank-requests','View requests']};
export const BankNotifications=({nav})=>{
  const selection=useBankSelection();
  const [tab,setTab]=useState('inbox'),[page,setPage]=useState(0),[category,setCategory]=useState(''),[unread,setUnread]=useState(false),[query,setQuery]=useState('');
  const loadInbox=useCallback(()=>service.getInbox({limit:50,offset:page*50,...(category?{type:category}:{}),...(unread?{unread:true}:{})}),[page,category,unread]);
  const inbox=useBankResource(loadInbox),history=useBankResource(service.getNotifications);
  const [form,setForm]=useState({title:'',type:'general',message:'',group:'',district:'',campaignId:'',mode:selection?.recipients?.length?'selected':'filters'});
  const [detail,setDetail]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const lock=useRef(false);
  const refreshInbox=inbox.refresh,refreshHistory=history.refresh;
  const refresh=useCallback(()=>{refreshInbox();refreshHistory();},[refreshInbox,refreshHistory]);
  useEffect(()=>{if(tab==='compose'||detail)return;window.addEventListener('focus',refresh);const timer=window.setInterval(()=>{if(!document.hidden)refresh();},30000);return()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};},[refresh,tab,detail]);
  const mark=async id=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{
    const result=id?await service.markInboxRead(id):await service.markAllInboxRead();setMessage(result.message||'Read status saved.');setPage(0);refreshInbox();
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}};
  const all=inbox.data?.items||[],items=all.filter(n=>[n.title,n.message].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())));
  const sent=history.data?.items||[];
  const unreadCount=inbox.data?.unreadCount??all.filter(n=>!n.isRead).length;
  const value=(resource,n)=>resource.loading?'Loading...':resource.error||resource.data?.available===false?'Unavailable':n;
  return <BankLayout nav={nav} title="Notification Management" subtitle="Manage your inbox and donor announcements">
    <div className="flex justify-end gap-2 mb-4"><Button icon={RefreshCw} onClick={refresh} disabled={inbox.loading||history.loading}>Refresh notifications</Button></div>
    {message&&<p role="status" className="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-3 mb-4">{message}</p>}
    {error&&<ErrorPanel message={error}/>}
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <StatCard icon={Bell} label="Unread inbox" value={value(inbox,unreadCount)}/>
      <StatCard icon={Send} label="Recent announcements" value={value(history,sent.length)} accent="blue"/>
      <StatCard icon={MailCheck} label="Stored in donor inboxes" value={value(history,sent.reduce((sum,r)=>sum+Number(r.storedCount||0),0))} accent="green"/>
    </div>
    <div role="tablist" aria-label="Notification sections" className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-5">
      {[[ 'inbox','Inbox',Inbox],['compose','Compose notification',Send],['history','Sent history',MailCheck]].map(([key,label,Icon])=><button key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>{setTab(key);setError('');}} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab===key?'bg-red-50 text-red-700 ring-1 ring-red-200':'text-gray-600 hover:bg-gray-100'}`}><Icon className="w-4 h-4"/>{label}</button>)}
    </div>
    {tab==='inbox'&&<SectionCard title="Incoming Notifications" action={<Button icon={CheckCheck} disabled={busy||inbox.loading||!!inbox.error||!unreadCount} onClick={()=>mark()}>Mark all as read</Button>}>
      <Filters><Field label="Inbox read status"><select className={inputClass} value={unread?'unread':'all'} onChange={e=>{setUnread(e.target.value==='unread');setPage(0);}}><option value="all">All notifications</option><option value="unread">Unread only</option></select></Field><Field label="Inbox category"><select className={inputClass} value={category} onChange={e=>{setCategory(e.target.value);setPage(0);}}><option value="">All categories</option>{NOTIFICATION_TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field><Field label="Search this inbox page"><input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title or message"/></Field></Filters>
      <ResourceState resource={inbox} emptyTitle="Your inbox is clear">
        <div className="space-y-3">{items.map(n=>{const target=destinations[n.relatedType];return <article key={n.id} className={`rounded-lg border p-4 ${n.isRead?'border-gray-200 bg-white':'border-red-100 bg-red-50/50'}`}>
          <div className="flex justify-between gap-3"><p className="font-semibold text-sm">{n.title}</p>{!n.isRead&&<Badge color="red">Unread</Badge>}</div>
          <p className="text-xs text-gray-500 mt-1">{notificationLabel(n.type)} - {formatDateTime(n.createdAt)}</p><p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap line-clamp-2">{n.message}</p>
          <div className="flex flex-wrap gap-1.5 mt-3"><CompactAction icon={Eye} onClick={()=>setDetail(n)}>View details</CompactAction>{target&&<CompactAction tone="schedule" icon={Eye} onClick={()=>nav.onNavigate(target[0])}>{target[1]}</CompactAction>}{!n.isRead&&<CompactAction tone="success" icon={Check} disabled={busy} onClick={()=>mark(n.id)}>Mark as read</CompactAction>}</div>
        </article>;})}</div>{!items.length&&<p className="text-sm text-gray-500 py-4">No notifications match your search on this page.</p>}
      </ResourceState>
      <div className="flex justify-between items-center gap-3 mt-4"><p className="text-xs text-gray-500">Page {page+1}</p><div className="flex gap-2"><Button disabled={inbox.loading||page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button disabled={inbox.loading||!inbox.data?.hasMore} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div>
    </SectionCard>}
    {tab==='compose'&&<BankNotificationComposer form={form} setForm={setForm} selectedIds={selection?.recipients||[]} onSent={result=>{setMessage(`Announcement saved to ${result.recipientCount??'the selected'} donor inbox(es).`);setForm(f=>({...f,title:'',message:''}));setTab('history');refreshHistory();}}/>}
    {tab==='history'&&<BankNotificationHistory resource={history}/>}
    {detail&&<Dialog title="Notification details" onClose={()=>setDetail(null)}><Details entries={[[ 'Title',detail.title],['Category',notificationLabel(detail.type)],['Created',formatDateTime(detail.createdAt)],['Status',detail.isRead?'Read':'Unread'],['Message',detail.message]]}/></Dialog>}
  </BankLayout>;
};
