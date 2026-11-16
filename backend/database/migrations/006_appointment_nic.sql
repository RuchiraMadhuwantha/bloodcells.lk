-- Existing installations: apply once. Existing donor profiles are unchanged.
ALTER TABLE appointments ADD COLUMN booking_nic VARCHAR(20) NULL;
