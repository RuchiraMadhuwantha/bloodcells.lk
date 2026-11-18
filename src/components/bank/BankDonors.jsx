import React, { useCallback, useState } from 'react';
import {sortRecords} from '../recordSorting';
import {SortControl} from '../SortControl';
import {Send} from 'lucide-react';
import { Button, Badge, Table, SectionCard } from '../UIComponents';
import {SavedForm} from './BankForms';
import * as service from '../../services/bankService';
import { DISTRICTS } from '../../data/districts';
import { BankLayout, useBankResource, useBankSelection, ResourceState, EmptyState, Field, Filters, Dialog, Details, Loading, ErrorPanel, inputClass, disabledClass, BLOOD_GROUPS, formatDate, titleCase } from './BankUI';
const DonorDetails = ({ id, onClose }) => {
  const loader = useCallback(() => service.getDonorDetails(id), [id]);
  const resource = useBankResource(loader);
  const d = resource.data?.donor;
  const [editing,setEditing]=useState(false);
  return <Dialog title="Donor Details" onClose={onClose}>
    {resource.loading ? <Loading /> : resource.error ? <ErrorPanel message={resource.error} onRetry={resource.refresh} /> : d && <>
      <Details entries={[[ 'Reference', d.id ], ['Name', d.fullName], ['Blood group', d.bloodGroup], ['District', d.district], ['Registered', formatDate(d.registeredAt)], ['Account status', titleCase(d.accountStatus)], ['Phone', d.phone], ['Email', d.email], ['Last recorded donation date', formatDate(d.lastDonationDate)], ['Waiting period ends', formatDate(d.nextEligibleDate)], ['Completed donations', d.donationCount], ['Medical eligibility', 'A health check is needed at the donation centre'], ['Donor availability', 'Not recorded']]} />
      <div className="flex flex-wrap gap-3 mt-5">{d.phone && <a className="text-red-700 underline" href={'tel:' + d.phone}>Call donor</a>}{d.email && <a className="text-red-700 underline" href={'mailto:' + d.email}>Open email client</a>}<Button disabled className={disabledClass}>Health checks are done at the centre</Button><Button onClick={()=>setEditing(!editing)}>Update account status</Button></div>
      {editing&&<SavedForm fields={[{key:'status',label:'Account status',options:['active','inactive']},{key:'reason',label:'Status decision reason'}]} onSave={(data,key)=>service.setDonorStatus(id,data,key)} onSaved={()=>{setEditing(false);resource.refresh();}}/>}
      <h3 className="font-semibold mt-5 mb-3">Recorded appointments and donations</h3>
      {resource.data.appointments?.length ? <Table columns={['Reference', 'Date', 'Centre', 'Status']}>{resource.data.appointments.map((a) => <tr key={a.id}><td className="p-3 text-sm">{a.reference}</td><td className="p-3 text-sm">{formatDate(a.appointmentDate)}</td><td className="p-3 text-sm">{a.hospitalName}</td><td className="p-3 text-sm">{a.statusLabel || a.status}</td></tr>)}</Table> : <EmptyState title="No appointment records returned" />}
    </>}
  </Dialog>;
};
export const DonorManagement = ({ nav, candidates = false }) => {
  const resource = useBankResource(service.getDonors);
  const selection = useBankSelection();
  const [sort,setSort]=useState('newest');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState(candidates ? 'active' : '');
  const [interval, setInterval] = useState(candidates ? 'true' : '');
  const [detail, setDetail] = useState(null);
  const records = resource.data?.items || [];
  const items = sortRecords(records.filter((d) => (!group || d.bloodGroup === group) && (!district || d.district === district) && (!status || d.accountStatus === status) &&
    (!interval || (interval === 'true' ? d.eligible === true : d.eligible === false)) &&
    [d.id, d.fullName, d.username, d.email, d.nic, d.phone].some((v) => String(v || '').toLowerCase().includes(query.trim().toLowerCase()))),'donors',sort);
  const recipients = selection?.recipients || [];
  const toggle = (id) => selection?.setRecipients((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  return <BankLayout nav={nav} title={candidates ? 'Eligible Donor Search' : 'Donor Management'} subtitle={candidates ? 'Potential matches subject to medical screening' : 'Registered donors and their donation records'}>
    <SectionCard title={candidates ? 'Potential Donor Matches' : 'Registered Donors'} action={<div className="flex flex-wrap items-center gap-2"><Button icon={Send} disabled={!recipients.length} onClick={() => { selection?.setNotificationTab?.('compose'); nav.onNavigate('bank-notifications'); }}>Compose notification</Button><Button variant="outline" disabled={resource.loading} onClick={resource.refresh}>Refresh</Button></div>}>
      <Filters>
        <Field label="Search donors"><input className={inputClass} maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Donor reference or name" /></Field>
        <Field label="Donor blood group"><select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Donor district"><select className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">All districts</option>{[...new Set([...DISTRICTS, ...records.map((d) => d.district).filter(Boolean)])].sort().map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Donor account status"><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All accounts</option>{['active', 'pending', 'inactive', 'suspended'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        <Field label="Time since last donation"><select className={inputClass} value={interval} onChange={(e) => setInterval(e.target.value)}><option value="">All donation dates</option><option value="true">Waiting period completed</option><option value="false">Still in the waiting period</option></select></Field>
        <Field label="Donation availability"><select disabled className={inputClass}><option>Availability not recorded</option></select></Field>
        <SortControl label="Sort donors" profile="donors" value={sort} onChange={setSort} className={inputClass}/>
      </Filters>
      <ResourceState resource={resource} emptyTitle="No registered donors found">
        {!items.length ? <EmptyState title="No donors match your filters" /> : <Table columns={['Select', 'Reference / Name', 'Group', 'District', 'Registered', 'Account', 'Donation waiting period', 'Details']}>
          {items.map((d) => <tr key={d.donorId}><td className="p-3"><input type="checkbox" aria-label={'Select donor ' + d.id} checked={recipients.includes(d.donorId)} onChange={() => toggle(d.donorId)} disabled={!selection || d.accountStatus !== 'active'} /></td><td className="p-3 text-sm">{d.id}<span className="block font-medium">{d.fullName}</span></td><td className="p-3 text-sm">{d.bloodGroup}</td><td className="p-3 text-sm">{d.district || 'Not recorded'}</td><td className="p-3 text-sm">{formatDate(d.registeredAt)}</td><td className="p-3 text-sm">{titleCase(d.accountStatus)}</td><td className="p-3"><Badge color="gray">{typeof d.eligible !== 'boolean' ? 'Unknown' : d.eligible ? 'Waiting period completed; health check needed' : 'Still in the waiting period'}</Badge></td><td className="p-3"><Button variant="ghost" onClick={() => setDetail(d.donorId)} aria-label={'View donor ' + d.id}>Details</Button></td></tr>)}
        </Table>}
      </ResourceState>
      <div className="flex flex-wrap items-center gap-3 mt-5"><span className="text-sm text-gray-500">{recipients.length} donor(s) selected in this session</span><Button variant="ghost" disabled={!recipients.length} onClick={() => selection?.setRecipients([])}>Clear selection</Button></div>
    </SectionCard>
    {detail != null && <DonorDetails id={detail} onClose={() => setDetail(null)} />}
  </BankLayout>;
};
