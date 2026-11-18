-- Existing databases: npm run db:email:setup (safe to rerun).
ALTER TABLE donors ADD COLUMN email_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN email_consent_updated_at DATETIME NULL;
ALTER TABLE bank_deliveries ADD COLUMN recipient_email VARCHAR(100) NULL,
  ADD COLUMN message_id VARCHAR(255) NULL, ADD COLUMN sending_started_at DATETIME NULL,
  ADD COLUMN accepted_at DATETIME NULL, ADD KEY idx_bank_delivery_status (status,delivery_id);
