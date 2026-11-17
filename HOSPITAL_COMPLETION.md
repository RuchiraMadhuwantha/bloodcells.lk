# Hospital portal workflow completion

## Collection and inventory

From Appointment Management, approve the booking and record its collected units,
millilitres, blood component and actual expiry date. The collection save creates
a hospital-owned inventory batch named `COLLECTION-AP-xxxxx` in quarantine.
Collection, inventory movement, donor history and notifications commit together.
A unique appointment link prevents duplicate collection batches.

After checks, use Hospital Inventory → Details → Update stock to record the
release decision and reason. Quarantined or expired blood has no usable units.
Existing historical collections are preserved; batches and expiry dates are not
invented for them or automatically added on top of existing stock.

## Units and millilitres

Stock entries, adjustments, usage and transfers now support recorded mL with
two decimal places. Both transfer directions carry the dispatched volume into
the receiving inventory batch. Usage and dispatch deduct units and mL atomically.

Enter actual movement volume when available. If omitted for a batch with a
recorded total volume, the service allocates that total in proportion to units,
rounding to 0.01 mL and retaining the remainder for later moves. These allocations
are bookkeeping splits, not new measurements. For legacy batches without a
recorded volume, omitted mL remains null and displays as **Not recorded**.
Adjusting units on a batch with known volume requires an updated actual volume.

## Hospital appointment controls

Pending and approved appointments have compact Reschedule and Cancel actions.
Rescheduling checks hospital ownership, booking state, dates, centre capacity and
donor conflicts. Cancellation requires confirmation. Completed and cancelled
appointments cannot be changed. The donor and blood bank receive saved in-app
notifications for both actions.

- `PUT /api/appointments/:id/hospital-reschedule`
  `{ "appointment_date": "2027-01-01", "time_slot": "09:00" }`
- `PUT /api/appointments/:id/hospital-cancel` with `{}`
- `PUT /api/appointments/:id/collection`
  `{ "collectedUnits": 1, "collectedVolumeMl": 450,
     "component": "Whole blood", "expiryDate": "<actual batch expiry>" }`

## Reports

Reports now include completed donation collections and incoming/outgoing blood
transfers, alongside requests, fulfillment, inventory and usage. Every report
supports preview, print, CSV and PDF. Hospital ownership, blood group and date
filters apply on the server. Collections filter by donation appointment date;
transfers filter by transfer creation date. Missing volume/collection amounts
are identified rather than presented as zero measurements.

## Database and validation

After the standard hospital and bank table setup, run from `backend`:

```powershell
npm run db:hospital:complete
```

This repeatable migration adds nullable volumes and a unique collection link
without rewriting historical data. Restart the backend after updating the code.
New installations also get these fields from migrations 003 and 004.

```powershell
node --test tests/hospitalCompletion.test.js tests/hospitalOperations.test.js tests/hospitalTransfers.test.js tests/bankOperations.test.js
npm run check:hospital:completion
```

The second check runs against MySQL with temporary fixtures and rolls back its
stock changes, appointments and notifications. It needs the existing active demo
hospitals, donor and bank. It verifies collection linkage, quarantine release,
usage, both transfer directions, volume conservation, retries, ownership, reports,
rescheduling and cancellation.
