-- Existing databases: npm run db:hospital:complete (safe to rerun).
ALTER TABLE stock_batches ADD COLUMN volume_ml DECIMAL(12,2) UNSIGNED NULL,
  ADD COLUMN appointment_id INT UNSIGNED NULL,
  ADD UNIQUE KEY uq_stock_collection_appointment (appointment_id),
  ADD CONSTRAINT fk_stock_collection_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id);
ALTER TABLE hospital_blood_usage ADD COLUMN volume_ml DECIMAL(12,2) UNSIGNED NULL;
ALTER TABLE bank_transfers ADD COLUMN volume_ml DECIMAL(12,2) UNSIGNED NULL;
