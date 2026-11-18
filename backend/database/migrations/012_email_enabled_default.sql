-- Apply once when enabling email for all existing donors.
-- Reapplying the UPDATE would overwrite later donor preference changes.
ALTER TABLE donors ALTER COLUMN email_opt_in SET DEFAULT 1;
UPDATE donors SET email_opt_in=1,email_consent_updated_at=CURRENT_TIMESTAMP WHERE email_opt_in=0;
