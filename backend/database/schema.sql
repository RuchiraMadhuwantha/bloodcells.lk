-- NOTE: this file is database-agnostic. The target schema name comes from
-- DB_NAME in .env (default: nbts) and `npm run db:setup` creates that database
-- and then connects to it before running the statements below.
-- Nothing here drops or truncates an existing database/table.

-- The review columns are declared inline so a brand new database is complete
-- without relying on the migration step. `db:setup` also adds them to existing
-- installations, which is why both paths are safe.
CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('donor', 'hospital', 'blood_bank') NOT NULL,
  account_status ENUM('pending', 'active', 'inactive', 'suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donors (
  donor_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  nic VARCHAR(20) NOT NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(20) NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  phone VARCHAR(20) NULL,
  district VARCHAR(100) NULL,
  weight DECIMAL(5,2) NULL,
  last_donation_date DATE NULL,
  declaration_checked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (donor_id),
  UNIQUE KEY uk_donors_user_id (user_id),
  UNIQUE KEY uk_donors_nic (nic),
  CONSTRAINT fk_donors_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hospitals (
  hospital_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  hospital_name VARCHAR(150) NOT NULL,
  hospital_code VARCHAR(50) NOT NULL,
  hospital_type VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  address TEXT NULL,
  official_phone VARCHAR(20) NULL,
  contact_person_name VARCHAR(100) NULL,
  contact_person_designation VARCHAR(100) NULL,
  contact_person_phone VARCHAR(20) NULL,
  contact_person_email VARCHAR(100) NULL,
  rejection_reason TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (hospital_id),
  UNIQUE KEY uk_hospitals_user_id (user_id),
  UNIQUE KEY uk_hospitals_code (hospital_code),
  CONSTRAINT fk_hospitals_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (username, email, password_hash, role, account_status)
SELECT 'bloodbank_admin', 'bloodbank@bloodcells.lk', '$2b$10$U3i3UDd3/QER17TQ5SHAr.2ChIa06V8uHzNCjmO07lZEMFU6MeNVG', 'blood_bank', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'bloodbank_admin'
);

/* ============================================================================
   BLOOD REQUESTS — hospital raises a request, blood bank processes it
   ========================================================================== */
CREATE TABLE IF NOT EXISTS blood_requests (
  request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id INT UNSIGNED NOT NULL,
  requested_by_user_id INT UNSIGNED NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  urgency ENUM('normal','urgent','emergency') NOT NULL DEFAULT 'normal',
  required_date DATE NULL,
  department VARCHAR(100) NULL,
  reason TEXT NULL,
  status ENUM('pending','approved','rejected','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
  decision_note VARCHAR(500) NULL,
  reviewed_by_user_id INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  fulfilled_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  KEY idx_blood_requests_status (status),
  KEY idx_blood_requests_hospital (hospital_id),
  KEY idx_blood_requests_created (created_at),
  CONSTRAINT fk_blood_requests_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_blood_requests_requester
    FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================================
   BLOOD INVENTORY — one row per blood group (source of truth for stock)
   ========================================================================== */
CREATE TABLE IF NOT EXISTS blood_inventory (
  inventory_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  available_units INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 15,
  critical_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
  last_restocked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_id),
  UNIQUE KEY uk_blood_inventory_group (blood_group),
  KEY idx_blood_inventory_available (available_units)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO blood_inventory (blood_group, available_units, low_stock_threshold, critical_stock_threshold) VALUES
  ('A+', 0, 15, 5), ('A-', 0, 10, 3), ('B+', 0, 15, 5), ('B-', 0, 10, 3),
  ('AB+', 0, 8, 2), ('AB-', 0, 5, 2), ('O+', 0, 20, 8), ('O-', 0, 8, 3);

/* ============================================================================
   APPOINTMENTS — donor books a donation slot at an approved hospital
   ========================================================================== */
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  donor_id INT UNSIGNED NOT NULL,
  hospital_id INT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(10) NOT NULL,
  notes VARCHAR(500) NULL,
  status ENUM('pending','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id),
  UNIQUE KEY uk_appointments_slot (donor_id, appointment_date, time_slot),
  KEY idx_appointments_date (appointment_date),
  KEY idx_appointments_hospital (hospital_id),
  KEY idx_appointments_status (status),
  CONSTRAINT fk_appointments_donor
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_hospital
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================================
   PASSWORD RESET TOKENS — hashed, expiring, single use
   ========================================================================== */
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_id),
  UNIQUE KEY uk_password_reset_hash (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
