CREATE DATABASE IF NOT EXISTS blood_donation_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE blood_donation_system;

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
