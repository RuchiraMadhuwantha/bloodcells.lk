import {Eye} from 'lucide-react';
import React, { useState } from 'react';
import { Button, CompactAction, BloodTypeBadge, SectionCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass } from './HospitalUI';
import { HospitalStockEditor } from './HospitalStockEditor';
import { BLOOD_GROUPS, formatDate } from './hospitalUtils';

const InventoryDetails = ({ item: i }) => <Details entries={[
  ['Batch reference',i.reference],['Component',i.component],['Recorded volume (mL)',i.volumeMl??'Not recorded'],['Collection appointment',i.appointmentId?'AP-'+String(i.appointmentId).padStart(5,'0'):'Not linked'],['Blood group', i.bloodGroup], ['Available quantity', i.availableUnits == null ? undefined : `${i.availableUnits} units`],
  ['Stock status', i.level], ['Reserved quantity', i.reservedUnits == null ? 'Not supplied' : `${i.reservedUnits} units`],
  ['Expiry date', i.expiryDate ? formatDate(i.expiryDate) : 'Not supplied'], ['Last updated', i.updatedAt || 'Not supplied'],
  ['Last restocked (server time)', i.lastRestockedAt || 'Not supplied'],
]} />;

export const HospitalInventory = ({ nav }) => {
  const resource = useHospitalResource(service.getHospitalStock);
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [editor,setEditor]=useState(null);
  const [changes,setChanges]=useState(null);
  const [actionError,setActionError]=useState(null);
  const items = (resource.data?.items || []).filter((i) => (!group || i.bloodGroup === group) && `${i.bloodGroup} ${i.level}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <HospitalLayout nav={nav} title="Hospital Inventory" subtitle="Manage blood batches held by your hospital">
    <SectionCard title="Blood Availability" className="mb-6" action={<Button disabled={resource.loading} onClick={resource.refresh}>Refresh availability</Button>}>
      {resource.data?.available && !resource.error ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BLOOD_GROUPS.map(bloodGroup => {
          const units=(resource.data.items || []).filter(b=>b.bloodGroup===bloodGroup).reduce((total,b)=>total+Number(b.availableUnits || 0),0);
          return <div key={bloodGroup} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"><BloodTypeBadge group={bloodGroup} size="sm" /><div><p className="text-lg font-semibold text-gray-800" aria-label={'Available '+bloodGroup}>{units}</p><p className="text-xs text-gray-500">Available units</p></div></div>;
        })}
      </div> : <p className="text-sm text-gray-500">{resource.loading?'Loading availability...':'Availability will appear when hospital stock is available.'}</p>}
    </SectionCard>
    <SectionCard title="Hospital-owned Stock">
      <Notice>Hospital-owned batches only. Expired, discarded and quarantined batches have zero usable availability. Blood bank inventory is managed separately.</Notice>
      {actionError&&<p role="alert" className="text-red-700 mb-4">{actionError}</p>}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={()=>setEditor({})}>{resource.data?.available?'Add inventory':'Add inventory unavailable'}</Button>
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={async()=>{try{setChanges(await service.getStockChanges());}catch(e){setActionError(e.message);}}}>View stock changes</Button>
      </div>
      <Filters><Field label="Hospital stock blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Search hospital stock"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Blood group or stock status" /></Field></Filters>
      <ResourceState resource={resource} emptyTitle="No hospital stock records">
        {items.length === 0 ? <EmptyState title="No hospital stock matches your filters" /> : <Table columns={['Blood group', 'Available', 'Volume (mL)', 'Reserved', 'Expiry', 'Updated', 'Status', 'Details']}>
          {items.map((i) => <tr key={i.id}><td className="p-3 text-sm">{i.bloodGroup}</td><td className="p-3 text-sm">{i.availableUnits}</td><td className="p-3 text-sm">{i.volumeMl??'Not recorded'}</td><td className="p-3 text-sm">{i.reservedUnits ?? 'Not supplied'}</td><td className="p-3 text-sm">{formatDate(i.expiryDate)}</td><td className="p-3 text-sm">{i.updatedAt || 'Not supplied'}</td><td className="p-3 text-sm">{i.level}</td><td className="p-3"><CompactAction icon={Eye} onClick={() => setSelected(i)}>Details</CompactAction></td></tr>)}
        </Table>}
      </ResourceState>
      {selected && <Dialog title="Hospital stock details" onClose={() => setSelected(null)}><InventoryDetails item={selected} /><Button disabled={selected.status==='discarded'} className={`mt-4 ${disabledClass}`} onClick={()=>{setEditor(selected);setSelected(null);}}>Update stock</Button></Dialog>}
    </SectionCard>
    {editor&&<HospitalStockEditor item={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);resource.refresh();}}/>}
    {changes&&<Dialog title="Hospital stock changes" onClose={()=>setChanges(null)}>{changes.available===false?<EmptyState title="History unavailable">{changes.reason}</EmptyState>:<Table columns={['Batch','Quantity change','Balance','Reason','Recorded']}>{changes.items.map(r=><tr key={r.id}><td className="p-3">{r.batchId}</td><td className="p-3">{r.quantityDelta}</td><td className="p-3">{r.quantityAfter}</td><td className="p-3">{r.reason}</td><td className="p-3">{r.createdAt}</td></tr>)}</Table>}<p className="text-xs text-gray-500">Latest 1000 audit entries.</p></Dialog>}
  </HospitalLayout>;
};
