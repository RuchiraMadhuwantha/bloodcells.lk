# Blood expiry demo dataset

Seeded on **18 November 2026 (Asia/Colombo)** for the demo blood bank locations
assigned to `demo_bank` (locations 3 `Main Blood Bank`, 4 `DEMO Receiving Blood
Bank - Kandy`, 5 `DEMO Receiving Blood Bank - Galle`).

Each location received fictional batches so the Blood Expiry screen, its filters
and its disposal workflow have demo coverage:

| Location | Batch reference | Group | Units | Expiry | Status |
|---|---|---|---|---|---|
| Main Blood Bank | `DEMO-EXP-3-EXPIRED-O-PLUS` | O+ | 6 | 4 days ago | usable |
| Main Blood Bank | `DEMO-EXP-3-EXPIRING-A-MINUS` | A- | 3 | in 2 days | usable |
| Kandy | `DEMO-EXP-4-EXPIRED-B-PLUS` | B+ | 2 | yesterday | quarantined |
| Kandy | `DEMO-EXP-4-EXPIRING-AB-MINUS` | AB- | 4 | today | usable |
| Galle | `DEMO-EXP-5-EXPIRED-O-MINUS` | O- | 5 | 8 days ago | discarded |
| Galle | `DEMO-EXP-5-EXPIRING-A-PLUS` | A+ | 2 | in 5 days | usable |
| Galle | `DEMO-EXP-5-EXPIRING-B-MINUS` | B- | 3 | in 7 days | usable |

These are fictional records, not medical or operational stock. Batch references
use `DEMO-EXP-<location>-`; every seeded row carries `demo: true` in the stock
audit details and a `demo-expiry-seed` audit event, so the bank audit reconciles
with the seeded quantities.

## Rerun

From `backend`:

```powershell
npm run db:seed:expiry
```

The seed runs in a transaction and skips any `DEMO-EXP-` reference that already
exists. It does not move, rewrite or delete any existing stock, and disposing of
a demo batch through the Blood Expiry screen only marks that batch discarded.
