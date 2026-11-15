# Donor Backend — Implementation Report

Bloodcells.lk — Donor-level modules (D01–D05), plus dashboard/profile integration.
Status date: 2026-11-14. Environment: Node.js + Express (`backend/`), MySQL 8.4.7 (`nbts` database), React donor UI (`src/`).

## A. Existing functionality found (before these changes)

- Donor registration with bcrypt hashing, duplicate username/email/NIC rejection, `donor` role, `account_status = active`.
- Donor + hospital + blood bank login with JWT; auth middleware re-reads the role/status from MySQL on every request (a stale token cannot keep a rejected account alive); role middleware (`allowRoles`).
- Forgot/reset password: `password_reset_tokens` table (hashed, expiring, single-use tokens) — **already implemented in the backend**; no SMTP is configured, so in non-production the reset link is only logged server-side (and returned as `resetToken` outside production). It was **not** silently extended; see Section H.
- Profile read (`GET /api/auth/me`) and update (`PUT /api/auth/me`); protected columns (role, account_status, vanity fields) are not writable via the profile endpoint; users can only edit their own row.
- Appointments: book (`POST /api/appointments`), list own (`GET /api/appointments/mine`), cancel (`PUT /api/appointments/:id/cancel`), centre slot availability (`GET /api/appointments/slots/:hospitalId`), hospital inbox (`GET /api/appointments/hospital`), bank review (`GET /api/appointments`, `PUT /api/appointments/:id/status`), plus a 15-minute duplicate-slot check and an `uk_appointments_slot` unique index.
- Donor dashboard summary (`GET /api/donors/me/summary`) and blood bank donor directory (`/api/donors`).
- Matching open blood requests for the donor's own group (`GET /api/blood-requests/matching`) — **kept unchanged** (see note in Section H).
- Blood bank stats (`/api/stats/blood-bank`), hospital approval workflow, blood requests, inventory — all untouched.
- Frontend donor portal existed with the API wiring to *shared* endpoints, but campaigns / notifications / reschedule / alert responses were hard-disabled ("unavailable" screens, `{ available: false }`); donation "history" was rendered by filtering `/appointments/mine` for `completed` rows client-side.

Not present anywhere before: any campaign, notification, emergency-alert or donation-specific backend; any tables other than the 7 listed below.

## B. Implemented features

| Module | Status | Notes |
|---|---|---|
| D01 Donation history | **Fully working and tested** | New donor-scoped ledger view over completed appointments; year/date filter, sort, pagination, per-record details, total completed count. |
| D02 Appointment management | **Fully working and tested** | Booking (now transactional, centre-capacity aware), list/detail, cancel, **reschedule** (new), slot availability, atomic duplicate prevention. Fixed a bank-side bug that made `pending → completed` impossible. |
| D03 Campaign participation | **Fully working and tested** | Campaign storage (reuse of the frontend campaign data model), public browse, register / re-register / cancel, capacity + duplicate enforcement, blood bank create/update/publish via API. |
| D04 Donor notifications | **Fully working and tested** | Persisted notifications; created automatically on book, approve, complete, cancel, reschedule, campaign registration, emergency alert publish. Read / read-all / unread-count. |
| D05 Emergency alerts | **Fully working and tested** | Blood bank publishes alerts (stand-alone or backed by a genuine hospital blood request); fan-out notifications to registered donors of the matching blood group in the district; donor respond (duplicate-safe, blood-group-matched), close; patient/clinical data never exposed. |
| Donor registration | Fully working (unchanged, e2e-verified) | No changes required; bcrypt + transaction verified. |
| Authentication | Fully working (unchanged, e2e-verified) | JWT + DB re-read; role restrictions enforced server-side. |
| Profile management | Fully working; **fixed frontend URL bug** | `PUT /auth/profile` (404, broken) → `PUT /api/auth/me`. |
| Dashboard API integration | Fully working | Summary, appointments, donations, campaigns, unread notifications, emergency alerts all wired to live APIs. Campaign completion notifications now include `appointment_completed`. |

## C. Files changed

### Backend — new
- `backend/database/migrations/001_donor_modules.sql` — creates `campaigns`, `campaign_registrations`, `notifications`, `emergency_alerts`, `emergency_alert_responses` (additive).
- `backend/database/migrations/002_appointments_active_slot_uniqueness.sql` — active-slot uniqueness for appointments (drops legacy `uk_appointments_slot`, adds NULL-for-cancelled VIRTUAL columns + unique indexes). See Section E.
- `backend/models/donationModel.js` — completed-appointment donation records (see D01 note below).
- `backend/models/campaignModel.js`, `models/notificationModel.js`, `models/emergencyAlertModel.js` — data access.
- `backend/controllers/donationController.js`, `controllers/campaignController.js`, `controllers/notificationController.js`, `controllers/emergencyAlertController.js` — request handlers.
- `backend/routes/donationRoutes.js` (mounted under `/api/donors`), `routes/campaignRoutes.js`, `routes/notificationRoutes.js`, `routes/emergencyAlertRoutes.js`.
- `backend/scripts/donorModulesE2eTest.js` — 74-check donor-module e2e suite (creates and cleans up `e2e_*` records).

### Backend — modified
- `database/schema.sql` — appended the five new `CREATE TABLE IF NOT EXISTS` blocks; `appointments` now carries the fixed unique-index shape on fresh installs.
- `server.js` — mounts the new routers.
- `models/appointmentModel.js` — `createAppointment` is transactional (hospital row lock, per-donor duplicate check, centre slot capacity); new `rescheduleAppointment` (ownership, status, capacity, duplicate checks); `updateAppointmentStatus`/`getAppointmentById` accept a transaction executor.
- `models/donorModel.js` — added `getUserIdByDonorId`, `findDonorUserIdsForBloodGroup` (notification fan-out).
- `controllers/appointmentController.js` — booking/cancel/reschedule now run in transactions and emit persisted notifications; **state machine fix**: `pending → approved/completed/cancelled`, `approved → completed/cancelled` (previously every final state blocked every transition, so completion was impossible); new `getMyAppointment` (donor-scoped details) and `rescheduleMyAppointment`; raw duplicate-key errors mapped to actionable messages.
- `routes/appointmentRoutes.js` — reschedule route, donor `GET /:id` (declared after fixed paths).
- `validators/domainValidators.js` — reschedule, campaign, emergency-alert, notification rule sets.

### Frontend — modified
- `src/services/api.js` — added donation history, campaigns, notifications, emergency-alert methods; `apiDelete` import; **fixed** `updateProfile` → `PUT /auth/me`.
- `src/services/donorService.js` — all unavailable adapters replaced with live API calls; `donorCapabilities` now all `true`.
- `src/components/donor/DonorCampaigns.jsx` — real register/cancel with double-submit locking, refresh, success/error states.
- `src/components/donor/DonorNotifications.jsx` — mark read / mark-all-read wired to server; unread badge from server count.
- `src/components/donor/DonorRecords.jsx` — reschedule dialog (date + slot) for pending/approved appointments.
- `src/components/donor/EmergencyAlerts.jsx` — emergency-alert API, respond flow with `responded` state, description/instructions shown when published.
- `src/components/donor/DonorDashboard.jsx` — campaigns / notifications / emergency-alerts sections render live data.
- `src/components/donor/donorUtils.js` — added `appointment_completed` notification type.
- `src/services/bankService.js` — `getCampaigns` now reads the real campaign API (read-only); the bank Campaign Management screen remains create/publish-via-API only (see Section H).
- `src/services/bankService.test.js`, `src/services/donorService.test.js`, `src/components/donor/DonorModules.test.jsx` — updated tests.
- `DONOR_FRONTEND.md` — pointer note added.

## D. API documentation

All routes except health endpoints require `Authorization: Bearer <token>`. `(donor)` = `allowRoles('donor')`, `(bank)` = `allowRoles('blood_bank')`, `(auth)` = any signed-in role. Donors always act on their **own** records — no donor ID is ever read from the request for authorization.

### Donation history (D01)
- `GET /api/donors/me/donations?year=2026&date=2026-11-14&sort=desc|asc|recent|oldest&page=1&pageSize=50` (donor)
  → `{ success, donations: Donation[], items: Donation[], pagination: { total, page, pageSize, totalPages }, totalCompleted }`
  `Donation = { id, donationId, reference: 'AP-00042', donorId, hospitalId, donationDate, timeSlot, location, hospitalName, hospitalCode, district, bloodGroup, status: 'completed', statusLabel: 'Completed', quantity: null, notes }`
  Filters validate types (400 on bad input); `quantity` is always `null` because no ledger records volume.
- `GET /api/donors/me/donations/:id` (donor) → `{ success, donation }` or 404 (also when the record belongs to another donor).

### Appointments (D02)
- `POST /api/appointments` (donor) — body `{ hospital_id: int, appointment_date: 'YYYY-MM-DD', time_slot: 'HH:MM', notes? }`
  → 201 `{ success, message, appointment }`. Validates: donor profile, active/approved hospital, date not in past, slot format, per-donor duplicate active booking, centre slot free (transaction + row lock). Errors: 400 past/invalid, 403 role, 404 donor profile, 409 duplicate/centre occupied.
- `GET /api/appointments/mine` (donor) → `{ success, appointments[] }`.
- `GET /api/appointments/:id` (donor) → `{ success, appointment }` — 403 if not owned.
- `PUT /api/appointments/:id/reschedule` (donor) — body `{ appointment_date, time_slot }` → `{ success, message, appointment }`. Ownership, status must be `pending|approved`, new date not in past, centre slot free, donor slot free. Errors: 400/403/404/409.
- `PUT /api/appointments/:id/cancel` (donor) — status-based cancellation (record kept), 409 if already cancelled/completed.
- `GET /api/appointments/slots/:hospitalId?date=YYYY-MM-DD` (auth) → `{ success, booked: ['HH:MM'] }`.
- `GET /api/appointments/hospital` (hospital), `GET /api/appointments` (bank), `PUT /api/appointments/:id/status` (bank) — body `{ status: 'approved'|'completed'|'cancelled' }`, transitions `pending→approved/completed/cancelled`, `approved→completed/cancelled`. **Previously impossible** to complete an appointment; fixed. (Bank UI `appointmentActions` still offers only `pending → …`; backend additionally permits `approved → completed/cancelled` for API users.)

### Campaigns (D03)
- `GET /api/campaigns?district&date&period=upcoming|past|all` (donor, bank) — donors see only `Upcoming`/`Active` campaigns; bank sees all statuses. → `{ success, campaigns[] }` with card-shaped fields (`name, shortDescription, detailedDescription, date, startTime, endTime, venueName, address, district, city, organizerName, neededBloodGroups[], participants, targetDonors, status, …`).
- `GET /api/campaigns/:id` (donor, bank) — donors: published only (404 otherwise).
- `POST /api/campaigns/:id/registrations` (donor) — body `{ note? }` → 201 `{ success, registration }`. Checks: exists, `Upcoming|Active`, date not passed, capacity (`targetDonors`, enforced with row lock), duplicate active registration (unique key). Re-registration after cancellation re-uses the row. Notification `campaign` is created atomically.
- `GET /api/campaigns/registrations/mine` (donor) → `{ success, registrations: [{ id, reference, status, note, registeredAt, updatedAt, campaign }] }`.
- `DELETE /api/campaigns/:id/registrations` (donor) — cancels own registration (row kept, `status='cancelled'`). 409 if already cancelled or campaign closed/past.
- `POST /api/campaigns` / `PUT /api/campaigns/:id` (bank) — create/update/publish; validators + `endTime > startTime`.

### Notifications (D04)
- `GET /api/notifications?type&unread=true&limit&offset` (auth) → `{ success, notifications: [{ id, type, title, description, message, relatedType, relatedId, actionRoute, isRead, readAt, createdAt }], unreadCount }`. Always scoped to the caller.
- `GET /api/notifications/unread-count` (auth) → `{ success, unreadCount }`.
- `GET /api/notifications/:id` (auth) → 404 when not owned.
- `PUT /api/notifications/:id/read` (auth) → `{ success, notification, unreadCount }`.
- `PUT /api/notifications/read-all` (auth) → `{ success, updated, unreadCount: 0 }`.
- Types: `appointment_confirmation`, `appointment_reminder`, `appointment_approved`, `appointment_rejected`, `appointment_rescheduled`, `appointment_cancelled`, `appointment_completed`, `campaign`, `emergency`, `general`.

### Emergency alerts (D05)
- `GET /api/emergency-alerts?bloodGroup&district&mine=true` (donor, bank) — donor: **active only**, scoped to their own registered blood group (other groups are rejected with 403); each alert carries `responded: bool`. Bank: full history incl. closed. Response never includes patient or clinical data.
- `GET /api/emergency-alerts/:id` (donor, bank) — donor: active only + `responded`.
- `POST /api/emergency-alerts/:id/respond` (donor) — body `{ note? }` → 201 `{ response: { id, alertId, status: 'interested' } }`. Validates: active alert, blood group matches the donor's registered group (403), duplicate interest (409, also DB unique key). Interest ≠ donation ≠ eligibility.
- `POST /api/emergency-alerts` (bank) — publish. With `blood_request_id`, pulls the genuine hospital request (rejects rejected/cancelled ones); otherwise explicit `blood_group` required. **Nothing is ever auto-published.** Fan-out notifications to active donors of the matching blood group in the alert's district.
- `PUT /api/emergency-alerts/:id/close` (bank).

## E. Database changes

Tables reused (untouched structure): `users`, `donors`, `hospitals`, `blood_requests`, `appointments`, `blood_inventory`, `password_reset_tokens`.

**001_donor_modules.sql — APPLIED to live `nbts` (2026-11-14, user-authorized), via direct execution of the file:**
`campaigns`, `campaign_registrations`, `notifications`, `emergency_alerts`, `emergency_alert_responses`.
- `campaign_registrations`: unique `(campaign_id, donor_id)` — duplicate prevention at the DB level; re-registration flips the same row.
- `emergency_alert_responses`: unique `(alert_id, donor_id)`.
- `emergency_alerts.blood_request_id`: unique (one donor-facing alert per hospital request), `ON DELETE SET NULL`.
- `notifications`: `(user_id, is_read)` index for unread counts.

**002_appointments_active_slot_uniqueness.sql — APPLIED to live `nbts` (2026-11-14, user-authorized after preflight PASS, 0 active duplicates):**
Added VIRTUAL columns `active_donor_slot`, `active_centre_slot` (both NULL when `status='cancelled'`), dropped legacy `uk_appointments_slot`, added `idx_appointments_donor` (FK support) and unique indexes `uk_appointments_donor_active_slot`, `uk_appointments_centre_active_slot`. Note: MySQL 8.4.7 rejected STORED generated columns here with error 1215; VIRTUAL + unique indexes achieve the same guarantee. Preflight queries (centre and donor duplicate active slots) returned 0 rows.

**schema.sql** now produces the final shape for fresh installs (verified end-to-end on a throwaway `bloodcells_schema_check` database that was created and dropped immediately: 14/14 statements applied, 12 tables, correct indexes).

Data preserved: `nbts` pre/post-test counts — users 12, donors 7, hospitals 4, appointments 3 (verified identical before/after; only `e2e_*` records created/removed). During the first e2e run, the emergency-alert fan-out notified 3 pre-existing O+ donors about a test alert; those 3 notifications (ids 9–11) were identified and deleted; the suite now fans out only to `E2E District` donors.

## F. Integration status

| Module | Backend | MySQL | Frontend | Remaining work |
|---|---|---|---|---|
| D01 Donation history | Fully working and tested | Works (live nbts) | Fully integrated | None for current scope; a real donation ledger (quantity) if a collection workflow is added |
| D02 Appointments (book/list/details/cancel/reschedule) | Fully working and tested | Works (live nbts, migration 002) | Fully integrated | Hospital-side approval UI toggles OFF → completed flow unchanged (UI offers pending→…); matching is app-enforced + DB-enforced |
| D03 Campaigns | Fully working and tested | Works (live nbts, 001) | Donor UI fully integrated; bank UI read-only list wired | Bank campaign **create/publish/close** has API but no wired UI (bank screen remains preview-only by existing design) |
| D04 Notifications | Fully working and tested | Works (live nbts, 001) | Fully integrated | SMS/email delivery is **not** configured (see H) |
| D05 Emergency alerts | Fully working and tested | Works (live nbts, 001) | Fully integrated (respond flow) | Bank alert publication UI is API-only; matching is blood group + district hints, never eligibility |
| Donor registration/login/profile | Fully working and tested | Unchanged | Integrated (profile URL bug fixed) | Nothing |
| Dashboard API | Fully working | Works | Live data end-to-end | Nothing |

## G. Testing results

- **Backend unit/e2e:** `node scripts/donorModulesE2eTest.js` — **74/74 PASS** against the live stack (covers D01–D05 incl. capacity, duplicate registration/response/booking/reschedule, ownership-404/403, closed-alert respond, cancel→rebook slot, re-registration). Cleans up after itself; post-run state identical to pre-run.
- **Project regression suite:** `node scripts/e2eTest.js` — **113/113 PASS** (inventory restored byte-for-byte by the suite).
- **Frontend:** `CI=true npm test -- --watchAll=false --runInBand` — **100/100 PASS** (14 suites). `npm run build` — **compiles cleanly** (one stale `.eslintcache` caused a phantom error; removed).
- Not executed: browser/manual E2E in the React dev server (no donor credentials available to the agent; the dev server + this build are ready to verify manually). SMS/email delivery not testable (no provider configured).

## H. Remaining development tasks / dependencies

1. **Campaign creation UI (Blood Bank):** the backend supports `POST/PUT /api/campaigns` (publish via `status`), but `CampaignManagement.jsx` is a preview-only screen; it now *lists* real campaigns but its Save/Publish/Close buttons are intentionally still disabled. Wire the form to `POST/PUT /api/campaigns` to complete the loop — donors see whatever the bank publishes.
2. **Emergency alert publication UI (Blood Bank):** `POST /api/emergency-alerts` (optionally `blood_request_id`) and `PUT /api/emergency-alerts/:id/close` are API-only; there is no bank screen yet. Alerts must be published by authorized personnel by design.
3. **Blood bank appointment completion flow:** bank UI marks appointments completed from `pending` only; backend also permits `approved → completed/cancelled`. Align the UI if a "check-in then complete" flow is desired (this completion is what D01 history counts).
4. **Bank Campaign "My Campaigns" dependency (D03):** `GET /api/campaigns/registrations/mine` is consumed; any future participant list for organizers would use `campaign_registrations`.
5. **Donation ledger:** no quantity/volume is recorded anywhere, so D01 reports `quantity: null` and uses completed appointments as the canonical "recorded donation". If a real ledger arrives, only `donationModel.js` changes.
6. **`blood-requests/matching`** (pre-existing, hospital→donor matching list) was left untouched per "preserve working functionality". The donor dashboard/alerts now use the purpose-built emergency-alert module instead.
7. **Password recovery:** backend reset flow exists (hashed, expiring, single-use; dev reset link in server logs / response outside production). For production: configure an SMTP provider (e.g., via env `SMTP_*`), send the link by email, remove the token from any response body, add rate limiting, and document verification for changed emails.
8. **Rate limiting:** no `express-rate-limit` dependency exists; add limits on `/api/auth/login`, `/api/auth/forgot-password`, and registration endpoints before production exposure.
9. **SMS/email notifications:** no provider exists in the repo. Only in-app DB notifications are implemented. External delivery should be opt-in per recipient preference with provider credentials in env/secrets, never in React or committed files.
10. **Medical safety:** blood-group + district matching is a visibility filter, not eligibility. Eligibility stays with the donation centre after screening. Donors are never declared medically eligible by this system.
11. **Notification fan-out volume:** publishing an alert notifies every matching active donor; consider batching/queuing and recipient preferences at scale.
12. **Notification retention/read-at:** `read_at` stored; no retention policy yet.
