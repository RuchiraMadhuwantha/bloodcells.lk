-- ============================================================================
-- OPTIONAL, REVIEW-GATED. Do not run without explicit authorization.
--
-- Fixes two uniqueness gaps in `appointments`:
--
--   1. Existing uk_appointments_slot (donor_id, appointment_date, time_slot)
--      treats CANCELLED rows as occupying the slot, so a donor who cancels
--      cannot re-book the same slot (and a reschedule onto a slot the donor
--      previously cancelled fails with a raw duplicate-entry error).
--
--   2. The frontend treats a (hospital, date, time_slot) as taken for everyone
--      once any donor books it, but nothing in the database enforces that, so
--      two donors can book the same centre slot concurrently.
--
-- The fix adds VIRTUAL generated columns that are NULL for cancelled rows and
-- are covered by unique indexes. MySQL unique indexes allow multiple NULLs,
-- so cancelled rows stop blocking re-booking while active rows stay protected.
--
-- NOTE: STORED generated columns were rejected by MySQL 8.4.7 on this server
-- ("Cannot add foreign key constraint"); VIRTUAL columns + unique indexes
-- achieve the same guarantee.
--
-- PREFLIGHT (must return 0 rows before running). Any active duplicates must be
-- resolved by the business first — this script will NOT delete user data:
--
--   SELECT hospital_id, appointment_date, time_slot, COUNT(*) AS active_bookings
--     FROM appointments
--    WHERE status <> 'cancelled'
--    GROUP BY hospital_id, appointment_date, time_slot
--   HAVING active_bookings > 1;
--
--   SELECT donor_id, appointment_date, time_slot, COUNT(*) AS active_bookings
--     FROM appointments
--    WHERE status <> 'cancelled'
--    GROUP BY donor_id, appointment_date, time_slot
--   HAVING active_bookings > 1;
-- ============================================================================

ALTER TABLE appointments
  ADD COLUMN active_donor_slot VARCHAR(64)
    GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, CONCAT_WS('|', donor_id, appointment_date, time_slot))) VIRTUAL,
  ADD COLUMN active_centre_slot VARCHAR(64)
    GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, CONCAT_WS('|', hospital_id, appointment_date, time_slot))) VIRTUAL;

-- MySQL will not let us drop the old unique index while the FK on donor_id
-- relies on it for its leftmost prefix; give the FK a supporting index first.
CREATE INDEX idx_appointments_donor ON appointments (donor_id);

-- Replaces the old unconditional donor-slot constraint.
ALTER TABLE appointments DROP INDEX uk_appointments_slot;

CREATE UNIQUE INDEX uk_appointments_donor_active_slot ON appointments (active_donor_slot);
CREATE UNIQUE INDEX uk_appointments_centre_active_slot ON appointments (active_centre_slot);
