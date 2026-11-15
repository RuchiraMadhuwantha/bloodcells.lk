import React, { useState } from 'react';
import { Button, Badge, SectionCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass } from './HospitalUI';
import { HospitalStockEditor } from './HospitalStockEditor';
import { BLOOD_GROUPS, formatDate } from './hospitalUtils';

const InventoryDetails = ({ item: i }) => <Details entries={[
  ['Blood group', i.bloodGroup], ['Available quantity', i.availableUnits == null ? undefined : `${i.availableUnits} units`],
  ['Stock status', i.level], ['Reserved quantity', i.reservedUnits == null ? 'Not supplied' : `${i.reservedUnits} units`],
  ['Expiry date', i.expiryDate ? formatDate(i.expiryDate) : 'Not supplied'], ['Last updated', i.updatedAt || 'Not supplied'],
  ['Last restocked (server time)', i.lastRestockedAt || 'Not supplied'],
]} />;

export const NetworkStock = ({ onRequest }) => {
  const resource = useHospitalResource(service.getNetworkStock);
  const [district,setDistrict]=useState('');
  const [centre,setCentre]=useState('');
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const items = (resource.data?.items || []).filter((i) => (!group || i.bloodGroup === group) && (!district || i.district===district) && (!centre || String(i.id)===centre) && `${i.bloodGroup} ${i.level}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <SectionCard title="Blood Centre Availability" action={<Button type="button" variant="outline" disabled={resource.loading} className={disabledClass} onClick={resource.refresh}>Refresh stock</Button>}>
    <Notice>Usable, unreserved, non-expired batches at authorized blood bank locations. Legacy aggregate stock is excluded because it has no expiry or location provenance. Viewing does not reserve or allocate blood; confirm suitability with the supplying centre.</Notice>
    <Filters>
      <Field label="Stock blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
      <Field label="Search stock"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Blood group or stock status" /></Field>
      <Field label="District"><select className={inputClass} value={district} onChange={e=>setDistrict(e.target.value)}><option value="">All districts</option>{[...new Set((resource.data?.items||[]).map(i=>i.district).filter(Boolean))].sort().map(d=><option key={d}>{d}</option>)}</select></Field>
      <Field label="Blood bank / centre"><select className={inputClass} value={centre} onChange={e=>setCentre(e.target.value)}><option value="">All centres</option>{[...new Map((resource.data?.items||[]).map(i=>[i.id,i])).values()].map(i=><option key={i.id} value={String(i.id)}>{i.centreName}</option>)}</select></Field>
    </Filters>
    {resource.data?.fetchedAt && <p className="text-xs text-gray-500 mb-4">Retrieved at {new Date(resource.data.fetchedAt).toLocaleString('en-GB')} (browser time). Per-centre stock timestamps are shown below.</p>}
    <ResourceState resource={resource} emptyTitle="No network stock records returned">
      {items.length === 0 ? <EmptyState title="No stock matches your filters" /> : <Table columns={['Blood group', 'Available units', 'Stock status', 'Centre / District', 'Updated', 'Actions']}>
        {items.map((i) => <tr key={String(i.id)+i.bloodGroup}><td className="p-3 text-sm font-medium">{i.bloodGroup}</td><td className="p-3 text-sm">{i.availableUnits}</td>
          <td className="p-3"><Badge color={i.level === 'Critical' ? 'red' : i.level === 'Low' ? 'amber' : 'green'}>{i.level}</Badge></td><td className="p-3 text-sm">{i.centreName} / {i.district}</td><td className="p-3 text-sm">{i.updatedAt || 'Not supplied'}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setSelected(i)} aria-label={`View network stock ${i.bloodGroup}`}>Details</Button>{onRequest && <Button variant="outline" onClick={() => onRequest(i.bloodGroup)} aria-label={`Request blood ${i.bloodGroup}`}>Request Blood</Button>}</div></td>
        </tr>)}
      </Table>}
    </ResourceState>
    {selected && <Dialog title={`Network stock: ${selected.bloodGroup}`} onClose={() => setSelected(null)}><Details entries={[['Centre',selected.centreName],['District',selected.district],['Blood group',selected.bloodGroup],['Usable units',selected.availableUnits],['Updated',selected.updatedAt]]}/></Dialog>}
  </SectionCard>;
};

export const BloodAvailability = ({ nav, onRequest }) => <HospitalLayout nav={nav} title="Blood Availability" subtitle="Check authorized network stock before requesting blood"><NetworkStock onRequest={onRequest} /></HospitalLayout>;

export const HospitalInventory = ({ nav }) => {
  const resource = useHospitalResource(service.getHospitalStock);
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [editor,setEditor]=useState(null);
  const [changes,setChanges]=useState(null);
  const [actionError,setActionError]=useState(null);
  const items = (resource.data?.items || []).filter((i) => (!group || i.bloodGroup === group) && `${i.bloodGroup} ${i.level}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <HospitalLayout nav={nav} title="Hospital Inventory" subtitle="Hospital-owned stock is separate from network inventory">
    <SectionCard title="Hospital-owned Stock">
      <Notice>Hospital-owned batches only. Expired, discarded and quarantined batches have zero usable availability. Blood bank inventory is managed separately.</Notice>
      {actionError&&<p role="alert" className="text-red-700 mb-4">{actionError}</p>}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={()=>setEditor({})}>{resource.data?.available?'Add inventory':'Add inventory unavailable'}</Button>
        <Button disabled={!resource.data?.available} className={disabledClass} onClick={async()=>{try{setChanges(await service.getStockChanges());}catch(e){setActionError(e.message);}}}>View stock changes</Button>
      </div>
      <Filters><Field label="Hospital stock blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Search hospital stock"><input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Blood group or stock status" /></Field></Filters>
      <ResourceState resource={resource} emptyTitle="No hospital stock records">
        {items.length === 0 ? <EmptyState title="No hospital stock matches your filters" /> : <Table columns={['Blood group', 'Available', 'Reserved', 'Expiry', 'Updated', 'Status', 'Details']}>
          {items.map((i) => <tr key={i.id}><td className="p-3 text-sm">{i.bloodGroup}</td><td className="p-3 text-sm">{i.availableUnits}</td><td className="p-3 text-sm">{i.reservedUnits ?? 'Not supplied'}</td><td className="p-3 text-sm">{formatDate(i.expiryDate)}</td><td className="p-3 text-sm">{i.updatedAt || 'Not supplied'}</td><td className="p-3 text-sm">{i.level}</td><td className="p-3"><Button variant="ghost" onClick={() => setSelected(i)}>Details</Button></td></tr>)}
        </Table>}
      </ResourceState>
      {selected && <Dialog title="Hospital stock details" onClose={() => setSelected(null)}><InventoryDetails item={selected} /><Button disabled={selected.status==='discarded'} className={`mt-4 ${disabledClass}`} onClick={()=>{setEditor(selected);setSelected(null);}}>Update stock</Button></Dialog>}
    </SectionCard>
    {editor&&<HospitalStockEditor item={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);resource.refresh();}}/>}
    {changes&&<Dialog title="Hospital stock changes" onClose={()=>setChanges(null)}>{changes.available===false?<EmptyState title="History unavailable">{changes.reason}</EmptyState>:<Table columns={['Batch','Quantity change','Balance','Reason','Recorded']}>{changes.items.map(r=><tr key={r.id}><td className="p-3">{r.batchId}</td><td className="p-3">{r.quantityDelta}</td><td className="p-3">{r.quantityAfter}</td><td className="p-3">{r.reason}</td><td className="p-3">{r.createdAt}</td></tr>)}</Table>}<p className="text-xs text-gray-500">Latest 1000 audit entries.</p></Dialog>}
    <div className="mt-6"><NetworkStock /></div>
  </HospitalLayout>;
};
