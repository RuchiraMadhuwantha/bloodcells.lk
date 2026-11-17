# Hospital blood transfers

Hospital Portal → **Blood Transfers** lists only the signed-in hospital's
inventory batches and transfer history. Batch details include blood group,
component, physical/reserved/available units, collection date, expiry and status.

Choose **Transfer to Blood Bank**, select a blood batch and receiving bank centre,
enter units and a reason, then confirm. This action remains visible with empty
inventory and guides the user through missing stock or receiving-centre setup.
The source must be usable, unexpired, owned by the hospital
and have enough unreserved units. Transfers require a registered active bank
centre with an active assigned bank account.

Sending deducts hospital stock once and creates an **In transit** transfer. The
destination's assigned bank staff receive an in-app notification and can confirm
receipt through Blood Bank → **Blood Transfers**. Receipt creates a destination
batch, preserves component and dates, and records the receiving decision. Blood
that fails receiving checks, or has expired in transit, is recorded quarantined.
Receipt notifies the originating hospital; its transfer history updates to
**Received**. No units are added to bank stock before receipt.

Stock changes, movements, audit records, notifications and durable submission
keys are transactional. Repeating an identical submission does not move stock
again; a reused key with changed data is rejected. Other hospitals cannot access
the source stock or its transfers. Only bank staff assigned to the destination
can receive the transfer.

## Incoming blood

Blood bank staff can select an active hospital as a transfer destination and
approve and dispatch the transfer. The receiving hospital sees it under
**Blood Transfers → Received Blood**, with its sending bank, batch, blood group,
component, units, collection date, expiry and status.

**Confirm receipt** records receiving checks and adds the units to that
hospital's inventory once. Expired blood or blood awaiting checks is quarantined.
The sending bank receives an in-app confirmation. Other hospitals cannot view
or receive the transfer.

`PUT /api/hospitals/mine/transfers/:id/receive` requires `Idempotency-Key` and
`{ "accepted": true, "note": "Receiving checks recorded" }`.

## Database setup

Existing migrations `003_hospital_operations.sql` and `004_bank_operations.sql`
provide the shared tables. No new tables or duplicate inventory ledger are added.
Use the existing migration runner for a configured local database, then restart
the backend. Register a receiving centre from Blood Bank → **Blood Inventory**
and add physical hospital batches from Hospital → **Hospital Inventory**.
New appointment collections create linked quarantined inventory batches using
the entered component and actual expiry. See [hospital workflow completion](HOSPITAL_COMPLETION.md)
for volume tracking, collection linkage and the repeatable database update.

## APIs

- `GET /api/hospitals/mine/transfer-destinations`
- `GET /api/hospitals/mine/transfers`
- `GET /api/hospitals/mine/transfers/:id`
- `POST /api/hospitals/mine/transfers`, with `Idempotency-Key` and body
  `{ "batchId": 1, "destinationId": 2, "quantity": 3, "reason": "Bank supply" }`.
- Hospital receipt uses `PUT /api/hospitals/mine/transfers/:id/receive`.
- Blood bank receipt uses the existing bank transfer action API and destination permissions.

Run `npm run test:hospital`, `npm run test:transfers` and `npm run test:bank`
from `backend` for regression checks.
