# Hospital portal demo dataset

Seeded on **17 November 2026 (Asia/Colombo)** for all four active hospitals:

| Hospital | Existing login | New demo donor account prefix |
|---|---|---|
| Demo Colombo Donation Centre | `demo_hospital1` | `demo_portal_h26_d` |
| Demo Kandy Donation Centre | `demo_hospital2` | `demo_portal_h27_d` |
| Demo Galle Donation Centre | `demo_hospital3` | `demo_portal_h28_d` |
| OSRO | `OSRO` | `demo_portal_h31_d` |

Each hospital received:

- Five appointments: a completed historical donation (1 unit / 450 mL), an
  approved appointment on the seed date, future pending and approved bookings,
  and a cancelled booking.
- Six requests covering pending emergency, pending normal, approved, fulfilled,
  rejected and cancelled cases.
- Eleven stock batches covering all eight blood groups, an expired batch, a
  quarantined batch and a receipt linked to the fulfilled demo request.
- Two usage records with matching stock deductions and audit movements.
- Two outbound transfers: one in transit and one received by the blood bank.
- One upcoming campaign assigned only to that hospital, with two demo registrations.
- Demo campaign, transfer and portal notifications.
- Four clearly named demo donor accounts. Append `1`, `2`, `3` or `4` to the
  account prefix above; their password is `Demo@12345`.

For example, `demo_portal_h31_d1` has the completed historical donation, and
`demo_portal_h31_d2` has OSRO's approved appointment on the seed date. Existing
hospital and blood bank passwords were not changed.

Three **DEMO Receiving Blood Bank** centres were added in Colombo, Kandy and
Galle, assigned to the existing `demo_bank` account. Each has eight opening
blood-group batches. The bank can receive the in-transit hospital transfers.

Dashboard statistics and reports use these saved records. No separate report
totals were fabricated. Hospital stock movements and bank stock audits reconcile
with current balances; usage, fulfilled requests and transfers move quantities
consistently. Historical seeded collections are preserved separately; new collections
recorded through the hospital form create linked quarantined inventory batches.

## Labels and preservation

These are fictional workflow examples, not medical or operational records.
Batch references use `DEMO-P1-`; requests, appointments, transfer reasons and
notifications carry demo labels. New donor names are prefixed `Demo`; their NICs
are synthetic test identifiers and email addresses use `example.test`.

Existing operational records and OSRO's profile were preserved. Missing contact
fields were filled only on existing `demo_` hospital profiles using fictional
placeholder values. Pending and inactive hospitals were excluded.

## Rerun

From `backend`, run:

```powershell
npm run db:seed:hospitals
```

The seed runs in a transaction and records a per-hospital marker in
`hospital_operation_keys`. Repeating it does not duplicate records or reset
quantities, statuses, passwords or dates. New active hospitals can be populated
on a later run if the shared demo source batches remain usable and sufficient.
The seed is a dated snapshot; it does not refresh expired stock automatically.

## Incoming transfer examples

Run `npm run db:seed:incoming-transfers` from `backend` after the main seed.
Each seeded active hospital has two incoming bank transfers: two units already
received into inventory, and one unit awaiting receipt. These use the normal
approval, dispatch and receipt operations and carry demo transfer reasons.
Rerunning the command reuses durable submission keys without moving stock again.
