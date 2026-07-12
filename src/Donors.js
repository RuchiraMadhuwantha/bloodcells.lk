import React, { useState } from 'react';
import {
  Droplet, Heart, Calendar, Award, LayoutDashboard, Clock, CheckCircle, MapPin, Phone, Mail, Edit,
  Save, X, Loader2, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from './components/DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card } from './components/UIComponents';
import { HOSPITALS } from './data/mockHospitals';
import { DISTRICTS } from './data/districts';
import { BarChart } from './components/Charts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const DonorDashboard = ({ nav }) => {
  const history = [
    { label: 'Jan', value: 1 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 1 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 1 }, { label: 'Jun', value: 1 },
  ];
  return (
    <DashboardLayout {...nav} title="Donor Dashboard" subtitle="Welcome back, Nimal" userName="Nimal Perera" role="Donor · O+">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-12 h-12" />
          <div>
            <h2 className="text-xl font-bold">You are eligible to donate</h2>
            <p className="text-white/90 text-sm">Your last donation was 96 days ago. Thank you for saving lives!</p>
          </div>
        </div>
        <Button variant="primary" className="bg-white text-green-700 hover:bg-gray-100" icon={Calendar} onClick={() => nav.onNavigate('donor-appointment')}>Book Appointment</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Droplet} value="12" label="Total Donations" accent="red" trend={{ up: true, value: '+1 this year' }} />
        <StatCard icon={Heart} value="36" label="Lives Impacted" accent="pink" />
        <StatCard icon={Calendar} value="Jun 16" label="Next Eligible Date" accent="green" />
        <StatCard icon={Award} value="Gold" label="Donor Tier" accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Donation History" className="lg:col-span-2" action={<Badge color="gray">Last 6 months</Badge>}>
          <BarChart data={history} />
        </SectionCard>

        <SectionCard title="Upcoming Appointment">
          <div className="border border-red-100 bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 font-semibold"><Calendar className="w-5 h-5" /> Jun 18, 2026</div>
            <p className="text-sm text-gray-600 mt-2 flex items-center gap-2"><Clock className="w-4 h-4" /> 10:30 AM</p>
            <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> NBTS Colombo</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 text-xs">Reschedule</Button>
              <Button variant="ghost" className="flex-1 text-xs text-red-600">Cancel</Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Emergency Requests Near You" className="lg:col-span-2">
          <div className="space-y-3">
            {[
              { hospital: 'Colombo General Hospital', group: 'O+', dist: '2.1 km', urgent: true },
              { hospital: 'Kurunegala Teaching Hospital', group: 'O+', dist: '5.4 km', urgent: false },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <BloodTypeBadge group={r.group} size="sm" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.hospital}</p>
                    <p className="text-xs text-gray-500">{r.dist} away · matches your group</p>
                  </div>
                </div>
                {r.urgent ? <Badge color="red">Urgent</Badge> : <Badge color="yellow">Needed</Badge>}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

export const AppointmentBooking = ({ nav }) => {
  const [selectedDate, setSelectedDate] = useState(18);
  const [selectedCenter, setSelectedCenter] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('Colombo');

  const centers = HOSPITALS.filter(h => h.district === selectedDistrict);
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  if (confirmed) {
    return (
      <DashboardLayout {...nav} title="Appointment Booking" userName="Nimal Perera" role="Donor · O+">
        <Card className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h2>
          <p className="text-gray-600 mb-6">We've reserved your slot and sent a confirmation to your email.</p>
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
            <p className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium">{centers[selectedCenter]?.name || '—'}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">Jun {selectedDate}, 2026</span></p>
            <p className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot}</span></p>
          </div>
          <Button onClick={() => nav.onNavigate('donor-dashboard')} icon={LayoutDashboard}>Back to Dashboard</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...nav} title="Book Appointment" subtitle="Choose a center, date and time" userName="Nimal Perera" role="Donor · O+">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Select Donation Center">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">Your district</div>
              <select value={selectedDistrict} onChange={e => { setSelectedDistrict(e.target.value); setSelectedCenter(0); }}
                className="py-2 px-3 border rounded-lg text-sm bg-white">
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              {centers.length === 0 ? (
                <div className="border border-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">No hospitals are currently available in your district.</div>
              ) : (
                centers.map((c, i) => (
                  <button key={i} onClick={() => setSelectedCenter(i)}
                    className={`w-full flex items-center justify-between border rounded-lg p-4 text-left transition-colors ${selectedCenter === i ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}>
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-5 h-5 ${selectedCenter === i ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.addr}</p>
                      </div>
                    </div>
                    <Badge color="gray">{c.dist}</Badge>
                  </button>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Select Date — June 2026">
            <div className="grid grid-cols-7 gap-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-xs font-medium text-gray-400 py-1">{d}</div>)}
              {days.map(d => {
                const disabled = d < 16;
                return (
                  <button key={d} disabled={disabled} onClick={() => setSelectedDate(d)}
                    className={`aspect-square rounded-lg text-sm transition-colors
                      ${disabled ? 'text-gray-300 cursor-not-allowed' : selectedDate === d ? 'bg-red-600 text-white font-semibold' : 'hover:bg-red-50 text-gray-700'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Available Time Slots">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map(s => (
                <button key={s} onClick={() => setSelectedSlot(s)}
                  className={`py-2 rounded-lg text-sm border transition-colors ${selectedSlot === s ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-700 hover:border-red-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Booking Summary" className="sticky top-20">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Donor</span><span className="font-medium">Nimal Perera</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Blood Group</span><BloodTypeBadge group="O+" size="sm" /></div>
              <hr />
              <div className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium text-right">{centers[selectedCenter]?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">Jun {selectedDate}, 2026</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot || '—'}</span></div>
            </div>
            <Button onClick={() => selectedSlot && setConfirmed(true)} disabled={!selectedSlot}
              className={`w-full mt-6 ${!selectedSlot ? 'opacity-50 cursor-not-allowed' : ''}`}>Confirm Booking</Button>
            <p className="text-xs text-gray-400 text-center mt-3">You can reschedule up to 24h before.</p>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const DonorProfile = ({ nav }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [saveError, setSaveError] = useState(null);

  const token = localStorage.getItem('authToken');

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load profile.');
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
  };

  React.useEffect(() => { loadProfile(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      const res = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile.');
      setUser(data.user);
      setProfile(data.profile);
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout {...nav} title="My Profile" userName="Donor" role="Donor">
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading profile…
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...nav} title="My Profile" userName="Donor" role="Donor">
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadProfile}>Retry</Button>
        </div>
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
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {saveError}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">NIC (cannot change)</label>
                  <input value={profile?.nic || ''} disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                    <option value="">Select</option>
                    {genderOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" name="weight" value={form.weight} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Blood Group</label>
                  <select name="blood_group" value={form.blood_group} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1">District</label>
                  <select name="district" value={form.district} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-red-600" /> {profile?.phone || '—'}</p>
                <p className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-red-600" /> {user?.email || '—'}</p>
                <p className="flex items-center gap-3 text-gray-700"><MapPin className="w-4 h-4 text-red-600" /> {profile?.district || '—'}</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

