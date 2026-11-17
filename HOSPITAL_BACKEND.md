# Hospital backend and MySQL integration report

Date: 2026-11-14. Workspace: Bloodcells.lk. No live schema changes or record mutations were performed during this task.

## A. Existing functionality

The project already had Express/MySQL, bcrypt hospital registration with a pending account, blood-bank approval/rejection, JWT login and role checks, hospital details, blood requests/cancellation/bank processing, appointments, and hospital navigation. The existing hospital inventory, usage and centre-level availability interfaces lacked reliable backing data. Request counts were global rather than scoped to the hospital. Reports previously depended on frontend data.

The connected MySQL 8.4.7 database is `nbts`. Existing `blood_inventory` stores aggregate blood-group totals without centre, batch expiry, component or reservation provenance. It cannot supply verified centre/batch availability. Existing records have been preserved.

## B. Implemented features

- H01: Validated request submission; positive integer quantities, valid group/urgency and nonpast required dates; server-confirmed reference/status; identical pending request retries deduplicated for 30 seconds under a hospital row lock. Submission never deducts bank inventory.
- H02: Own request list/details/counts, status/urgency/group/date filters, sorting, optional pagination, timestamps, cancellation and conditional state changes to prevent stale overwrites. Another hospital's detail returns 404.
- H03: Server priority ordering by emergency, urgent, normal; then required date and submission order. Urgency does not bypass bank review or allocate stock.
- H04: Own batch receipts/details/updates, quantities, reservations, collection/expiry/component/status, optimistic version checks and movement history. Transactions and durable retry keys prevent repeated mutations. Pending migration in the live database.
- H05: Usage references an owned usable batch. Usage insert, unreserved stock deduction, movement and retry key commit together. Expired, quarantined, discarded, foreign, insufficient and group-mismatched stock are rejected. Pending migration.
- H06: Query usable, unexpired, unreserved batches owned by the authenticated hospital. Hospital ownership is enforced in SQL. Legacy aggregate totals are excluded. Pending migration and verified blood-bank batch ingestion; no centre data was invented.
- H07: Server-side request, fulfillment, inventory and usage reports; JSON preview, CSV, PDF and existing print flow. Summaries cover the full filtered source, not a UI page. More than 10,000 matching records produces 413 instead of truncated totals. Request reports work on existing tables; inventory/usage reports require migration.
- Registration: Existing bcrypt hashing, duplicate checks, pending hospital role preserved; schema-compatible field limits added.
- Approval/login: Existing blood-bank-only approval and active-account login preserved and covered by backend tests. JWT middleware rechecks current database role/status.
- Dashboard/profile: Own request counts and recent records, honest migration notices, real inventory/usage summaries when available, persisted whitelisted hospital contact/profile edits. Account role/status/code cannot be edited through profile.

## C. Files changed in this task

Other donor/bank work was already present in the workspace and is not listed as new hospital-backend work.

| File | Purpose |
|---|---|
| backend/database/migrations/003_hospital_operations.sql | Additive batch, location, usage, movement and retry schema |
| backend/scripts/hospitalMigration.js | Read-only schema check; explicit database-targeted apply command |
| backend/models/hospitalOperationsModel.js | Owned stock/usage/availability and transactional writes |
| backend/controllers/hospitalOperationsController.js | Hospital access, profile, dashboard, reports and stock/usage responses |
| backend/routes/hospitalOperationsRoutes.js | Protected hospital operation endpoints |
| backend/validators/hospitalValidators.js | Payload/query/id/retry key validation |
| backend/utils/hospitalReports.js | Full-source report summaries, CSV escaping and PDFKit generation |
| backend/tests/hospitalOperations.test.js | 51 safe backend tests using a fake database adapter |
| backend/models/bloodRequestModel.js | Own counts, priority/filtering, retry deduplication, conditional transitions, timestamps |
| backend/controllers/bloodRequestController.js | Own details/counts/filtering/pagination |
| backend/routes/bloodRequestRoutes.js | Hospital detail route and query validation |
| backend/validators/domainValidators.js | Strict valid, nonpast request date |
| backend/validators/authValidators.js | Registration field lengths |
| backend/middleware/errorMiddleware.js | Safe 500 fallback for unknown errors |
| backend/server.js | Mount hospital operation router before generic hospital router |
| backend/package.json; backend/package-lock.json | PDFKit dependency and hospital test/schema-check scripts |
| src/services/apiClient.js | Authenticated binary downloads and Idempotency-Key support |
| src/services/hospitalService.js | Real API adapters, exports and migration-aware states |
| src/services/hospitalService.test.js | Updated API contracts |
| src/Hospital.js | Real dashboard summary |
| src/components/hospital/HospitalStock.jsx | Verified availability, own stock editor and history |
| src/components/hospital/HospitalStockEditor.jsx | Actual batch receipt/update form |
| src/components/hospital/HospitalUsage.jsx | Confirmed usage, batch selection and refreshed balances |
| src/components/hospital/HospitalReports.jsx | Server preview, PDF/CSV download and print |
| src/components/hospital/HospitalProfile.jsx | Persisted contact/profile editing |
| src/components/hospital/hospitalUtils.js | Stable submission key generation |
| src/components/hospital/HospitalModules.test.jsx | Real usage submission and updated module tests |
| HOSPITAL_BACKEND.md | This report, endpoint documentation and deployment limits |

## D. API documentation

All paths below start with `/api`. Protected endpoints require `Authorization: Bearer <JWT>`. Hospital endpoints require an active approved hospital and derive ownership from its authenticated user, never a client-supplied hospital ID. Common responses use `{success:true,...}`; failures use `{success:false,message,errors?}`. Validation is 400; missing/invalid JWT 401; role/inactive account 403; missing/foreign own detail 404; conflicts 409; missing migration 503; oversized report 413. Unexpected errors return a safe 500.

| Method / path | Role | Request data | Successful response / special errors |
|---|---|---|---|
| POST /auth/register/hospital | Public | username, email, password (8+), hospital_name, hospital_code; optional hospital_type, district, address, official_phone, contact_person_name/designation/phone/email | Created pending hospital; duplicate username/email/code rejected; bcrypt password, no client role/status accepted |
| POST /auth/login | Public | username, password | JWT and user/profile data; pending/inactive hospital rejected |
| GET /auth/me | Authenticated | None | Current user/profile without password |
| GET /hospitals/mine | Hospital | None | hospital profile |
| PUT /hospitals/:userId/approve | Blood bank | User ID in path | Confirmed active account and current hospital/statistics |
| PUT /hospitals/:userId/reject | Blood bank | User ID | Confirmed rejection |
| PUT /hospitals/:userId/review-again | Blood bank | User ID | Confirmed pending review |
| POST /blood-requests | Hospital | blood_group, quantity; urgency normal/urgent/emergency, required_date YYYY-MM-DD, department, reason optional | 201 request, own counts, aggregate-stock advisory; immediate identical pending retry returns existing reference |
| GET /blood-requests/mine | Hospital | Optional bloodGroup, status, urgency, start/end submission dates, sort newest/required/priority; page and limit (1..1000) | requests, own status counts; pagination/hasMore when limit given |
| GET /blood-requests/mine/:id | Hospital | Positive request ID | Own request; 404 for another hospital |
| PUT /blood-requests/:id/cancel | Hospital | Own request ID | Confirmed cancellation; terminal/invalid transition 409 |
| GET /hospitals/mine/dashboard | Hospital | None | summary.requests, inventory, usage, recentRequests; missing stock schema explicitly unavailable |
| PUT /hospitals/mine/profile | Hospital | Any nonempty subset hospitalName, hospitalType, district, address, contactNumber, contactPersonName, contactPersonDesignation, contactPersonPhone, contactPersonEmail | Updated hospital; unknown/account fields 400 |
| GET /hospitals/mine/inventory | Hospital | Optional bloodGroup, start/end collection dates | items, complete:true, totalAvailable; each item includes id/reference/group/component/qty/reserved/available/expiry/status/version |
| GET /hospitals/mine/inventory/:id | Hospital | Positive batch ID | Own item or 404 |
| GET /hospitals/mine/inventory/changes | Hospital | None | Latest 1000 own movements, explicit limit:1000 |
| POST /hospitals/mine/inventory | Hospital | Batch receipt described below; required Idempotency-Key header | 201 item/replayed:false or 200 retry/replayed:true; duplicate batch reference conflict |
| PUT /hospitals/mine/inventory/:id | Hospital | quantity, reservedUnits, status, version, reason; required Idempotency-Key | Confirmed updated item; stale version/discarded/expired usable update 409 |
| GET /hospitals/mine/blood-usage | Hospital | Optional bloodGroup, start/end usage dates | items, complete:true, totalUsage |
| GET /hospitals/mine/blood-usage/:id | Hospital | Positive usage ID | Own usage or 404 |
| POST /hospitals/mine/blood-usage | Hospital | batchId, bloodGroup, quantity, usageDate, category; notes/requestId optional; required Idempotency-Key | 201 item and confirmation, or 200 identical retry; unsafe/insufficient stock 409, foreign batch/request 404 |
| GET /hospitals/mine/availability | Hospital | Optional bloodGroup, district, centreId | Own hospital/group usable totals, update times, complete:true, scope:hospital_batches; caller-supplied hospital IDs cannot change ownership |
| GET /hospitals/mine/reports | Hospital | Required type requests/fulfillment/inventory/usage; optional start/end, bloodGroup, status, format json/csv/pdf | JSON report or authenticated CSV/PDF attachment; >10000 matches 413 |

Receipt example (dates must reflect the actual batch, not an assumed shelf life):

```json
{"reference":"ACTUAL-BATCH-REFERENCE","bloodGroup":"O+","component":"Actual component","quantity":10,"reservedUnits":0,"collectionDate":"YYYY-MM-DD","expiryDate":"YYYY-MM-DD","status":"usable","reason":"Verified physical receipt"}
```

Quantity is an integer 0..100000 for stock, 1..100000 for usage. Reserved units cannot exceed physical stock. Dates must be valid calendar dates. Collection and usage dates cannot be future dates. Usable stock must not be expired. Usage must fall within collection/expiry and batch must still be usable today. Status is usable/quarantined/discarded. No patient identity is collected. A related request must belong to the same hospital and match the group.

`Idempotency-Key` is 8..100 ASCII letters/digits/underscores/hyphens. Reuse the same key and payload after an uncertain response; a changed payload under the same operation/key returns 409. Keys are durable and commit with the mutation. Stock update payload includes batch ID in its hash. The frontend retains the key while retrying unchanged form data and disables duplicate pending submissions.

Reports use submission dates for requests, usage dates for usage and collection dates for inventory. Inventory totals are current balances for the selected batches, not a reconstruction of historic balances. Fulfillment rate uses the status of matching submitted requests. CSV neutralizes formula-leading cells. PDF is generated before response headers are sent.

## E. Database changes

Reused `users`, `hospitals`, `blood_requests` and legacy `blood_inventory`; appointment/donor/bank tables remain intact. The live schema check found all five new tables missing.

Migration 003 adds only:

1. `stock_locations`: real hospital or bank location; hospital ownership FK.
2. `stock_batches`: component, group, physical/reserved quantities, dates, status and version; location/reference uniqueness and integrity checks.
3. `hospital_blood_usage`: owned usage record referencing batch, actor and optional request.
4. `stock_movements`: append-only application movement audit.
5. `hospital_operation_keys`: durable operation/payload/result deduplication.

Status: **prepared, NOT executed**. No existing records were deleted, seeded, reassigned or copied. No default expiry dates or centre names were fabricated. MySQL DDL commits implicitly; the script can safely resume `CREATE TABLE IF NOT EXISTS` after a partial creation, but this is not a transactional migration rollback. Take the normal database backup and review privileges before approved deployment.

Read-only check from workspace root:

```powershell
node backend/scripts/hospitalMigration.js --check
```

Only after explicit approval, apply the prepared migration to the confirmed database:

```powershell
node backend/scripts/hospitalMigration.js --apply --database nbts
```

The script rejects an apply target that differs from the configured database and permits only the five expected CREATE TABLE statements. Do not substitute `db:setup`; that older script is outside this incremental deployment workflow.

Bank fulfillment currently operates on the preserved legacy aggregate stock. It cannot automatically credit an expiring hospital batch because that source lacks batch/location/component/expiry metadata. Hospital receipt therefore requires verified physical batch data. Connecting bank batch dispatch and hospital receipt requires a later traceable transfer workflow.

## F. Integration status

"Fully working and tested" below means covered by the stated automated tests, not live write certification. All state-changing backend tests used a fake database adapter. Safe live checks exercised reads only.

| Function | Backend | MySQL | Frontend integration | Remaining work |
|---|---|---|---|---|
| H01 Submission | Fully working and tested | Existing tables; live writes untested | Fully working and tested | Approved write acceptance check |
| H02 Tracking | Fully working and tested | Own reads tested | Fully working and tested | Browser acceptance |
| H03 Priority | Fully working and tested | Existing columns/order | Fully working and tested | Operational acceptance |
| H04 Inventory | Fully working and tested with fake DB | Pending database migration | Fully working and tested | Migration, real MySQL transaction/concurrency acceptance |
| H05 Usage | Fully working and tested with fake DB | Pending database migration | Fully working and tested | Migration, real MySQL rollback/concurrency acceptance |
| H06 Availability | Fully working and tested with fake DB | Pending database migration | Partially integrated | Verified bank locations/batches and ingestion workflow |
| H07 Reports | Fully working and tested | Request JSON/PDF reads tested; stock/usage pending migration | Fully working and tested | Browser/PDF visual acceptance; stock reports after migration |
| Registration | Fully working and tested with fake DB | Existing tables; live writes untested | Existing integration preserved | Approved write acceptance |
| Approval | Fully working and tested with fake DB | Existing tables; live writes untested | Existing bank integration preserved | Approved write acceptance |
| Login | Fully working and tested with fake DB | Existing tables; live password login untested | Existing integration preserved | Account acceptance |
| Dashboard/profile | Fully working and tested | Read dashboard tested; stock summaries pending migration; profile write untested live | Fully working and tested | Migration and browser acceptance |

## G. Testing results

Executed:

- `node --test backend/tests/hospitalOperations.test.js`: **51 passed, 0 failed**. Real Express routes, JWT/bcrypt and models with an isolated fake DB adapter; no live records created. Authentication/roles/status, approval/login/registration, ownership, validation, priority/filter SQL, retry deduplication, stock safety/versioning, usage atomicity/rollback and genuine PDF response covered.
- `CI=true npm test -- --watchAll=false --runInBand`: **14 suites, 101 tests passed, 0 failed**, including donor, bank and hospital regressions.
- Scoped ESLint on hospital components, dashboard and service/client changes: passed.
- `npm run build`: compiled successfully, with no build errors.
- Read-only migration check: connected to `nbts`; five required tables missing; no apply performed.
- Temporary authenticated live API read smoke: own requests 200, dashboard 200, request report JSON 200, request PDF 200 with `%PDF-` header; inventory/usage/availability 503 as expected. Temporary server stopped and connections closed. JWT and personal records were not printed.
- Production dependency audit: 5 findings (2 moderate, 1 high, 2 critical) in existing express/body-parser/proxy-addr/qs/mysql2 dependency chains. PDFKit was not implicated. Dependency remediation requires its own compatibility validation; no blind audit-fix was applied.

Not executed: live registration/approval/request/stock/usage/profile writes; migration application; real MySQL transaction race tests; destructive/seeding existing E2E scripts; browser acceptance; rendered PDF visual inspection (no PDF renderer available). PDF tests verify generation and binary HTTP handling, not visual layout or non-Latin glyph coverage.

Global diff whitespace check flags a preexisting extra blank EOF in `backend/database/schema.sql`; this task did not rewrite that earlier donor work. Hospital task files pass scoped whitespace checks.

## H. Remaining tasks

1. Obtain approval and apply additive migration 003 to `nbts`, then repeat schema/read checks.
2. Validate stock receipt/update/usage, durable retries, rollback and simultaneous submissions against an approved staging MySQL database, then perform authorized end-to-end acceptance.
3. Blood Bank dependency: capture verified centres and actual usable batches, and build an authorized batch ingestion/dispatch/receipt workflow. Legacy aggregate data cannot supply this automatically. Empty verified availability after migration is honest until actual records exist.
4. Review PDF layout in a renderer/browser, including long text/multipage and any required Sinhala/Tamil font embedding. No patient information is included.
5. Review existing production dependency advisories with compatible upgrades and regression testing.
6. Donor/appointments modules are preserved; no new donor functionality is implemented by this task.
