import {Eye} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Button, CompactAction, SectionCard, Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout, useHospitalResource, ResourceState, EmptyState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass } from './HospitalUI';
import { BLOOD_GROUPS, todayStr, formatDate, newSubmissionKey } from './hospitalUtils';

export const HospitalUsage = ({ nav }) => {
  const resource = useHospitalResource(service.getUsage);
  const stock=useHospitalResource(service.getHospitalStock);
  const requests = useHospitalResource(service.getRequests);
  const [form, setForm] = useState({ batchId:'', bloodGroup: '', quantity: '', volumeMl:'', date: todayStr(), category: '', requestId: '', notes: '' });
  const [filters, setFilters] = useState({ group: '', date: '', query: '' });
  const [selected, setSelected] = useState(null);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState(null),[saved,setSaved]=useState(null);
  const lock=useRef(false),attempt=useRef(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const filter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const items = (resource.data?.items || []).filter((r) => (!filters.group || r.bloodGroup === filters.group) && (!filters.date || r.usageDate === filters.date) && `${r.reference || r.id} ${r.category || ''}`.toLowerCase().includes(filters.query.trim().toLowerCase()));
  const submit=async e=>{
    e.preventDefault();if(lock.current)return;
    lock.current=true;setSaving(true);setSaveError(null);setSaved(null);
    const payload={...form,volumeMl:form.volumeMl===''?null:Number(form.volumeMl),batchId:Number(form.batchId),quantity:Number(form.quantity),requestId:form.requestId?Number(form.requestId):undefined};
    const signature=JSON.stringify(payload);
    if(attempt.current?.signature!==signature)attempt.current={signature,key:newSubmissionKey()};
    try{
      const result=await service.saveUsage(payload,attempt.current.key);
      if(!result.item)throw new Error('Usage was not confirmed. Refresh before retrying.');
      setSaved(result.message);setForm(f=>({...f,quantity:'',volumeMl:'',notes:''}));resource.refresh();stock.refresh();
    }catch(e){setSaveError(e.message);}finally{lock.current=false;setSaving(false);}
  };
  return <HospitalLayout nav={nav} title="Blood Usage" subtitle="Monitor hospital blood usage">
    <Notice>Usage is saved with an atomic deduction from your selected usable, unreserved batch. No patient identity is required. If the hospital migration is pending, saving remains unavailable.</Notice>
    <div className="grid xl:grid-cols-3 gap-6">
      <SectionCard title="Record Blood Usage">
        <form aria-label="Record hospital usage" onSubmit={submit} className="space-y-4">
          {saveError&&<p role="alert" className="text-red-700">{saveError}</p>}{saved&&<p role="status" className="text-green-700">{saved}</p>}
          <fieldset disabled={saving} className="space-y-4">
          <Field label="Usage blood group"><select className={inputClass} value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}><option value="">Select group</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Usable hospital stock batch"><select required className={inputClass} value={form.batchId} onChange={e=>{const batch=stock.data.items.find(b=>String(b.id)===e.target.value);setForm(f=>({...f,batchId:e.target.value,bloodGroup:batch?.bloodGroup||f.bloodGroup}));}}><option value="">Select stock batch</option>{(stock.data?.items||[]).filter(b=>b.availableUnits>0&&(!form.bloodGroup||b.bloodGroup===form.bloodGroup)).map(b=><option key={b.id} value={b.id}>{b.reference} - {b.bloodGroup} ({b.availableUnits} usable)</option>)}</select></Field>
          <Field label="Quantity used (units)"><input required type="number" min="1" max="100000" step="1" className={inputClass} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
          <Field label="Volume used (mL)"><input type="number" min="0.01" step="0.01" className={inputClass} value={form.volumeMl} onChange={e=>set('volumeMl',e.target.value)}/></Field>
          <p className="text-xs text-gray-500">Enter the actual volume used. If blank, a recorded batch volume is split in proportion to units; unknown volume remains unrecorded.</p>
          <Field label="Usage date"><input required type="date" max={todayStr()} className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Usage category / reason"><input required maxLength={100} className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Related blood request (optional)"><select className={inputClass} value={form.requestId} onChange={(e) => set('requestId', e.target.value)} disabled={requests.loading || !!requests.error}><option value="">No related request</option>{(requests.data?.items || []).map((r) => <option key={r.id} value={r.id}>{r.reference} | {r.bloodGroup}</option>)}</select></Field>
          {requests.error && <p className="text-xs text-red-700">Related requests could not be loaded: {requests.error}</p>}
          <Field label="Additional notes (optional)"><textarea rows={3} maxLength={1000} className={inputClass} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          <Button type="submit" disabled={saving||!resource.data?.available||!stock.data?.available} className={`w-full ${disabledClass}`}>{saving?'Saving...':resource.data?.available&&stock.data?.available?'Save usage':'Save usage unavailable'}</Button>
          </fieldset>
        </form>
      </SectionCard>
      <SectionCard title="Blood Usage History" className="xl:col-span-2">
        <p className="text-sm text-gray-600 mb-5">{resource.data?.available ? `Total recorded usage: ${resource.data.items.reduce((sum, r) => sum + Number(r.quantity), 0)} units` : 'Total recorded usage: unavailable'}</p>
        <Filters>
          <Field label="Filter usage blood group"><select className={inputClass} value={filters.group} onChange={(e) => filter('group', e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Filter usage date"><input type="date" className={inputClass} value={filters.date} onChange={(e) => filter('date', e.target.value)} /></Field>
          <Field label="Search usage records"><input className={inputClass} value={filters.query} onChange={(e) => filter('query', e.target.value)} placeholder="Reference or category" /></Field>
        </Filters>
        <ResourceState resource={resource} emptyTitle="No recorded blood usage">
          {items.length === 0 ? <EmptyState title="No usage records match your filters" /> : <Table columns={['Reference', 'Group', 'Quantity', 'Volume (mL)', 'Usage date', 'Category', 'Details']}>
            {items.map((r) => <tr key={r.id}><td className="p-3 text-sm">{r.reference || r.id}</td><td className="p-3 text-sm">{r.bloodGroup}</td><td className="p-3 text-sm">{r.quantity}</td><td className="p-3 text-sm">{r.volumeMl??'Not recorded'}</td><td className="p-3 text-sm">{formatDate(r.usageDate)}</td><td className="p-3 text-sm">{r.category}</td><td className="p-3"><CompactAction icon={Eye} onClick={() => setSelected(r)}>Details</CompactAction></td></tr>)}
          </Table>}
        </ResourceState>
      </SectionCard>
    </div>
    {selected && <Dialog title="Usage details" onClose={() => setSelected(null)}><Details entries={[[ 'Reference', selected.reference || selected.id ], ['Blood group', selected.bloodGroup], ['Quantity used', selected.quantity],['Volume used (mL)',selected.volumeMl??'Not recorded'], ['Usage date', formatDate(selected.usageDate)], ['Category', selected.category], ['Related request', selected.requestReference], ['Notes', selected.notes]]} /></Dialog>}
  </HospitalLayout>;
};
