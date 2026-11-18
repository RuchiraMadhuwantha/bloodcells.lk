# Gmail email announcements

Notification Management supports in-app announcements and Gmail SMTP email.
The configured sender is `bloodcells30@gmail.com`. SMTP secrets are read only
from the ignored `backend/.env`; they are never returned to the browser.

## Activate Gmail

1. Sign in to the sender Google account and enable 2-Step Verification.
2. Create an app password at https://myaccount.google.com/apppasswords.
   Use this app password instead of the account's regular password.
3. In `backend/.env`, enter `SMTP_PASS=<app password>` and set
   `EMAIL_ENABLED=true`. The following settings are already prepared:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=bloodcells30@gmail.com
SMTP_FROM=bloodcells30@gmail.com
```

4. Restart the backend. Run `npm run email:verify` from `backend`, or use
   **Check email connection** in Notification Management. This checks SMTP
   authentication without sending an email. Successful verification does not
   establish final inbox delivery.

Google account policy can restrict app-password availability. See the official
instructions: https://support.google.com/mail/answer/185833?hl=en.

## Donor opt-in and sending

Donors use **My Profile → Edit Profile → Receive blood bank announcements by
email**, then Save Changes. New donors have email notifications enabled by default. Migration 012 enables existing donor accounts once; later profile opt-outs remain effective. Only active donors
who opted in appear in email recipient previews. The server rechecks opt-in,
account status and address before queuing and immediately before processing.

Blood bank staff select **Email**, filter the audience, review the message and
explicit recipient list, then confirm. Each recipient receives a separate email;
other recipient addresses are not exposed. Email sends do not create an in-app
inbox record claiming email delivery.

## Queue, status and retries

- A saved announcement queues durable per-recipient records transactionally.
  Repeating an identical submission key does not queue duplicate emails.
- The backend worker processes at most one recipient every two seconds and
  verifies the SMTP connection periodically. Authentication/connection failures
  pause processing before further attempts.
- **Queued**, **Sending**, **Accepted by mail server** and **Failed** appear in
  delivery history. The stored `delivered` database status means SMTP acceptance;
  it does not mean the message reached the inbox or was read.
- Retry failed emails is limited to three attempts, requires the sending bank
  account and current opt-in/address eligibility, and uses an idempotency key.
  Already accepted emails are excluded.
- Interrupted or ambiguous SMTP sends become **Delivery uncertain**, including
  abandoned sends older than 15 minutes. They are not automatically retried;
  review the provider's records before taking further action. SMTP cannot provide
  a transactional exactly-once guarantee across network interruptions.
- Opt-out stops queued messages not yet claimed for sending. An email already
  being submitted may still complete.

## Setup and checks

Run `npm run db:email:setup` from `backend` for migration 011. It preserves all
existing records and adds donor consent and delivery metadata. The local database
has this update applied. Email remains off until credentials are supplied and
`EMAIL_ENABLED=true` is set.

```powershell
node --test tests/emailService.test.js tests/emailWorker.test.js
npm run check:hospital:completion
```

Tests use fake SMTP and rolled-back database fixtures. They do not send real
messages. In-app notifications continue to work independently of Gmail settings.
Password-reset emails and SMS are separate features and are not wired into this
announcement queue.
