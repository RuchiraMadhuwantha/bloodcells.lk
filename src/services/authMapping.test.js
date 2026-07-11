import { buildDonorRegistrationPayload, getBloodBankDemoLogin } from './authMapping';

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

describe('getBloodBankDemoLogin', () => {
  it('returns the blood bank demo profile for the dedicated credentials', () => {
    const profile = getBloodBankDemoLogin({ username: 'bloodbank_admin', password: 'NBTS@BloodBank2026!' });

    expect(profile).toEqual({
      role: 'blood_bank',
      token: 'bloodbank-demo-token',
      user: {
        username: 'bloodbank_admin',
        role: 'blood_bank',
        displayName: 'Blood Bank Admin',
      },
    });
  });

  it('returns null for non-demo credentials', () => {
    expect(getBloodBankDemoLogin({ username: 'someone', password: 'else' })).toBeNull();
  });
});
