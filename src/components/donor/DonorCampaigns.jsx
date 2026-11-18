import React, { useRef, useState } from 'react';
import {sortRecords} from '../recordSorting';
import {SortControl} from '../SortControl';
import { Button, Badge, SectionCard } from '../UIComponents';
import CampaignCard from '../CampaignCard';
import * as donor from '../../services/donorService';
import { DISTRICTS } from '../../data/districts';
import { DonorLayout, useDonorResource, ResourceState, EmptyState, Filters, Field, Dialog, Details, ErrorPanel, inputClass, disabledClass } from './DonorUI';
import { todayStr, formatDate } from './donorUtils';

export const DonorCampaigns = ({ nav, mine = false }) => {
  const resource = useDonorResource(mine ? donor.getMyCampaigns : donor.getCampaigns);
  const [sort,setSort]=useState('date');
  const [district, setDistrict] = useState('');
  const [period, setPeriod] = useState('upcoming');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const lock = useRef(false);
  const records = resource.data?.items || [];
  // Registered records have { id, status, campaign }; published records are campaigns.
  const campaigns = sortRecords(records.filter((r) => {
    const c = mine ? r.campaign : r;
    return (!district || c.district === district) && (!date || c.date === date) &&
      (period === 'all' || (period === 'upcoming' ? c.date >= todayStr() : c.date < todayStr()));
  }),'campaigns',sort,r=>mine?r.campaign:r);
  const campaign = selected && (mine ? selected.campaign : selected);
  const runAction = async (action) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await action();
      setSuccess(result.message || 'Done.');
      setSelected(null);
      resource.refresh();
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      lock.current = false; setBusy(false);
    }
  };
  const handleRegister = (id) => runAction(() => donor.registerForCampaign(id));
  const handleCancel = (id) => runAction(() => donor.cancelCampaignRegistration(id));
  return <DonorLayout nav={nav} title={mine ? 'My Campaigns' : 'Blood Donation Campaigns'} subtitle={mine ? 'Your registrations and participation status' : 'Find published donation campaigns near you'}>
    <div className="flex flex-wrap gap-3 mb-5"><Button variant={mine ? 'outline' : 'primary'} onClick={() => nav.onNavigate('donor-campaigns')}>Browse campaigns</Button><Button variant={mine ? 'primary' : 'outline'} onClick={() => nav.onNavigate('donor-my-campaigns')}>My Campaigns</Button></div>
    {success && <p role="status" className="p-4 mb-4 rounded-lg bg-green-50 text-green-800">{success}</p>}
    {error && <div className="mb-4"><ErrorPanel message={error} /></div>}
    <SectionCard title={mine ? 'Registered campaigns' : 'Published campaigns'}>
      <Filters>
        <Field label="Campaign district"><select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputClass}><option value="">All districts</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Campaign period"><select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All dates</option></select></Field>
        <Field label="Campaign date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field>
        <SortControl label="Sort campaigns" profile="campaigns" value={sort} onChange={setSort} className={inputClass}/>
      </Filters>
      <ResourceState resource={resource} emptyTitle={mine ? 'No campaign registrations' : 'No published campaigns'}>
        {campaigns.length === 0 ? <EmptyState title="No campaigns match your filters" /> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {campaigns.map((r) => <div key={r.id} className="space-y-3">
            {mine && <p className="text-sm">Participation status: <Badge color="blue">{r.status}</Badge></p>}
            <CampaignCard campaign={mine ? r.campaign : r} donorView onView={() => setSelected(r)} />
          </div>)}
        </div>}
      </ResourceState>
    </SectionCard>
    {campaign && <Dialog title={campaign.name || 'Campaign details'} onClose={() => !busy && setSelected(null)} busy={busy}>
      {campaign.image && <img src={campaign.image} alt={campaign.name} className="w-full max-h-60 object-cover rounded-lg mb-4" />}
      <Details entries={[[ 'Date', formatDate(campaign.date) ], ['Time', [campaign.startTime, campaign.endTime].filter(Boolean).join(' – ') || undefined],
        ['Location', [campaign.venueName, campaign.address].filter(Boolean).join(', ') || undefined], ['District', campaign.district],
        ['Organizer', campaign.organizerName], ['Campaign status', campaign.status],
        ['Participants', campaign.targetDonors > 0 ? `${campaign.participants ?? 0}/${campaign.targetDonors} registered` : `${campaign.participants ?? 0} registered`],
        ['Description', campaign.detailedDescription || campaign.shortDescription], ['Participation information', campaign.whoCanParticipate],
        ['What to bring', campaign.whatToBring], ['Preparation', campaign.preparationInstructions],
        ...(mine ? [['Registration reference', selected.id], ['Participation status', selected.status]] : []),
      ]} />
      <div className="flex flex-wrap gap-3 mt-5">
        {mine
          ? <Button variant="outline" disabled={busy || selected.status !== 'registered'} className={disabledClass} onClick={() => handleCancel(campaign.id || selected.campaignId || selected.id)}>{busy ? 'Processing…' : 'Cancel registration'}</Button>
          : <Button disabled={busy || !['Upcoming', 'Active'].includes(campaign.status)} className={disabledClass} onClick={() => handleRegister(campaign.id)}>{busy ? 'Processing…' : 'Register'}</Button>}
        <Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Close</Button>
      </div>
    </Dialog>}
  </DonorLayout>;
};
