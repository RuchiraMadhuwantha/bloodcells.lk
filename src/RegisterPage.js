import React, { useState } from 'react';
import {
  Droplet, Check, User, Mail, Phone, Lock, Calendar, AlertCircle, FileText, MapPin, Activity, ChevronRight
} from 'lucide-react';
import RegistrationTypeSelector from './components/registration/RegistrationTypeSelector';
import HospitalRegistrationForm from './components/registration/HospitalRegistrationForm';
import { DISTRICTS } from './data/districts';
import { buildDonorRegistrationPayload } from './services/authMapping';

export const RegisterPage = ({ onNavigate }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    gender: 'Male',
    nic: '',
    district: 'Colombo',
    bloodGroup: 'O+',
    weight: '',
    lastDonationDate: '',
    declarationChecked: false
  });

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const [regType, setRegType] = useState('donor');

  const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(form.dob);
  const isAgeValid = !form.dob || (age >= 18 && age <= 60);
  const isWeightValid = !form.weight || parseFloat(form.weight) >= 50;

  const oldNicRegex = /^[0-9]{9}[vVxX]$/;
  const newNicRegex = /^[0-9]{12}$/;
  const isNicValid = !form.nic || oldNicRegex.test(form.nic) || newNicRegex.test(form.nic);

  const handleNext = () => {
    if (step === 1) {
      if (!form.username.trim() || !form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
        alert("Please fill in all fields to set up your account.");
        return;
      }
      if (!form.email.includes('@')) {
        alert("Please enter a valid email address.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.dob || !form.nic.trim() || !form.district) {
        alert("Please fill in all demographic details.");
        return;
      }
      if (!isNicValid) {
        alert("Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits).");
        return;
      }
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!form.weight) {
      alert("Please enter your weight.");
      return;
    }
    if (!isAgeValid) {
      alert("You must be between 18 and 60 years old to register as a donor.");
      return;
    }
    if (!isWeightValid) {
      alert("You must weigh at least 50 kg to register as a donor.");
      return;
    }
    if (!form.declarationChecked) {
      alert("Please check the voluntary health declaration checkbox to register.");
      return;
    }

    try {
      const payload = buildDonorRegistrationPayload(form);
      const response = await fetch('http://localhost:5000/api/auth/register/donor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      alert(data.message || 'Registration successful! Welcome to the National Blood Transfusion Service network.');
      onNavigate('login');
    } catch (error) {
      alert(error.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg border border-red-50/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-3 text-red-600">
            <Droplet className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Become a Life Saver</h1>
          <p className="text-gray-500 text-sm mt-1">Register for the National Blood Transfusion Service</p>
        </div>

        <div className="flex justify-center mb-6">
          <RegistrationTypeSelector value={regType} onChange={setRegType} />
        </div>

        {regType === 'donor' ? (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 px-2">
              {[
                { stepNum: 1, label: 'Account' },
                { stepNum: 2, label: 'Demographics' },
                { stepNum: 3, label: 'Medical' }
              ].map((s, idx) => (
                <React.Fragment key={s.stepNum}>
                  <div className="flex flex-col items-center relative">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                      step === s.stepNum
                        ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100 scale-105'
                        : step > s.stepNum
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {step > s.stepNum ? <Check className="w-5 h-5" /> : s.stepNum}
                    </div>
                    <span className={`text-[11px] font-medium mt-1.5 transition-colors ${
                      step === s.stepNum ? 'text-red-600 font-semibold' : step > s.stepNum ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-[2px] -mt-5 mx-2 transition-all duration-350 ${
                      step > s.stepNum ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step Content */}
            <div className="space-y-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="yourname@domain.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="e.g. 0771234567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-100"
                    >
                      Next Step: Demographic Details <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={form.dob}
                        onChange={e => setForm({ ...form, dob: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                      />
                    </div>
                    {form.dob && !isAgeValid && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs transition-all">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Age Restriction Alert</p>
                          <p>You are {age} years old. Donors in Sri Lanka must be between 18 and 60 years old.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setForm({ ...form, gender: g })}
                          className={`py-2.5 text-sm font-medium rounded-lg border transition-all ${
                            form.gender === g
                              ? 'border-red-500 bg-red-50 text-red-600 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">NIC Number (National Identity Card)</label>
                    <div className="relative">
                      <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        value={form.nic}
                        onChange={e => setForm({ ...form, nic: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="e.g. 901234567V or 199012345678"
                      />
                    </div>
                    {form.nic && !isNicValid && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Invalid NIC Format</p>
                          <p>Use old format (9 digits + V/X) or new format (12 digits).</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">District</label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={form.district}
                        onChange={e => setForm({ ...form, district: e.target.value })}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50 appearance-none cursor-pointer"
                      >
                        {DISTRICTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">▾</div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all font-semibold flex items-center justify-center gap-1.5"
                    >
                      Next: Medical Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Blood Group</label>
                    <div className="grid grid-cols-4 gap-2">
                      {BLOOD_GROUPS.map(bg => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setForm({ ...form, bloodGroup: bg })}
                          className={`py-2.5 text-sm font-bold rounded-lg border transition-all ${
                            form.bloodGroup === bg
                              ? 'border-red-600 bg-red-600 text-white shadow-sm'
                              : 'border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Weight (kg)</label>
                    <div className="relative">
                      <Activity className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        value={form.weight}
                        onChange={e => setForm({ ...form, weight: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                        placeholder="Enter weight in kilograms"
                      />
                    </div>
                    {form.weight && !isWeightValid && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Weight Restriction Alert</p>
                          <p>You must weigh at least 50 kg to donate blood safely.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Last Donation Date (Optional)</label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={form.lastDonationDate}
                        onChange={e => setForm({ ...form, lastDonationDate: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50/50"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Leave empty if you have not donated blood before.</p>
                  </div>

                  <div className="flex items-start gap-2.5 bg-red-50/40 p-4 rounded-xl border border-red-100/60 mt-3">
                    <input
                      type="checkbox"
                      id="declarationChecked"
                      checked={form.declarationChecked}
                      onChange={e => setForm({ ...form, declarationChecked: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-red-600 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <label htmlFor="declarationChecked" className="text-xs text-gray-600 leading-normal select-none cursor-pointer">
                      I voluntarily confirm that I am in good general health, weigh over 50kg, and agree to the basic medical eligibility screening questionnaire of the National Blood Transfusion Service.
                    </label>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleRegister}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all font-semibold shadow-md shadow-red-100 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Submit Registration
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <HospitalRegistrationForm onCancel={() => setRegType('donor')} />
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          By registering, you agree to become a voluntary blood donor.
        </p>
        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account? <button onClick={() => onNavigate('login')} className="text-red-600 hover:underline font-semibold transition-all">Login here</button>
        </p>
      </div>
    </div>
  );
};
