# Main blood bank transfers

All hospitals send to one main blood bank. Districts do not choose the destination.
The hospital form sends batch, units, optional volume and reason. The backend
selects the main bank and notifies its active staff. Only the receiving bank
confirms arrival; sending does not add usable receiving stock automatically.

`MAIN_BLOOD_BANK_LOCATION_ID` in `backend/.env` identifies the receiving stock
location. Configure an existing active bank location with active staff using:

```powershell
node backend/scripts/configureMainBloodBank.js <location-number>
```

Restart the backend after changing the setting. The setup script saves a local
backup of the old location name and setting. It does not move stock or rewrite
past transfer records. Older centres can remain as storage/history records;
they are not offered as hospital destinations. Old clients that explicitly send
a different destination are rejected before any stock is deducted.

If the main bank or its staff are unavailable, transfers are blocked. The app
never falls back to a regional bank. Incoming transfers already sent to a hospital
can still be received and checked normally.
