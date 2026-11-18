import {transferDestination} from './transferDestination';
import {batchLabel} from '../batchLabel';
import {displayStatus} from '../userLanguage';
import React, { useCallback, useEffect, useState } from 'react';
import { Droplets, Eye, RefreshCw, Truck } from 'lucide-react';
import { Badge, Button, CompactAction, SectionCard, StatCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, Loading, ErrorPanel, inputClass } from './HospitalUI';
import { SavedForm } from '../bank/BankForms';
import { BLOOD_GROUPS, formatDate, titleCase } from './hospitalUtils';
import { formatDateTime } from '../donor/donorUtils';

const bloodDetails = b => [
  ['Packet ID',batchLabel(b)],['Packet reference',b.batchReference || b.reference],['Blood group',b.bloodGroup],['Blood component',b.component],['Recorded volume (mL)',b.volumeMl??'Not recorded'],
  ['Collection date',formatDate(b.collectionDate)],['Expiry date',formatDate(b.expiryDate)],
];
export const HospitalTransfers = ({ nav }) => {
  const stock=useHospitalResource(service.getHospitalStock);
  const transfers=useHospitalResource(service.getTransfers);
  const destinations=useHospitalResource(service.getTransferDestinations);
  const [selected,setSelected]=useState(null),[receiving,setReceiving]=useState(null),[detail,setDetail]=useState(null),[group,setGroup]=useState(''),[query,setQuery]=useState(''),[message,setMessage]=useState('');
  const transferOpen=selected!==null||receiving!==null;
  const refreshStock=stock.refresh,refreshTransfers=transfers.refresh,refreshDestinations=destinations.refresh;
  const refresh=useCallback(()=>{refreshStock();refreshTransfers();refreshDestinations();},[refreshStock,refreshTransfers,refreshDestinations]);
  useEffect(()=>{
    if(transferOpen)return;
    window.addEventListener('focus',refresh);
    const timer=window.setInterval(()=>{if(!document.hidden)refresh();},30000);
    return()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};
  },[refresh,transferOpen]);
  const allBatches=stock.data?.items || [];
  const eligibleBatches=allBatches.filter(b=>b.availableUnits>0);
  const selectedBatch=selected?.id ? allBatches.find(b=>b.id===selected.id) || (stock.loading?selected:null) : null;
  const batches=allBatches.filter(b=>(!group || b.bloodGroup===group)&&[b.batchCode,b.reference,b.component,b.bloodGroup].some(v=>String(v || '').toLowerCase().includes(query.trim().toLowerCase())));
  const history=transfers.data?.items || [];
  const incoming=history.filter(t=>t.direction==='incoming');
  const outgoing=history.filter(t=>t.direction!=='incoming');
  const centres=destinations.data?.items || [];
  const destination=transferDestination(centres);
  const ready=destinations.data?.available&&!destinations.loading&&!destinations.error&&!!destination;
  return <HospitalLayout nav={nav} title="Blood Transfers" subtitle="Receive blood from banks and manage outgoing transfers">
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <StatCard icon={Droplets} label="Available units in view" value={stock.loading?'Loading...':stock.error||stock.data?.available===false?'Unavailable':batches.reduce((n,b)=>n+b.availableUnits,0)} />
      <StatCard icon={Truck} label="Transfers in transit" value={transfers.loading?'Loading...':transfers.error||transfers.data?.available===false?'Unavailable':outgoing.filter(t=>t.status==='dispatched').length} accent="amber" />
      <StatCard icon={Truck} label="Blood received (units)" value={transfers.loading?'Loading...':transfers.error||transfers.data?.available===false?'Unavailable':incoming.filter(t=>t.status==='received').reduce((n,t)=>n+t.quantity,0)} accent="green" />
    </div>
    <SectionCard title="Received Blood" className="mb-6">
      <ResourceState resource={{...transfers,data:transfers.data?{...transfers.data,items:incoming}:null}} emptyTitle="No incoming blood transfers recorded"><Table columns={['Transfer','Sending blood bank','Packet / Blood group','Units','Volume (mL)','Collection / Expiry','Status','Actions']}>
        {incoming.map(t=><tr key={t.id}>
          <td className="p-3 text-sm">{t.reference}{t.requestReference&&<span className="block text-xs text-gray-500">{t.requestReference}</span>}</td><td className="p-3 text-sm">{t.sourceCentre}</td>
          <td className="p-3 text-sm">{t.batchCode||t.batchReference}<span className="block text-xs text-gray-500">{t.bloodGroup} / {t.component}</span></td><td className="p-3 text-sm">{t.quantity}</td><td className="p-3 text-sm">{t.volumeMl??'Not recorded'}</td>
          <td className="p-3 text-xs whitespace-nowrap">{formatDate(t.collectionDate)}<span className="block text-gray-500">{formatDate(t.expiryDate)}</span></td>
          <td className="p-3"><Badge color={t.status==='received'?'green':'blue'}>{t.status==='dispatched'?'Awaiting receipt':titleCase(t.status)}</Badge>{t.receiptStatus&&<span className="block text-xs text-gray-500 mt-1">{titleCase(t.receiptStatus)}</span>}</td>
          <td className="p-3"><div className="flex flex-wrap gap-1.5"><CompactAction icon={Eye} onClick={()=>setDetail(t)}>View details</CompactAction>{t.status==='dispatched'&&<CompactAction tone="success" icon={Truck} onClick={()=>setReceiving(t)} aria-label={'Confirm receipt '+t.reference}>Confirm receipt</CompactAction>}</div></td>
        </tr>)}
      </Table></ResourceState>
    </SectionCard>
    <SectionCard title="Hospital blood packets" className="mb-6" action={<div className="flex flex-wrap justify-end gap-1.5"><Button icon={Truck} onClick={()=>setSelected({})}>Transfer to Blood Bank</Button><Button onClick={()=>nav.onNavigate('hospital-inventory')}>Add stock packet</Button><Button icon={RefreshCw} onClick={refresh}>Refresh transfers</Button></div>}>
      <Filters>
        <Field label="Search blood packets"><input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Packet, blood group or component" /></Field>
        <Field label="Transfer blood group"><select className={inputClass} value={group} onChange={e=>setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
      </Filters>
      <ResourceState resource={stock} emptyTitle="No hospital blood packets recorded">
        {!batches.length?<EmptyState title="No blood packets match your filters" />:<Table columns={['Packet / Component','Blood group','Physical / Reserved','Volume (mL)','Available units','Collection / Expiry','Status','Actions']}>
          {batches.map(b=><tr key={b.id}>
            <td className="p-3 text-sm">{batchLabel(b)}<span className="block text-gray-500">{b.component}</span></td><td className="p-3 text-sm">{b.bloodGroup}</td>
            <td className="p-3 text-sm">{b.quantity} / {b.reservedUnits}</td><td className="p-3 text-sm">{b.volumeMl??'Not recorded'}</td><td className="p-3 text-sm font-medium">{b.availableUnits}</td>
            <td className="p-3 text-xs whitespace-nowrap">{formatDate(b.collectionDate)}<span className="block text-gray-500">{formatDate(b.expiryDate)}</span></td>
            <td className="p-3"><Badge color={b.availableUnits>0?'green':'gray'}>{b.level || titleCase(b.status)}</Badge></td>
            <td className="p-3"><CompactAction tone="schedule" icon={Truck} disabled={!ready||b.availableUnits<1} onClick={()=>setSelected(b)} aria-label={'Transfer '+batchLabel(b)}>Transfer to Bank</CompactAction></td>
          </tr>)}
        </Table>}
      </ResourceState>
    </SectionCard>
    <SectionCard title="Sent Blood / Transfer history">
      <ResourceState resource={{...transfers,data:transfers.data?{...transfers.data,items:outgoing}:null}} emptyTitle="No outgoing blood transfers recorded"><Table columns={['Reference / Sent','Blood bank','Packet / Blood group','Units','Volume (mL)','Status','Details']}>
        {outgoing.map(t=><tr key={t.id}>
          <td className="p-3 text-sm">{t.reference}<span className="block text-xs text-gray-500">{formatDateTime(t.createdAt)}</span></td><td className="p-3 text-sm">{t.destinationCentre}</td>
          <td className="p-3 text-sm">{t.batchCode||t.batchReference}<span className="block text-xs text-gray-500">{t.bloodGroup} · {t.component}</span></td><td className="p-3 text-sm">{t.quantity}</td><td className="p-3 text-sm">{t.volumeMl??'Not recorded'}</td>
          <td className="p-3"><Badge color={t.status==='received'?'green':'blue'}>{t.status==='dispatched'?'In transit':titleCase(t.status)}</Badge></td>
          <td className="p-3"><CompactAction icon={Eye} onClick={()=>setDetail(t)}>View details</CompactAction></td>
        </tr>)}
      </Table></ResourceState>
    </SectionCard>
    {selected && <Dialog title="Transfer to Blood Bank" onClose={()=>setSelected(null)}>
      {stock.loading&&!selectedBatch?<Loading label="Loading hospital blood packets..." />:stock.error?<ErrorPanel message={stock.error} onRetry={stock.refresh} />:!eligibleBatches.length&&!selectedBatch?<EmptyState title="Add hospital stock before transferring"><p>No blood units are available to transfer. Units that are set aside, waiting for checks or expired cannot be transferred.</p><Button className="mt-3" onClick={()=>nav.onNavigate('hospital-inventory')}>Add stock packet</Button></EmptyState>:<Field label="Blood packet to transfer"><select className={inputClass} value={selectedBatch?.id || ''} onChange={e=>setSelected(eligibleBatches.find(b=>String(b.id)===e.target.value) || {})}><option value="">Select a hospital blood packet</option>{eligibleBatches.map(b=><option key={b.id} value={b.id}>{batchLabel(b)} / {b.bloodGroup} / {b.component} / {b.availableUnits} units available</option>)}</select></Field>}
      {selectedBatch && <div className="mt-4"><Details entries={[...bloodDetails(selectedBatch),['Available units',selectedBatch.availableUnits]]} /></div>}
      {destinations.loading?<Loading label="Loading receiving blood banks..." />:destinations.error?<ErrorPanel message={destinations.error} onRetry={destinations.refresh} />:!ready?<EmptyState title="Blood bank setup needed"><p>Ask blood bank staff to finish setting up the main blood bank before sending blood.</p><Button className="mt-3" icon={RefreshCw} onClick={destinations.refresh}>Refresh blood banks</Button></EmptyState>:selectedBatch&&selectedBatch.availableUnits>0?<>
        <p className="text-sm text-gray-600 my-4">Blood is sent directly to the main blood bank. Sending removes these units from hospital stock while they are on the way. Enter the actual volume; leaving it blank splits recorded packet volume in proportion to units. Unknown volume remains unrecorded. The blood bank confirms receipt.</p>
        <SavedForm key={selectedBatch.id} fields={[{key:'quantity',label:'Units to transfer',type:'number',min:1,max:selectedBatch.availableUnits},{key:'volumeMl',label:'Transferred volume (mL)',type:'number',min:0.01,step:0.01,required:false},{key:'reason',label:'Transfer reason',maxLength:500}]} onSave={(data,key)=>service.sendTransfer({batchId:selectedBatch.id,...data},key)} onSaved={()=>{setSelected(null);setMessage('Blood transfer sent. The blood bank has been notified and will confirm receipt.');refresh();}} />
      </>:eligibleBatches.length>0?<p className="text-sm text-gray-500 mt-4">Choose a blood packet to continue.</p>:null}
    </Dialog>}
    {receiving&&<Dialog title={'Receive blood - '+receiving.reference} onClose={()=>setReceiving(null)}>
      <Details entries={[...bloodDetails(receiving),['Sending blood bank',receiving.sourceCentre],['Incoming units',receiving.quantity]]} />
      <div className="mt-4"><SavedForm fields={[{key:'note',label:'Receiving checks / note',maxLength:500},{key:'receiptStatus',label:'Receiving decision',options:[{value:'quarantined',label:'Keep separate until checks are complete'},{value:'accepted',label:'Checks passed'}]}]} onSave={(data,key)=>service.receiveTransfer(receiving.id,{accepted:data.receiptStatus==='accepted',note:data.note},key)} onSaved={()=>{setReceiving(null);setMessage('Blood receipt confirmed. Hospital inventory and the sending blood bank have been updated.');refresh();}} /></div>
    </Dialog>}
    {detail && <Dialog title={'Blood transfer · '+detail.reference} onClose={()=>setDetail(null)}><Details entries={[...bloodDetails(detail),['Blood request',detail.requestReference||'Not linked'],[detail.direction==='incoming'?'Sending blood bank':'Source hospital',detail.sourceCentre],[detail.direction==='incoming'?'Receiving hospital':'Receiving blood bank',detail.destinationCentre],['Transferred units',detail.quantity],['Status',detail.status==='dispatched'?'In transit':titleCase(detail.status)],['Receiving stock status',displayStatus(detail.receiptStatus) || 'Waiting for arrival'],['Reason',detail.reason],['Sent',formatDateTime(detail.createdAt)],['Last update',formatDateTime(detail.updatedAt)]]} /></Dialog>}
  </HospitalLayout>;
};
