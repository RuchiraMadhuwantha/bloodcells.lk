import React, { useState } from 'react';
import { Mail, Lock, User, FileText, MapPin, Phone, Check, AlertCircle } from 'lucide-react';
import { DISTRICTS } from '../../data/districts';
import { buildHospitalRegistrationPayload } from '../../services/authMapping';

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
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const HOSPITAL_TYPES = ['Government Hospital','Teaching Hospital','Base Hospital','District General Hospital','Private Hospital','Other'];
  const DESIGNATIONS = ['Medical Officer','Blood Bank Officer','Hospital Administrator','Authorized Staff Member','Other'];

  const getHospitalValidationError = (field) => {
    switch (field) {
      case 'username':
        if (!form.username.trim()) return 'Username is required.';
        if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
        return null;
      case 'email':
        if (!form.email.trim()) return 'Official Email Address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.';
        return null;
      case 'password':
        if (!form.password) return 'Password is required.';
        if (form.password.length < 8) return 'Password must be at least 8 characters long.';
        return null;
      case 'confirmPassword':
        if (!form.confirmPassword) return 'Please confirm your password.';
        if (form.password !== form.confirmPassword) return 'Passwords do not match.';
        return null;
      case 'hospitalName':
        if (!form.hospitalName.trim()) return 'Hospital name is required.';
        return null;
      case 'hospitalCode':
        if (!form.hospitalCode.trim()) return 'Hospital code is required.';
        return null;
      case 'hospitalType':
        if (!form.hospitalType) return 'Select hospital type.';
        return null;
      case 'address':
        if (!form.address.trim()) return 'Hospital address is required.';
        return null;
      case 'contactNumber':
        if (!form.contactNumber.trim()) return 'Official contact number is required.';
        if (!/^(?:\+94|0)?(?:[1-9][0-9]{8}|7[0-9]{8})$/.test(form.contactNumber.trim())) return 'Please enter a valid contact number (e.g. 0112345678 or 0771234567).';
        return null;
      case 'contactPersonName':
        if (!form.contactPersonName.trim()) return 'Contact person name is required.';
        return null;
      case 'contactPersonDesignation':
        if (!form.contactPersonDesignation) return 'Select a designation.';
        return null;
      case 'contactPersonPhone':
        if (!form.contactPersonPhone.trim()) return 'Contact person phone is required.';
        if (!/^(?:\+94|0)?7[0-9]{8}$/.test(form.contactPersonPhone.trim())) return 'Please enter a valid mobile number.';
        return null;
      case 'contactPersonEmail':
        if (!form.contactPersonEmail.trim()) return 'Contact person email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactPersonEmail.trim())) return 'Please enter a valid email address.';
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validate = () => {
    const fields = [
      'username', 'email', 'password', 'confirmPassword', 'hospitalName',
      'hospitalCode', 'hospitalType', 'address', 'contactNumber',
      'contactPersonName', 'contactPersonDesignation', 'contactPersonPhone',
      'contactPersonEmail'
    ];
    const nextTouched = {};
    fields.forEach(f => { nextTouched[f] = true; });
    setTouched(prev => ({ ...prev, ...nextTouched }));

    const hasError = fields.some(f => getHospitalValidationError(f));
    return !hasError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = buildHospitalRegistrationPayload({
        username: form.username,
        email: form.email,
        password: form.password,
        hospitalName: form.hospitalName,
        hospitalCode: form.hospitalCode,
        hospitalType: form.hospitalType,
        district: form.district,
        address: form.address,
        contactNumber: form.contactNumber,
        contactPersonName: form.contactPersonName,
        contactPersonDesignation: form.contactPersonDesignation,
        contactPersonPhone: form.contactPersonPhone,
        contactPersonEmail: form.contactPersonEmail,
      });

      const response = await fetch('http://localhost:5000/api/auth/register/hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Hospital registration failed.');
      }

      setSubmitted(true);
    } catch (error) {
      alert(error.message || 'Hospital registration failed.');
    }
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
                onBlur={() => handleBlur('username')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.username && getHospitalValidationError('username') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.username && getHospitalValidationError('username') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('username')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={() => handleBlur('email')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.email && getHospitalValidationError('email') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.email && getHospitalValidationError('email') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('email')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                onBlur={() => handleBlur('password')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.password && getHospitalValidationError('password') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.password && getHospitalValidationError('password') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('password')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                onBlur={() => handleBlur('confirmPassword')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.confirmPassword && getHospitalValidationError('confirmPassword') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.confirmPassword && getHospitalValidationError('confirmPassword') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('confirmPassword')}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Hospital Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Name</label>
            <input value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })}
              onBlur={() => handleBlur('hospitalName')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.hospitalName && getHospitalValidationError('hospitalName') ? 'border-red-500' : 'border-gray-200'
              }`} />
            {touched.hospitalName && getHospitalValidationError('hospitalName') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('hospitalName')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Registration Number / Code</label>
            <input value={form.hospitalCode} onChange={e => setForm({ ...form, hospitalCode: e.target.value })}
              onBlur={() => handleBlur('hospitalCode')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.hospitalCode && getHospitalValidationError('hospitalCode') ? 'border-red-500' : 'border-gray-200'
              }`} />
            {touched.hospitalCode && getHospitalValidationError('hospitalCode') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('hospitalCode')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hospital Type</label>
            <select value={form.hospitalType} onChange={e => setForm({ ...form, hospitalType: e.target.value })}
              onBlur={() => handleBlur('hospitalType')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.hospitalType && getHospitalValidationError('hospitalType') ? 'border-red-500' : 'border-gray-200'
              }`}>
              <option value="">Select type</option>
              {HOSPITAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {touched.hospitalType && getHospitalValidationError('hospitalType') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('hospitalType')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">District</label>
            <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 border-gray-200">
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Hospital Address</label>
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              onBlur={() => handleBlur('address')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.address && getHospitalValidationError('address') ? 'border-red-500' : 'border-gray-200'
              }`} rows={3} />
            {touched.address && getHospitalValidationError('address') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('address')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Official Contact Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                onBlur={() => handleBlur('contactNumber')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.contactNumber && getHospitalValidationError('contactNumber') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.contactNumber && getHospitalValidationError('contactNumber') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('contactNumber')}</p>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Authorized Contact Person</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Name</label>
            <input value={form.contactPersonName} onChange={e => setForm({ ...form, contactPersonName: e.target.value })}
              onBlur={() => handleBlur('contactPersonName')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.contactPersonName && getHospitalValidationError('contactPersonName') ? 'border-red-500' : 'border-gray-200'
              }`} />
            {touched.contactPersonName && getHospitalValidationError('contactPersonName') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('contactPersonName')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Designation</label>
            <select value={form.contactPersonDesignation} onChange={e => setForm({ ...form, contactPersonDesignation: e.target.value })}
              onBlur={() => handleBlur('contactPersonDesignation')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.contactPersonDesignation && getHospitalValidationError('contactPersonDesignation') ? 'border-red-500' : 'border-gray-200'
              }`}>
              <option value="">Select designation</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {touched.contactPersonDesignation && getHospitalValidationError('contactPersonDesignation') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('contactPersonDesignation')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Phone</label>
            <input value={form.contactPersonPhone} onChange={e => setForm({ ...form, contactPersonPhone: e.target.value })}
              onBlur={() => handleBlur('contactPersonPhone')}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                touched.contactPersonPhone && getHospitalValidationError('contactPersonPhone') ? 'border-red-500' : 'border-gray-200'
              }`} />
            {touched.contactPersonPhone && getHospitalValidationError('contactPersonPhone') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('contactPersonPhone')}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Contact Person Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={form.contactPersonEmail} onChange={e => setForm({ ...form, contactPersonEmail: e.target.value })}
                onBlur={() => handleBlur('contactPersonEmail')}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm bg-gray-50/50 ${
                  touched.contactPersonEmail && getHospitalValidationError('contactPersonEmail') ? 'border-red-500' : 'border-gray-200'
                }`} />
            </div>
            {touched.contactPersonEmail && getHospitalValidationError('contactPersonEmail') && <p className="text-xs text-red-600 mt-1">{getHospitalValidationError('contactPersonEmail')}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors">Submit Registration</button>
      </div>
    </form>
  );
};

export default HospitalRegistrationForm;
