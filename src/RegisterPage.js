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
  const [touched, setTouched] = useState({});

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

  const getValidationError = (field) => {
    switch (field) {
      case 'username':
        if (!form.username.trim()) return 'Username is required.';
        if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
        return null;
      case 'name':
        if (!form.name.trim()) return 'Full name is required.';
        return null;
      case 'email':
        if (!form.email.trim()) return 'Email address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
        return null;
      case 'phone':
        if (!form.phone.trim()) return 'Phone number is required.';
        if (!/^(?:\+94|0)?7[0-9]{8}$/.test(form.phone.trim())) return 'Please enter a valid Sri Lankan phone number (e.g. 0771234567).';
        return null;
      case 'password':
        if (!form.password) return 'Password is required.';
        if (form.password.length < 8) return 'Password must be at least 8 characters long.';
        return null;
      case 'dob':
        if (!form.dob) return 'Date of birth is required.';
        if (!isAgeValid) return `You are ${age} years old. Donors in Sri Lanka must be between 18 and 60 years old.`;
        return null;
      case 'nic':
        if (!form.nic.trim()) return 'NIC number is required.';
        if (!isNicValid) return 'Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits).';
        return null;
      case 'weight':
        if (!form.weight) return 'Weight is required.';
        if (!isWeightValid) return 'You must weigh at least 50 kg to donate blood safely.';
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleNext = () => {
    if (step === 1) {
      const fields = ['username', 'name', 'email', 'phone', 'password'];
      const nextTouched = {};
      fields.forEach(f => { nextTouched[f] = true; });
      setTouched(prev => ({ ...prev, ...nextTouched }));

      const hasError = fields.some(f => getValidationError(f));
      if (hasError) {
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const fields = ['dob', 'nic'];
      const nextTouched = {};
      fields.forEach(f => { nextTouched[f] = true; });
      setTouched(prev => ({ ...prev, ...nextTouched }));

      const hasError = fields.some(f => getValidationError(f));
      if (hasError) {
        return;
      }
      setStep(3);
    }
  };

  const handleRegister = async () => {
    const fields = ['username', 'name', 'email', 'phone', 'password', 'dob', 'nic', 'weight'];
    const nextTouched = {};
    fields.forEach(f => { nextTouched[f] = true; });
    setTouched(prev => ({ ...prev, ...nextTouched }));

    const hasError = fields.some(f => getValidationError(f));
    if (hasError) {
      alert("Please fix all errors before submitting.");
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-rose-700 text-white">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-14 max-w-lg">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
              <Droplet className="w-7 h-7 text-white fill-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">BloodCells<span className="text-red-200">.lk</span></span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Join the lifeline.</h1>
          <p className="text-lg text-red-100">
            Create your donor or hospital account and start saving lives across Sri Lanka in just a few steps.
          </p>
          <div className="mt-10 space-y-3 text-sm text-red-50/90">
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Quick 3-step registration</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Secure, verified accounts</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-white/80" /> Role-based dashboards on approval</div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
              <Droplet className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">BloodCells<span className="text-brand-600">.lk</span></span>
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Create your account</h2>
              <p className="text-gray-500 text-sm mt-1">Register with BloodCells<span className="text-brand-600">.lk</span></p>
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
                            ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-soft scale-105'
                            : step > s.stepNum
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                          {step > s.stepNum ? <Check className="w-5 h-5" /> : s.stepNum}
                        </div>
                        <span className={`text-[11px] font-medium mt-1.5 transition-colors ${
                          step === s.stepNum ? 'text-brand-600 font-semibold' : step > s.stepNum ? 'text-green-600' : 'text-gray-400'
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
                            onBlur={() => handleBlur('username')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.username && getValidationError('username') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="Choose a username"
                          />
                        </div>
                        {touched.username && getValidationError('username') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('username')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                          <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            onBlur={() => handleBlur('name')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.name && getValidationError('name') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter your full name"
                          />
                        </div>
                        {touched.name && getValidationError('name') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('name')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                          <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            onBlur={() => handleBlur('email')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.email && getValidationError('email') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="yourname@domain.com"
                          />
                        </div>
                        {touched.email && getValidationError('email') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('email')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                          <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            onBlur={() => handleBlur('phone')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.phone && getValidationError('phone') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g. 0771234567"
                          />
                        </div>
                        {touched.phone && getValidationError('phone') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('phone')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                        <div className="relative">
                          <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            onBlur={() => handleBlur('password')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.password && getValidationError('password') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="••••••••"
                          />
                        </div>
                        {touched.password && getValidationError('password') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('password')}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          type="button"
                          onClick={handleNext}
                          className="flex-1 bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-md shadow-soft"
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
                            onBlur={() => handleBlur('dob')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.dob && getValidationError('dob') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {touched.dob && getValidationError('dob') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('dob')}
                          </p>
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
                                  ? 'border-brand-500 bg-brand-50 text-brand-600 font-semibold'
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
                            onBlur={() => handleBlur('nic')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.nic && getValidationError('nic') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="e.g. 901234567V or 199012345678"
                          />
                        </div>
                        {touched.nic && getValidationError('nic') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('nic')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">District</label>
                        <div className="relative">
                          <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={form.district}
                            onChange={e => setForm({ ...form, district: e.target.value })}
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 appearance-none cursor-pointer"
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
                          className="flex-1 bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-all font-semibold flex items-center justify-center gap-1.5"
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
                                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                                  : 'border-gray-200 text-gray-700 hover:bg-brand-50 hover:border-brand-200'
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
                            onBlur={() => handleBlur('weight')}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50 ${
                              touched.weight && getValidationError('weight') ? 'border-brand-500 focus:ring-brand-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter weight in kilograms"
                          />
                        </div>
                        {touched.weight && getValidationError('weight') && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getValidationError('weight')}
                          </p>
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
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-gray-50/50"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Leave empty if you have not donated blood before.</p>
                      </div>

                      <div className="flex items-start gap-2.5 bg-brand-50/40 p-4 rounded-xl border border-brand-100/60 mt-3">
                        <input
                          type="checkbox"
                          id="declarationChecked"
                          checked={form.declarationChecked}
                          onChange={e => setForm({ ...form, declarationChecked: e.target.checked })}
                          className="mt-1 w-4 h-4 accent-red-600 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
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
                          className="flex-1 bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-all font-semibold shadow-md shadow-soft flex items-center justify-center gap-1.5"
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
              Already have an account? <button onClick={() => onNavigate('login')} className="text-brand-600 hover:underline font-semibold transition-all">Login here</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
