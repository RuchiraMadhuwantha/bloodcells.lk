-- Existing installations: apply once. Historical quantities remain unknown.
ALTER TABLE appointments
  ADD COLUMN collected_units INT UNSIGNED NULL,
  ADD COLUMN collected_volume_ml INT UNSIGNED NULL,
  ADD COLUMN collection_recorded_at DATETIME NULL,
  ADD COLUMN collection_recorded_by_user_id INT UNSIGNED NULL;
