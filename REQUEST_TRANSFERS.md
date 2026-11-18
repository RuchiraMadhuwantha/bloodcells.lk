# Blood requests and transfers

Approved requests appear on the blood bank Blood Transfers page as **Approved -
not sent yet**. Approval alone does not move stock. Staff open the blood request,
set aside its batches with Allocate batch, and choose Issue blood.

Issuing blood creates one outgoing transfer for each allocated batch, linked to
the request and allocation. The units and recorded volume are deducted once by
the request transaction. Transfer creation does not deduct stock a second time.
The request and its transfers are saved together or rolled back together.

The hospital sees these records in Blood Transfers, including the blood request
reference, and confirms arrival and receiving checks. Receipt adds hospital stock
once. Request transfers cannot be dispatched again from the manual transfer
controls. Existing manual transfers and hospital-to-main-bank transfers keep
their usual workflow.

For an existing database:

```powershell
node backend/scripts/setupRequestTransfers.js --backfill
```

The setup adds nullable request links, foreign keys and a unique allocation link.
It saves a local backup before changes. Backfill records previously issued
allocations without deducting stock, creating hospital stock or sending messages.
An explicitly recorded old receipt reuses its existing hospital batch and is
marked received; otherwise the transfer awaits hospital arrival confirmation.
Running it again does not create duplicate transfers.

Restart the backend after deploying. Checks:

```powershell
node backend/scripts/checkRequestTransfers.js
node backend/scripts/checkHospitalCompletion.js
```

The first is read-only. The second exercises request issue, transfer tracking and
hospital receipt with real database transactions and rolls every fixture back.
