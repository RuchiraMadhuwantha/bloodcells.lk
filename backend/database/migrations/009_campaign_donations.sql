-- Existing databases: npm run db:campaign-donations:setup (safe to rerun).
ALTER TABLE appointments ADD COLUMN campaign_id INT UNSIGNED NULL,
  ADD KEY idx_appointment_campaign_status (campaign_id,status),
  ADD CONSTRAINT fk_appointment_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id);
