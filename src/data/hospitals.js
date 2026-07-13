import React, { createContext, useContext, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────
//  FRONTEND-ONLY SAMPLE DATA + STATE
//  These are SAMPLE hospital registration records for UI development.
//  They mirror the field names used by the existing Hospital Registration
//  form (src/components/registration/HospitalRegistrationForm.jsx) so they
//  can later be replaced by a backend API / DB query without UI changes.
//  No passwords, hashes, JWTs, or auth secrets are ever stored here.
// ─────────────────────────────────────────────────────────────────────────

export const HOSPITAL_TYPES = [
  'Government Hospital', 'Teaching Hospital', 'Base Hospital',
  'District General Hospital', 'Private Hospital', 'Other',
];

export const MOCK_HOSPITALS = [
  {
    id: 'H-2001',
    username: 'colombogeneral',
    email: 'admin@colombogeneral.lk',
    hospitalName: 'Colombo General Hospital',
    hospitalCode: 'NHTS-CG-001',
    hospitalType: 'Government Hospital',
    district: 'Colombo',
    city: 'Colombo 10',
    address: 'Regent Street, Colombo 10',
    contactNumber: '0112691111',
    contactPersonName: 'Dr. Anura Silva',
    contactPersonDesignation: 'Hospital Administrator',
    contactPersonPhone: '0771234567',
    contactPersonEmail: 'anura.silva@colombogeneral.lk',
    status: 'Active',
    registrationDate: '2026-01-12',
    approvalDate: '2026-01-15',
    rejectionReason: '',
  },
  {
    id: 'H-2002',
    username: 'kandyteaching',
    email: 'admin@kandyth.lk',
    hospitalName: 'Kandy Teaching Hospital',
    hospitalCode: 'KTH-002',
    hospitalType: 'Teaching Hospital',
    district: 'Kandy',
    city: 'Kandy',
    address: 'D.S. Senanayake Veediya, Kandy',
    contactNumber: '0812234111',
    contactPersonName: 'Mrs. Priya Ranasinghe',
    contactPersonDesignation: 'Blood Bank Officer',
    contactPersonPhone: '0772345678',
    contactPersonEmail: 'priya.r@kandyth.lk',
    status: 'Active',
    registrationDate: '2026-02-03',
    approvalDate: '2026-02-06',
    rejectionReason: '',
  },
  {
    id: 'H-2003',
    username: 'galledistrict',
    email: 'admin@galledh.lk',
    hospitalName: 'Galle District General Hospital',
    hospitalCode: 'GDH-003',
    hospitalType: 'District General Hospital',
    district: 'Galle',
    city: 'Galle',
    address: 'Galle Fort Road, Galle',
    contactNumber: '0912233444',
    contactPersonName: 'Mr. Sahan Fernando',
    contactPersonDesignation: 'Medical Officer',
    contactPersonPhone: '0773456789',
    contactPersonEmail: 'sahan.f@galledh.lk',
    status: 'Pending',
    registrationDate: '2026-07-02',
    approvalDate: '',
    rejectionReason: '',
  },
  {
    id: 'H-2004',
    username: 'kurunegalabase',
    email: 'admin@kbh.lk',
    hospitalName: 'Kurunegala Base Hospital',
    hospitalCode: 'KBH-004',
    hospitalType: 'Base Hospital',
    district: 'Kurunegala',
    city: 'Kurunegala',
    address: 'Base Hospital Road, Kurunegala',
    contactNumber: '0372233111',
    contactPersonName: 'Dr. Lakshmi Perera',
    contactPersonDesignation: 'Hospital Administrator',
    contactPersonPhone: '0774567890',
    contactPersonEmail: 'lakshmi.p@kbh.lk',
    status: 'Pending',
    registrationDate: '2026-07-05',
    approvalDate: '',
    rejectionReason: '',
  },
  {
    id: 'H-2005',
    username: 'nawalokaprivate',
    email: 'admin@nawaloka.lk',
    hospitalName: 'Nawaloka Private Hospital',
    hospitalCode: 'NPH-005',
    hospitalType: 'Private Hospital',
    district: 'Colombo',
    city: 'Colombo 02',
    address: 'Deshamanya H.K. Dharmadasa Mawatha, Colombo 02',
    contactNumber: '0115771111',
    contactPersonName: 'Mr. Roshan Mendis',
    contactPersonDesignation: 'Authorized Staff Member',
    contactPersonPhone: '0775678901',
    contactPersonEmail: 'roshan.m@nawaloka.lk',
    status: 'Rejected',
    registrationDate: '2026-03-10',
    approvalDate: '',
    rejectionReason: 'Submitted documentation was incomplete and required licences were not provided.',
  },
  {
    id: 'H-2006',
    username: 'matarageneral',
    email: 'admin@matarah.lk',
    hospitalName: 'Matara General Hospital',
    hospitalCode: 'MGH-006',
    hospitalType: 'District General Hospital',
    district: 'Matara',
    city: 'Matara',
    address: 'Main Street, Matara',
    contactNumber: '0412223111',
    contactPersonName: 'Mrs. Deepika Gunawardena',
    contactPersonDesignation: 'Blood Bank Officer',
    contactPersonPhone: '0776789012',
    contactPersonEmail: 'deepika.g@matarah.lk',
    status: 'Pending',
    registrationDate: '2026-07-08',
    approvalDate: '',
    rejectionReason: '',
  },
  {
    id: 'H-2007',
    username: 'negombodistrict',
    email: 'admin@ndh.lk',
    hospitalName: 'Negombo District Hospital',
    hospitalCode: 'NDH-007',
    hospitalType: 'District General Hospital',
    district: 'Puttalam',
    city: 'Negombo',
    address: 'Negombo Main Road, Negombo',
    contactNumber: '0312233111',
    contactPersonName: 'Mr. Chamara Jayasuriya',
    contactPersonDesignation: 'Medical Officer',
    contactPersonPhone: '0777890123',
    contactPersonEmail: 'chamara.j@ndh.lk',
    status: 'Inactive',
    registrationDate: '2026-04-01',
    approvalDate: '2026-04-04',
    rejectionReason: '',
  },
  {
    id: 'H-2008',
    username: 'jaffnateaching',
    email: 'admin@jaffnath.lk',
    hospitalName: 'Jaffna Teaching Hospital',
    hospitalCode: 'JTH-008',
    hospitalType: 'Teaching Hospital',
    district: 'Jaffna',
    city: 'Jaffna',
    address: 'Kandarodai Road, Jaffna',
    contactNumber: '0212211111',
    contactPersonName: 'Dr. Kavitha Sivakumar',
    contactPersonDesignation: 'Hospital Administrator',
    contactPersonPhone: '0778901234',
    contactPersonEmail: 'kavitha.s@jaffnath.lk',
    status: 'Active',
    registrationDate: '2026-01-20',
    approvalDate: '2026-01-22',
    rejectionReason: '',
  },
];

export const hospitalStatusBadge = (status) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Pending':
      return 'yellow';
    case 'Rejected':
      return 'red';
    case 'Inactive':
    default:
      return 'gray';
  }
};

const HospitalContext = createContext(null);
export const useHospitals = () => useContext(HospitalContext);

const today = () => new Date().toISOString().slice(0, 10);

// Frontend-only state store. Mutations update React state only.
export const HospitalProvider = ({ children }) => {
  const [hospitals, setHospitals] = useState(MOCK_HOSPITALS);

  const pendingCount = hospitals.filter((h) => h.status === 'Pending').length;

  const approve = (id) =>
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, status: 'Active', approvalDate: today(), rejectionReason: '' } : h
      )
    );

  const reject = (id, reason) =>
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, status: 'Rejected', rejectionReason: reason, approvalDate: '' } : h
      )
    );

  const reviewAgain = (id) =>
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, status: 'Pending', rejectionReason: '', approvalDate: '' } : h
      )
    );

  return (
    <HospitalContext.Provider value={{ hospitals, pendingCount, approve, reject, reviewAgain }}>
      {children}
    </HospitalContext.Provider>
  );
};
