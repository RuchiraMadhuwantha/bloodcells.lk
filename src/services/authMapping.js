export const buildDonorRegistrationPayload = (form) => ({
  username: form.username,
  full_name: form.name,
  email: form.email,
  phone: form.phone,
  password: form.password,
  date_of_birth: form.dob,
  gender: form.gender,
  nic: form.nic,
  district: form.district,
  blood_group: form.bloodGroup,
  weight: form.weight,
  last_donation_date: form.lastDonationDate,
  declaration_checked: form.declarationChecked,
});

export const buildHospitalRegistrationPayload = (form) => ({
  username: form.username,
  email: form.email,
  password: form.password,
  hospital_name: form.hospitalName,
  hospital_code: form.hospitalCode,
  hospital_type: form.hospitalType,
  district: form.district,
  address: form.address,
  official_phone: form.contactNumber,
  contact_person_name: form.contactPersonName,
  contact_person_designation: form.contactPersonDesignation,
  contact_person_phone: form.contactPersonPhone,
  contact_person_email: form.contactPersonEmail,
});

export const buildLoginPayload = (form) => ({
  username: form.username,
  password: form.password,
});

export const getBloodBankDemoLogin = (form) => {
  const DEMO_USERNAME = 'bloodbank_admin';
  const DEMO_PASSWORD = 'NBTS@BloodBank2026!';

  if (form?.username === DEMO_USERNAME && form?.password === DEMO_PASSWORD) {
    return {
      role: 'blood_bank',
      token: 'bloodbank-demo-token',
      user: {
        username: DEMO_USERNAME,
        role: 'blood_bank',
        displayName: 'Blood Bank Admin',
      },
    };
  }

  return null;
};
