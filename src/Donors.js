import React, { useCallback, useEffect, useState } from 'react';
import {
  Droplet, Heart, Calendar, Award, LayoutDashboard, Clock, CheckCircle, MapPin, Phone, Mail, Edit,
  Save, X, Loader2, AlertCircle, Building2
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card } from './components/UIComponents';
import { DISTRICTS } from './data/districts';
import { useAuth } from './context/AuthContext';
import * as api from './services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const ALL_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

/** Today in local time as YYYY-MM-DD (never use toISOString — that is UTC). */
const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addDaysStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ErrorPanel = ({ message, onRetry }) => (
  <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-6 text-center">
    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
    <p>{message}</p>
    {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>}
  </div>
);

const Loading = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center py-20 text-gray-500">
    <Loader2 className="w-6 h-6 animate-spin mr-2" /> {label}
  </div>
);

const statusColor = (status) => ({
  pending: 'yellow', approved: 'blue', completed: 'green',
  cancelled: 'gray', rejected: 'gray',
}[status] || 'gray');

/* ===================================================================================
   DONOR DASHBOARD — every value comes from MySQL
   =================================================================================== */

export const DonorDashboard = ({ nav }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [matching, setMatching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, m] = await Promise.all([
        api.getMyDonorSummary(),
        api.listMyAppointments(),
        api.getMatchingRequests(),
      ]);
      setSummary(s.summary);
      setAppointments(a.appointments || []);
      setMatching(m.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    setBusyId(id);
    setActionError(null);
    try {
      await api.cancelAppointment(id);
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="Donor Dashboard" userName={user?.username || 'Donor'}>
        <Loading label="Loading your donation record…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="Donor Dashboard" userName={user?.username || 'Donor'}>
        <ErrorPanel message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  const today = todayStr();
  const upcoming = appointments
    .filter((a) => ['pending', 'approved'].includes(a.status) && a.appointmentDate >= today)
    .sort((a, b) => (a.appointmentDate + a.timeSlot).localeCompare(b.appointmentDate + b.timeSlot));
  const next = upcoming[0] || null;
  const history = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));

  const displayName = summary?.fullName || user?.username || 'Donor';
  const roleLabel = `Donor · ${summary?.bloodGroup || '—'}`;

  return (
    <DashboardLayout {...nav} title="Donor Dashboard" subtitle={`Welcome back, ${displayName}`} userName={displayName} role={roleLabel}>
      {/* Eligibility is computed by the backend from the last completed donation. */}
      {summary?.eligibleNow ? (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-12 h-12" />
            <div>
              <h2 className="text-xl font-bold">You are eligible to donate</h2>
              <p className="text-white/90 text-sm">
                {summary.lastDonationDate
                  ? `Your last donation was on ${formatDate(summary.lastDonationDate)}.`
                  : 'You have not donated yet — thank you for signing up!'}
              </p>
            </div>
          </div>
          <Button variant="primary" className="bg-white text-green-700 hover:bg-gray-100" icon={Calendar} onClick={() => nav.onNavigate('donor-appointment')}>
            Book Appointment
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Clock className="w-12 h-12" />
            <div>
              <h2 className="text-xl font-bold">You are resting period</h2>
              <p className="text-white/90 text-sm">
                Donors wait {summary?.donationIntervalDays} days between donations. You can donate again on{' '}
                <strong>{formatDate(summary?.nextEligibleDate)}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Heart} value={summary?.totalDonations ?? 0} label="Completed Donations" accent="red" />
        <StatCard icon={Droplet} value={summary?.bloodGroup || '—'} label="Blood Group" accent="pink" />
        <StatCard icon={Calendar} value={upcoming.length} label="Upcoming Appointments" accent="green" />
        <StatCard
          icon={Award}
          value={summary?.eligibleNow ? 'Eligible' : formatDate(summary?.nextEligibleDate)}
          label="Next Eligible Date"
          accent="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard
          title="Upcoming Appointment"
          className="lg:col-span-1"
          action={<Button variant="ghost" className="text-xs" onClick={() => nav.onNavigate('donor-appointment')}>Book new</Button>}
        >
          {!next ? (
            <p className="text-sm text-gray-500">
              You have no upcoming appointment.{' '}
              <button onClick={() => nav.onNavigate('donor-appointment')} className="text-brand-600 hover:underline font-medium">
                Book one now
              </button>
              .
            </p>
          ) : (
            <div className="border border-red-100 bg-brand-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-brand-600 font-semibold">
                <Calendar className="w-5 h-5" /> {formatDate(next.appointmentDate)}
              </div>
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {next.timeSlot}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {next.hospitalName}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge color={statusColor(next.status)}>{next.statusLabel}</Badge>
                <span className="text-xs text-gray-500">{next.reference}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="ghost"
                  className="flex-1 text-xs text-brand-600"
                  disabled={busyId === next.id}
                  onClick={() => cancel(next.id)}
                >
                  {busyId === next.id ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Donation History" className="lg:col-span-2" action={<Badge color="gray">From your appointments</Badge>}>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No completed donations yet. Your history will appear here.</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{formatDate(a.appointmentDate)}</p>
                      <p className="text-xs text-gray-500">{a.hospitalName} · {a.timeSlot}</p>
                    </div>
                  </div>
                  <Badge color="green">{a.statusLabel}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Open Requests for ${summary?.bloodGroup || 'Your Group'}`}
          className="lg:col-span-3"
          action={<Badge color="gray">Live from hospitals</Badge>}
        >
          {matching.length === 0 ? (
            <p className="text-sm text-gray-500">
              There are no open requests for {summary?.bloodGroup} right now. Thank you for checking.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {matching.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <BloodTypeBadge group={r.bloodGroup} size="sm" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" /> {r.hospitalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.district || 'Sri Lanka'} · needs {r.quantity} unit(s)
                        {r.requiredDate ? ` · by ${formatDate(r.requiredDate)}` : ''}
                      </p>
                    </div>
                  </div>
                  {r.urgency === 'emergency' ? <Badge color="red">Urgent</Badge>
                    : r.urgency === 'urgent' ? <Badge color="yellow">Urgent</Badge>
                    : <Badge color="blue">Needed</Badge>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

/* ===================================================================================
   APPOINTMENT BOOKING — real hospitals, real slots, real booking
   =================================================================================== */

export const AppointmentBooking = ({ nav }) => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDate, setSelectedDate] = useState(addDaysStr(1));
  const [bookedSlots, setBookedSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [district, setDistrict] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Only hospitals the blood bank has approved are offered.
        const data = await api.listActiveHospitals();
        setHospitals(data.hospitals || []);
        if (data.hospitals?.length) setSelectedHospitalId(String(data.hospitals[0].hospitalId));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Booked slots come from MySQL for the chosen centre + date.
  useEffect(() => {
    if (!selectedHospitalId || !selectedDate) return;
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      try {
        const data = await api.listBookedSlots(selectedHospitalId, selectedDate);
        if (!cancelled) setBookedSlots(data.booked || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedHospitalId, selectedDate]);

  const submit = async () => {
    if (!selectedSlot || !selectedHospitalId) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await api.bookAppointment({
        hospital_id: Number(selectedHospitalId),
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        notes: notes.trim() || undefined,
      });
      setConfirmed(data.appointment);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <DashboardLayout {...nav} title="Appointment Booking" userName={user?.username || 'Donor'}>
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your slot is reserved and the hospital can see it now. Reference {confirmed.reference}.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
            <p className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium">{confirmed.hospitalName}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{formatDate(confirmed.appointmentDate)}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{confirmed.timeSlot}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Status</span><Badge color={statusColor(confirmed.status)}>{confirmed.statusLabel}</Badge></p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => nav.onNavigate('donor-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => { setConfirmed(null); setSelectedSlot(''); setNotes(''); }}>Book another</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const filtered = district
    ? hospitals.filter((h) => h.district === district)
    : hospitals;
  const selectedHospital = hospitals.find((h) => String(h.hospitalId) === String(selectedHospitalId));
  const districtOptions = [...new Set(hospitals.map((h) => h.district).filter(Boolean))].sort();
  const minDate = todayStr();

  return (
    <DashboardLayout {...nav} title="Book Appointment" subtitle="Choose an approved centre, date and time" userName={user?.username || 'Donor'}>
      {error && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Select Donation Centre"
            action={
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="py-2 px-3 border rounded-lg text-sm bg-white"
              >
                <option value="">All districts</option>
                {(districtOptions.length ? districtOptions : DISTRICTS).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            }
          >
            {loading ? (
              <Loading label="Loading approved centres…" />
            ) : filtered.length === 0 ? (
              <div className="border border-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">
                No blood banks are currently available{district ? ` in ${district}` : ''}.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c) => {
                  const active = String(c.hospitalId) === String(selectedHospitalId);
                  return (
                    <button
                      key={c.hospitalId}
                      onClick={() => setSelectedHospitalId(String(c.hospitalId))}
                      className={`w-full flex items-center justify-between border rounded-lg p-4 text-left transition-colors ${active ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-red-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.address || c.district || '—'}</p>
                        </div>
                      </div>
                      <Badge color="gray">{c.code}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Select Date">
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-2">Bookings open 30 days ahead and cannot be made in the past.</p>
          </SectionCard>

          <SectionCard title="Available Time Slots" action={slotsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {ALL_SLOTS.map((s) => {
                const taken = bookedSlots.includes(s);
                return (
                  <button
                    key={s}
                    disabled={taken || slotsLoading}
                    onClick={() => setSelectedSlot(s)}
                    className={`py-2 rounded-lg text-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                      selectedSlot === s ? 'bg-brand-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'
                    }`}
                    title={taken ? 'Already booked' : ''}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Struck-through slots are already taken for {selectedHospital?.name || 'this centre'} on {formatDate(selectedDate)}.
            </p>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Booking Summary" className="sticky top-20">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Donor</span><span className="font-medium">{user?.username || '—'}</span></div>
              <hr />
              <div className="flex justify-between"><span className="text-gray-500">Centre</span><span className="font-medium text-right">{selectedHospital?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot || '—'}</span></div>
            </div>

            <label className="block text-sm text-gray-500 mt-4 mb-1">Note to the centre (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. First time donor, please call on arrival"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />

            <Button
              onClick={submit}
              disabled={!selectedSlot || !selectedHospitalId || submitting}
              className={`w-full mt-6 ${!selectedSlot || submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Button>
            <p className="text-xs text-gray-400 text-center mt-3">You can cancel your own appointment from the dashboard.</p>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

/* ===================================================================================
   DONOR PROFILE — real profile, real update
   =================================================================================== */

export const DonorProfile = ({ nav }) => {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.me();
      setUser(data.user);
      setProfile(data.profile);
      setForm({
        full_name: data.profile?.full_name || '',
        email: data.user?.email || '',
        phone: data.profile?.phone || '',
        district: data.profile?.district || '',
        gender: data.profile?.gender || '',
        weight: data.profile?.weight ?? '',
        date_of_birth: data.profile?.date_of_birth ? String(data.profile.date_of_birth).slice(0, 10) : '',
        blood_group: data.profile?.blood_group || '',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const data = await api.updateProfile({
        email: form.email,
        full_name: form.full_name,
        phone: form.phone,
        district: form.district,
        gender: form.gender,
        weight: form.weight,
        date_of_birth: form.date_of_birth,
        blood_group: form.blood_group,
      });
      setUser(data.user);
      setProfile(data.profile);
      setEditing(false);
      setSaved(true);
      await refreshProfile();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="My Profile" userName="Donor" role="Donor">
        <Loading label="Loading profile…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="My Profile" userName="Donor" role="Donor">
        <ErrorPanel message={error} onRetry={loadProfile} />
      </DashboardLayout>
    );
  }

  const displayName = profile?.full_name || user?.username || 'Donor';
  const initials = displayName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const genderOptions = ['Male', 'Female'];

  const field = (label, value) => (
    <div><p className="text-gray-400">{label}</p><p className="font-medium text-gray-800">{value || '—'}</p></div>
  );

  return (
    <DashboardLayout {...nav} title="My Profile" userName={displayName} role={`Donor · ${profile?.blood_group || ''}`}>
      <div className="flex justify-end mb-4">
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" icon={X} onClick={() => { setEditing(false); setSaveError(null); loadProfile(); }} disabled={saving}>Cancel</Button>
            <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" icon={Edit} onClick={() => setEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {saveError && (
        <div className="bg-brand-50 border border-red-100 text-brand-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {saveError}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Profile updated successfully.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">{initials}</div>
          <h2 className="text-xl font-bold text-gray-800">{displayName}</h2>
          <p className="text-gray-500 text-sm">Username: {user?.username}</p>
          <div className="flex justify-center my-4"><BloodTypeBadge group={profile?.blood_group || '—'} size="lg" /></div>
          <Badge color={user?.account_status === 'active' ? 'green' : 'amber'}>
            {user?.account_status === 'active' ? 'Active' : (user?.account_status || 'Pending')}
          </Badge>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Personal Details">
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-400 mb-1">Full Name</label>
                  <input name="full_name" value={form.full_name} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">NIC (cannot change)</label>
                  <input value={profile?.nic || ''} disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="">Select</option>
                    {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" name="weight" value={form.weight} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Blood Group</label>
                  <select name="blood_group" value={form.blood_group} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {field('Full Name', profile?.full_name)}
                {field('Date of Birth', profile?.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : null)}
                {field('Gender', profile?.gender)}
                {field('NIC', profile?.nic)}
                {field('Weight', profile?.weight ? `${profile.weight} kg` : null)}
                {field('Blood Group', profile?.blood_group)}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Contact Details">
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-400 mb-1">Email</label>
                  <input name="email" value={form.email} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1">District</label>
                  <select name="district" value={form.district} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-brand-600" /> {profile?.phone || '—'}</p>
                <p className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-brand-600" /> {user?.email || '—'}</p>
                <p className="flex items-center gap-3 text-gray-700"><MapPin className="w-4 h-4 text-brand-600" /> {profile?.district || '—'}</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};
