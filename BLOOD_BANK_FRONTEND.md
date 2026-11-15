# Blood Bank frontend implementation report

## A. Inspection and plan

The active app is the root React package: src/index.js -> src/App.js. The nested
frontend/src/App.js is empty; src/components/BloodBank.js is an unused prototype.
The active blood bank exports were in src/BloodBank.js, with separate
HospitalManagement and CampaignManagement components.

Existing working features:
- JWT client/session verification, role-prefixed client navigation and API errors.
- Real hospital approval/rejection/review-again, full registration details, filters,
  summaries and a sidebar pending-count source.
- Aggregate inventory reads, threshold updates and adjustment UI.
- Blood request approval/rejection/fulfillment and a donor directory/detail API.
- Dashboard inventory charts, request queue, interval statistics and appointments.
- An existing rule-based Demand Planning screen; it is not an AI model.

Partial/prototype features:
- Stock adjustment sent blood_group while the actual backend expects bloodGroup.
- Campaigns used MOCK_CAMPAIGNS, generated local IDs and browser-only mutations.
- Donor interval flags were presented as medical eligibility.
- No standalone bank appointment manager or report generator existed.
- No backend routes exist for expiry batches, centre stock, transfers, campaigns,
  message sending/delivery, donor verification/status edits or bank profile edits.

Plan followed:
Preserve authentication, endpoints, existing routes, donor/hospital/admin work
and visual conventions. Extend original operational exports rather than create
parallel systems. Retain campaign form/card design but remove simulated data and
mutations. Reuse existing portal dialogs/resources and report exporters. Add
missing bank pages with honest capability states and disabled unsupported writes.
Verify actual transition rules and complete-data scope before offering actions
or reports. No backend, database, authentication or dependency changes.

## B. Completed frontend work

B01 Hospital approvals:
- Preserved existing hospital source, district/type/status/search filters,
  summaries, details and provider-driven pending badge.
- Added keyboard-accessible dialogs, in-flight locking, authorization-aware
  decision controls and confirmation for review-again as well as approve/reject.
- Corrected hardcoded staff identity to the signed-in user, labelled filters,
  mobile detail rows, rejection reason control and error toast styling.
- Existing approval date/rejection reason show actual available decision data.
  Full approval-event history is not supplied.

B02 Inventory:
- Extracted the original InventoryManagement export into BankInventory and
  extended it with search/group/status filters, details, stock overview, real
  threshold values, validated adjustments and confirmation.
- Corrected the existing frontend service payload to bloodGroup without changing
  the backend API contract.
- Whole quantities and configured threshold bounds are enforced. Removal cannot
  exceed currently loaded stock; final concurrency and nonnegative checks remain
  backend responsibilities.
- Aggregate rows do not support new batch creation, location filtering, reserved
  units, collection/expiry dates, authoritative update timestamps or transaction
  history. Missing fields and history are explicitly unavailable.
- Values are labelled recorded network stock, not expiry-verified clinical stock.

B03 Expiry:
- Added batch/expiry interface with blood group and expiry-period controls,
  nearest-expiry layout and details.
- Backend classifications/product shelf lives are not invented. No aggregate
  rows are converted into batches. Disposal stays disabled.

B04 Shortages:
- Reuses the same inventory interface, restricted to server-classified Low and
  Critical rows, with real configured thresholds and recorded-unit summaries.
- No invented alert thresholds or regional allocation. Centre filtering is
  unavailable without centre metadata.

B05 Requests:
- Extended the original BloodRequestQueue export with hospital/group/district/
  urgency/status/date/search filters, priority/deadline sorting, emergency
  highlighting and complete details.
- Approval, rejection, fulfillment and cancellation require confirmation, honor
  current model transitions and wait for the returned request status.
- Rejection requires a reason. Fulfillment calls only the backend transaction;
  React never subtracts stock. On-hold and full processing-event history are
  unavailable. Recorded reviewed/fulfilled dates and response remain visible.
- Dashboard requests lead to this confirmed processing workflow.

B06 Regional stock:
- Added centre/district/group/search/comparison interface and honest unavailable
  state. No hospital is relabelled as a regional blood centre.
- District selection is extensible beyond the two pilot districts.

B07 Transfers:
- Added source/destination/group/quantity/date/reason/notes form, history/details
  layout, and unavailable approve/reject/dispatch/receipt controls.
- Real centre source and status contracts are missing. All persistence is
  disabled. Validation helper rejects missing/same centres and nonpositive or
  fractional quantities; no transfer can currently be submitted.
- Stock is never moved in frontend state.

B08 Donors:
- Extended the original DonorManagement export with reference/name/contact
  search, group/district/account/interval filters and full authorized detail and
  appointment history.
- Main table omits unnecessary NIC/contact fields; authorized contact links
  appear in details. No credentials, password hashes or tokens are displayed.
- Donor verification/profile/status mutations remain disabled without endpoints.

B09 Potential matches:
- Uses the same donor component and authorized directory, with active-account
  and interval-flag defaults. It clearly says potential matches require screening.
- The backend eligible flag checks recorded time intervals with a profile-date
  fallback. It is not verified clinical eligibility or current availability.
- Availability is not supplied. Donors can be selected for an unsent notification
  preview; selection is session component state and never fake persistence.

B10 Campaigns:
- Preserved existing multi-section form, CampaignCard shape, image preview and
  donor-view details. Required preview fields and time/target validation added.
- Removed sample campaign records, fake load timer, generated local IDs and
  browser-only create/update/delete success behavior.
- Real records now come only through an explicitly unavailable service adapter.
  Prepare/edit preview is labelled unsaved; save/publish/cancel/close/participants
  are disabled. No record is silently made visible to donors.
- Local image preview URLs are released when replaced/unmounted.

B11 Notifications:
- Added type/channel/message/recipient filters, donor-selection handoff, text
  preview and delivery-history layout.
- Recipient records come from the existing bank-authorized directory. Campaign
  participation recipients, sending, delivery and retry remain unavailable.
- No SMS/email credentials or client-side gateways exist; no message is sent.

B12 Appointments:
- Added bank listing, filters, search, details, history display and confirmed
  approve/mark-completed/cancel operations for pending records only.
- The actual bank status controller rejects changes from approved, completed
  or cancelled records. Those actions are not offered, even though the donor
  cancellation endpoint has different permissions/rules.
- Rejection and rescheduling are unsupported and explained; no guessed status
  value or donor-only endpoint is used. Changes wait for the returned appointment.

B13 Reports:
- Inventory and hospital-request reports use complete authorized sources.
- Donation report is explicitly limited to completed appointments returned for
  currently active hospitals. It is not claimed to be a complete donation ledger;
  collected quantity is not supplied and is never invented.
- Added type/group/district/location/date filters, metadata, summaries, preview,
  print mechanism and CSV using existing export helpers.
- Inventory is a current snapshot; historical-date and location filters are
  disabled because that data is absent.
- Partial sources cannot generate complete reports. Changed filters clear the
  prior snapshot. CSV/print require nonempty generated rows; CSV protects formula
  prefixes and printable HTML escapes data.
- Expiry/regional/campaign/transfer report types have unavailable source states.
  Direct PDF export is disabled; browser printing can be used when verified.

B14 Coordination:
- Reuses regional stock presentation and transfer availability.
- Adds actual open hospital demand by recorded district, separately labelled as
  hospital requests, not centre allocations. No automated distribution,
  optimization or clinical suitability is claimed.

Dashboard/navigation:
- Preserved chart/card design, actual sources, appointment and request sections.
- Corrected the O/A versus AB donut overlap.
- Added real hospital/appointment/critical/pending-emergency figures and honest
  missing expiry/campaign/transfer summaries. Interval wording requires screening.
- Added bank routes, grouped scrollable bank sidebar and source-error-aware
  pending badge. No repeated navigation button grid was added above the dashboard.
- Donor/hospital routes and completed views are preserved. The Administrator
  screen retains its previous menu labels/routes. Existing authentication and
  role guards remain; bank mutations additionally require blood_bank in the UI.
- The existing non-AI rule-based Demand Planning implementation was retained.

## C. Affected files and purpose (this blood bank task)

Modified:
- src/App.js: bank routes, grouped navigation, recipient provider; preserve admin menu.
- src/BloodBank.js: dashboard improvements; re-export extended original screens;
  retain existing Demand Planning.
- src/components/HospitalManagement.jsx: accessible confirmations and decision UX.
- src/components/CampaignManagement.jsx: preserve form/preview; remove fake records
  and unsaved mutation success.
- src/components/DashboardShell.js: optional navigation groups/scrolling for bank;
  ungrouped donor/hospital behavior unchanged.
- src/services/api.js: corrected stock-adjustment property to actual bloodGroup.
- src/components/hospital/reportUtils.js: optional report metadata/source labels
  so bank reports reuse the existing safe CSV/print utilities. Default hospital
  report output is unchanged and its tests still pass.

Created:
- src/services/bankService.js: existing endpoint adapters, completeness checks,
  explicit unavailable sources.
- src/components/bank/BankUI.jsx: bank layout, permissions, recipient state,
  confirmed action hook; reuses existing portal primitives.
- src/components/bank/BankInventory.jsx: inventory and shortage modes.
- src/components/bank/BankOperations.jsx: original request queue and bank appointments.
- src/components/bank/BankDonors.jsx: original directory and potential-match mode.
- src/components/bank/BankRegional.jsx: expiry, regional stock, transfers and coordination.
- src/components/bank/BankNotifications.jsx: unsent composition and delivery UI.
- src/components/bank/BankReports.js: report interface.
- src/components/bank/bankReportUtils.js: honest, scope-aware report data.
- src/services/bankService.test.js: data adapters and unavailable contracts.
- src/services/inventoryContract.test.js: actual stock-adjustment payload regression.
- src/components/bank/BankModules.test.jsx: bank workflows and states.
- src/components/bank/bankReportUtils.test.js: transitions, transfer validation,
  report completeness and scope.
- src/BankNavigation.test.jsx: bank navigation, roles, decisions and refresh.
- BLOOD_BANK_FRONTEND.md: this inspection, integration and validation report.

Earlier donor/hospital changes remain uncommitted in the same working tree. They
were not reverted. No backend/database/dependency/authentication files changed.

## D. API integration status

| Function | Frontend status | Backend API status | Remaining work |
| --- | --- | --- | --- |
| B01 Hospital approval | Fully integrated | Existing hospital list/decisions | Live authenticated verification; full decision audit API |
| B02 Aggregate inventory | Fully integrated for existing operations | Existing reads/adjust/thresholds | Batch/location/expiry/reservation/ledger source |
| B03 Expiry | Frontend complete, backend pending | No batch/expiry/disposal API | Product-aware classifications and audited disposal |
| B04 Shortages | Fully integrated for network totals | Actual level and thresholds | Regional shortage metadata |
| B05 Requests | Fully integrated for supported transitions | Existing list/status transaction | On-hold/audit endpoint if required |
| B06 Regional stock | Frontend complete, backend pending | No centre-level stock API | Centre directory and scoped stock |
| B07 Transfers | Frontend complete, backend pending | No transfer API/status contract | Atomic lifecycle and receipts |
| B08 Donor directory | Fully integrated for reads/history | Existing bank-only donor APIs | Verification/status mutation APIs |
| B09 Potential matching | Partially implemented | Existing directory interval flags | Verified availability/eligibility/consent |
| B10 Campaigns | Frontend complete, backend pending | No campaign API | Storage/publication/participants |
| B11 Notifications | Frontend complete, backend pending | No send/history/delivery API | Server-side gateway integration and consent |
| B12 Appointments | Fully integrated for pending-state decisions | Existing list/status API | Rejection/rescheduling and approved-state workflow |
| B13 Inventory/request reports | Fully integrated from available sources | Complete unpaginated reads | Browser export verification; direct PDF optional |
| B13 Donation report | Partially implemented; explicitly limited | Completed active-centre appointments | Full donation ledger and collected quantities |
| B13 Other report types | Frontend complete, backend pending | Sources missing | Complete scoped data and report contracts |
| B14 Coordination | Partially implemented | Hospital demand reads only | Regional stock/transfer integration |

## Actual routes and constraints inspected

All paths below are relative to API_BASE, through the existing api.js/apiClient.js.

- GET /hospitals -> hospitals, stats. PUT /hospitals/:userId/approve,
  /reject ({ reason }), /review-again. Existing provider refreshes list and badge.
- GET /inventory -> inventory and stats. Row fields: id, bloodGroup,
  availableUnits, lowStockThreshold, criticalStockThreshold, level, isLow,
  lastRestockedAt. Last restock is not last update.
- POST /inventory/adjust -> { bloodGroup, amount, mode }, mode add/set/remove;
  returns item, stats, message. Set/remove zero are rejected by controller.
- PUT /inventory/thresholds -> bloodGroup, lowStockThreshold,
  criticalStockThreshold. Integers 0..100000; critical <= low.
- GET /blood-requests -> complete requests with optional server filters.
  PUT /blood-requests/:id/status -> status, optional note; returns request.
  pending -> approved/rejected/cancelled; approved -> fulfilled/cancelled;
  rejected/fulfilled/cancelled terminal. Fulfillment uses backend stock locks.
- GET /donors -> complete donor records and stats; GET /donors/:id ->
  donor plus authorized appointment history. No donor write endpoint exists.
- GET /appointments -> appointments at currently active hospitals only.
  PUT /appointments/:id/status -> status approved/completed/cancelled;
  current controller permits changes only from pending.
- GET /stats/blood-bank -> actual dashboard summaries and next five appointments.
  That next-five subset is never used as a complete report source.

Management routes are blood_bank-only at the backend. The existing frontend
allows admin navigation to bank screens, but this change does not grant backend
admin permissions; unavailable/forbidden responses remain visible and writes are
disabled for roles other than blood_bank. No authentication logic was weakened.

## E. Missing backend requirements (proposals, not routes called by this UI)

These path suggestions require backend agreement; none were implemented or guessed
in runtime network requests.

1. GET /blood-centres: authorized real centre identity, name, district, storage
   locations and permitted contacts. Do not use hospital registrations as centres.
2. GET /inventory/batches and GET /inventory/expiry: product type, batch/unit ID,
   bloodGroup, collectionDate, authoritative expiryDate, location/centre,
   quantities, reserved quantities, updatedAt and server expiry classification.
   Product-specific expiry rules and exclusion of expired/quarantined stock must
   be enforced on the backend, not inferred from aggregate totals.
3. POST /inventory/batches/:id/disposal and GET /inventory/transactions:
   permission-scoped disposal/audit history, atomic stock updates, reason,
   actor/time and idempotency. Aggregate removal is not batch disposal.
4. GET /regional-stock: centre/district/group quantities, authoritative status,
   thresholds and updatedAt/freshness metadata; complete or explicit pagination.
5. GET/POST /blood-transfers; GET /blood-transfers/:id; authorized approval,
   rejection, dispatch, cancellation and receipt operations with a confirmed
   status/transition contract. Server must validate distinct centres, permissions,
   positive quantities, stock/expiry suitability, reserve/dispatch/receipt ledger
   operations, locking, idempotency and audit trail. React must not move stock.
6. GET /donors/matches (or extend existing directory): separately verified donor
   availability/consent/eligibility and source/verification dates. Interval-only
   flags cannot establish clinical suitability. Add authorized donor verification/
   status operations if required, with audit and minimal contact disclosure.
7. Campaign CRUD/publication/cancellation, participant/registration reads:
   GET/POST /campaigns, PUT /campaigns/:id, publish/close operations and
   GET /campaigns/:id/registrations. Reuse the existing CampaignCard/form shape
   already used by donor previews; do not create a separate mock schema.
8. GET/POST /notifications; /notifications/:id/delivery and retry:
   server-owned SMS/email credentials, recipient authorization, consent/opt-out,
   rate limits, idempotency, message categories, delivery/failure audit. Never
   embed gateway secrets in React or imply preview counts are delivery counts.
9. Appointment rejection/rescheduling with explicit accepted statuses, ownership,
   slot availability/duplicate checks and confirmed responses. Define whether
   approved records may later be completed/cancelled by staff; current controller
   rejects those transitions. Audit endpoint required for complete event history.
10. Full authorized donation ledger: donation ID/date, collected quantity/unit,
    blood group and centre, including inactive-centre historical records. Current
    active-hospital appointment list is not a full donation report.
11. Complete historical inventory/expiry/regional/campaign/transfer report sources
    or dedicated report endpoints. Preserve scope, completeness and timestamps.
    Server PDF or a verified export mechanism is needed for direct PDF downloads.
12. Complete hospital decision/request/appointment event histories and full
    timestamps; current request fields generally provide dates/current note only.
13. Bank profile/settings and approved role policy if those capabilities are
    required. No bank profile model/update endpoint currently exists.

Backend/database operations above belong in a separate backend task. Add proper
service methods, real handlers and verified permissions before enabling disabled
controls; changing a capability label alone is not integration.

## F. Validation and verification limits

Completed tests use Jest/React Testing Library with mocked API fixtures, not live
data insertion. The full suite passed 14 suites / 96 tests after the functional
source changes, including donor/hospital and existing report regressions.

Commands executed:
- npm.cmd test -- --watchAll=false --runInBand, CI=true via PowerShell.
- node_modules/.bin/eslint.cmd --ext .js,.jsx src/App.js src/BloodBank.js
  src/BankNavigation.test.jsx src/components/bank
  src/components/CampaignManagement.jsx src/components/HospitalManagement.jsx
  src/components/DashboardShell.js src/components/hospital/reportUtils.js
  src/services/api.js src/services/bankService.js src/services/bankService.test.js
  src/services/inventoryContract.test.js.
- Direct node_modules/.bin/eslint.cmd src/BloodBank.js confirmed the current file
  had no undefined old dashboard callbacks.
- git diff --check.
- npm.cmd run build (final outcome appended below).

Read-only live probes:
- /health and /health/db: HTTP 200, backend running and database connected.
- /api/hospitals, /api/inventory, /api/blood-requests, /api/donors,
  /api/appointments, /api/stats/blood-bank: HTTP 401 without a token, as expected.
- No live approval, stock write, message, request decision or appointment mutation
  was executed. No database records were created or changed by tests.

Intermediate issues fixed: Windows import resolution collision between the report
page and similarly named utility; one test lint-query preference; old cached
dashboard lint errors. Build linting remained enabled. A stale ignored ESLint cache
was renamed reversibly inside node_modules/.cache before final verification.
Node prints a dependency punycode deprecation warning during tests.

No browser/end-to-end tests, desktop/tablet/mobile visual verification, actual CSV
download or browser print dialog execution were performed. Their absence is not
reported as a passing check.

## G. Remaining work

Implement and connect the missing backend models/services/authorized transactions
above. Validate all real operations using an approved blood bank test account.
Run browser/viewport QA and actual CSV/print checks. Complete full donation and
historical/region/batch reports only after authoritative complete sources exist.
No new dependencies, deployment, AI model or backend/schema work is part of this
frontend implementation.
Final verification outcomes:
- npm.cmd run build: compiled successfully with no build warnings after the stale
  cache reset; linting remained enabled.
- Full current test run: 14 suites / 96 tests passed.
- Final scoped ESLint command: exit 0, no errors or warnings.
- Final git diff --check: passed.
- No tracked backend, package/dependency, AuthContext, apiClient or Administrator
  dashboard source changes were present.

Report module follow-up: the report page uses BankReports.js explicitly, matching the development server module path. The distinct bankReportUtils.js name avoids the previous Windows resolution collision.
