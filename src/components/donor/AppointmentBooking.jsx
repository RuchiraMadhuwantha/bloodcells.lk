import React, { useEffect, useRef, useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { Button, Badge, Card, SectionCard } from '../UIComponents';
import * as donor from '../../services/donorService';
import { DonorLayout, useDonorResource, Loading, ErrorPanel, EmptyState, Field, Details, inputClass, disabledClass } from './DonorUI';
import { todayStr, formatDate, statusColor, isFutureSlot } from './donorUtils';

// Preserve the existing booking time choices. The API returns booked times only,
// not hospital opening hours or a schedule of available slots.
const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

export const AppointmentBooking = ({ nav }) => {
  const centres = useDonorResource(donor.getHospitals);
  const [district, setDistrict] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [date, setDate] = useState(() => todayStr(1));
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [nic, setNic] = useState('');
  const [availability, setAvailability] = useState({ key: '', booked: [], loading: false, error: null });
  const [slotRevision, setSlotRevision] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const hospitals = centres.data || [];
  const filtered = hospitals.filter((h) => !district || h.district === district);
  const selected = filtered.find((h) => String(h.hospitalId) === hospitalId);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayStr();
  const key = `${hospitalId}:${date}`;
  const slotsReady = availability.key === key && !availability.loading && !availability.error && !!selected && validDate;
  const canBook = slotsReady && SLOTS.includes(slot) && !availability.booked.includes(slot) && isFutureSlot(date, slot);

  useEffect(() => {
    setSlot('');
    if (!hospitalId || !validDate) return;
    let active = true;
    setAvailability({ key, booked: [], loading: true, error: null });
    donor.getBookedSlots(hospitalId, date).then((booked) => {
      if (active) setAvailability({ key, booked, loading: false, error: null });
    }).catch((e) => {
      if (active) setAvailability({ key, booked: [], loading: false, error: e.message });
    });
    return () => { active = false; };
  }, [hospitalId, date, validDate, key, slotRevision]);

  const submit = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    if (!district || !canBook) { setError('Select a district, hospital, valid date and available future time.'); return; }
    const bookingNic = nic.trim().toUpperCase();
    if (bookingNic && !/^(?:\d{9}[VX]|\d{12})$/.test(bookingNic)) { setError('Enter a valid NIC: 9 digits followed by V or X, or 12 digits.'); return; }
    lock.current = true; setSubmitting(true); setError(null);
    try {
      const data = await donor.bookAppointment({ hospital_id: Number(hospitalId), appointment_date: date, time_slot: slot, notes: notes.trim() || undefined, ...(bookingNic ? {nic: bookingNic} : {}) });
      if (!data?.appointment) throw new Error('The server did not return a booking confirmation. Check My Appointments before trying again.');
      setConfirmed(data.appointment);
    } catch (e) {
      setError(e.message);
      // Availability may have changed since selection. Recheck before another attempt.
      setSlot(''); setSlotRevision((n) => n + 1);
    } finally { lock.current = false; setSubmitting(false); }
  };

  if (confirmed) return <DonorLayout nav={nav} title="Appointment Booking">
    <Card className="max-w-xl mx-auto">
      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-center mb-2">Appointment booked</h2>
      <p role="status" className="text-sm text-gray-600 text-center mb-5">Your booking has been saved. The current status is shown below.</p>
      <Details entries={[[ 'Reference', confirmed.reference ], ['Hospital', confirmed.hospitalName], ...(confirmed.nic ? [['NIC', confirmed.nic]] : []), ['District', confirmed.district], ['Date', formatDate(confirmed.appointmentDate)], ['Time', confirmed.timeSlot], ['Status', <Badge color={statusColor(confirmed.status)}>{confirmed.statusLabel || confirmed.status}</Badge>]]} />
      <div className="flex flex-wrap gap-3 mt-6"><Button onClick={() => nav.onNavigate('donor-appointments')}>My Appointments</Button><Button variant="outline" onClick={() => { setConfirmed(null); setSlot(''); setNotes(''); setSlotRevision((n) => n + 1); }}>Book another</Button></div>
    </Card>
  </DonorLayout>;

  return <DonorLayout nav={nav} title="Book Appointment" subtitle="Choose an approved centre, date and time">
    {error && <div className="mb-4"><ErrorPanel message={error} /></div>}
    <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
      <fieldset disabled={submitting} className="lg:col-span-2 space-y-5 min-w-0">
        <legend className="sr-only">Appointment booking</legend>
        <SectionCard title="Donor identification">
          <Field label="NIC (optional)"><input type="text" maxLength={12} autoComplete="off" spellCheck={false} value={nic} onChange={e => setNic(e.target.value.toUpperCase())} className={inputClass} placeholder="e.g. 199012345678 or 901234567V" /></Field>
        </SectionCard>
        <SectionCard title="Select Donation Centre">
          {centres.loading ? <Loading label="Loading approved centres…" /> : centres.error ? <ErrorPanel message={centres.error} onRetry={centres.refresh} /> : hospitals.length === 0 ? <EmptyState title="No approved centres available" /> : <div className="space-y-4">
            <Field label="District"><select required className={inputClass} value={district} onChange={(e) => { setDistrict(e.target.value); setHospitalId(''); setSlot(''); }}>
              <option value="">Select district</option>{[...new Set(hospitals.map((h) => h.district).filter(Boolean))].sort().map((d) => <option key={d}>{d}</option>)}
            </select></Field>
            <Field label="Hospital"><select required disabled={!district} className={inputClass} value={hospitalId} onChange={(e) => { setHospitalId(e.target.value); setSlot(''); }}>
              <option value="">Select approved hospital</option>{filtered.map((h) => <option key={h.hospitalId} value={String(h.hospitalId)}>{h.name} {h.code ? `(${h.code})` : ''}</option>)}
            </select></Field>
            {selected && <p className="text-sm text-gray-500">{selected.address || selected.district}</p>}
          </div>}
        </SectionCard>
        <SectionCard title="Select Date">
          <Field label="Appointment date"><input type="date" required min={todayStr()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(''); }} className={inputClass} /></Field>
          {!validDate && <p role="alert" className="text-sm text-red-700 mt-2">Choose today or a future date.</p>}
        </SectionCard>
        <SectionCard title="Appointment Time">
          {!selected || !validDate ? <p className="text-sm text-gray-500">Select a hospital and valid date to check times.</p> : availability.loading ? <Loading label="Checking booked times…" /> : availability.error ? <ErrorPanel message={availability.error} onRetry={() => setSlotRevision((n) => n + 1)} /> : <fieldset>
            <legend className="sr-only">Available appointment time</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{SLOTS.map((s) => {
              const taken = availability.booked.includes(s);
              const disabled = !slotsReady || taken || !isFutureSlot(date, s);
              return <label key={s} className={`rounded-lg border text-center p-2 text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${slot === s ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-200'}`}>
                <input type="radio" name="time-slot" value={s} checked={slot === s} disabled={disabled} onChange={() => setSlot(s)} className="mr-2 accent-red-600" />{s}{taken && <span className="block text-xs">Booked</span>}
              </label>;
            })}</div>
            <p className="text-xs text-gray-500 mt-3">Existing appointment times are checked against booked slots. Hospital-specific schedules are not supplied by the service.</p>
          </fieldset>}
        </SectionCard>
      </fieldset>
      <div><SectionCard title="Booking Summary" className="lg:sticky lg:top-20">
        <Details entries={[[ 'Centre', selected?.name ], ...(nic.trim() ? [['NIC', nic.trim()]] : []), ['District', district || undefined], ['Date', formatDate(date)], ['Time', slot || undefined]]} />
        <div className="mt-5"><Field label="Note to the centre (optional)"><textarea disabled={submitting} rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></Field></div>
        <Button type="submit" icon={Calendar} disabled={!district || !canBook || submitting} className={`w-full mt-5 ${disabledClass}`}>{submitting ? 'Booking…' : 'Confirm booking'}</Button>
        <p className="text-xs text-gray-500 mt-3">Manage or cancel your booking in My Appointments. Hospital screening determines donation eligibility.</p>
      </SectionCard></div>
    </form>
  </DonorLayout>;
};

