import {
  buildDonorRegistrationPayload,
  buildHospitalRegistrationPayload,
  buildLoginPayload,
} from './authMapping';
import * as authMapping from './authMapping';

describe('buildDonorRegistrationPayload', () => {
  it('maps the current donor form fields to the backend-friendly payload', () => {
    const form = {
      username: 'nimal01',
      name: 'Nimal Perera',
      email: 'nimal@example.com',
      phone: '0771234567',
      password: 'StrongPass123',
      dob: '1990-01-01',
      gender: 'Male',
      nic: '199012345678',
      district: 'Colombo',
      bloodGroup: 'O+',
      weight: '74',
      lastDonationDate: '2024-01-01',
      declarationChecked: true,
    };

    expect(buildDonorRegistrationPayload(form)).toEqual({
      username: 'nimal01',
      full_name: 'Nimal Perera',
      email: 'nimal@example.com',
      phone: '0771234567',
      password: 'StrongPass123',
      date_of_birth: '1990-01-01',
      gender: 'Male',
      nic: '199012345678',
      district: 'Colombo',
      blood_group: 'O+',
      weight: '74',
      last_donation_date: '2024-01-01',
      declaration_checked: true,
    });
  });
});

describe('buildHospitalRegistrationPayload', () => {
  it('maps the hospital form fields to the backend payload', () => {
    const form = {
      username: 'hospital01',
      email: 'contact@example.com',
      password: 'StrongPass123',
      hospitalName: 'Base Hospital Negombo',
      hospitalCode: 'BH-NEG',
      hospitalType: 'Base Hospital',
      district: 'Gampaha',
      address: 'Main Road, Negombo',
      contactNumber: '0312223344',
      contactPersonName: 'Sampath Kumara',
      contactPersonDesignation: 'Blood Bank Officer',
      contactPersonPhone: '0775556667',
      contactPersonEmail: 'officer@example.com',
    };

    expect(buildHospitalRegistrationPayload(form)).toEqual({
      username: 'hospital01',
      email: 'contact@example.com',
      password: 'StrongPass123',
      hospital_name: 'Base Hospital Negombo',
      hospital_code: 'BH-NEG',
      hospital_type: 'Base Hospital',
      district: 'Gampaha',
      address: 'Main Road, Negombo',
      official_phone: '0312223344',
      contact_person_name: 'Sampath Kumara',
      contact_person_designation: 'Blood Bank Officer',
      contact_person_phone: '0775556667',
      contact_person_email: 'officer@example.com',
    });
  });
});

describe('buildLoginPayload', () => {
  it('sends only the username and password', () => {
    expect(buildLoginPayload({ username: 'nimal01', password: 'StrongPass123' })).toEqual({
      username: 'nimal01',
      password: 'StrongPass123',
    });
  });
});

describe('client-side demo bypass removal', () => {
  it('no longer exposes a Blood Bank demo login helper', () => {
    expect(authMapping.getBloodBankDemoLogin).toBeUndefined();
  });

  it('does not contain any hardcoded Blood Bank credentials', () => {
    const source = Object.values(authMapping).map(String).join('\n');
    expect(source).not.toMatch(/bloodbank[-_]?admin/i);
    expect(source).not.toMatch(/demo-token/i);
  });
});
