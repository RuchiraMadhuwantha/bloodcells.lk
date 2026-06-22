import React, { useState } from 'react';
import {
  Droplet, Heart, Calendar, Award, LayoutDashboard, Clock, CheckCircle, MapPin, Phone, Mail, Edit
} from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, BloodTypeBadge, Button, SectionCard, Card } from './UIComponents';
import { BarChart } from './Charts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const DonorDashboard = ({ nav }) => {
  const history = [
    { label: 'Jan', value: 1 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 1 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 1 }, { label: 'Jun', value: 1 },
  ];
  return (
    <DashboardLayout {...nav} title="Donor Dashboard" subtitle="Welcome back, Nimal" userName="Nimal Perera" role="Donor · O+">
      {/* Eligibility banner */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Droplet} value="12" label="Total Donations" accent="red" trend={{ up: true, value: '+1 this year' }} />
        <StatCard icon={Heart} value="36" label="Lives Impacted" accent="pink" />
        <StatCard icon={Calendar} value="Jun 16" label="Next Eligible Date" accent="green" />
        <StatCard icon={Award} value="Gold" label="Donor Tier" accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* History chart */}
        <SectionCard title="Donation History" className="lg:col-span-2" action={<Badge color="gray">Last 6 months</Badge>}>
          <BarChart data={history} />
        </SectionCard>

        {/* Upcoming appointment */}
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

        {/* Emergency requests */}
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

        {/* Recommendations */}
        <SectionCard title="Recommended For You">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Award className="w-4 h-4 text-red-600 mt-0.5" /> O+ is in high demand this week — your donation is impactful.</li>
            <li className="flex items-start gap-2"><Calendar className="w-4 h-4 text-red-600 mt-0.5" /> Colombo Mega Blood Drive on Jun 24 is near you.</li>
            <li className="flex items-start gap-2"><Heart className="w-4 h-4 text-red-600 mt-0.5" /> 1 more donation reaches your Platinum tier.</li>
          </ul>
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

  const centers = [
    { name: 'NBTS Colombo', addr: 'Narahenpita, Colombo 05', dist: '2.1 km' },
    { name: 'Kurunegala RBC', addr: 'Hospital Rd, Kurunegala', dist: '4.8 km' },
    { name: 'Anuradhapura RBC', addr: 'Maithripala Rd', dist: '6.3 km' },
  ];
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
            <p className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium">{centers[selectedCenter].name}</span></p>
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
          {/* Centers */}
          <SectionCard title="Select Donation Center">
            <div className="space-y-3">
              {centers.map((c, i) => (
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
              ))}
            </div>
          </SectionCard>

          {/* Calendar */}
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

          {/* Slots */}
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

        {/* Summary */}
        <div>
          <SectionCard title="Booking Summary" className="sticky top-20">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Donor</span><span className="font-medium">Nimal Perera</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Blood Group</span><BloodTypeBadge group="O+" size="sm" /></div>
              <hr />
              <div className="flex justify-between"><span className="text-gray-500">Center</span><span className="font-medium text-right">{centers[selectedCenter].name}</span></div>
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

export const DonorProfile = ({ nav }) => (
  <DashboardLayout {...nav} title="My Profile" userName="Nimal Perera" role="Donor · O+">
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Profile card */}
      <Card className="text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">NP</div>
        <h2 className="text-xl font-bold text-gray-800">Nimal Perera</h2>
        <p className="text-gray-500 text-sm">Donor since 2019</p>
        <div className="flex justify-center my-4"><BloodTypeBadge group="O+" size="lg" /></div>
        <Badge color="amber">Gold Tier Donor</Badge>
        <Button variant="outline" icon={Edit} className="w-full mt-6">Edit Profile</Button>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        {/* Donation statistics */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Droplet} value="12" label="Donations" accent="red" />
          <StatCard icon={Heart} value="36" label="Lives Saved" accent="pink" />
          <StatCard icon={Calendar} value="96d" label="Since Last" accent="blue" />
        </div>

        {/* Personal details */}
        <SectionCard title="Personal Details">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Full Name', 'Nimal Perera'], ['Date of Birth', '12 Mar 1990'],
              ['Gender', 'Male'], ['NIC', '199012345678'],
              ['Weight', '74 kg'], ['Height', '176 cm'],
            ].map(([k, v]) => (
              <div key={k}><p className="text-gray-400">{k}</p><p className="font-medium text-gray-800">{v}</p></div>
            ))}
          </div>
        </SectionCard>

        {/* Medical info */}
        <SectionCard title="Medical Information">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-400">Allergies</p><p className="font-medium text-gray-800">None reported</p></div>
            <div><p className="text-gray-400">Chronic Conditions</p><p className="font-medium text-gray-800">None</p></div>
            <div><p className="text-gray-400">Last Hemoglobin</p><p className="font-medium text-gray-800">14.6 g/dL</p></div>
            <div><p className="text-gray-400">Eligibility</p><Badge color="green">Eligible</Badge></div>
          </div>
        </SectionCard>

        {/* Contact details */}
        <SectionCard title="Contact Details">
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-3 text-gray-700"><Phone className="w-4 h-4 text-red-600" /> +94 77 123 4567</p>
            <p className="flex items-center gap-3 text-gray-700"><Mail className="w-4 h-4 text-red-600" /> nimal.perera@email.com</p>
            <p className="flex items-center gap-3 text-gray-700"><MapPin className="w-4 h-4 text-red-600" /> 42 Galle Rd, Colombo 03</p>
          </div>
        </SectionCard>
      </div>
    </div>
  </DashboardLayout>
);
