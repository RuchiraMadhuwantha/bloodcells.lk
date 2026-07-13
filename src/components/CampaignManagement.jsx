import React, { useEffect, useState } from 'react';
import {
  Megaphone, Plus, Search, Filter, Eye, Pencil, Trash2, Calendar, Clock, MapPin, Users,
  Phone, Mail, ChevronRight, X, Image as ImageIcon, ArrowLeft, FileText, Heart, AlertCircle,
  Loader2, CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, Button, SectionCard, Table, BloodTypeBadge } from './UIComponents';
import CampaignCard from './CampaignCard';
import { MOCK_CAMPAIGNS, BLOOD_GROUPS, CAMPAIGN_STATUSES, statusBadgeColor } from '../data/campaigns';

const defaultImage = MOCK_CAMPAIGNS[0].image;

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
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-600"> *</span>}
    </label>
    {children}
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
const CampaignForm = ({ initial, onSubmit, onCancel, onPreview }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [imagePreview, setImagePreview] = useState(initial && initial.image ? initial.image : null);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
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

  const submit = (statusOverride) => {
    if (!form.name.trim()) {
      setError('Campaign Name is required.');
      return;
    }
    const data = { ...form, image: imagePreview || form.image };
    if (statusOverride) data.status = statusOverride;
    onSubmit(data);
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

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={() => submit('Draft')}>Save as Draft</Button>
        <Button variant="outline" onClick={() => onPreview({ ...form, image: imagePreview || form.image })}>Preview Campaign</Button>
        <Button onClick={() => submit(null)}>{initial ? 'Save Changes' : 'Create Campaign'}</Button>
      </div>
    </div>
  );
};

/* ── Donor-view Preview Modal ── */
const PreviewModal = ({ campaign, onClose }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-white text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full">Donor View Preview</span>
          <span className="text-xs text-gray-400">This is a frontend preview only.</span>
        </div>
        <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="p-6">
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
            {campaign.neededBloodGroups.map((g) => <BloodTypeBadge key={g} group={g} size="sm" />)}
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
      </div>
    </div>
  </div>
);

const PreviewRow = ({ icon: Icon, label, value }) => (
  <div className="border border-gray-100 rounded-lg p-3">
    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      <Icon className="w-3.5 h-3.5 text-red-500" /> {label}
    </p>
    <p className="text-gray-800">{value || '—'}</p>
  </div>
);

/* ── Small UI states ── */
const EmptyState = ({ onCreate }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
      <Megaphone className="w-8 h-8 text-red-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-800">No campaigns found.</h3>
    <p className="text-gray-500 mt-1 mb-5">Create your first blood donation campaign.</p>
    <Button icon={Plus} onClick={onCreate}>Create Campaign</Button>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-4 border border-gray-100 rounded-lg p-4 animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
    ))}
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-8 h-8 text-red-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-800">Unable to load campaigns.</h3>
    <p className="text-gray-500 mt-1 mb-5">A reusable error state is ready for future API integration.</p>
    <Button variant="outline" onClick={onRetry}>Retry</Button>
  </div>
);

/* ── Delete confirmation ── */
const DeleteModal = ({ campaign, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Delete campaign?</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to delete <strong>{campaign.name}</strong>? This action is a frontend demo and can be wired to an API later.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm}>Delete</Button>
      </div>
    </div>
  </div>
);

/* ── Main Campaign Management ── */
export const CampaignManagement = ({ nav }) => {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
  const [view, setView] = useState('list'); // list | create | detail | edit
  const [selected, setSelected] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [sort, setSort] = useState('Newest');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500); // simulated frontend load
    return () => clearTimeout(t);
  }, []);

  const goList = () => { setView('list'); setSelected(null); };
  const openCreate = () => { setSelected(null); setView('create'); };
  const openDetail = (c) => { setSelected(c); setView('detail'); };
  const openEdit = (c) => { setSelected(c); setView('edit'); };

  const handleCreate = (data) => {
    const newC = { ...data, id: 'C-' + String(Date.now()).slice(-6), participants: 0 };
    setCampaigns((prev) => [newC, ...prev]);
    setSelected(newC);
    setView('detail');
  };
  const handleUpdate = (data) => {
    let updated;
    setCampaigns((prev) => prev.map((c) => {
      if (c.id !== data.id) return c;
      updated = { ...c, ...data };
      return updated;
    }));
    setSelected(updated);
    setView('detail');
  };
  const handleDelete = (c) => {
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
    setDeleteTarget(null);
    goList();
  };

  const districts = ['All', ...Array.from(new Set(campaigns.map((c) => c.district)))];
  const filtered = campaigns
    .filter((c) => statusFilter === 'All' || c.status === statusFilter)
    .filter((c) => districtFilter === 'All' || c.district === districtFilter)
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.title || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'Oldest' || sort === 'Campaign Date') return new Date(a.date) - new Date(b.date);
      return new Date(b.date) - new Date(a.date);
    });

  const summary = {
    total: campaigns.length,
    upcoming: campaigns.filter((c) => c.status === 'Upcoming').length,
    active: campaigns.filter((c) => c.status === 'Active').length,
    completed: campaigns.filter((c) => c.status === 'Completed').length,
  };

  const titleMap = {
    list: 'Campaign Management',
    create: 'Create New Campaign',
    detail: selected ? selected.name : 'Campaign Details',
    edit: 'Edit Campaign',
  };
  const subtitleMap = {
    list: 'Create, manage, and monitor blood donation campaigns.',
    create: 'Fill in the campaign details below.',
    detail: selected ? `Campaign ID: ${selected.id}` : '',
    edit: selected ? `Campaign ID: ${selected.id}` : '',
  };

  const renderContent = () => {
    if (view === 'create')
      return <CampaignForm initial={null} onSubmit={handleCreate} onCancel={goList} onPreview={(d) => setPreviewing(d)} />;

    if (view === 'edit' && selected)
      return (
        <div>
          <button onClick={goList} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to campaigns
          </button>
          <CampaignForm initial={selected} onSubmit={handleUpdate} onCancel={goList} onPreview={(d) => setPreviewing(d)} />
        </div>
      );

    if (view === 'detail' && selected) {
      const c = selected;
      return (
        <div>
          <button onClick={goList} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to campaigns
          </button>

          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="relative h-48 md:h-60">
              <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4"><Badge color={statusBadgeColor(c.status)}>{c.status}</Badge></div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900">{c.name}</h2>
              {c.title && <p className="text-gray-500 mt-1">{c.title}</p>}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-red-500" /> {formatDate(c.date)}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-red-500" /> {c.startTime} – {c.endTime}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500" /> {c.venueName}, {c.city}, {c.district}</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="About the Campaign">
              <p className="text-sm text-gray-700 leading-relaxed">{c.detailedDescription}</p>
              {c.goal && <p className="text-sm text-gray-600 mt-3"><strong>Goal:</strong> {c.goal}</p>}
            </SectionCard>
            <SectionCard title="Blood Requirements">
              <div className="flex flex-wrap gap-2 mb-4">
                {c.neededBloodGroups.map((g) => <BloodTypeBadge key={g} group={g} size="sm" />)}
              </div>
              <p className="text-sm text-gray-600">Target Donors: <strong>{c.targetDonors}</strong></p>
              <p className="text-sm text-gray-600">Participation: <strong>{c.participants}</strong></p>
            </SectionCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <SectionCard title="Donor Information">
              <DetailLine label="Who Can Participate" value={c.whoCanParticipate} />
              <DetailLine label="Eligibility" value={c.eligibilityInfo} />
              <DetailLine label="What to Bring" value={c.whatToBring} />
              <DetailLine label="Preparation" value={c.preparationInstructions} />
              <DetailLine label="Special Instructions" value={c.specialInstructions} />
            </SectionCard>
            <SectionCard title="Contact Information">
              <DetailLine label="Organizer" value={c.organizerName} />
              <DetailLine label="Contact Person" value={c.contactPerson} />
              <DetailLine label="Contact Number" value={c.contactNumber} />
              <DetailLine label="Contact Email" value={c.contactEmail} />
              <DetailLine label="Emergency Contact" value={c.emergencyContact} />
            </SectionCard>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button icon={Pencil} onClick={() => openEdit(c)}>Edit Campaign</Button>
            <Button variant="outline" icon={Eye} onClick={() => setPreviewing(c)}>Preview</Button>
          </div>
        </div>
      );
    }

    // LIST VIEW
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Megaphone} value={summary.total} label="Total Campaigns" accent="red" />
          <StatCard icon={Calendar} value={summary.upcoming} label="Upcoming Campaigns" accent="blue" />
          <StatCard icon={CheckCircle} value={summary.active} label="Active Campaigns" accent="green" />
          <StatCard icon={FileText} value={summary.completed} label="Completed Campaigns" accent="amber" />
        </div>

        <SectionCard
          title="Campaigns"
          action={<Button icon={Plus} onClick={openCreate}>Create Campaign</Button>}
        >
          <div className="flex flex-col lg:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns…"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                <option>All</option>
                {CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                {districts.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                <option>Newest</option>
                <option>Oldest</option>
                <option>Campaign Date</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <Table columns={['Campaign', 'Date', 'District', 'Status', 'Participation', 'Actions']}>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={c.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.district}</td>
                  <td className="px-4 py-3"><Badge color={statusBadgeColor(c.status)}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{c.participants}/{c.targetDonors}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openDetail(c)} title="View" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setPreviewing(c)} title="Preview" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><ImageIcon className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(c)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </SectionCard>
      </>
    );
  };

  return (
    <DashboardLayout
      {...nav}
      title={titleMap[view]}
      subtitle={subtitleMap[view]}
      userName="Ruwan Jayasuriya"
      role="Bank Manager"
    >
      {renderContent()}

      {previewing && <PreviewModal campaign={previewing} onClose={() => setPreviewing(null)} />}
      {deleteTarget && (
        <DeleteModal campaign={deleteTarget} onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
    </DashboardLayout>
  );
};

const DetailLine = ({ label, value }) => (
  <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
    <span className="w-36 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-700">{value || '—'}</span>
  </div>
);

export default CampaignManagement;
