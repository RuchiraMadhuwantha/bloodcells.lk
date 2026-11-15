# Hospital frontend implementation report

## A. Inspection and implementation plan

The active application is the root React package (src/index.js -> src/App.js).
The nested frontend/src/App.js is empty. src/components/Hospital.js is an unused
demonstration; the actual hospital exports are src/Hospital.js.

Existing features found:
- JWT session verification and role-prefix routing in AuthContext and App.
- Hospital registration with field validation and approval confirmation.
- New request submission for eight blood groups, normal/urgent/emergency urgency,
  optional date, department and reason.
- Hospital dashboard reading its own registration, its own requests, donor
  appointments at its centre, and authorized read-only network blood stock.
- Hospital cancellation through its ownership-checked cancel endpoint.
- Existing red/white Tailwind layout, cards, badges, tables and lucide icons.

Before implementation, the plan was to preserve these integrations and donor/bank/
admin behavior, extend the existing hospital screens, add request tracking and
the remaining hospital modules, reuse shared portal primitives, and disable
backend-dependent operations rather than simulate them.

Important inspection findings:
1. GET /blood-requests/mine returns hospital-scoped request rows, but its counts
   come from the network-wide getRequestCountByStatus query. The new hospital
   adapter discards counts. Dashboard/report summaries derive from own rows only.
2. GET /inventory is authorized for hospitals, but it returns network aggregates,
   not hospital-owned stock or stock by centre/district.
3. Network lastRestockedAt is a restock time, not an inventory last-updated time.
4. Request createdAt/reviewedAt/fulfilledAt are dates, not full timestamps.
5. Hospital request detail GET /blood-requests/:id is bank-only. Hospital details
   must use the existing /mine response, not call that endpoint.
6. The inspected hospital request query has no LIMIT or pagination. Its complete
   authorized list supports frontend request/fulfillment reports. The adapter
   additionally detects partial-response metadata and disables reports if present.
7. No hospital-owned inventory, usage, or regional-centre availability APIs exist.
   Inventory writes are bank-only. The schema has network blood_inventory, but
   no hospital usage or hospital inventory ledger.
8. Hospital profile reading exists; hospital profile editing does not. Donor
   profile update routes must not be used for hospitals.
9. Login already rejects pending/inactive/suspended accounts; auth middleware also
   rechecks account status on each request. These mechanisms were not changed.

## B. Implemented features

H01: Extended the existing BloodRequestPage and preserved its endpoint/contract.
Quantity must be an integer from 1 to 500. Optional dates must be valid and not
in the past. The actual backend's three urgency values are preserved. A submit
lock and disabled controls prevent duplicate submission. Server errors and
returned status/reference/stock warning are visible; success requires a returned
reference. Optional reason is limited to the backend's 2,000 characters. No
separate unsupported notes property is sent. Required fields follow the actual
backend: blood group and quantity; optional date/department/reason stay optional.

H02: Added My Blood Requests with ID search, group/urgency/status filters,
priority/newest/oldest sorting, complete details and blood bank response.
Cancellation asks for confirmation, disables actions during processing, and
shows errors without claiming success. Only backend statuses are used:
pending, approved, rejected, fulfilled, cancelled.

H03: Emergency badges, row highlighting, urgency filtering, deadline details
and display-priority sorting. Dashboard counts cover own total/pending/approved/
fulfilled requests and open emergencies. No client approval or processing logic
was added. The blood bank remains responsible for processing priority.

H04: Hospital-owned stock view, filtering, details layout and disabled add/update/
change-history controls. Actual hospital stock cannot be retrieved or changed
without new endpoints. A separate read-only network stock section is explicitly
labelled, preserving useful existing stock visibility without reclassifying it
as hospital inventory.

H05: Usage entry interface (group, quantity, date, category/reason, related own
request, notes), history/filter/details layout, and an unavailable total state.
Save is disabled and values are not persisted. React never adjusts inventory.

H06: Authorized aggregate stock with search/group filters, status, actual last-
restock time, details, refresh and retrieval timestamp. District/centre filters
are visibly disabled because metadata is missing. Request Blood opens the existing
form with the selected group. Unknown expiry/reservations/last-update/centre
details say not supplied. No claim of live freshness or clinical suitability.

H07: Four report choices, submission date range/group/status filters and
hospital-named preview. Request and fulfillment reports use complete own records,
with summary counts, requested units on fulfilled requests and a labelled rate
against all filtered requests. Print renders an isolated escaped HTML report;
CSV includes metadata, summaries and filtered rows, escapes quotes/separators,
and neutralizes spreadsheet formula prefixes. Partial datasets, reversed date
ranges and unsupported sources cannot generate reports. Changing filters clears
the prior snapshot. Print/CSV require a generated non-empty report. Direct PDF
export is disabled; users can use browser printing. Hospital inventory and usage
reports are unavailable rather than substituted with network stock.

Hospital access/registration:
- Added a hospital-only presentation guard around hospital routes. It checks the
  session account status, fetches the actual own hospital profile and renders
  protected content only after active status is verified. Errors and nonactive
  statuses fail closed; no protected child data requests run before verification.
- Existing JWT verification, login rejection, AuthContext and canAccess are unchanged.
  Frontend checks are not a substitute for backend authorization.
- Hospital registration now reuses registerHospital/the existing API client,
  prevents duplicate submits, preserves validation, supplies accessible labels,
  and displays inline errors and the actual success/approval message.
- Added a read-only own Hospital Profile; editing is clearly unavailable.
- Existing stock cards, donor appointments, request table, cancellation and visual
  conventions remain. Data sources load independently so a stock error does not
  hide valid requests. Navigation stays in the existing sidebar rather than
  duplicating a menu grid above the dashboard.

## C. Files changed for this hospital task

Modified:
- src/App.js (hospital routes/navigation/availability handoff and hospital wrapper)
- src/Hospital.js (existing hospital dashboard and request form)
- src/components/registration/HospitalRegistrationForm.jsx

Created:
- src/services/hospitalService.js
- src/services/hospitalService.test.js
- src/components/hospital/HospitalUI.jsx
- src/components/hospital/hospitalUtils.js
- src/components/hospital/HospitalRequests.jsx
- src/components/hospital/HospitalStock.jsx
- src/components/hospital/HospitalUsage.jsx
- src/components/hospital/HospitalReports.jsx
- src/components/hospital/HospitalProfile.jsx
- src/components/hospital/reportUtils.js
- src/components/hospital/reportUtils.test.js
- src/components/hospital/HospitalModules.test.jsx
- src/HospitalNavigation.test.jsx
- HOSPITAL_FRONTEND.md

The earlier donor changes remain in the working tree and were not edited by this
task. No backend, database, auth context, bank/admin page or dependency changes
were made. Pure portal UI/date helpers already in the donor folder are imported
for reuse; the donor layout and donor API loaders are not used by hospital pages.

## D. Integration status

| Feature | Frontend status | Backend API status | Remaining work |
| --- | --- | --- | --- |
| H01 submission | Integrated with validation and confirmation | POST /blood-requests | Authenticated live verification |
| H02 tracking/details/cancel | Integrated | GET /blood-requests/mine, PUT /blood-requests/:id/cancel | Authenticated live verification |
| H03 prioritization | Integrated display, filters and own counters | Existing urgency/status fields | Processing priority remains backend responsibility |
| H04 hospital stock | Presentation complete; writes disabled; separate network reads integrated | No hospital-owned stock API | Scoped hospital inventory, ledger and authorized writes |
| H05 usage | Presentation complete; save disabled | No usage API | Transactional recording/history/totals |
| H06 availability | Aggregate network reads integrated | GET /inventory | Regional centre/district/details/freshness metadata |
| H07 request/fulfillment | Preview, print mechanism and CSV implemented | Complete own /mine list; no dedicated report endpoint needed | Browser print/download and authenticated verification |
| H07 usage/inventory | Report choices and unavailable states | Missing hospital data sources | Connect complete owned records/report APIs |
| Registration/access/profile | Shared client, approval guard and read-only profile | Existing registration/login/own-profile APIs | No hospital profile editing endpoint |

## Actual API use

Existing apiClient configuration, token handling and unauthorized behavior are
reused through src/services/api.js. No guessed endpoint is invoked.

- POST /auth/register/hospital: existing mapped registration fields; success/message.
- POST /auth/login and GET /auth/me: unchanged authentication.
- GET /hospitals/mine: hospitalName, hospitalCode, accountStatus, status, contacts,
  location, registration/approval dates and rejectionReason.
- POST /blood-requests: blood_group, quantity, urgency, optional required_date,
  department and reason. Returns request, message, optional stockWarning.
- GET /blood-requests/mine: requests; ignore the current network-wide counts.
- PUT /blood-requests/:id/cancel: own request cancellation; returns updated request.
- GET /inventory: inventory array with bloodGroup, availableUnits, level,
  lowStockThreshold, criticalStockThreshold, isLow and lastRestockedAt.
- GET /appointments/hospital: own centre's donor appointments, unchanged read use.

Request response fields: id, reference, hospitalId, hospitalName, hospitalCode,
district, bloodGroup, quantity, urgency, urgencyLabel, requiredDate, department,
reason, status, statusLabel, decisionNote, requestedBy, createdAt, reviewedAt,
fulfilledAt. Reports deliberately include no clinical reason or patient fields.

## E. Missing backend requirements (proposed contracts, not implementations)

Confirm path naming and response contracts with backend owners before wiring.
All future ownership must come from the authenticated user/hospital on the server,
not a client-supplied hospital ID.

1. GET /hospitals/mine/inventory -> complete or explicitly paginated hospital stock
   records: id, bloodGroup, availableUnits, optional reservedUnits/expiryDate,
   updatedAt and level. Existing network rows cannot be relabelled as hospital stock.
2. POST /hospitals/mine/inventory and PUT /hospitals/mine/inventory/:id ->
   authorized hospital-owned stock operations. Persist batch/location ownership,
   available/reserved amounts, expiry and audit information. Enforce nonnegative
   quantities, row/version concurrency and audit ledger in backend transactions.
   These must never authorize hospitals to mutate regional blood_inventory.
3. GET /hospitals/mine/inventory/changes -> owned audit/change entries with timestamps.
4. GET/POST /hospitals/mine/blood-usage -> hospital-scoped usage history/creation:
   id/reference, bloodGroup, quantity, usageDate, category, optional requestId/
   requestReference and notes. Validate any linked request belongs to this hospital.
   Usage creation, inventory deduction and audit insertion must be a single
   authorized atomic transaction with stock locking and duplicate protection.
   Patient identity is not required by this frontend.
5. GET /blood-availability -> authorized per-centre records including centre ID/name,
   district/location, bloodGroup, availableUnits, authoritative updatedAt and stock
   status; optional permitted centre contact/details. Define freshness guarantees.
   These fields are absent from the existing aggregate /inventory API.
6. Hospital usage/inventory reports need complete owned data plus totals, or scoped
   report endpoints with explicit pagination/completeness and reporting period.
   A PDF endpoint or established client exporter is needed for direct PDF export.
7. PUT /hospitals/mine -> authorized and validated hospital profile updates if
   editing is desired. Do not use the donor-only profile update operation.
8. Scope the counts returned from /blood-requests/mine to the authenticated hospital.
   The frontend workaround derives them from owned records, but the backend should
   stop including other hospitals' aggregate counts in this response.
9. Full submission/review/fulfillment timestamps would support time-precise reports.
   Current fields contain dates only; no times are fabricated.
10. A backend idempotency contract would extend duplicate-submit protection across
    retries, reloads and multiple clients beyond the current in-flight UI lock.

New hospital stock/usage/report adapters must keep unavailable states until real
sources are wired. Add real persistence handlers and permission checks before
enabling any disabled operation. Do not simply toggle a UI flag.

## F. Validation

Executed:
- npm.cmd run build: first hospital build compiled successfully.
- CI=true npm.cmd test -- --watchAll=false --runInBand (CI set through PowerShell):
  final completed run passed 9 suites and 61 tests, including donor regressions.
- node_modules/.bin/eslint.cmd --ext .js,.jsx src/Hospital.js src/App.js
  src/HospitalNavigation.test.jsx src/components/hospital
  src/components/registration/HospitalRegistrationForm.jsx
  src/services/hospitalService.js src/services/hospitalService.test.js:
  final completed run exit 0 with no errors or warnings.
- git diff --check: passed.
- Read-only Node fetch probes: /health and /health/db returned 200, backend running
  and database connected. /api/hospitals/mine, /api/blood-requests/mine,
  /api/inventory and /api/appointments/hospital returned 401 without a token.

Automated tests use mocked API fixtures, never production sample records. Coverage
includes validation and duplicate submission, errors and empty states, authorized
endpoint selection, request filtering/details/cancellation, missing stock/usage
actions, source completeness, report totals/date filters/CSV and HTML escaping,
hospital sidebar navigation and group handoff, inactive access guards,
registration feedback and donor regression behavior.

Node emits a dependency punycode deprecation warning during tests. The intermediate
new navigation-test encoding error and test lint naming errors were fixed; the
final results above passed. No live donor/hospital/database mutation was performed.

## G. Remaining tasks and verification limits

- Implement the missing backend services and then connect actual persistence and
  complete hospital stock/usage report data.
- Verify authenticated reads and controlled submissions/cancellations with an
  approved hospital test account.
- Execute browser/end-to-end tests, desktop/tablet/mobile visual checks, CSV download
  and browser print verification. This session ran DOM/unit tests, not a browser.
- Add direct PDF export only when a working mechanism is integrated.
- Address backend-owned count scoping, transactional stock rules and full timestamp
  requirements in a separate backend task.
Final verification: npm.cmd run build compiled successfully after all source fixes,
with no build warnings. The final git diff --check passed. No tracked backend,
package/dependency, authentication-context/client, blood bank or administrator
files were changed by the hospital implementation.
