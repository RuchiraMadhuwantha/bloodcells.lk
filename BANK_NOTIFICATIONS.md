# Blood bank notification management

Notification Management has three views:

- **Inbox:** account-owned notifications, unread/category filters, search within
  the current page, next/previous pages, details and read controls. Hospital
  appointment and transfer updates link to the corresponding bank section.
- **Compose notification:** title, category, message and active donor audience.
  Filter by blood group, district, previously selected donors and campaign
  registration. Campaign filters include registered participants only. Review
  recipients and message before confirming. Draft text survives tab changes.
- **Sent history:** the account's latest 1,000 announcements, stored/read counts,
  message details and individual recipient delivery/read status.

Recipient previews are calculated on the server. More than 500 matches requires
narrower filters. An empty selected-donor list cannot become a broadcast. The
server rechecks campaign registrations and active donor accounts on submission.
Saves, delivery records, donor inbox entries and audits share one transaction;
retrying the same submission key does not duplicate an announcement. The existing
one-announcement-per-minute limit remains in place.

In-app delivery works. SMS/email are disabled in the compose menu until provider
and consent integrations exist. Older blocked external-channel records remain
visible as **Not sent**, rather than being presented as delivered. An emergency
announcement is an inbox message; it does not publish a separate emergency alert.

The notification bell opens Notification Management. No hospital sidebar
notification item is added.

## Database and endpoints

Run `npm run db:bank-notifications:setup` from `backend`, then restart the backend.
The repeatable migration adds nullable `bank_outreach.campaign_id` and preserves
old announcements. New bank-table installations include it in migration 004.

- `GET /api/bank/notification-recipients?mode=filters&campaignId=7`
- `GET /api/bank/notification-recipients?mode=selected&donorIds=4,5`
- `POST /api/bank/notifications` accepts optional `campaignId`, explicit
  `donorIds` and an `Idempotency-Key`.
- `GET /api/bank/notifications/:id` returns only announcements sent by the
  authenticated bank account, with recipient details limited to names, groups,
  districts and delivery/read status.
- Existing `/api/notifications` inbox endpoints support `hasMore` and
  `nextOffset`, plus individual and all-read actions scoped to the signed-in user.

Run `node --test tests/bankNotifications.test.js tests/bankOperations.test.js`
and `npm run check:hospital:completion` for regression checks. The integration
check verifies campaign targeting, duplicate prevention, inbox privacy,
pagination and read status using temporary data, then rolls every fixture back.
It does not send external messages or leave announcements in donor inboxes.
