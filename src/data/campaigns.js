// ─────────────────────────────────────────────────────────────────────────
//  FRONTEND-ONLY SAMPLE DATA
//  These are SAMPLE Bloodcells.lk campaign records used for UI development.
//  They are NOT real campaigns and must NOT be presented as real news.
//  Structure them so they can later be replaced by a backend API / DB query
//  without changing the UI components.
// ─────────────────────────────────────────────────────────────────────────

import campaign1 from '../assets/campaigns/campaign-1.svg';
import campaign2 from '../assets/campaigns/campaign-2.svg';
import campaign3 from '../assets/campaigns/campaign-3.svg';
import campaign4 from '../assets/campaigns/campaign-4.svg';
import campaign5 from '../assets/campaigns/campaign-5.svg';
import campaign6 from '../assets/campaigns/campaign-6.svg';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CAMPAIGN_STATUSES = ['Draft', 'Upcoming', 'Active', 'Completed', 'Cancelled'];

export const MOCK_CAMPAIGNS = [
  {
    id: 'C-1001',
    name: 'Community Blood Donation Drive',
    title: 'Community Blood Donation Drive 2026',
    shortDescription:
      'A neighbourhood blood donation drive supporting local hospitals with voluntary donors.',
    detailedDescription:
      'Join our community blood donation drive organised in partnership with the regional blood bank. The campaign aims to collect voluntary donations for routine and emergency transfusion needs across Colombo. Light refreshments, health screening, and donor certificates will be provided on site.',
    image: campaign1,
    status: 'Active',
    date: '2026-07-20',
    startTime: '09:00',
    endTime: '16:00',
    venueName: 'Narahenpita Community Hall',
    address: '123 Main Street, Narahenpita',
    district: 'Colombo',
    city: 'Colombo 05',
    locationNotes: 'Parking available at the rear of the hall.',
    organizerName: 'BloodCells.lk Community Team',
    contactPerson: 'Niranjali Senanayake',
    contactNumber: '+94 11 269 5671',
    contactEmail: 'community@bloodcells.lk',
    whoCanParticipate: 'Healthy voluntary donors aged 18–60 who meet general eligibility.',
    eligibilityInfo: 'Weight above 50 kg and haemoglobin at or above 12.5 g/dL.',
    whatToBring: 'National ID, previous donor card (if any), and a photo ID.',
    preparationInstructions: 'Eat a healthy meal and drink plenty of water before donating.',
    specialInstructions: 'Avoid strenuous activity for the rest of the day after donation.',
    availableFacilities: 'Rest area, refreshments, first-aid, and free health screening.',
    emergencyContact: '+94 11 269 5671 (24/7 blood bank hotline)',
    neededBloodGroups: ['O+', 'O-', 'A+', 'B+'],
    targetDonors: 200,
    goal: 'Collect 200 voluntary donations to support hospital blood supply.',
    participants: 132,
  },
  {
    id: 'C-1002',
    name: 'University Blood Donation Campaign',
    title: 'University Blood Donation Campaign',
    shortDescription:
      'A campus-wide campaign encouraging students and staff to become voluntary blood donors.',
    detailedDescription:
      'The university campaign engages students, lecturers, and staff in voluntary blood donation. Awareness sessions and on-campus donation camps are organised in collaboration with the National Blood Transfusion Service.',
    image: campaign2,
    status: 'Upcoming',
    date: '2026-08-05',
    startTime: '08:30',
    endTime: '15:00',
    venueName: 'University of Colombo Auditorium',
    address: 'Cumaratunga Munidasa Mawatha',
    district: 'Colombo',
    city: 'Colombo 03',
    locationNotes: 'Use the eastern gate entrance for donors.',
    organizerName: 'University Student Union',
    contactPerson: 'Hasan Fernando',
    contactNumber: '+94 77 123 4567',
    contactEmail: 'campus@bloodcells.lk',
    whoCanParticipate: 'Students, staff, and nearby community members.',
    eligibilityInfo: 'General donor eligibility applies; bring student/staff ID.',
    whatToBring: 'University ID and national ID.',
    preparationInstructions: 'Get a good night sleep and eat breakfast before donating.',
    specialInstructions: 'Group bookings available for student societies.',
    availableFacilities: 'Shaded waiting area, refreshments, and counselling.',
    emergencyContact: '+94 11 269 5671',
    neededBloodGroups: ['A+', 'B+', 'O+', 'AB+'],
    targetDonors: 350,
    goal: 'Register 350 student and staff donors for the campus drive.',
    participants: 88,
  },
  {
    id: 'C-1003',
    name: 'Regional Donor Awareness Campaign',
    title: 'Regional Donor Awareness Campaign',
    shortDescription:
      'An awareness campaign promoting voluntary blood donation across the Southern Province.',
    detailedDescription:
      'This regional campaign focuses on education and awareness about voluntary blood donation, targeting rural communities with mobile information sessions and community meetings.',
    image: campaign3,
    status: 'Upcoming',
    date: '2026-08-18',
    startTime: '10:00',
    endTime: '17:00',
    venueName: 'Galle Town Centre',
    address: 'Galle Fort Road',
    district: 'Galle',
    city: 'Galle',
    locationNotes: 'Near the public bus terminal.',
    organizerName: 'Southern Provincial Health Office',
    contactPerson: 'Kumari Dissanayake',
    contactNumber: '+94 91 223 4567',
    contactEmail: 'south@bloodcells.lk',
    whoCanParticipate: 'Open to the general public.',
    eligibilityInfo: 'Informational campaign; donations accepted from eligible donors.',
    whatToBring: 'Curiosity and willingness to learn about donation.',
    preparationInstructions: 'No preparation required for the awareness sessions.',
    specialInstructions: 'Free health check-ups available on the day.',
    availableFacilities: 'Information desk, seating, and refreshments.',
    emergencyContact: '+94 11 269 5671',
    neededBloodGroups: ['O-', 'A-', 'B-'],
    targetDonors: 150,
    goal: 'Raise awareness and recruit 150 new voluntary donors.',
    participants: 41,
  },
  {
    id: 'C-1004',
    name: 'Emergency Blood Donation Initiative',
    title: 'Emergency Blood Donation Initiative',
    shortDescription:
      'A rapid-response initiative to support urgent transfusion needs during emergencies.',
    detailedDescription:
      'The emergency initiative activates voluntary donors quickly when hospitals face critical shortages. Pre-registered donors are notified for priority response.',
    image: campaign4,
    status: 'Active',
    date: '2026-07-12',
    startTime: '07:00',
    endTime: '20:00',
    venueName: 'Kandy Teaching Hospital',
    address: 'D.S. Senanayake Veediya',
    district: 'Kandy',
    city: 'Kandy',
    locationNotes: 'Emergency entrance, Block B.',
    organizerName: 'Kandy Regional Blood Centre',
    contactPerson: 'Dr. Ruwan Weerasinghe',
    contactNumber: '+94 81 234 5678',
    contactEmail: 'emergency@bloodcells.lk',
    whoCanParticipate: 'Pre-registered voluntary donors and walk-ins.',
    eligibilityInfo: 'Standard emergency eligibility screening applies.',
    whatToBring: 'Donor ID and any previous donation records.',
    preparationInstructions: 'Stay hydrated; avoid heavy meals immediately before.',
    specialInstructions: 'Priority given to O− and emergency-typed requests.',
    availableFacilities: 'Triage, medical staff, and ambulance standby.',
    emergencyContact: '+94 81 234 5678',
    neededBloodGroups: ['O-', 'O+', 'A+', 'B+', 'AB-'],
    targetDonors: 120,
    goal: 'Mobilise 120 donors to stabilise emergency stock levels.',
    participants: 97,
  },
  {
    id: 'C-1005',
    name: 'Youth Blood Donation Program',
    title: 'Youth Blood Donation Program',
    shortDescription:
      'A program engaging young people in lifelong voluntary blood donation habits.',
    detailedDescription:
      'The youth program introduces school leavers and young adults to safe, voluntary blood donation through workshops and supervised donation sessions.',
    image: campaign5,
    status: 'Draft',
    date: '2026-09-02',
    startTime: '09:30',
    endTime: '14:30',
    venueName: 'Kurunegala Youth Centre',
    address: 'Youth Centre Lane',
    district: 'Kurunegala',
    city: 'Kurunegala',
    locationNotes: 'Main hall, ground floor.',
    organizerName: 'Youth Health Network',
    contactPerson: 'Pasan Rathnayake',
    contactNumber: '+94 72 987 6543',
    contactEmail: 'youth@bloodcells.lk',
    whoCanParticipate: 'Youth aged 18 and above.',
    eligibilityInfo: 'First-time donors welcome with parental guidance if under 18.',
    whatToBring: 'National ID and consent form.',
    preparationInstructions: 'Light meal recommended two hours before donation.',
    specialInstructions: 'Group enrolment for clubs and societies.',
    availableFacilities: 'Workshop room, refreshments, and counselling.',
    emergencyContact: '+94 11 269 5671',
    neededBloodGroups: ['A+', 'O+', 'B+', 'AB+'],
    targetDonors: 180,
    goal: 'Enrol 180 young voluntary donors into the national registry.',
    participants: 12,
  },
  {
    id: 'C-1006',
    name: 'Monsoon Preparedness Blood Drive',
    title: 'Monsoon Preparedness Blood Drive',
    shortDescription:
      'A seasonal drive to build reserves ahead of the monsoon emergency period.',
    detailedDescription:
      'This completed drive built a buffer stock ahead of the monsoon season when accident-related transfusion demand typically rises.',
    image: campaign6,
    status: 'Completed',
    date: '2026-05-28',
    startTime: '08:00',
    endTime: '18:00',
    venueName: 'Matara Municipal Grounds',
    address: 'Matara Main Road',
    district: 'Matara',
    city: 'Matara',
    locationNotes: 'Open-air pavilion.',
    organizerName: 'Matara Health Division',
    contactPerson: 'Shanthi Paranavitana',
    contactNumber: '+94 41 234 5678',
    contactEmail: 'matara@bloodcells.lk',
    whoCanParticipate: 'All eligible voluntary donors.',
    eligibilityInfo: 'Standard eligibility; post-monsoon follow-up offered.',
    whatToBring: 'National ID and donor card.',
    preparationInstructions: 'Hydrate well in the warm season.',
    specialInstructions: 'Thank-you certificates issued to all donors.',
    availableFacilities: 'Shaded tents, water, and medical support.',
    emergencyContact: '+94 11 269 5671',
    neededBloodGroups: ['O+', 'O-', 'A+', 'B+', 'AB+', 'AB-'],
    targetDonors: 250,
    goal: 'Secure 250 donations to pre-build monsoon reserves.',
    participants: 244,
  },
];

export const statusBadgeColor = (status) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Upcoming':
      return 'blue';
    case 'Completed':
      return 'gray';
    case 'Cancelled':
      return 'red';
    case 'Draft':
    default:
      return 'amber';
  }
};
