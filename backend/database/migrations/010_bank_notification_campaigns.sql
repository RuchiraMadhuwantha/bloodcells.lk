-- Existing databases: npm run db:bank-notifications:setup (safe to rerun).
ALTER TABLE bank_outreach ADD COLUMN campaign_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_bank_outreach_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id);
