ALTER TABLE campaigns
  ADD COLUMN hospital_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_campaign_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id);
