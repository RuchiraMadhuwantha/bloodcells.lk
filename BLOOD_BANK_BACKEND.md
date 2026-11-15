# Blood Bank backend and MySQL integration report

Date: 2026-11-15. This report supersedes unavailable-service descriptions in the earlier Blood Bank frontend report.

**Deployment status:** backend code and frontend connections are implemented. Batch operations await approval/application of migrations 003 and 004. No live schemas or records were changed. Automated write tests use an isolated fake database adapter; SMS/email delivery is blocked pending provider and consent integration.

## A. Existing functionality and initial audit

The working tree was inspected before editing; preexisting donor/hospital/bank changes were preserved. The Express entry is backend/server.js, with mysql2 pooling in config/db.js. JWT middleware verifies tokens and reloads role/status from MySQL; roles remain donor, hospital and blood_bank. Existing bcrypt login, pending hospital registration/approval, donor self-service, campaign registration, appointments and donor notification inboxes were reused.

Read-only inspection found MySQL 8.4.7, database nbts. Existing tables: users, donors, hospitals, appointments, blood_inventory, blood_requests, campaigns, campaign_registrations, notifications, emergency_alerts, emergency_alert_responses, password_reset_tokens. No centre/transfer/allocation schema existed. Hospital migration 003 was prepared but unapplied. Legacy blood_inventory lacks centre, batch, component, expiry and reservation provenance.

| Module | Initial classification | Gap |
|---|---|---|
| B01 Hospital approval | Partially implemented | Repeated/conflicting decisions allowed |
| B02 Inventory | Partially implemented | Aggregate updates lacked expiry/centre/audit provenance |
| B03 Expiry | Frontend present, backend missing | No actual batch source |
| B04 Shortages | Partially implemented | Unverified aggregate totals only |
| B05 Requests | Partially implemented | Fulfillment used aggregate stock without allocations |
| B06 Regional stock | Frontend present, backend missing | No centre registry/access assignments |
| B07 Transfers | Frontend present, backend missing | No transfer persistence/transactions |
| B08 Donors | Partially implemented | List privacy and audited status changes missing |
| B09 Candidate identification | Partially implemented | Donation interval flag only |
| B10 Campaigns | Backend present, frontend integration pending | Preview-only form; creator/state guards needed |
| B11 Managed outreach | Frontend present, backend missing | Donor inbox existed, managed history/providers absent |
| B12 Appointments | Partially implemented | UI transition mismatch and concurrent decisions |
| B13 Reports | Partially implemented | Subset of frontend reports; no bank PDF endpoint |
| B14 Coordination | Partially implemented | Demand shown, regional stock/transfers unavailable |

Plan executed: reuse shared stock_locations/stock_batches; prepare additive bank support tables; implement permissions/transactions; connect existing screens; run safe tests/live reads; document deployment limits. No second backend/database, parallel balance system or AI demand prediction was added.

## B. Implemented features

**B01:** Preserve registration and decisions. Lock account and reject repeated/conflicting transitions: pending -> active/inactive; active -> inactive; inactive -> pending review. Existing reviewer/time/rejection metadata persists. Bank list supports status/search/district and detail by user ID. No historical approval events were fabricated.

**B02:** Register actual centres, receive/edit owned batches, inspect physical/reserved/available units, component/dates/status/version and audit history. Transactions and durable retry keys protect writes. Centre creation assigns only its creator. Legacy aggregates remain intact but excluded from verified totals. Old aggregate write endpoints return 409 so they cannot bypass expiry, ownership or history.

**B03:** Derive expired/approaching-expiry from stored expiry dates. Seven days is an operational monitoring window, not shelf life. Expired/quarantined/discarded stock is unavailable. Disposal/quarantine uses the batch editor/audit; reservations must be released first. No records deleted or incompatible expired enum introduced.

**B04:** SQL aggregates usable unreserved stock by assigned centre/group, including zero-balance groups from the existing registry. Centre threshold overrides fall back to existing group configuration. No clinical thresholds invented. Shortages never trigger automatic bulk outreach.

**B05:** Preserve existing request states and urgency order. Approval does not reserve/deduct stock. Allocation reserves one or more matching owned batches for the complete quantity. Fulfillment locks request/batches, verifies usable reservations, deducts stock and marks issued atomically. Duplicate issue is prevented. Hospital cancellation releases reservations in its status transaction. Decision/reservation/issue/release history is recorded after migration. On-hold, partial fulfillment and clinical compatibility are not invented.

**B06:** Actual registered bank centres, assigned stock, district/group filters, usable/reserved totals, shortage comparisons and update times. Staff cannot view unassigned stock. The transfer destination directory exposes centre ID/name/district only.

**B07:** Request/approve/reject/cancel/dispatch/receive/detail/history. Request leaves balances unchanged; approval reserves source; dispatch deducts into transit; destination receipt creates a traceable batch preserving original group/component/dates and source transfer identity. Only assigned destination staff receive. Explicit acceptance and receiving-check note required; expired or failed-check receipts are quarantined. Locked states/retry keys prevent duplicate dispatch/receipt. Units are never usable at both centres simultaneously.

**B08:** Existing search/details/history retained. Lists omit contact/NIC/DOB/weight, support status filtering and expose no credentials. Details remain bank-only. Active/inactive donor changes require reason/audit; pending/suspended accounts cannot be arbitrarily promoted. No medical verification fields fabricated.

**B09:** Blood group/district/recorded interval and active-account selection identify potential outreach candidates. Legacy eligible means interval only; intervalMet and medicalEligibility:not_verified clarify it. Availability/preferences/verified screening are absent and never inferred. Qualified screening/contact confirmation remain necessary.

**B10:** Existing form now saves shared campaigns/statuses. Creator-only edits lock rows and enforce lifecycle, strict calendar dates and time ranges. Donor registrations preserved; published campaigns use the existing donor source. Participants/counts connected. Image upload remains local preview; existing HTTP image URLs can be retained, but no upload service was invented.

**B11:** Explicit selection of up to 500 active donors, persisted outreach and per-recipient status. In-app inbox entries commit atomically. Durable keys prevent duplicate entries; a database-backed one-minute per-staff cooldown limits creation. Manual categories: general/campaign/emergency/appointment_reminder; actual appointment events generate their own status messages. SMS/email requests persist provider_unconfigured with zero attempts. No provider, consent workflow, delivery worker or webhooks were configured. External delivery/retry is not implemented; no external messages sent.

**B12:** Existing list/filter/approve/complete/cancel reused. Decisions lock appointment, conditionally update status and atomically notify donor. UI now supports completing/cancelling approved appointments. Bank rescheduling reuses centre/donor conflicts and existing active-slot constraints, updates original record and notifies donor. Appointment centres are hospitals, with no bank-centre staff mapping: existing bank-wide appointment permission retained. Rejected enum not added; cancellation used where supported.

**B13:** Protected server JSON/CSV/PDF for inventory, donations, requests, expiry, regional, campaigns and transfers. Reuses PDFKit and hospital renderer. Summaries use complete matching records; more than 10000 source rows rejected with 413. Collected volume and campaign-donation linkage are labeled not recorded. CSV formula injection prevented. Date semantics: collection (inventory), actual expiry (expiry), submission (requests/transfers), event date (donations/campaigns). Regional balances are current and reject historical ranges.

**B14/dashboard/profile:** Coordination reuses regional/transfer services and open hospital demand. Dashboard excludes legacy aggregates, explicitly marks stock unavailable before migration, and supports active/upcoming campaigns, approaching-expiry units and assigned pending transfers. Own bank email updates persist; role/status/username are not editable. Existing JWT/bcrypt contracts preserved.

## C. Files created or modified

Preexisting unrelated changes were preserved; no Donor/Hospital frontend component changed in this task.

| File | Purpose |
|---|---|
| backend/database/migrations/004_bank_operations.sql | Eight additive support tables, prerequisite 003 |
| backend/scripts/bankMigration.js | Read-only schema check and explicit target apply |
| backend/models/bankInventoryModel.js | Permissions, shared batches, transactions, keys, thresholds, aggregation, audit |
| backend/models/bankTransferModel.js | Transfers, allocation, release, verified fulfillment |
| backend/models/bankManagementModel.js | Outreach, donor status, participants, profile, reschedule |
| backend/validators/bankValidators.js | IDs, dates, keys, stock, recipients and filters |
| backend/routes/bankOperationsRoutes.js | Protected operations and migration errors |
| backend/utils/bankReports.js | Seven report datasets; reuse PDF/CSV renderer |
| backend/tests/bankOperations.test.js | 61 isolated bank tests |
| backend/server.js | Mount /api/bank |
| backend/package.json | test:bank/db:bank:check scripts; no dependency installed |
| backend/models/bloodRequestModel.js | Verified issue, transactional release/cancellation, filters/audit |
| backend/controllers/bloodRequestController.js | Cancellation actor and bank filters |
| backend/routes/bloodRequestRoutes.js | Validate bank request queries |
| backend/models/hospitalModel.js | Locked decision guards and filters |
| backend/controllers/hospitalController.js | List filters and ID/reason validation |
| backend/routes/hospitalRoutes.js | Bank detail route and query validation |
| backend/controllers/inventoryController.js | Reject aggregate mutation bypasses |
| backend/controllers/statsController.js | Assigned verified stock/metrics and migration state |
| backend/models/donorDirectoryModel.js | List privacy, status filtering, screening distinction |
| backend/controllers/donorDirectoryController.js | Validate/pass filters |
| backend/models/appointmentModel.js | Locked reads, conditional decisions, filters |
| backend/controllers/appointmentController.js | Locked decisions/atomic notifications and filters |
| backend/routes/appointmentRoutes.js | Query validation |
| backend/models/campaignModel.js | Transaction executor/locking and status filter |
| backend/controllers/campaignController.js | Creator/state/publication rules and transactions |
| backend/routes/campaignRoutes.js | Status filter validation |
| backend/validators/domainValidators.js | Strict campaign dates |
| src/services/bankService.js | Actual bank APIs, keys, exports, migration handling |
| src/services/bankService.test.js | Path/key/migration contracts |
| src/BloodBank.js | Verified dashboard and own profile editor |
| src/BankNavigation.test.jsx | Mock new reads while preserving auth helpers |
| src/components/bank/BankForms.jsx | Confirmed saved forms, stable keys and history |
| src/components/bank/BankInventory.jsx | Receipt/edit/disposal/centre/threshold/history integration |
| src/components/bank/BankRegional.jsx | Regional/expiry, transfers/history, coordination API |
| src/components/bank/BankOperations.jsx | Allocation/reschedule, state actions, request history |
| src/components/bank/BankDonors.jsx | Audited account status editing |
| src/components/bank/BankNotifications.jsx | Actual selected-recipient outreach/history |
| src/components/bank/BankReports.js | Server preview/PDF/CSV/print and supported filters |
| src/components/bank/BankModules.test.jsx | Real operation payload/confirmation tests |
| src/components/bank/bankReportUtils.test.js | Approved appointment transition contract |
| src/components/CampaignManagement.jsx | Shared save/status/participants |
| BLOOD_BANK_BACKEND.md | This report |

## D. API documentation

All paths below use /api prefix. Except public login/registration, require Bearer JWT, active account and blood_bank role unless stated. Stock/transfers additionally enforce bank_location_access; bank role never implies all-centre access.

Common errors: 400 validation/related records; 401 missing/invalid JWT; 403 wrong role/inactive/unassigned; 404 missing or hidden resource; 409 state/version/stock/key conflict or legacy unsafe write; 413 dataset/report over 10000; 429 outreach cooldown; 503 migration/database unavailable; safe 500 for unexpected failure. Validation includes errors:[{field,message}].

Lists usually return {success:true,available:true,complete:true,items}. History lists explicitly limit:1000 and may set complete:false; they are not complete report sources. New transactional writes return {success:true,id,replayed,message,...}, 201 new/200 identical retry. Profile returns {success:true,profile}. Reports return {success:true,complete:true,report} or attachment.

New centre/batch/threshold/transfer/allocation/outreach/donor-status/reschedule writes require Idempotency-Key: 8..100 ASCII letters/digits/underscores/hyphens. Same key/data confirms prior result; changed payload returns 409. Key and mutation commit together. Existing profile/campaign/request/appointment APIs retain contracts; locked terminal-state guards prevent duplicate issue.

| Method / route | Request | Response / rules |
|---|---|---|
| GET /bank/centres | directory=true optional | Assigned centres; directory exposes active IDs/names/districts only |
| POST /bank/centres | name 1..150, district 1..100, key | New actual centre ID; creator assignment only |
| PUT /bank/centres/:id/thresholds | bloodGroup, lowStockThreshold, criticalStockThreshold, key | Assigned centre; integers 0..100000, critical<=low |
| GET /bank/inventory | bloodGroup,centreId,district,start/end collection dates optional | Assigned batches: physical/reserved/available/dates/status/version |
| GET /bank/inventory/:id | Positive batch ID | item or 404 |
| POST /bank/inventory | locationId,reference,bloodGroup,component,quantity,collectionDate,expiryDate,status,reason,key | Saved batch ID; no fabricated dates or aggregate conversion |
| PUT /bank/inventory/:id | quantity,status,version,reason,key | Saved ID; stale/reserved-disposal/expired-usable changes 409 |
| GET /bank/inventory/history | None | Latest 1000 assigned-centre events |
| GET /bank/expiry | bloodGroup,centreId,district,start/end expiry dates optional | Actual expired/approaching batches |
| GET /bank/regional-stock | bloodGroup,centreId,district optional | SQL usable/reserved totals, thresholds, timestamps |
| GET /bank/shortages | Same regional filters | Low/critical centre/group rows |
| GET /bank/transfers | None | Assigned source/destination transfers |
| GET /bank/transfers/:id | Positive ID | Assigned item or 404 |
| POST /bank/transfers | batchId,destinationId,quantity,reason,key | Real distinct centres, owned usable source |
| PUT /bank/transfers/:id | action approve/reject/cancel/dispatch/receive,note,key; receive: accepted boolean | Saved ID/status; source assignment except destination-only receiving |
| GET /bank/transfers/:id/history | Transfer ID | Latest 1000 visible recorded events |
| POST /bank/requests/:id/allocations | items:[{batchId,quantity}],key | Approved request; 1..100 distinct owned batches; matching group/exact total |
| GET /bank/requests/:id/history | Request ID | Visible decision/reservation/issue/release events |
| GET /bank/coordination | Regional filters optional | regional,shortages,openRequests,transfers,stats |

Bank batch availability/allocation/receipt expiry checks use the database business date, matching SQL aggregation even when the application clock differs.

Stock quantity integer 0..100000; transfer 1..100000; allocation item 1..65535 and exact complete-request sum. Reference/component <=100; reason/note <=500. Dates YYYY-MM-DD must be real, collection nonfuture, expiry>=collection, usable not expired. Status: usable/quarantined/discarded. Reservations controlled by allocation/transfer, never freely overwritten. ABO/Rh equality is not clinical compatibility testing.

Example receipt shape (replace placeholders with verified data):

```json
{"locationId":1,"reference":"VERIFIED-REFERENCE","bloodGroup":"O+","component":"Recorded component","quantity":5,"collectionDate":"YYYY-MM-DD","expiryDate":"YYYY-MM-DD","status":"quarantined","reason":"Physical receipt"}
```

Transfer states: requested -> approved -> dispatched -> received; requested/approved -> rejected or cancelled. Expired in-transit receipts can enter quarantine, never usable stock.

| Method / shared route | Role/request | Response / rules |
|---|---|---|
| POST /auth/login | Public; username,password | Existing bcrypt/JWT and user response; inactive denied |
| GET /auth/me | Existing authorized roles | Current account, no password hash |
| GET /bank/profile | Bank | Own id,username,email,role,accountStatus |
| PUT /bank/profile | Bank; email only <=100 | Saved own profile; privilege fields rejected |
| POST /auth/register/hospital | Public; existing registration fields | Hashed-password pending hospital, duplicates rejected |
| GET /hospitals | Bank; status pending/active/inactive/suspended,search,district optional | hospitals,stats; search/district<=100 |
| GET /hospitals/:userId | Bank; positive ID | hospital or 404 |
| GET /hospitals/stats; /hospitals/pending-count | Bank | Existing statistics/count |
| PUT /hospitals/:userId/approve | Bank | Confirmed active decision; valid transition required |
| PUT /hospitals/:userId/reject | Bank; reason nonempty <=1000 | Persisted inactive/reviewer metadata |
| PUT /hospitals/:userId/review-again | Bank | Rejected -> pending; conflicting repeat 409 |
| GET /blood-requests | Bank; status,search,bloodGroup,urgency,district,start/end optional | requests/counts; server urgency order retained |
| GET /blood-requests/:id | Bank | request and legacy advisory, which is not usable-stock proof |
| PUT /blood-requests/:id/status | Bank; approved/rejected/fulfilled/cancelled,note optional<=500 | Confirmed request/counts; fulfillment needs allocations; cancellation releases reservations |
| GET /donors | Bank; search,bloodGroup,district,status,eligible optional | Minimized donors/stats/breakdown; eligible is interval only |
| GET /donors/:id | Bank | Authorized details/appointments, no credentials |
| PUT /bank/donors/:id/status | Bank; active/inactive,reason,key | Audited account status; no medical/privilege edits |
| GET /campaigns | Donor/bank; district,date,period; bank status filter | Shared campaigns; donors only Upcoming/Active |
| GET /campaigns/:id | Donor/bank | Shared campaign; unpublished hidden from donors |
| POST /campaigns | Bank; name,date,startTime,endTime,organizerName and existing optional fields | Created shared campaign; strict date/time and nonpast publication |
| PUT /campaigns/:id | Bank creator; permitted fields/status | Locked creator/lifecycle validation; registrations preserved |
| GET /bank/campaigns/:id/participants | Bank | Registration/name/group/district/status, no contact expansion |
| GET /appointments | Bank; date,hospitalId,status,search optional | Existing active-hospital appointment source |
| PUT /appointments/:id/status | Bank; approved/completed/cancelled | Confirmed appointment plus atomic donor notification |
| PUT /bank/appointments/:id/reschedule | Bank; newDate YYYY-MM-DD,newTimeSlot HH:mm,key | Original record saved; nonpast/conflict/capacity checks and donor notice |
| GET /stats/blood-bank | Bank | Existing shape, assigned inventory, operations, migration state |

Existing donor registration/appointment/campaign/alert/inbox endpoints remain through prior contracts. Hospital receipt still requires verified physical batch data; automatic bank-to-hospital receiving/acceptance is not implemented.

| Method / managed API | Request | Response / constraints |
|---|---|---|
| POST /bank/notifications | donorIds 1..500 distinct active IDs; channel in_app/sms/email; type general/campaign/emergency/appointment_reminder; title<=150,message<=1000,key | Persisted ID/count/state; in-app inbox entries; external channels explicitly blocked |
| GET /bank/notifications | None | Current actor's latest 1000 outreach records/counts/channel/states; no other staff recipient contacts |
| GET /bank/reports | type inventory/donations/requests/expiry/regional/campaigns/transfers; supported start/end,bloodGroup,district,centreId; format json/csv/pdf optional | Complete matching report or genuine attachment; >10000 rows 413 |

Bank-centre filters cannot apply to hospital requests/donations or campaigns because no bank-centre assignment exists. Campaigns have no single collected group. Unsupported filters return 400, not silently ignored. Regional historical ranges rejected; transfer district means source district. PDF includes branding/title/period/date/supported filters/summary/data. CSV escapes formula prefixes/quotes.

## E. Database changes

Reuse users/hospitals/donors/appointments/blood_requests/campaigns/campaign_registrations/notifications/blood_inventory. Shared stock_locations/stock_batches from 003 hold all new stock balances, including hospital workflows. No duplicated balance table.

Migration 004 adds:

1. bank_location_access: staff/location assignments.
2. bank_operations: actor/operation/key/payload/result journal.
3. bank_audit: actor, event, location/batch/entity and change details/deltas. Existing hospital stock_movements requires hospital ownership and cannot represent bank events without changing its contract.
4. bank_transfers: source/destination batch identity, quantity, state.
5. bank_request_allocations: request/batch quantities, reserved/issued/released.
6. bank_outreach: authorized message/channel.
7. bank_deliveries: unique per-outreach recipient state, attempts, error code.
8. bank_stock_thresholds: centre/group overrides and critical<=low constraint.

Foreign keys, unique keys, indexes and checks included. No ALTER/DROP/TRUNCATE, seed, default membership, fake centre or aggregate conversion. Existing IDs/enums preserved. Intentional API changes: reject aggregate mutation/unverified fulfillment, enforce stricter transitions, minimize donor list personal data.

**Execution:** 003/004 prepared, NOT applied. Read-only check on nbts found all 13 expected tables missing. MySQL PREPARE/DEALLOCATE accepted all 13 CREATE statements; **zero schema statements were EXECUTEd**. This checks preparation/syntax, not actual table/foreign-key installation or new-table transaction behavior.

Read-only check from workspace root:

```powershell
node backend/scripts/bankMigration.js --check
```

Only after explicit approval and normal database backup/review:

```powershell
node backend/scripts/bankMigration.js --apply --database nbts
```

Apply requires exact configured-database match, only permits expected CREATE statements, and runs no seeds/old setup scripts. MySQL DDL cannot be transactionally rolled back; IF NOT EXISTS permits partial-create resumption but does not validate an incompatible existing table shape. Do not substitute db:setup.

After approval, register actual centres and verified batches. Creator is the only automatic assignee. Additional staff memberships require separately authorized provisioning; no self-service permission-escalation endpoint exists. No bank account is assumed to own every centre.

## F. Integration status

Tested means stated isolated automated checks, not live write certification. New-table MySQL integration and true simultaneous transactions await an approved staging environment.

| Feature | Backend | MySQL | Frontend integration | Remaining work |
|---|---|---|---|---|
| B01 Approval | Fully working and tested | Existing reads tested; writes untested live | Existing integration tested | Authorized write acceptance |
| B02 Inventory | Fully working and tested with fake DB | Pending migration | Connected/tested | Real batches, MySQL rollback/race tests |
| B03 Expiry | Stock guards tested; monitoring implemented | Pending migration | Connected; unavailable-state tested | Live disposal/expiry acceptance |
| B04 Shortages | Implemented but new SQL untested on tables | Pending migration | Connected | Verify centre thresholds/totals |
| B05 Requests | Fully working and tested with fake DB | Existing reads tested; allocation pending migration | Connected/tested | Live allocation/issue/cancel races |
| B06 Regional stock | Implemented but untested on new tables | Pending migration | Connected | Actual centre/access provisioning |
| B07 Transfers | Fully working and tested with fake DB | Pending migration | Receiving payload tested | Full multi-centre browser/MySQL acceptance |
| B08 Donors | Directory/status safeguards tested | Read tested; audited writes pending migration | Connected/tested | Authorized write acceptance; screening not invented |
| B09 Candidates | Partially integrated | Existing reliable filters | Connected | Verified availability/preferences/screening absent |
| B10 Campaigns | Shared create/publish/edit tests passed | Reads tested, writes untested live | Save/status/participants connected | Live/browser acceptance; image upload absent |
| B11 Notifications | In-app/retry/blocked-provider tests passed | Pending migration | Explicit-recipient submit tested | External provider/consent/worker/callback/retry not implemented |
| B12 Appointments | Decisions/reschedule/notifications tested | Reads tested; reschedule journal pending migration | Connected | MySQL conflicts/browser acceptance; rejected enum unsupported |
| B13 Reports | Request PDF/CSV/totals tested; seven sources implemented | Existing-table reads/PDF tested; other sources pending migration | Server preview/export tested | Full-source totals and PDF visual acceptance |
| B14 Coordination | Implemented shared services | Pending migration | Connected | Live scoped operational acceptance |
| Dashboard/profile | Implemented; read smoke passed | Reads tested; profile writes untested live | Connected | Authorized writes/browser acceptance |

## G. Testing results

- `node --test backend/tests/bankOperations.test.js backend/tests/hospitalOperations.test.js`: **112 passed, 0 failed** (61 bank, 51 hospital). Real routes/JWT/models with isolated fake transactional adapter; no live writes. Covers roles/status/ownership, versions, rollback/retries, unusable/insufficient stock, transfer lifecycle/destination permissions/duplicate operations, reservation release/issue, approval conflicts, donor privacy, shared campaign publication, appointment notices/reschedule, outreach and PDF.
- `CI=true npm test -- --watchAll=false --runInBand`: **14 suites, 105 tests passed, 0 failed**, including donor/hospital/bank regressions and actual allocation/receiving/outreach/export payloads. Final full-suite rerun after filter/control changes also passed: 105/105 in 14 suites (34.067 seconds).
- Scoped ESLint: passed for bank dashboard/navigation/components/campaign/service changes.
- Production build after final filter/control changes: compiled successfully with no warnings (main.f09b5765.js, 145.47 kB gzip).
- Read-only schema check: nbts reachable, 13 tables missing; no apply.
- MySQL PREPARE/DEALLOCATE: 13 CREATE statements prepared; none executed.
- Temporary authenticated live GET smoke: profile, stats, filtered donors/campaigns/hospitals/requests/appointments, request/donation/campaign JSON reports and request PDF returned **200**; PDF begins `%PDF-`. Inventory/expiry/regional/transfers/managed-notifications/coordination returned **503** pending migration. Temporary server/DB connections closed; no JWTs or personal rows printed.
- Scoped tracked-file whitespace check passed. Earlier unrelated schema EOF whitespace preserved.

Resolved failures found during work: outdated frontend transition expectations/auth mocks, stale ESLint cache, a reserved MySQL notification-history alias, a test expecting string rather than explicit boolean receipt acceptance, and the all-pages navigation test exceeding five seconds under parallel build load (per-test allowance set to 20 seconds; assertions preserved). Final live history check reaches expected missing-table 503. No failed tests were hidden.

Not executed: live writes/migrations; actual new-table MySQL integration and simultaneous allocation/transfer races; destructive/seeding old E2E scripts; external SMS/email/callbacks; full browser acceptance; rendered PDF/multipage/non-Latin visual verification. PDF tests establish generation/binary response, not layout or clinical correctness.

No dependency installed for this bank task. Prior hospital work recorded five production dependency audit findings in existing Express/mysql2 chains; no remediation or fresh audit was performed here. A separately validated upgrade/security review remains appropriate before deployment.

## H. Outstanding tasks

1. Approve/apply reviewed additive 003/004 to confirmed target after backup/schema review.
2. Provision actual centres/staff assignments/verified batches. Aggregate totals cannot supply missing dates/provenance.
3. Run new-table integration/rollback/concurrency tests on approved staging MySQL, then authorized browser acceptance. Real records must not become disposable fixtures.
4. Configure actual SMS/email provider, verified recipient consent/preferences, reliable worker/retries and authenticated delivery callbacks. Blocked records are not external delivery.
5. Define actual hospital-centre assignments, bank-to-hospital receipt/acceptance, medical screening/availability and donor verification workflows where required; none are guessed.
6. Visually verify long/multipage PDF and required Sinhala/Tamil fonts. Collected donation volume/campaign linkage require actual source records to support those report fields.
7. Review dependency advisories/deployment settings separately. No AI demand prediction, automated distribution optimization, on-hold/partial-fulfillment enums or automatic clinical release added.

Final verification: 112 backend tests and 105 frontend tests passed; scoped lint/whitespace checks passed; production build compiled successfully. Live migration execution, new-table MySQL write/concurrency acceptance, external delivery and PDF visual QA remain outstanding as described above.
