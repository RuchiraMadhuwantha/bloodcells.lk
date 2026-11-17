-- ADDITIVE ONLY. Prepared for review; do not apply to the live database without approval.
-- Existing aggregate blood_inventory is NOT moved, copied or relabelled as verified batches.
CREATE TABLE IF NOT EXISTS stock_locations (
  location_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  district VARCHAR(100) NULL,
  kind ENUM('hospital','blood_bank') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_stock_location_owner CHECK ((kind='hospital' AND hospital_id IS NOT NULL) OR (kind='blood_bank' AND hospital_id IS NULL)),
  UNIQUE KEY uk_stock_location_hospital (hospital_id),
  CONSTRAINT fk_stock_location_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_batches (
  batch_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  location_id INT UNSIGNED NOT NULL,
  reference VARCHAR(100) NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  component VARCHAR(100) NOT NULL,
  volume_ml DECIMAL(12,2) UNSIGNED NULL,
  quantity INT UNSIGNED NOT NULL,
  reserved_units INT UNSIGNED NOT NULL DEFAULT 0,
  collection_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status ENUM('usable','quarantined','discarded') NOT NULL DEFAULT 'usable',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_stock_batch_reference (location_id,reference),
  KEY idx_stock_batch_availability (location_id,blood_group,status,expiry_date),
  CONSTRAINT ck_stock_batch_reserved CHECK (reserved_units <= quantity),
  appointment_id INT UNSIGNED NULL,
  UNIQUE KEY uq_stock_collection_appointment (appointment_id),
  CONSTRAINT fk_stock_collection_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
  CONSTRAINT ck_stock_batch_dates CHECK (expiry_date >= collection_date),
  CONSTRAINT fk_stock_batch_location FOREIGN KEY (location_id) REFERENCES stock_locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hospital_blood_usage (
  usage_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  request_id INT UNSIGNED NULL,
  volume_ml DECIMAL(12,2) UNSIGNED NULL,
  quantity INT UNSIGNED NOT NULL,
  usage_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  notes VARCHAR(1000) NULL,
  created_by_user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hospital_usage_date (hospital_id,usage_date),
  CONSTRAINT ck_hospital_usage_quantity CHECK (quantity > 0),
  CONSTRAINT fk_hospital_usage_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
  CONSTRAINT fk_hospital_usage_batch FOREIGN KEY (batch_id) REFERENCES stock_batches(batch_id),
  CONSTRAINT fk_hospital_usage_request FOREIGN KEY (request_id) REFERENCES blood_requests(request_id),
  CONSTRAINT fk_hospital_usage_actor FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id INT UNSIGNED NOT NULL,
  hospital_id INT UNSIGNED NOT NULL,
  quantity_delta INT NOT NULL,
  quantity_after INT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  usage_id INT UNSIGNED NULL,
  actor_user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_movement_hospital (hospital_id,created_at),
  CONSTRAINT fk_stock_movement_batch FOREIGN KEY (batch_id) REFERENCES stock_batches(batch_id),
  CONSTRAINT fk_stock_movement_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
  CONSTRAINT fk_stock_movement_usage FOREIGN KEY (usage_id) REFERENCES hospital_blood_usage(usage_id),
  CONSTRAINT fk_stock_movement_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hospital_operation_keys (
  operation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT UNSIGNED NOT NULL,
  operation VARCHAR(30) NOT NULL,
  idempotency_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  result_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_hospital_operation (hospital_id,operation,idempotency_key),
  CONSTRAINT fk_hospital_operation_owner FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
