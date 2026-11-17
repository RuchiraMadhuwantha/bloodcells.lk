# Campaign donations and blood bank reports

Hospital staff can select **Donation campaign (optional)** when recording a
collection. Choices contain published or completed campaigns assigned to that
hospital on the donation date. Routine donations can remain unassigned.

For past completed donations, open Hospital → Appointment Management →
**Link campaign**, choose the matching campaign and enter a reason. Selecting
**No campaign / routine donation** removes an incorrect link. This changes only
the campaign association; it does not create another inventory batch or change
the recorded collection amounts. Link changes are audited. Repeating the same
link does not add another donation.

Campaign Management and the blood bank Campaign Donation Report show registered
participants, linked completed donations, collected units, collected mL and
donations with missing quantities separately. Registrations, pending appointments
and unassigned donations do not become campaign collection totals. A donation
belongs to at most one campaign. Campaign hospital/date changes are blocked while
donations are linked, preserving the hospital and date association.

Existing historical donations remain unassigned until staff explicitly link them;
no campaign attendance or missing collection amount is inferred.

Inventory and expiry reports now include recorded batch volume. Transfer reports
include each transfer's recorded volume and received-volume totals. Unknown mL
is labelled **Not recorded** and excluded from measured-volume totals, with a
separate missing-volume count. CSV/PDF/print use the same server-generated data.
Report date labels identify the dates being filtered, and reversed ranges are
blocked before submission. Regional Stock is not offered in the report menu.

## Setup

From `backend`, run `npm run db:campaign-donations:setup`, then restart the
backend. This repeatable migration adds nullable `appointments.campaign_id`, its
foreign key and a campaign/status index. `db:setup` also adds the field on new
installations. No historical rows are assigned automatically.

- `GET /api/hospitals/mine/collection-campaigns?date=YYYY-MM-DD`
- `PUT /api/appointments/:id/campaign`
  `{ "campaignId": 1, "note": "Confirmed campaign attendance" }`
- Collection payloads accept optional `campaignId`.
- Campaign list/detail responses include `completedDonations`, `collectedUnits`,
  `collectedVolumeMl` and `missingCollectionAmounts`.

Run `node --test tests/campaignDonations.test.js tests/bankOperations.test.js`
for focused checks. `npm run check:hospital:completion` runs a real MySQL workflow
including campaign links, separate registration/collection totals, access checks,
CSV/PDF exports and repeat-save protection, then rolls all fixture data back.
