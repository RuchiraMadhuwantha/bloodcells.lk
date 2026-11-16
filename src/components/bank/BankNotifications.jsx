import React, { useState } from 'react';
import { Button, SectionCard, Table } from '../UIComponents';
import {SavedForm} from './BankForms';
import * as service from '../../services/bankService';
import { NOTIFICATION_TYPES, notificationLabel } from '../donor/donorUtils';
import { DISTRICTS } from '../../data/districts';
import { BankLayout, useBankResource, useBankSelection, ResourceState, Notice, Field, Filters, Dialog, Details, inputClass, disabledClass, BLOOD_GROUPS } from './BankUI';

const OUTREACH_TYPES=NOTIFICATION_TYPES.filter(([key])=>['general','campaign','emergency','appointment_reminder'].includes(key));
export const BankNotifications = ({ nav }) => {
  const history = useBankResource(service.getNotifications);
  const inbox = useBankResource(service.getInbox);
  const donors = useBankResource(service.getDonors);
  const selection = useBankSelection();
  const [form, setForm] = useState({ type: 'general', channel: 'in_app', message: '', group: '', district: '', status: 'active', mode: selection?.recipients?.length ? 'selected' : 'filters' });
  const [preview, setPreview] = useState(null);
  const [historyType, setHistoryType] = useState('');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const recipients = (donors.data?.items || []).filter((d) => (!form.group || d.bloodGroup === form.group) && (!form.district || d.district === form.district) && (!form.status || d.accountStatus === form.status) && (form.mode !== 'selected' || selection?.recipients.includes(d.donorId)));
  return <BankLayout nav={nav} title="Notification Management" subtitle="Compose and preview blood bank announcements">
    <SectionCard title="Incoming Notifications" action={<Button onClick={inbox.refresh}>Refresh inbox</Button>}>
      <ResourceState resource={inbox} emptyTitle="No incoming notifications">
        {(inbox.data?.items || []).map(item => <div key={item.id} className="border-b p-3"><p className="font-medium">{item.title}</p><p className="text-sm">{item.message}</p><p className="text-xs text-gray-500">{item.createdAt}</p>{item.relatedType === 'appointment' && <Button variant="ghost" onClick={() => nav.onNavigate('bank-appointments')}>View appointments</Button>}</div>)}
      </ResourceState>
    </SectionCard>
    <Notice>In-app announcements are stored in selected active donors' inboxes. SMS/email requests are recorded as blocked until a provider and consent workflow are configured; they are not marked delivered. Maximum 500 recipients per operation.</Notice>
    <div className="grid lg:grid-cols-2 gap-6">
      <SectionCard title="Compose Notification"><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setPreview({ ...form, count: recipients.length,donorIds:recipients.map(d=>d.donorId) }); }}>
        <Field label="Notification category"><select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>{OUTREACH_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="Message channel"><select className={inputClass} value={form.channel} onChange={(e) => set('channel', e.target.value)}><option value="in_app">In-app inbox</option><option value="email">Email (provider not configured)</option><option value="sms">SMS (sending unavailable)</option></select></Field>
        <Field label="Notification message"><textarea rows={6} maxLength={1000} required className={inputClass} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Compose your announcement without patient-identifying information" /></Field>
        <Filters>
          <Field label="Recipient selection"><select className={inputClass} value={form.mode} onChange={(e) => set('mode', e.target.value)}><option value="filters">Filtered registered donors</option><option value="selected">Previously selected donors</option></select></Field>
          <Field label="Recipient blood group"><select className={inputClass} value={form.group} onChange={(e) => set('group', e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Recipient district"><select className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)}><option value="">All districts</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Registered donor status"><select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}><option value="active">Active</option><option value="">All recorded accounts (preview only)</option></select></Field>
          <Field label="Campaign participation"><select disabled className={inputClass}><option>Campaign recipients unavailable</option></select></Field>
        </Filters>
        <p className="text-sm text-gray-500">{donors.loading ? 'Loading authorized recipients...' : donors.error ? 'Recipient lookup failed: ' + donors.error : recipients.length + ' authorized record(s) match this preview.'}</p>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!form.message.trim() || donors.loading || !!donors.error} className={disabledClass}>Preview message</Button></div>
      </form></SectionCard>
      <SectionCard title="Notification History">
        <Field label="History notification type"><select className={inputClass} value={historyType} onChange={(e) => setHistoryType(e.target.value)}><option value="">All categories</option>{NOTIFICATION_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <ResourceState resource={history} emptyTitle="No notification history"><Table columns={['Category', 'Sent', 'Recipients', 'Delivery status']}>{(history.data?.items || []).filter((r) => !historyType || r.type === historyType).map((r) => <tr key={r.id}><td className="p-3">{notificationLabel(r.type)}</td><td className="p-3">{r.createdAt}</td><td className="p-3">{r.recipientCount}</td><td className="p-3">{r.deliveryStatus}</td></tr>)}</Table></ResourceState>
        <Button disabled className={disabledClass}>Retry delivery unavailable</Button>
      </SectionCard>
    </div>
    {preview && <Dialog title="Unsent message preview" onClose={() => setPreview(null)}>
      <Details entries={[[ 'Category', notificationLabel(preview.type) ], ['Channel', preview.channel], ['Matching records (not delivered)', preview.count], ['Message', preview.message]]} />
      <p className="text-sm text-gray-500 mt-4">This preview does not verify address validity, consent, gateway delivery or medical eligibility.</p><SavedForm fields={[{key:'title',label:'Notification title',maxLength:150}]} onSave={(data,key)=>service.sendNotification({...data,type:preview.type,channel:preview.channel,message:preview.message,donorIds:preview.donorIds},key)} onSaved={()=>{setPreview(null);history.refresh();}}/>
    </Dialog>}
  </BankLayout>;
};
