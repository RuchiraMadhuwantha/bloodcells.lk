import {batchLabel} from '../batchLabel';
import {displayStatus,STOCK_STATUS_OPTIONS,changeSummary,changeLabel} from '../userLanguage';
import React,{useEffect,useState} from 'react';
import {sortRecords} from '../recordSorting';
import {SortControl} from '../SortControl';
import {Button,Table,SectionCard,StatCard} from '../UIComponents';
import {Droplets} from 'lucide-react';
import * as service from '../../services/bankService';
import {BankLayout,useBankResource,ResourceState,Filters,Field,Dialog,Details,inputClass,BLOOD_GROUPS} from './BankUI';
import {expiryInfo,expirySummary,isExpiredBatch} from '../inventoryExpiry';
import {ExpiryBadge,ExpiryReminder} from '../ExpiryReminder';
import {SavedForm} from './BankForms';
export const InventoryManagement=({nav})=>{
 const batches=useBankResource(service.getBatches),centres=useBankResource(service.getCentres),history=useBankResource(service.getHistory);
 const [sort,setSort]=useState('expiry');
 const [group,setGroup]=useState(''),[centre,setCentre]=useState(''),[editor,setEditor]=useState(null),[detail,setDetail]=useState(null),[showHistory,setShowHistory]=useState(false),[message,setMessage]=useState(null);
 const refreshBatches=batches.refresh;
 useEffect(()=>{if(editor||detail||showHistory)return;const refresh=()=>{refreshBatches();};window.addEventListener('focus',refresh);const timer=window.setInterval(()=>{if(!document.hidden)refresh();},60000);return()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};},[refreshBatches,editor,detail,showHistory]);
 const items=sortRecords((batches.data?.items||[]).filter(r=>(!group||r.bloodGroup===group)&&(!centre||String(r.locationId)===centre)),'batches',sort);
 const expired=items.filter(r=>isExpiredBatch(r));
 const visible=items.filter(r=>!isExpiredBatch(r));
 const visibleResource={...batches,data:batches.data?{...batches.data,items:visible}:batches.data};
 const expiry=expirySummary(visible);
 const enabled=batches.data?.available&&centres.data?.available;
 const refresh=result=>{setEditor(null);setMessage(result?.replayed?'These changes were already saved.':'Changes saved.');batches.refresh();centres.refresh();history.refresh();};
 const options=(centres.data?.items||[]).map(c=>({value:c.id,label:c.name}));
 const receiptFields=[{key:'locationId',label:'Storage centre',type:'number',options},{key:'reference',label:'Packet reference',maxLength:100},{key:'bloodGroup',label:'Blood group',options:BLOOD_GROUPS},{key:'component',label:'Blood component',maxLength:100},{key:'quantity',label:'Total units',type:'number',min:0,max:100000},{key:'volumeMl',label:'Recorded volume (mL)',type:'number',min:0,step:0.01,required:false},{key:'collectionDate',label:'Collection date',type:'date'},{key:'expiryDate',label:'Expiry date on the blood packet',type:'date'},{key:'status',label:'Packet status',options:STOCK_STATUS_OPTIONS},{key:'reason',label:'Reason for adding stock'}];
 return <BankLayout nav={nav} title="Inventory Management" subtitle="Blood packets at the centres you manage">
  {message&&<p role="status" className="p-3 text-green-800">{message}</p>}
  <div className="grid sm:grid-cols-2 gap-4 mb-6"><StatCard icon={Droplets} label="Available units" value={batches.data?.available?visible.reduce((n,r)=>n+r.availableUnits,0):'Unavailable'}/></div>
  <SectionCard title="Blood packets" action={<div className="flex gap-2"><Button onClick={()=>{batches.refresh();}}>Refresh</Button><Button variant="outline" onClick={()=>nav.onNavigate('bank-expiry')}>Blood Expiry</Button><Button disabled={!enabled} onClick={()=>setEditor({kind:'centre'})}>Add centre</Button><Button disabled={!enabled||!options.length} onClick={()=>setEditor({kind:'receipt'})}>Add received blood</Button></div>}>
   <Filters><Field label="Inventory blood group"><select className={inputClass} value={group} onChange={e=>setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field><Field label="Storage location"><select className={inputClass} value={centre} onChange={e=>setCentre(e.target.value)}><option value="">Centres you manage</option>{options.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></Field><SortControl label="Sort inventory" profile="batches" value={sort} onChange={setSort} className={inputClass}/></Filters>
   <ExpiryReminder summary={expiry}/>{expired.length>0&&<div role="status" className="flex flex-wrap items-center gap-2 mb-4 text-sm"><ExpiryBadge info={{kind:'expired',label:expired.length+' expired packet(s), '+expired.reduce((n,r)=>n+Number(r.quantity||0),0)+' unit(s)'}}/><span className="self-center text-xs font-medium text-gray-700">Expired packets are managed in Blood Expiry</span><Button variant="outline" onClick={()=>nav.onNavigate('bank-expiry')}>Open Blood Expiry</Button></div>}
   <ResourceState resource={visibleResource} emptyTitle="No current or expiring blood packets recorded"><Table columns={['Packet','Centre','Group','Available / Total units','Volume (mL)','Reserved','Expiry','Status','Actions']}>{visible.map(r=><tr key={r.id} className={expiryInfo(r).rowClass}><td className="p-3">{batchLabel(r)}</td><td className="p-3">{r.locationName}</td><td className="p-3">{r.bloodGroup}</td><td className="p-3">{r.availableUnits} / {r.quantity}</td><td className="p-3">{r.volumeMl??'Not recorded'}</td><td className="p-3">{r.reservedUnits}</td><td className="p-3">{r.expiryDate}<div className="mt-1"><ExpiryBadge info={expiryInfo(r)}/></div></td><td className="p-3">{displayStatus(r.level)}</td><td className="p-3"><Button variant="ghost" onClick={()=>setDetail(r)}>Details</Button><Button variant="outline" disabled={r.status==='discarded'} onClick={()=>setEditor({kind:'update',item:r})}>Update / remove</Button></td></tr>)}</Table></ResourceState>
   <Button variant="outline" onClick={()=>setShowHistory(true)}>Stock changes</Button>
  </SectionCard>
  {detail&&<Dialog title="Packet details" onClose={()=>setDetail(null)}><div className="mb-3"><ExpiryBadge info={expiryInfo(detail)}/></div><Details entries={Object.entries(detail).filter(([k])=>['batchCode','reference','component','volumeMl','quantity','reservedUnits','availableUnits','collectionDate','expiryDate','status','locationName'].includes(k)).map(([key,value])=>[key==='reference'?'Packet reference':key==='batchCode'?'Packet ID':key,value])}/></Dialog>}
  {showHistory&&<Dialog title="Stock change history" onClose={()=>setShowHistory(false)}><ResourceState resource={history} emptyTitle="No stock history"><Table columns={['Action','Packet','Recorded at','Details']}>{(history.data?.items||[]).map(r=><tr key={r.id}><td className="p-3">{changeLabel(r.event)}</td><td className="p-3">{r.batchId}</td><td className="p-3">{r.createdAt}</td><td className="p-3">{changeSummary(r.details)}</td></tr>)}</Table></ResourceState></Dialog>}
  {editor&&<Dialog title={editor.kind==='centre'?'Add blood centre':editor.kind==='receipt'?'Receive verified packet':'Update or remove a packet'} onClose={()=>setEditor(null)}>
   <SavedForm initial={editor.kind==='update'?{quantity:editor.item.quantity,volumeMl:editor.item.volumeMl??'',status:editor.item.status}:editor.kind==='receipt'?{status:'quarantined'}:{}} fields={editor.kind==='centre'?[{key:'name',label:'Centre name',maxLength:150},{key:'district',label:'District',maxLength:100}]:editor.kind==='receipt'?receiptFields:[{key:'quantity',label:'Total units',type:'number',min:0,max:100000},{key:'volumeMl',label:'Recorded volume (mL)',type:'number',min:0,step:0.01,required:false},{key:'status',label:'Packet status',options:STOCK_STATUS_OPTIONS},{key:'reason',label:'Adjustment or disposal reason'}]} onSave={(data,key)=>editor.kind==='centre'?service.createCentre(data,key):editor.kind==='receipt'?service.createBatch(data,key):service.updateBatch(editor.item.id,{...data,version:editor.item.version},key)} onSaved={refresh}/>
  </Dialog>}
 </BankLayout>;
};
