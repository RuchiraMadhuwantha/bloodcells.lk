# Hospital appointments and blood collection

Hospitals have an **Appointment Management** sidebar page. They can approve
their own pending appointments and record collected units and millilitres for
approved appointments on or after the appointment date. Saving a collection
completes the appointment and updates the donor's last donation date without
moving it backwards.

Approval and collection notifications go to the donor and every active blood
bank account. Quantities, status and notifications are saved in one transaction.
Repeated collection submissions cannot overwrite or count a donation twice.

The blood bank appointment page shows hospital, donor, blood group, status,
recorded units and millilitres, with totals for the filtered records. Donation
reports include the recorded quantities. Existing completed appointments with
unknown quantities remain **Not recorded** and do not contribute to totals.
Bank staff can still cancel or reschedule eligible appointments, but only the
hospital can approve an appointment or record its collection.

Collection records do not create usable inventory batches. Batch receipt,
screening status, storage location and expiry remain separate inventory steps.

## Database setup

For existing installations, run from `backend`:

```powershell
npm run db:collections:setup
```

This command checks for and adds missing appointment NIC and collection
columns. It is safe to rerun. Alternatively, import
`backend/database/migrations/005_appointment_collections.sql` once in phpMyAdmin.
New installations include the fields in `schema.sql`; `db:setup` also handles
older installations. Restart the backend after updating the source.

## APIs

- `GET /api/appointments/hospital`: own hospital appointments and quantities.
- `PUT /api/appointments/:id/approve`: hospital approval.
- `PUT /api/appointments/:id/collection`: hospital collection, body
  `{ "collectedUnits": 1, "collectedVolumeMl": 450 }`.
- `GET /api/appointments`: blood bank overview and saved quantities.
- `GET /api/bank/reports?type=donations`: donation quantities and totals.

Collection amounts are entered separately; no unit-to-volume conversion is assumed.

## Booking NIC

Donors may enter an optional NIC when booking. The booking stores its own NIC;
the donor profile is unchanged. Old-style NICs (nine digits and V/X) and
12-digit NICs are accepted. Appointment details display it when supplied.
For a manual upgrade, import migration `006_appointment_nic.sql` once; new
installations already include the field in `schema.sql`.
