import {batchLabel} from '../batchLabel';
import {displayStatus} from '../userLanguage';
import {sortRecords} from '../recordSorting';
import {SortControl} from '../SortControl';
import {Eye} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button, Badge, CompactAction, BloodTypeBadge, SectionCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass } from './HospitalUI';
import {groupHospitalStock,matchesStockGroup} from './hospitalStockGroups';
import {expiryInfo,expirySummary} from '../inventoryExpiry';
import {ExpiryBadge,ExpiryReminder} from '../ExpiryReminder';
import { HospitalStockEditor } from './HospitalStockEditor';
import { BLOOD_GROUPS, formatDate } from './hospitalUtils';

const InventoryDetails = ({ item: i }) => <Details entries={[
  ['Packet ID',batchLabel(i)],['Packet reference',i.reference],['Component',i.component],['Recorded volume (mL)',i.volumeMl??'Not recorded'],['Collection appointment',i.appointmentId?'AP-'+String(i.appointmentId).padStart(5,'0'):'Not linked'],['Blood group', i.bloodGroup], ['Available quantity', i.availableUnits == null ? undefined : `${i.availableUnits} units`],
  ['Stock status', i.level], ['Units set aside', i.reservedUnits == null ? 'Not recorded' : `${i.reservedUnits} units`],
  ['Expiry date', i.expiryDate ? formatDate(i.expiryDate) : 'Not recorded'], ['Last updated', i.updatedAt || 'Not recorded'],
  ['Last stock update', i.lastRestockedAt || 'Not recorded'],
]} />;

export const HospitalInventory = ({ nav }) => {
  const resource = useHospitalResource(service.getHospitalStock);
  const [sort,setSort]=useState('group');
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [batchGroup,setBatchGroup]=useState(null);
  const [selected, setSelected] = useState(null);
  const [editor,setEditor]=useState(null);
  const [changes,setChanges]=useState(null);
  const [actionError,setActionError]=useState(null);
  const grouped=groupHospitalStock(resource.data?.items||[]).map(g=>({...g,expiry:expirySummary(g.batches)}));
  const items=sortRecords(grouped.filter(i=>(!group||i.bloodGroup===group)&&matchesStockGroup(i,query)),'stockGroups',sort);
  const refreshStock=resource.refresh;
  useEffect(()=>{if(editor||selected||batchGroup||changes)return;const refresh=()=>refreshStock();window.addEventListener('focus',refresh);const timer=window.setInterval(()=>{if(!document.hidden)refresh();},60000);return()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};},[refreshStock,editor,selected,batchGroup,changes]);
  const expiry=expirySummary(items.flatMap(g=>g.batches));
  return <HospitalLayout nav={nav} title="Hospital Inventory" subtitle="Manage blood packets held by your hospital">
    <SectionCard title="Blood Availability" className="mb-6" action={<Button disabled={resource.loading} onClick={resource.refresh}>Refresh availability</Button>}>
      {resource.data?.available && !resource.error ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BLOOD_GROUPS.map(bloodGroup => {
          const units=grouped.find(g=>g.bloodGroup===bloodGroup)?.availableUnits||0;
          return <div key={bloodGroup} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"><BloodTypeBadge group={bloodGroup} size="sm" /><div><p className="text-lg font-semibold text-gray-800" aria-label={'Available '+bloodGroup}>{units}</p><p className="text-xs text-gray-500">Available units</p></div></div>;
        })}
      </div> : <p className="text-sm text-gray-500">{resource.loading?'Loading availability...':'Availability will appear when hospital stock is available.'}</p>}
    </SectionCard>
    <SectionCard title="Hospital-owned Stock">
      <Notice>Only this hospital?s blood packets are shown. Blood that has expired, been removed from use or is waiting for checks is not available for use. Blood bank stock is listed separately.</Notice>
      {actionError&&<p role="alert" className="text-red-700 mb-4">{actionError}</p>}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={()=>setEditor({})}>{resource.data?.available?'Add inventory':'Add inventory unavailable'}</Button>
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={async()=>{try{setChanges(await service.getStockChanges());}catch(e){setActionError(e.message);}}}>View stock changes</Button>
      </div>
      <Filters><Field label="Hospital stock blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Search hospital stock"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Group, packet number, component or status" /></Field><SortControl label="Sort inventory" profile="stockGroups" value={sort} onChange={setSort} className={inputClass}/></Filters>
      <ExpiryReminder summary={expiry}/>
      <ResourceState resource={resource} emptyTitle="No hospital stock records">
        {items.length === 0 ? <EmptyState title="No hospital stock matches your filters" /> : <Table columns={['Blood group','Packet numbers','Recorded units','Available units','Units set aside','Recorded volume (mL)','Next usable expiry','Actions']}>
          {items.map(i=><tr key={i.bloodGroup} className={i.expiry.rowClass}>
            <td className="p-3"><BloodTypeBadge group={i.bloodGroup} size="sm"/></td>
            <td className="p-3"><div className="flex flex-wrap gap-1.5">{i.batches.map(b=><button key={b.id} type="button" aria-label={'View packet '+(batchLabel(b))} onClick={()=>setSelected(b)} title={expiryInfo(b).label||'View packet details'} className={'rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 '+(expiryInfo(b).kind==='expired'?'border-rose-300 bg-rose-100 text-rose-800':['today','expiring'].includes(expiryInfo(b).kind)?'border-amber-300 bg-amber-100 text-amber-800':'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}>{batchLabel(b)}</button>)}</div><p className="text-xs text-gray-500 mt-1">{i.batches.length} packet(s)</p></td>
            <td className="p-3 text-sm">{i.quantity}</td><td className="p-3 text-sm font-semibold">{i.availableUnits}</td><td className="p-3 text-sm">{i.reservedUnits}</td>
            <td className="p-3 text-sm">{i.missingVolumeBatches===i.batches.length?'Not recorded':i.volumeMl}{i.missingVolumeBatches>0&&i.missingVolumeBatches<i.batches.length&&<span className="block text-xs text-amber-700">{i.missingVolumeBatches} packet(s) unrecorded</span>}</td>
            <td className="p-3 text-sm whitespace-nowrap">{i.nextUsableExpiry?formatDate(i.nextUsableExpiry):i.availableUnits>0?'Expiry not recorded':'No usable stock'}<div className="flex flex-col items-start gap-1 mt-1">{i.expiry.expiredCount>0&&<ExpiryBadge info={{kind:'expired',label:i.expiry.expiredCount+' expired packet(s)'}}/>}{i.expiry.expiringCount>0&&<ExpiryBadge info={{kind:i.expiry.todayCount?'today':'expiring',days:i.expiry.nearestDays,label:i.expiry.expiringCount+' packet(s) ? '+(i.expiry.nearestDays===0?'Expires today':i.expiry.nearestDays+' days left')}}/>}</div></td>
            <td className="p-3"><CompactAction icon={Eye} aria-label={'View '+i.bloodGroup+' packets'} onClick={()=>setBatchGroup(i)}>View packets</CompactAction></td>
          </tr>)}
        </Table>}
      </ResourceState>
      {batchGroup&&<Dialog title={batchGroup.bloodGroup+' blood packets'} onClose={()=>setBatchGroup(null)}>
        <div className="mb-4"><Details entries={[[ 'Blood group',batchGroup.bloodGroup],['Recorded units',batchGroup.quantity],['Available units',batchGroup.availableUnits],['Units set aside',batchGroup.reservedUnits]]}/></div>
        <Table columns={['Packet / Component','Units / Volume','Available / Reserved','Collection / Expiry','Status','Actions']}>
          {batchGroup.batches.map(b=><tr key={b.id} className={expiryInfo(b).rowClass}><td className="p-3 text-sm">{batchLabel(b)}<span className="block text-xs text-gray-500">{b.component||'Not recorded'}</span></td><td className="p-3 text-sm">{b.quantity} unit(s)<span className="block text-xs text-gray-500">{b.volumeMl==null?'Volume not recorded':b.volumeMl+' mL'}</span></td><td className="p-3 text-sm">{b.availableUnits} / {b.reservedUnits??0}</td><td className="p-3 text-xs whitespace-nowrap">{formatDate(b.collectionDate)}<span className="block">{formatDate(b.expiryDate)}</span><div className="mt-1"><ExpiryBadge info={expiryInfo(b)}/></div></td><td className="p-3"><Badge color={b.availableUnits>0?'green':b.level==='Expired'?'red':'gray'}>{displayStatus(b.level||b.status)||'Not recorded'}</Badge></td><td className="p-3"><CompactAction icon={Eye} aria-label={'Details '+(batchLabel(b))} onClick={()=>{setBatchGroup(null);setSelected(b);}}>Details</CompactAction></td></tr>)}
        </Table>
      </Dialog>}
      {selected && <Dialog title="Hospital stock details" onClose={() => setSelected(null)}><div className="mb-3"><ExpiryBadge info={expiryInfo(selected)}/></div><InventoryDetails item={selected} /><Button disabled={selected.status==='discarded'} className={`mt-4 ${disabledClass}`} onClick={()=>{setEditor(selected);setSelected(null);}}>Update stock</Button></Dialog>}
    </SectionCard>
    {editor&&<HospitalStockEditor item={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);resource.refresh();}}/>}
    {changes&&<Dialog title="Hospital stock changes" onClose={()=>setChanges(null)}>{changes.available===false?<EmptyState title="History unavailable">{changes.reason}</EmptyState>:<Table columns={['Packet','Quantity change','Balance','Reason','Recorded']}>{changes.items.map(r=><tr key={r.id}><td className="p-3">{r.batchId}</td><td className="p-3">{r.quantityDelta}</td><td className="p-3">{r.quantityAfter}</td><td className="p-3">{r.reason}</td><td className="p-3">{r.createdAt}</td></tr>)}</Table>}<p className="text-xs text-gray-500">Latest 1000 audit entries.</p></Dialog>}
  </HospitalLayout>;
};
