import React, { useState } from 'react';
import { Mail, Lock, User, FileText, MapPin, Phone, Check, AlertCircle } from 'lucide-react';
import { DISTRICTS } from '../../data/districts';

export const HospitalRegistrationForm = ({ onCancel }) => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    hospitalName: '',
    hospitalCode: '',
    hospitalType: '',
    district: 'Colombo',
    address: '',
    contactNumber: '',
    contactPersonName: '',
    contactPersonDesignation: '',
    contactPersonPhone: '',
    contactPersonEmail: ''
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const HOSPITAL_TYPES = ['Government Hospital','Teaching Hospital','Base Hospital','District General Hospital','Private Hospital','Other'];
  const DESIGNATIONS = ['Medical Officer','Blood Bank Officer','Hospital Administrator','Authorized Staff Member','Other'];

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required.';
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!form.hospitalName.trim()) e.hospitalName = 'Hospital name is required.';
    if (!form.hospitalCode.trim()) e.hospitalCode = 'Hospital code is required.';
    if (!form.hospitalType) e.hospitalType = 'Select hospital type.';
    if (!form.address.trim()) e.address = 'Hospital address is required.';
    if (!form.contactNumber.trim()) e.contactNumber = 'Official contact number is required.';
    if (!form.contactPersonName.trim()) e.contactPersonName = 'Contact person name is required.';
    if (!form.contactPersonDesignation) e.contactPersonDesignation = 'Select a designation.';
    if (!form.contactPersonPhone.trim()) e.contactPersonPhone = 'Contact person phone is required.';
    if (!form.contactPersonEmail.includes('@')) e.contactPersonEmail = 'Enter a valid contact email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    console.log('Hospital registration (frontend-only):', form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Submitted</h2>
        <p className="text-gray-600 mb-4">Hospital accounts require verification and approval before access to the Hospital Dashboard is granted.</p>
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg">Back</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-red-50/60 p-4 rounded-lg border border-red-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600"><FileText className="w-5 h-5" /></div>
          <div>
            <p className="font-semibold text-gray-800">Hospital accounts require verification</p>
            <p className="text-sm text-gray-600">Hospital accounts require verification and approval before access to the Hospital Dashboard is granted.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Hospital Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Name</label>
            <input value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            {errors.hospitalName && <p className="text-xs text-red-600 mt-1">{errors.hospitalName}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Registration Number / Code</label>
            <input value={form.hospitalCode} onChange={e => setForm({ ...form, hospitalCode: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            {errors.hospitalCode && <p className="text-xs text-red-600 mt-1">{errors.hospitalCode}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Type</label>
            <select value={form.hospitalType} onChange={e => setForm({ ...form, hospitalType: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50">
              <option value="">Select type</option>
              {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.hospitalType && <p className="text-xs text-red-600 mt-1">{errors.hospitalType}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">District</label>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50">
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Hospital Address</label>
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" rows={3} />
            {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Official Contact Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.contactNumber && <p className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Authorized Contact Person</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Name</label>
            <input value={form.contactPersonName} onChange={e => setForm({ ...form, contactPersonName: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            {errors.contactPersonName && <p className="text-xs text-red-600 mt-1">{errors.contactPersonName}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Designation</label>
            <select value={form.contactPersonDesignation} onChange={e => setForm({ ...form, contactPersonDesignation: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50">
              <option value="">Select designation</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.contactPersonDesignation && <p className="text-xs text-red-600 mt-1">{errors.contactPersonDesignation}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Phone</label>
            <input value={form.contactPersonPhone} onChange={e => setForm({ ...form, contactPersonPhone: e.target.value })}
              className="w-full pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            {errors.contactPersonPhone && <p className="text-xs text-red-600 mt-1">{errors.contactPersonPhone}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.contactPersonEmail} onChange={e => setForm({ ...form, contactPersonEmail: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50" />
            </div>
            {errors.contactPersonEmail && <p className="text-xs text-red-600 mt-1">{errors.contactPersonEmail}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg">Cancel</button>
        <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-lg">Submit Registration</button>
      </div>
    </form>
  );
};

export default HospitalRegistrationForm;
