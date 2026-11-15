import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, Users,
  Phone, Image as ImageIcon, FileText, Heart, AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { BankLayout, useBankResource, ResourceState, Notice, Filters, Field as SharedField, EmptyState, Dialog } from './bank/BankUI';
import * as service from '../services/bankService';
import { DISTRICTS } from '../data/districts';
import { Button, SectionCard, Table, BloodTypeBadge } from './UIComponents';
import CampaignCard from './CampaignCard';
import { BLOOD_GROUPS, CAMPAIGN_STATUSES } from '../data/campaigns';

const defaultImage = '';

const EMPTY_FORM = {
  name: '', title: '', shortDescription: '', detailedDescription: '',
  image: defaultImage, status: 'Draft', date: '', startTime: '', endTime: '',
  venueName: '', address: '', district: '', city: '', locationNotes: '',
  organizerName: '', contactPerson: '', contactNumber: '', contactEmail: '',
  whoCanParticipate: '', eligibilityInfo: '', whatToBring: '', preparationInstructions: '',
  specialInstructions: '', availableFacilities: '', emergencyContact: '',
  neededBloodGroups: [], targetDonors: 0, goal: '',
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

const inputCls =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm';

/* ── Small shared form helpers ── */
const Field = ({ label, required, hint, full, children }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <p className="text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</p>
    {React.isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type)
      ? React.cloneElement(children, { 'aria-label': label }) : children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const FormSection = ({ title, children }) => (
  <div className="border border-gray-100 rounded-lg p-5">
    <h3 className="text-base font-bold text-gray-800 mb-4">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

/* ── Campaign Form (used for Create + Edit) ── */
const CampaignForm = ({ initial, onCancel, onPreview, onSaved }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const centres = useBankResource(service.getDonationCentres);
  const [centreId, setCentreId] = useState('');
  const [imagePreview, setImagePreview] = useState(initial && initial.image ? initial.image : null);
  const [error, setError] = useState('');
  const [busy,setBusy]=useState(false);const saving=useRef(false);
  const save = async (status) => {
    if (saving.current) return;
    if (!form.name.trim() || !form.date || !form.startTime || !form.endTime || !form.organizerName.trim()) {
      setError('Enter the campaign name, date, start time, end time and organizer name before saving.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('Campaign end time must be after the start time.');
      return;
    }
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await service.saveCampaign({ ...form, status: status || form.status, imageUrl: form.image?.startsWith('http') ? form.image : undefined }, initial?.id);
      if (!result?.campaign?.id) throw new Error('No campaign confirmation was returned. Check the campaign list before trying again.');
      onSaved(result.campaign);
    } catch (e) {
      setError(e.message || 'Could not save the campaign. Please try again.');
    } finally { saving.current = false; setBusy(false); }
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const selectCentre = (id) => {
    setCentreId(id);
    const centre = centres.data?.items.find((c) => String(c.hospitalId) === id);
    if (centre) setForm((f) => ({ ...f, venueName: centre.name, address: centre.address || '', district: centre.district || '', city: '' }));
  };
  const toggleGroup = (g) =>
    setForm((f) => ({
      ...f,
      neededBloodGroups: f.neededBloodGroups.includes(g)
        ? f.neededBloodGroups.filter((x) => x !== g)
        : [...f.neededBloodGroups, g],
    }));

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  useEffect(() => () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const preview = () => {
    if (!form.name.trim() || !form.shortDescription.trim() || !form.date || !form.startTime || !form.endTime || !form.venueName.trim() || !form.district.trim() || !form.organizerName.trim()) {
      setError('Complete the campaign name, description, date, times, venue, district and organizer before previewing.'); return;
    }
    if (form.endTime <= form.startTime || form.targetDonors < 0 || !Number.isInteger(Number(form.targetDonors))) {
      setError('End time must follow start time, and the donor target must be a nonnegative whole number.'); return;
    }
    setError(''); onPreview({ ...form, image: imagePreview || form.image });
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <FormSection title="1. Basic Information">
        <Field label="Campaign Name" required>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Community Blood Donation Drive" />
        </Field>
        <Field label="Campaign Title">
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Display title (optional)" />
        </Field>
        <Field label="Short Description" required full>
          <input className={inputCls} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line summary shown on cards" />
        </Field>
        <Field label="Detailed Description" full>
          <textarea rows={4} className={inputCls} value={form.detailedDescription} onChange={(e) => set('detailedDescription', e.target.value)} placeholder="Full description of the campaign" />
        </Field>
        <Field label="Campaign Status">
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </FormSection>

      <FormSection title="2. Date & Time">
        <Field label="Campaign Date" required>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Time" required>
            <input type="time" className={inputCls} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="End Time" required>
            <input type="time" className={inputCls} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="3. Location">
        <Field label="Select Donation Centre" full hint="The same approved centres available in donor appointment booking. Selecting a centre fills the venue, address and district.">
          <select className={inputCls} value={centreId} onChange={(e) => selectCentre(e.target.value)} disabled={centres.loading || !!centres.error}>
            <option value="">{centres.loading ? 'Loading donation centres...' : 'Select a donation centre'}</option>
            {(centres.data?.items || []).map((c) => <option key={c.hospitalId} value={String(c.hospitalId)}>{c.name}{c.code ? ` (${c.code})` : ''}{c.district ? ` — ${c.district}` : ''}</option>)}
          </select>
        </Field>
        {centres.error && <div className="md:col-span-2 text-sm text-red-700" role="alert">{centres.error} <button type="button" className="underline" onClick={centres.refresh}>Retry loading centres</button></div>}
        {!centres.loading && !centres.error && centres.data?.items.length === 0 && <p className="md:col-span-2 text-sm text-gray-500">No approved donation centres available.</p>}
        <Field label="Venue Name" required>
          <input className={inputCls} value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="e.g. Colombo Community Hall" />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="District" required>
          <input className={inputCls} value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="e.g. Colombo" />
        </Field>
        <Field label="City / Area">
          <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Location Notes" full>
          <input className={inputCls} value={form.locationNotes} onChange={(e) => set('locationNotes', e.target.value)} placeholder="Parking, entrances, etc." />
        </Field>
      </FormSection>

      <FormSection title="4. Organizer Details">
        <Field label="Organizer Name" required>
          <input className={inputCls} value={form.organizerName} onChange={(e) => set('organizerName', e.target.value)} />
        </Field>
        <Field label="Contact Person">
          <input className={inputCls} value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
        </Field>
        <Field label="Contact Number">
          <input className={inputCls} value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
        </Field>
        <Field label="Contact Email">
          <input type="email" className={inputCls} value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="5. Donor Information">
        <Field label="Who Can Participate" full>
          <input className={inputCls} value={form.whoCanParticipate} onChange={(e) => set('whoCanParticipate', e.target.value)} />
        </Field>
        <Field label="General Eligibility Information" full>
          <input className={inputCls} value={form.eligibilityInfo} onChange={(e) => set('eligibilityInfo', e.target.value)} />
        </Field>
        <Field label="What Donors Should Bring">
          <input className={inputCls} value={form.whatToBring} onChange={(e) => set('whatToBring', e.target.value)} />
        </Field>
        <Field label="Preparation Instructions">
          <input className={inputCls} value={form.preparationInstructions} onChange={(e) => set('preparationInstructions', e.target.value)} />
        </Field>
        <Field label="Special Instructions">
          <input className={inputCls} value={form.specialInstructions} onChange={(e) => set('specialInstructions', e.target.value)} />
        </Field>
        <Field label="Available Facilities">
          <input className={inputCls} value={form.availableFacilities} onChange={(e) => set('availableFacilities', e.target.value)} />
        </Field>
        <Field label="Emergency Contact Information" full>
          <input className={inputCls} value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="6. Blood Requirements">
        <Field label="Needed Blood Groups" full>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((g) => {
              const active = form.neededBloodGroups.includes(g);
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => toggleGroup(g)}
                  className={`w-12 h-12 rounded-full font-bold text-sm border transition-colors ${active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Target Number of Donors">
          <input type="number" min={0} className={inputCls} value={form.targetDonors} onChange={(e) => set('targetDonors', Number(e.target.value))} />
        </Field>
        <Field label="Campaign Goal / Objective" full>
          <textarea rows={3} className={inputCls} value={form.goal} onChange={(e) => set('goal', e.target.value)} placeholder="What this campaign aims to achieve" />
        </Field>
      </FormSection>

      <FormSection title="7. Campaign Image">
        <Field label="Cover Image" full hint="Frontend preview only — no upload to a server.">
          <div className="flex items-center gap-4">
            <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              {imagePreview
                ? <img src={imagePreview} alt="Campaign preview" className="w-full h-full object-cover" />
                : <ImageIcon className="w-6 h-6 text-gray-300" />}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <ImageIcon className="w-4 h-4" /> Choose Image
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </div>
        </Field>
      </FormSection>

      {error && <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" disabled={busy||(initial&&initial.status!=='Draft')} onClick={()=>save('Draft')}>Save as Draft</Button>
        <Button variant="outline" onClick={preview}>Preview Campaign</Button>
        <Button disabled={busy} onClick={()=>save()}>{busy?'Saving...':initial?'Save selected status':'Create campaign'}</Button>
      </div>
    </div>
  );
};

/* ── Donor-view Preview Modal ── */
const PreviewModal = ({ campaign, onClose }) => (
  <Dialog title="Unsaved donor-view preview" onClose={onClose}>
    <Notice>This is a frontend preview only. It is not published, registered or saved.</Notice>

        <CampaignCard campaign={campaign} />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <PreviewRow icon={Calendar} label="Date" value={formatDate(campaign.date)} />
          <PreviewRow icon={Clock} label="Time" value={`${campaign.startTime} – ${campaign.endTime}`} />
          <PreviewRow icon={MapPin} label="Venue" value={campaign.venueName} />
          <PreviewRow icon={MapPin} label="District" value={campaign.district} />
          <PreviewRow icon={Users} label="Who Can Participate" value={campaign.whoCanParticipate} />
          <PreviewRow icon={CheckCircle} label="Eligibility" value={campaign.eligibilityInfo} />
          <PreviewRow icon={FileText} label="What to Bring" value={campaign.whatToBring} />
          <PreviewRow icon={Heart} label="Preparation" value={campaign.preparationInstructions} />
          <PreviewRow icon={AlertCircle} label="Special Instructions" value={campaign.specialInstructions} />
          <PreviewRow icon={Phone} label="Emergency Contact" value={campaign.emergencyContact} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Needed Blood Groups</p>
          <div className="flex flex-wrap gap-2">
            {(campaign.neededBloodGroups || []).map((g) => <BloodTypeBadge key={g} group={g} size="sm" />)}
          </div>
        </div>
        {campaign.goal && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Campaign Goal</p>
            <p className="text-sm text-gray-700">{campaign.goal}</p>
          </div>
        )}
        {campaign.detailedDescription && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{campaign.detailedDescription}</p>
          </div>
        )}

  </Dialog>
);


const PreviewRow = ({ icon: Icon, label, value }) => (
  <div className="border border-gray-100 rounded-lg p-3">
    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      <Icon className="w-3.5 h-3.5 text-red-500" /> {label}
    </p>
    <p className="text-gray-800">{value || '—'}</p>
  </div>
);

const Participants=({id,onClose})=>{
 const load=useCallback(()=>service.getParticipants(id),[id]);const resource=useBankResource(load);
 return <Dialog title="Campaign participants" onClose={onClose}><ResourceState resource={resource} emptyTitle="No campaign registrations"><Table columns={['Donor','Group','District','Registration status']}>{(resource.data?.items||[]).map(r=><tr key={r.id}><td className="p-3">{r.fullName}</td><td className="p-3">{r.bloodGroup}</td><td className="p-3">{r.district}</td><td className="p-3">{r.status}</td></tr>)}</Table></ResourceState></Dialog>;
};
export const CampaignManagement = ({ nav }) => {
  const resource = useBankResource(service.getCampaigns);
  const [view, setView] = useState('list');
  const [participants,setParticipants]=useState(null);
  const [selected, setSelected] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');
  const [savedCampaign, setSavedCampaign] = useState(null);
  const onSaved = (campaign) => {
    setSavedCampaign(campaign);
    setSearch(''); setStatus(''); setDistrict('');
    setPreviewing(null); setView('list'); resource.refresh();
  };
  const records = (resource.data?.items || []).filter((c) => (!status || c.status === status) && (!district || c.district === district) && c.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <BankLayout nav={nav} title={view === 'list' ? 'Campaign Management' : selected ? 'Edit Campaign' : 'Create Campaign'} subtitle="Campaign planning and donor-facing preview">
    <Notice>Campaigns use the same saved source as donor participation. Only the creator may edit or publish a campaign. Preview changes are unsaved until confirmed with Save.</Notice>
    {view === 'list' && savedCampaign && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">Campaign “{savedCampaign.name}” saved successfully{savedCampaign.reference ? ` (${savedCampaign.reference})` : ''}. Status: {savedCampaign.status}. {savedCampaign.status === 'Draft' ? 'This draft is visible to the blood bank. Edit it and select Upcoming or Active to publish it to donors.' : ''}</p>}
    {view !== 'list' ? <CampaignForm initial={selected} onCancel={() => setView('list')} onPreview={setPreviewing} onSaved={onSaved} /> :
      <SectionCard title="Campaigns" action={<div className="flex gap-2"><Button variant="outline" disabled={resource.loading} onClick={resource.refresh}>Refresh campaigns</Button><Button onClick={() => { setSavedCampaign(null); setSelected(null); setView('create'); }}>Create campaign</Button></div>}>
        <Filters>
          <SharedField label="Search campaigns"><input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} /></SharedField>
          <SharedField label="Campaign district"><select className={inputCls} value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">All districts</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></SharedField>
          <SharedField label="Campaign status"><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All recorded statuses</option>{CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></SharedField>
        </Filters>
        <ResourceState resource={resource} emptyTitle="No campaign records returned">
          {!records.length ? <EmptyState title="No campaigns match your filters" /> : <Table columns={['Campaign', 'Date / Time', 'Location / District', 'Organizer', 'Status', 'Participants', 'Actions']}>{records.map((c) => <tr key={c.id}><td className="p-3 text-sm">{c.name}<p className="text-xs text-gray-500">{c.shortDescription}</p></td><td className="p-3 text-sm">{formatDate(c.date)}<span className="block">{c.startTime} - {c.endTime}</span></td><td className="p-3 text-sm">{c.venueName} / {c.district}</td><td className="p-3 text-sm">{c.organizerName}</td><td className="p-3 text-sm">{c.status}</td><td className="p-3 text-sm">{c.participants ?? 'Not supplied'}</td><td className="p-3"><Button variant="ghost" onClick={() => setPreviewing(c)}>Details</Button><Button variant="ghost" onClick={()=>setParticipants(c.id)}>Participants</Button><Button variant="ghost" onClick={() => { setSelected(c); setView('edit'); }}>Edit campaign</Button></td></tr>)}</Table>}
        </ResourceState>
        <div className="flex flex-wrap gap-3 mt-4"><span className="text-sm text-gray-500">Edit a campaign to publish, close or cancel it using its saved status.</span></div>
      </SectionCard>}
    {participants&&<Participants id={participants} onClose={()=>setParticipants(null)}/>}
    {previewing && <PreviewModal campaign={previewing} onClose={() => setPreviewing(null)} />}
  </BankLayout>;
};
export default CampaignManagement;
