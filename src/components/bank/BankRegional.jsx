import {batchLabel} from '../batchLabel';
import {displayStatus,STOCK_STATUS_OPTIONS} from '../userLanguage';
import React, { useEffect, useState, useCallback } from 'react';
import { Button, Badge, Table, SectionCard } from '../UIComponents';
import * as service from '../../services/bankService';
import {SavedForm,EventHistory} from './BankForms';
import { BankLayout, useBankResource, ResourceState, Notice, Field, Filters, Dialog, Details, EmptyState, inputClass, BLOOD_GROUPS, formatDate } from './BankUI';
import {expiryInfo} from '../inventoryExpiry';
import {ExpiryBadge} from '../ExpiryReminder';

export const BloodExpiry = ({ nav }) => {
  const resource = useBankResource(service.getExpiry);
  const [group, setGroup] = useState('');
  const [period, setPeriod] = useState('');
  const [detail, setDetail] = useState(null);
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState(null);
  const items = (resource.data?.items || []).filter((r) => (!group || r.bloodGroup === group) && (!period || r.expiryStatus === period)).sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)));
  const refresh = resource.refresh;
  return <BankLayout nav={nav} title="Blood Expiry" subtitle="Expired and expiring packets that need attention">
    {message && <p role="status" className="p-3 text-green-800">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><p className="text-sm text-gray-600">Expired and expiring packets are managed here. Usable stock lives in Inventory Management.</p><Button variant="outline" onClick={() => nav.onNavigate('bank-inventory')}>Open Blood Inventory</Button></div>
    <SectionCard title="Expiring and Expired Blood">
      <Filters><Field label="Expiry blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Expiry period"><select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="">All recorded expiry periods</option><option value="expired">Expired records</option><option value="expiring">Backend expiring classification</option></select></Field><Field label="Expiry order"><select className={inputClass} disabled><option>Nearest expiry first</option></select></Field></Filters>
      <ResourceState resource={resource} emptyTitle="No expiring or expired blood packets recorded">{!items.length ? <EmptyState title="No packets match your filters" /> : <Table columns={['Packet', 'Centre', 'Group', 'Available / Total units', 'Volume (mL)', 'Reserved', 'Expiry', 'Status', 'Actions']}>
        {items.map((r) => <tr key={r.id} className={expiryInfo(r).rowClass}><td className="p-3">{batchLabel(r)}<span className="block text-xs text-gray-500">{r.component}</span></td><td className="p-3">{r.storageLocation || r.locationName}</td><td className="p-3">{r.bloodGroup}</td><td className="p-3">{r.availableUnits} / {r.quantity}</td><td className="p-3">{r.volumeMl ?? 'Not recorded'}</td><td className="p-3">{r.reservedUnits}</td><td className="p-3">{formatDate(r.expiryDate)}<div className="mt-1"><ExpiryBadge info={expiryInfo(r)} /></div></td><td className="p-3">{displayStatus(r.level)}</td><td className="p-3"><Button variant="ghost" onClick={() => setDetail(r)}>Details</Button><Button variant="outline" disabled={r.status === 'discarded'} onClick={() => setEditor(r)}>Update / remove</Button></td></tr>)}
      </Table>}</ResourceState>
    </SectionCard>
    {detail && <Dialog title="Expiry details" onClose={() => setDetail(null)}><div className="mb-3"><ExpiryBadge info={expiryInfo(detail)} /></div><Details entries={[['Packet', batchLabel(detail) ], ['Blood group', detail.bloodGroup], ['Component', detail.component || 'Not recorded'], ['Collection date', formatDate(detail.collectionDate)], ['Expiry date', formatDate(detail.expiryDate)], ['Location', detail.storageLocation || detail.locationName], ['Available / Total units', (detail.availableUnits ?? 0) + ' / ' + detail.quantity], ['Reserved units', detail.reservedUnits], ['Packet status', displayStatus(detail.level)], ['Backend expiry classification', detail.expiryStatus]]} /><Button className="mt-4" disabled={detail.status === 'discarded'} onClick={() => { setEditor(detail); setDetail(null); }}>Update / remove</Button></Dialog>}
    {editor && <Dialog title="Update or remove an expired packet" onClose={() => setEditor(null)}><SavedForm initial={{ quantity: editor.quantity, volumeMl: editor.volumeMl ?? '', status: editor.status }} fields={[{ key: 'quantity', label: 'Total units', type: 'number', min: 0, max: 100000 }, { key: 'volumeMl', label: 'Recorded volume (mL)', type: 'number', min: 0, step: 0.01, required: false }, { key: 'status', label: 'Packet status', options: STOCK_STATUS_OPTIONS }, { key: 'reason', label: 'Adjustment or disposal reason' }]} onSave={(data, key) => service.updateBatch(editor.id, { ...data, version: editor.version }, key)} onSaved={() => { setEditor(null); setMessage('Changes saved. Refresh the list to see the latest expiry classification.'); refresh(); }} /></Dialog>}
  </BankLayout>;
};

export const RegionalCoordination=({nav})=>{
 const resource=useBankResource(service.getCoordination);const data=resource.data?.items?.[0];
 return <BankLayout nav={nav} title="Regional Coordination" subtitle="Recorded stock, demand and transfers">
  <Notice>Stock shows the centres you manage. Hospital requests appear in the blood bank review list. A district does not reserve stock at a centre.</Notice>
  <ResourceState resource={resource} emptyTitle="No coordination records"><>
   <SectionCard title="Coordination Summary"><Details entries={[[ 'Available units',data?.stats?.usableUnits],['Pending assigned transfers',data?.stats?.pendingTransfers],['Blood groups running low by centre',data?.shortages?.length]]}/></SectionCard>
   <SectionCard title="Regional Stock Comparison" className="mt-6"><Table columns={['Centre','District','Group','Usable units','Status']}>{(data?.regional||[]).map(r=><tr key={r.id}>{[r.centreName,r.district,r.bloodGroup,r.availableUnits,r.level].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
   <SectionCard title="Open Hospital Requests by District" className="mt-6" action={<Button onClick={()=>nav.onNavigate('bank-requests')}>Review requests</Button>}><Table columns={['Hospital','District','Group','Requested units','Urgency','Status']}>{(data?.openRequests||[]).map(r=><tr key={r.id}>{[r.hospitalName,r.district,r.bloodGroup,r.quantity,r.urgency,r.status].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
   <SectionCard title="Regional Transfers" className="mt-6" action={<Button onClick={()=>nav.onNavigate('bank-transfers')}>Transfer management</Button>}><Table columns={['Transfer','Source','Destination','Quantity','Status']}>{(data?.transfers||[]).map(r=><tr key={r.id}>{[r.reference,r.sourceCentre,r.destinationCentre,r.quantity,r.status].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
  </></ResourceState>
 </BankLayout>;
};

export const validateTransfer = (form) => {
  if (!form.source || !form.destination) return 'Choose the sending and receiving centres.';
  if (form.source === form.destination) return 'Choose different sending and receiving centres.';
  if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) <= 0) return 'Enter a whole number of units greater than zero.';
  return null;
};
const TransferHistory=({id})=>{const load=useCallback(()=>service.getEventHistory('transfers',id),[id]);return <EventHistory load={load}/>;};
export const BloodTransfers = ({nav}) => {
 const requests=useBankResource(service.getRequests);
 const resource=useBankResource(service.getTransfers),batches=useBankResource(service.getBatches),directory=useBankResource(service.getCentreDirectory);
 const [editor,setEditor]=useState(null),[message,setMessage]=useState(null),[historyId,setHistoryId]=useState(null);
 const refreshTransfers=resource.refresh,refreshRequests=requests.refresh;
 useEffect(()=>{if(editor||historyId)return;const update=()=>{refreshTransfers();refreshRequests();};window.addEventListener('focus',update);const timer=window.setInterval(()=>{if(!document.hidden)update();},30000);return()=>{window.removeEventListener('focus',update);window.clearInterval(timer);};},[refreshTransfers,refreshRequests,editor,historyId]);
 const approved=(requests.data?.items||[]).filter(r=>r.status==='approved');

 const refresh=()=>{setEditor(null);setMessage('Transfer operation saved.');resource.refresh();batches.refresh();};
 return <BankLayout nav={nav} title="Blood Transfers" subtitle="Track blood sent between hospitals and blood banks">
  <Notice>Approving a blood request does not send blood. Issue blood creates transfers from the packets set aside for that request. Hospitals confirm arrival and check the blood before adding it to stock. Manual transfers use Approve, then Send blood. Expired blood cannot be used.</Notice>
  {message&&<p role="status">{message}</p>}
  {approved.length>0&&<SectionCard title="Approved requests waiting to be issued" className="mb-6"><Table columns={['Request','Hospital','Blood group','Units','Status','Actions']}>{approved.map(r=><tr key={r.id}><td className="p-3">{r.reference}</td><td className="p-3">{r.hospitalName}</td><td className="p-3">{r.bloodGroup}</td><td className="p-3">{r.quantity}</td><td className="p-3"><Badge color="blue">Approved - not sent yet</Badge></td><td className="p-3"><Button variant="outline" onClick={()=>nav.onNavigate('bank-requests')}>Open blood request</Button></td></tr>)}</Table></SectionCard>}
  <SectionCard title="Recorded Transfers" action={<Button disabled={!resource.data?.available} onClick={()=>setEditor({kind:'create'})}>Request transfer</Button>}>
   <ResourceState resource={resource} emptyTitle="No recorded transfers"><Table columns={['Reference','Source','Destination','Packet / Group','Quantity','Volume (mL)','Status','Actions']}>{(resource.data?.items||[]).map(r=><tr key={r.id}><td className="p-3">{r.reference}{r.requestReference&&<span className="block text-xs text-gray-500">{r.requestReference}</span>}</td><td className="p-3">{r.sourceCentre}</td><td className="p-3">{r.destinationCentre}</td><td className="p-3">{r.batchCode||r.batchReference} / {r.bloodGroup}</td><td className="p-3">{r.quantity}</td><td className="p-3">{r.volumeMl??'Not recorded'}</td><td className="p-3">{displayStatus(r.status)}</td><td className="p-3"><Button variant="ghost" onClick={()=>setHistoryId(r.id)}>History</Button>{(r.requestId||(r.status==='dispatched'&&r.destinationKind==='hospital')?[]:({requested:['approve','reject','cancel'],approved:['dispatch','cancel'],dispatched:['receive']}[r.status]||[])).map(action=><Button key={action} variant="outline" onClick={()=>setEditor({kind:action,item:r})}>{{approve:'Approve',reject:'Reject',cancel:'Cancel',dispatch:'Send blood',receive:'Confirm arrival'}[action]}</Button>)}</td></tr>)}</Table></ResourceState>
  </SectionCard>
  {historyId&&<Dialog title="Transfer history" onClose={()=>setHistoryId(null)}><TransferHistory id={historyId}/></Dialog>}
  {editor&&<Dialog title={editor.kind==='create'?'Request packet transfer':'Confirm transfer '+editor.kind} onClose={()=>setEditor(null)}><SavedForm fields={editor.kind==='create'?[{key:'batchId',label:'Source packet',type:'number',options:(batches.data?.items||[]).filter(b=>b.availableUnits>0).map(b=>({value:b.id,label:b.locationName+' / '+batchLabel(b)+' / '+b.bloodGroup+' / '+b.availableUnits+' available'}))},{key:'destinationId',label:'Destination centre',type:'number',options:(directory.data?.items||[]).map(c=>({value:c.id,label:c.name+(c.kind==='hospital'?' (Hospital)':' (Blood Bank)')}))},{key:'quantity',label:'Transfer quantity',type:'number',min:1,max:100000},{key:'volumeMl',label:'Transfer volume (mL, optional)',type:'number',min:0.01,step:0.01,required:false},{key:'reason',label:'Transfer reason'}]:[{key:'note',label:'Decision or receiving checks'},...(editor.kind==='receive'?[{key:'receiptStatus',label:'Receiving decision',options:[{value:'quarantined',label:'Keep separate until checks are complete'},{value:'accepted',label:'Checks passed'}]}]:[])]} onSave={(data,key)=>editor.kind==='create'?service.createTransfer(data,key):service.transferAction(editor.item.id,{action:editor.kind,note:data.note,...(editor.kind==='receive'?{accepted:data.receiptStatus==='accepted'}:{})},key)} onSaved={refresh}/></Dialog>}
 </BankLayout>;
};
