# Campaign hospital assignments

The blood bank selects **Select Donation Centre** when creating or editing a
campaign. This stores `campaigns.hospital_id`; the venue remains editable and
does not control access. Publishing requires an active, approved hospital.

Hospitals can list and open only their own assigned, published campaigns.
The backend uses the signed-in user to determine the hospital; callers cannot
choose another hospital through query parameters. Unassigned campaigns stay
hidden from hospital accounts.

Publishing or assigning a published campaign to a different hospital notifies
only that hospital. Repeated edits for the same assignment do not create
duplicate publication notifications. Previously broadcast hospital campaign
notifications are filtered by current assignment in lists, unread counts,
single-record access and read actions.

Donor and public published-campaign browsing is unchanged.

For existing databases, run from `backend`:

```powershell
npm run db:campaigns:setup
```

The command adds the assignment column and foreign key if missing, then fills
only unassigned campaigns whose venue name and district uniquely match a
hospital. Unmatched campaigns require manual selection by the blood bank.
New databases include the field in `schema.sql`. Migration
`007_campaign_hospital.sql` adds the column and foreign key once when importing
manually in phpMyAdmin. Restart the backend after updating the source.
