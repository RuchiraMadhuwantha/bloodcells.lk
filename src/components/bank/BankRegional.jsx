import React, { useState, useCallback } from 'react';
import { Button, Badge, Table, SectionCard } from '../UIComponents';
import * as service from '../../services/bankService';
import {SavedForm,EventHistory} from './BankForms';
import { BankLayout, useBankResource, ResourceState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass, BLOOD_GROUPS, formatDate } from './BankUI';

export const BloodExpiry = ({ nav }) => {
  const resource = useBankResource(service.getExpiry);
  const [group, setGroup] = useState('');
  const [period, setPeriod] = useState('');
  const [selected, setSelected] = useState(null);
  return <BankLayout nav={nav} title="Blood Expiry" subtitle="Batch-based expiry monitoring">
    <SectionCard title="Expiring and Expired Blood">
      <Filters><Field label="Expiry blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Expiry period"><select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}><option value="">All recorded expiry periods</option><option value="expired">Expired records</option><option value="expiring">Backend expiring classification</option></select></Field><Field label="Expiry order"><select className={inputClass} disabled><option>Nearest expiry first (source unavailable)</option></select></Field></Filters>
      <ResourceState resource={resource} emptyTitle="No expiry records returned"><Table columns={['Batch', 'Group', 'Collected', 'Expiry', 'Location', 'Quantity', 'Status', 'Details']}>
        {(resource.data?.items || []).filter((r) => (!group || r.bloodGroup === group) && (!period || r.expiryStatus === period)).sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate))).map((r) => <tr key={r.id}><td className="p-3">{r.reference}</td><td className="p-3">{r.bloodGroup}</td><td className="p-3">{formatDate(r.collectionDate)}</td><td className="p-3">{formatDate(r.expiryDate)}</td><td className="p-3">{r.storageLocation}</td><td className="p-3">{r.quantity}</td><td className="p-3"><Badge color="amber">{r.expiryStatus}</Badge></td><td className="p-3"><Button variant="ghost" onClick={() => setSelected(r)}>Details</Button></td></tr>)}
      </Table></ResourceState>
      <Button variant="outline" onClick={()=>nav.onNavigate('bank-inventory')}>Review batch disposal in inventory</Button>
    </SectionCard>
    {selected && <Dialog title="Expiry details" onClose={() => setSelected(null)}><Details entries={[[ 'Batch', selected.reference ], ['Blood group', selected.bloodGroup], ['Collection date', formatDate(selected.collectionDate)], ['Expiry date', formatDate(selected.expiryDate)], ['Location', selected.storageLocation], ['Quantity', selected.quantity], ['Backend expiry classification', selected.expiryStatus]]} /><Button disabled className={`mt-4 ${disabledClass}`}>Disposal unavailable</Button></Dialog>}
  </BankLayout>;
};

export const RegionalCoordination=({nav})=>{
 const resource=useBankResource(service.getCoordination);const data=resource.data?.items?.[0];
 return <BankLayout nav={nav} title="Regional Coordination" subtitle="Recorded stock, demand and transfers">
  <Notice>Stock is scoped to assigned centres. Hospital demand is the existing bank review queue; district does not imply an allocation to a blood centre.</Notice>
  <ResourceState resource={resource} emptyTitle="No coordination records"><>
   <SectionCard title="Coordination Summary"><Details entries={[[ 'Usable unreserved units',data?.stats?.usableUnits],['Pending assigned transfers',data?.stats?.pendingTransfers],['Centre/group shortages',data?.shortages?.length]]}/></SectionCard>
   <SectionCard title="Regional Stock Comparison" className="mt-6"><Table columns={['Centre','District','Group','Usable units','Status']}>{(data?.regional||[]).map(r=><tr key={r.id}>{[r.centreName,r.district,r.bloodGroup,r.availableUnits,r.level].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
   <SectionCard title="Open Hospital Requests by District" className="mt-6" action={<Button onClick={()=>nav.onNavigate('bank-requests')}>Review requests</Button>}><Table columns={['Hospital','District','Group','Requested units','Urgency','Status']}>{(data?.openRequests||[]).map(r=><tr key={r.id}>{[r.hospitalName,r.district,r.bloodGroup,r.quantity,r.urgency,r.status].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
   <SectionCard title="Regional Transfers" className="mt-6" action={<Button onClick={()=>nav.onNavigate('bank-transfers')}>Transfer management</Button>}><Table columns={['Transfer','Source','Destination','Quantity','Status']}>{(data?.transfers||[]).map(r=><tr key={r.id}>{[r.reference,r.sourceCentre,r.destinationCentre,r.quantity,r.status].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</Table></SectionCard>
  </></ResourceState>
 </BankLayout>;
};

export const validateTransfer = (form) => {
  if (!form.source || !form.destination) return 'Choose real source and destination centres.';
  if (form.source === form.destination) return 'Source and destination must differ.';
  if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) <= 0) return 'Quantity must be a positive whole number.';
  return null;
};
const TransferHistory=({id})=>{const load=useCallback(()=>service.getEventHistory('transfers',id),[id]);return <EventHistory load={load}/>;};
export const BloodTransfers = ({nav}) => {
 const resource=useBankResource(service.getTransfers),batches=useBankResource(service.getBatches),directory=useBankResource(service.getCentreDirectory);
 const [editor,setEditor]=useState(null),[message,setMessage]=useState(null),[historyId,setHistoryId]=useState(null);
 const refresh=()=>{setEditor(null);setMessage('Transfer operation saved.');resource.refresh();batches.refresh();};
 return <BankLayout nav={nav} title="Blood Transfers" subtitle="Traceable regional batch transfers">
  <Notice>Approval reserves source stock. Dispatch deducts it into transit. Only assigned destination staff may confirm receipt. Receiving checks determine usable or quarantined status; expired receipts remain quarantined.</Notice>
  {message&&<p role="status">{message}</p>}
  <SectionCard title="Recorded Transfers" action={<Button disabled={!resource.data?.available} onClick={()=>setEditor({kind:'create'})}>Request transfer</Button>}>
   <ResourceState resource={resource} emptyTitle="No recorded transfers"><Table columns={['Reference','Source','Destination','Batch / Group','Quantity','Volume (mL)','Status','Actions']}>{(resource.data?.items||[]).map(r=><tr key={r.id}><td className="p-3">{r.reference}</td><td className="p-3">{r.sourceCentre}</td><td className="p-3">{r.destinationCentre}</td><td className="p-3">{r.batchReference} / {r.bloodGroup}</td><td className="p-3">{r.quantity}</td><td className="p-3">{r.volumeMl??'Not recorded'}</td><td className="p-3">{r.status}</td><td className="p-3"><Button variant="ghost" onClick={()=>setHistoryId(r.id)}>History</Button>{(r.status==='dispatched'&&r.destinationKind==='hospital'?[]:({requested:['approve','reject','cancel'],approved:['dispatch','cancel'],dispatched:['receive']}[r.status]||[])).map(action=><Button key={action} variant="outline" onClick={()=>setEditor({kind:action,item:r})}>{action}</Button>)}</td></tr>)}</Table></ResourceState>
  </SectionCard>
  {historyId&&<Dialog title="Transfer history" onClose={()=>setHistoryId(null)}><TransferHistory id={historyId}/></Dialog>}
  {editor&&<Dialog title={editor.kind==='create'?'Request batch transfer':'Confirm transfer '+editor.kind} onClose={()=>setEditor(null)}><SavedForm fields={editor.kind==='create'?[{key:'batchId',label:'Source batch',type:'number',options:(batches.data?.items||[]).filter(b=>b.availableUnits>0).map(b=>({value:b.id,label:b.locationName+' / '+b.reference+' / '+b.bloodGroup+' / '+b.availableUnits+' available'}))},{key:'destinationId',label:'Destination centre',type:'number',options:(directory.data?.items||[]).map(c=>({value:c.id,label:c.name+(c.kind==='hospital'?' (Hospital)':' (Blood Bank)')}))},{key:'quantity',label:'Transfer quantity',type:'number',min:1,max:100000},{key:'volumeMl',label:'Transfer volume (mL, optional)',type:'number',min:0.01,step:0.01,required:false},{key:'reason',label:'Transfer reason'}]:[{key:'note',label:'Decision or receiving checks'},...(editor.kind==='receive'?[{key:'receiptStatus',label:'Receiving decision',options:[{value:'quarantined',label:'Quarantine pending checks'},{value:'accepted',label:'Receiving checks accepted'}]}]:[])]} onSave={(data,key)=>editor.kind==='create'?service.createTransfer(data,key):service.transferAction(editor.item.id,{action:editor.kind,note:data.note,...(editor.kind==='receive'?{accepted:data.receiptStatus==='accepted'}:{})},key)} onSaved={refresh}/></Dialog>}
 </BankLayout>;
};
