import React, { useCallback, useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Edit, Save, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { DonorLayout, Loading, ErrorPanel } from './components/donor/DonorUI';
import { Badge, BloodTypeBadge, Button, SectionCard, Card } from './components/UIComponents';
import { BLOOD_GROUPS } from './components/donor/donorUtils';
import { DISTRICTS } from './data/districts';
import { useAuth } from './context/AuthContext';
import * as api from './services/api';
export { DonorDashboard } from './components/donor/DonorDashboard';
export { AppointmentBooking } from './components/donor/AppointmentBooking';

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
      <DonorLayout nav={nav} title="My Profile" userName="Donor" role="Donor">
        <Loading label="Loading profile…" />
      </DonorLayout>
    );
  }

  if (error) {
    return (
      <DonorLayout nav={nav} title="My Profile" userName="Donor" role="Donor">
        <ErrorPanel message={error} onRetry={loadProfile} />
      </DonorLayout>
    );
  }

  const displayName = profile?.full_name || user?.username || 'Donor';
  const initials = displayName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const genderOptions = ['Male', 'Female'];

  const field = (label, value) => (
    <div><p className="text-gray-400">{label}</p><p className="font-medium text-gray-800">{value || '—'}</p></div>
  );

  return (
    <DonorLayout nav={nav} title="My Profile" userName={displayName} role={`Donor · ${profile?.blood_group || ''}`}>
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
    </DonorLayout>
  );
};
