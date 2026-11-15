# Donor frontend implementation

> **Update (backend completion):** the unavailable-resource adapters described
> below have been replaced with live APIs. See `DONOR_BACKEND.md` for the
> authoritative endpoint contracts, capability status and migration state.
> The static `donorCapabilities` flags are now all `true`; the unavailable
> states were removed from the donor UI.


## Inspection and implementation plan

The running React app is the root package.json -> src/index.js -> src/App.js.
The nested frontend/src/App.js is empty; src/components/Donors.js is an unused
demonstration component and was left untouched. The root src/Donors.js exports
the active donor screens.

Preserve: AuthProvider session verification, JWT fetch client, role-prefix guards,
state-based client navigation, donor profile read/update, approved hospital
selection, appointment booking/cancellation, existing Tailwind/lucide UI.
Extend: donation history previously embedded in the dashboard, booking validation,
donor-safe matching requests, dashboard links, and the existing header bell.
Add: standalone history and appointment management, campaign browse/My Campaigns,
notification centre, alert listing/details, shared donor UI and service adapters.
Backend dependencies: campaign publication/participation, notifications/read state,
rescheduling, and interest responses have no routes. Keep those unavailable and
disable mutations. No invented requests, sample production data, local persistence,
backend edits, database edits, dependency installation, or deployment.

DashboardLayout, Button, SectionCard, StatCard, Table, Badge, BloodTypeBadge and
CampaignCard are reused. The optional donorView on CampaignCard adds donor
location/organizer information; existing bank callers retain their existing data
and actions. The header's optional onNotifications callback only changes donor
navigation; other portals retain their existing dropdown.

## Actual integrated endpoints

All paths below are relative to the existing API_BASE. Existing authentication and
401 session-expiration handling remain in src/services/apiClient.js.

| Endpoint | Actual response / use |
| --- | --- |
| GET /auth/me | user and profile, unchanged |
| PUT /auth/profile | existing donor profile update, unchanged |
| GET /hospitals/active | hospitals with hospitalId, name, code, district, address |
| GET /appointments/mine | appointments with id, reference, hospitalName, district, bloodGroup, appointmentDate, timeSlot, notes, status, statusLabel |
| GET /appointments/slots/:hospitalId?date=YYYY-MM-DD | booked: time strings |
| POST /appointments | hospital_id, appointment_date, time_slot, optional notes; returns appointment |
| PUT /appointments/:id/cancel | returns message and updated appointment |
| GET /donors/me/summary | summary: fullName, bloodGroup, totalDonations, upcomingAppointments, eligibleNow, nextEligibleDate, donationIntervalDays |
| GET /blood-requests/matching | bloodGroup and requests; donor-authorized public-safe projection only |

Appointment statuses exposed by current backend: pending, approved, completed,
cancelled. History consists only of completed appointments, matching the existing
dashboard and backend donation-count calculation. There is no separate donation
ledger or quantity field today. The history view supports quantity if later
supplied, without inventing one.

The matching request endpoint only retrieves the signed-in donor's blood group.
District, blood group, and urgency filters operate within that authorized set.
No donor request-detail or response endpoint exists. Description and response
instructions are absent and are explicitly shown as not provided. Internal
hospital/bank request reasons, patient information, and decision notes are never
requested or displayed.

Booking preserves the original time choices. The backend returns occupied slots,
not hospital-specific opening hours. The form labels this limitation, rejects past
dates/times, clears choices after centre/date changes, ignores stale availability
responses, blocks submission when availability fails, and prevents repeated submits.
The old unsupported claim of a 30-day booking window has been removed.

## Feature status

| Feature | Frontend | Backend API | Status |
| --- | --- | --- | --- |
| D01 history | Search, year/date filters, sort, details, recorded count | Completed entries from /appointments/mine | Fully integrated with current appointment-backed history |
| D02 booking/list/details/cancel | Validation, returned status, confirmation, processing/error states | Existing appointment/hospital routes | Fully integrated for existing operations |
| D02 reschedule | Explicitly disabled with explanation | Missing | Frontend complete, backend pending |
| D03 campaigns and My Campaigns | Filters, existing campaign cards, details, registration/participation layout; unavailable state | Missing | Frontend complete, backend pending |
| D04 notifications | Type/read filters, list/details/action-link layout, unread-count handling; disabled read actions and unavailable state | Missing | Frontend complete, backend pending |
| D05 alerts | Authorized cards, filters, details, honest missing description/instructions | Matching read endpoint only | Partially implemented: retrieval integrated; response pending |
| Dashboard/navigation | Nine sidebar destinations, independent data loading, existing bell links to notification centre | Summary/appointments/matching reads | Integrated; campaigns/notifications show unavailable |

The unavailable resource functions return { available: false, items: [], reason }.
These are capability states, not successful empty API responses. They make no
network requests to guessed endpoints.

## Missing backend requirements (proposals only)

The following URLs are proposed contracts for later backend work, not routes
implemented or called by this change. Confirm names/contracts with backend owners
before wiring them through the existing API client.

1. PUT /appointments/:id/reschedule: ownership-checked date/time update, atomic
   availability and duplicate checks, allowed statuses, updated appointment.
   Hospital-specific available slots would also remove the existing fixed choices.
2. GET /campaigns: only authorized published campaign records, with id, name,
   date (YYYY-MM-DD), startTime, endTime, district, organizerName, status,
   venueName/address, shortDescription, detailedDescription; optional image,
   city, neededBloodGroups, participants/targetDonors, whoCanParticipate,
   whatToBring, preparationInstructions. This follows the existing CampaignCard
   shape, without using MOCK_CAMPAIGNS.
3. POST /campaigns/:id/registrations, GET /campaigns/registrations/mine,
   DELETE /campaigns/:id/registrations/mine: ownership-checked registration,
   duplicate/capacity checks and cancellation. My Campaigns needs records shaped
   as { id, status, campaign } with persisted registration/participation status.
4. GET /notifications: authenticated donor-scoped records with id, title,
   description, type, createdAt (timestamp with timezone), isRead (boolean),
   optional actionRoute. Type keys are listed in donorUtils.js and cover
   confirmation, reminder, approval, rejection, rescheduling, cancellation,
   campaign, emergency, and general announcements.
5. PUT /notifications/:id/read and PUT /notifications/read-all: persisted,
   donor-scoped read state and authoritative unread count. No current page
   mutates read state or suggests browser-only marks are persisted.
6. Donor-safe request detail fields for a public alert description and response
   instructions; POST /blood-requests/:id/interest for ownership-scoped interest,
   duplicate prevention and an authoritative response. Do not expose patient or
   internal clinical details. Current matching retrieval can remain scoped.
7. Optional separate donation-ledger endpoint if distinct donation IDs, collected
   volume/quantity and non-appointment donations need to be tracked.

When these are implemented, replace the unavailable service adapters, map the
confirmed response shapes, and add real mutation methods/handlers before enabling
any currently disabled action. The static capability flags must not be treated
as implementations. Dashboard campaign/notification summaries also need to be
connected when those resources become available.

## Modified files

Modified:
- src/App.js
- src/Donors.js (dashboard and booking extracted; profile logic retained)
- src/components/DashboardShell.js
- src/components/CampaignCard.jsx

Created:
- src/services/donorService.js
- src/components/donor/DonorUI.jsx
- src/components/donor/donorUtils.js
- src/components/donor/DonorDashboard.jsx
- src/components/donor/AppointmentBooking.jsx
- src/components/donor/DonorRecords.jsx
- src/components/donor/DonorCampaigns.jsx
- src/components/donor/DonorNotifications.jsx
- src/components/donor/EmergencyAlerts.jsx
- src/services/donorService.test.js
- src/components/donor/DonorModules.test.jsx
- src/DonorNavigation.test.jsx
- DONOR_FRONTEND.md

## Validation and remaining verification

Automated coverage uses Jest/React Testing Library and mocked API responses;
test fixtures are not imported by production code. It covers donor navigation,
login/profile regression, expired sessions, role guards, filtering/details,
cancellation confirmation, duplicate cancellation protection, unavailable
resources, booking validation/centre changes/stale responses, and safe alerts.

Live read-only probes verified /health and /health/db, and confirmed HTTP 401
without a token for appointments/mine, hospitals/active, donors/me/summary, and
blood-requests/matching. No authenticated live mutation was executed.

Before full operation: implement the missing APIs above, wire and enable their
handlers, run authenticated API integration with a donor account, and perform
browser/end-to-end and viewport checks on desktop/tablet/mobile. Browser-based
tests and visual responsive verification were not executed in this session.


### Commands and outcomes

- npm.cmd run build — final run compiled successfully with no build warnings.
- CI=true npm.cmd test -- --watchAll=false --runInBand (CI set as a PowerShell environment variable) — 5 suites, 31 tests passed. Node printed an existing dependency punycode deprecation warning.
- node_modules/.bin/eslint.cmd --ext .js,.jsx src/Donors.js src/App.js src/DonorNavigation.test.jsx src/components/DashboardShell.js src/components/CampaignCard.jsx src/components/donor src/services/donorService.js src/services/donorService.test.js — exit 0, no warnings/errors. There is no separate lint script in package.json.
- git diff --check — passed.
- Invoke-WebRequest http://localhost:5000/health and /health/db — successful; backend running and database connected.
- Read-only Node fetch probes for the four authenticated GET endpoints listed above — each returned 401 without a token as expected.

The first build identified UTF-8 BOM warnings, which were removed. An initial
navigation-test query matched both the navbar and form login buttons; the test
selector was corrected. The final build/lint/test results above supersede those
intermediate runs. No actual donor credentials were used and no live database
records were created, changed, or deleted.


Dashboard follow-up: removed the repeated navigation button grid above the summary. All donor destinations remain in the sidebar.
