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
   BLOOD REQUESTS â€” hospital raises a request, blood bank processes it
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
   BLOOD INVENTORY â€” one row per blood group (source of truth for stock)
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
   APPOINTMENTS â€” donor books a donation slot at an approved hospital
   ========================================================================== */
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  donor_id INT UNSIGNED NOT NULL,
  hospital_id INT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(10) NOT NULL,
  notes VARCHAR(500) NULL,
  booking_nic VARCHAR(20) NULL,
  status ENUM('pending','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  collected_units INT UNSIGNED NULL,
  collected_volume_ml INT UNSIGNED NULL,
  collection_recorded_at DATETIME NULL,
  collection_recorded_by_user_id INT UNSIGNED NULL,
  active_donor_slot VARCHAR(64)
    GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, CONCAT_WS('|', donor_id, appointment_date, time_slot))) VIRTUAL,
  active_centre_slot VARCHAR(64)
    GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, CONCAT_WS('|', hospital_id, appointment_date, time_slot))) VIRTUAL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id),
  -- NOTE (fresh installs only): active-slot uniqueness for pending/approved/
  -- completed rows is enforced by uk_appointments_donor_active_slot /
  -- uk_appointments_centre_active_slot below (generated columns are NULL for
  -- cancelled rows, so cancelled bookings never block re-booking). Existing
  -- installations carry the original uk_appointments_slot; see
  -- database/migrations/002_appointments_active_slot_uniqueness.sql.
  KEY idx_appointments_date (appointment_date),
  KEY idx_appointments_donor (donor_id),
  UNIQUE KEY uk_appointments_donor_active_slot (active_donor_slot),
  UNIQUE KEY uk_appointments_centre_active_slot (active_centre_slot),
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
   PASSWORD RESET TOKENS â€” hashed, expiring, single use
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

-- ============================================================================
-- Bloodcells.lk â€” Donor modules (D03 campaigns, D04 notifications,
-- D05 emergency alerts). ADDITIVE ONLY.
--
-- Creates five new tables. It does NOT drop, truncate or alter any existing
-- table or constraint. Safe to run on a database that already contains live
-- donor/hospital/blood bank data.
--
-- Apply with:  cd backend && mysql -u <user> -p <database> < database/migrations/001_donor_modules.sql
-- (or run `npm run db:setup`, which applies database/schema.sql â€” the same
--  CREATE TABLE IF NOT EXISTS statements live there too)
--
-- NOTES
--   * campaign status values match the frontend CAMPAIGN_STATUSES exactly:
--     Draft | Upcoming | Active | Completed | Cancelled
--   * notifications.type is an ENUM so unknown types fail loudly; every value
--     is mirrored in src/components/donor/donorUtils.js NOTIFICATION_TYPES.
--   * needed_blood_groups stores a comma-separated list (e.g. 'O+,A+') because
--     the frontend CampaignCard expects an array; the API layer splits/joins.
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id            INT UNSIGNED NULL,
  created_by_user_id     INT UNSIGNED NOT NULL,
  name                   VARCHAR(150) NOT NULL,
  title                  VARCHAR(150) NULL,
  short_description      VARCHAR(500) NULL,
  detailed_description   TEXT NULL,
  image_url              VARCHAR(500) NULL,
  status                 ENUM('Draft','Upcoming','Active','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
  campaign_date          DATE NOT NULL,
  start_time             VARCHAR(5) NOT NULL,
  end_time               VARCHAR(5) NOT NULL,
  venue_name             VARCHAR(150) NULL,
  address                VARCHAR(255) NULL,
  district               VARCHAR(100) NULL,
  city                   VARCHAR(100) NULL,
  location_notes         VARCHAR(500) NULL,
  organizer_name         VARCHAR(150) NOT NULL,
  contact_person         VARCHAR(100) NULL,
  contact_number         VARCHAR(30)  NULL,
  contact_email          VARCHAR(100) NULL,
  who_can_participate    VARCHAR(500) NULL,
  eligibility_info       VARCHAR(500) NULL,
  what_to_bring          VARCHAR(500) NULL,
  preparation_instructions VARCHAR(500) NULL,
  special_instructions   VARCHAR(500) NULL,
  available_facilities   VARCHAR(500) NULL,
  emergency_contact      VARCHAR(100) NULL,
  needed_blood_groups    VARCHAR(80)  NULL,
  target_donors          INT UNSIGNED NOT NULL DEFAULT 0,
  goal                   VARCHAR(500) NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id),
  CONSTRAINT fk_campaign_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
  KEY idx_campaigns_status (status),
  KEY idx_campaigns_date (campaign_date),
  KEY idx_campaigns_district (district),
  CONSTRAINT fk_campaigns_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaign_registrations (
  registration_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaign_id       INT UNSIGNED NOT NULL,
  donor_id          INT UNSIGNED NOT NULL,
  status            ENUM('registered','cancelled') NOT NULL DEFAULT 'registered',
  note              VARCHAR(255) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (registration_id),
  -- One row per donor per campaign; re-registration reuses the row by flipping
  -- status back to 'registered', which also preserves the cancellation history
  -- via updated_at.
  UNIQUE KEY uk_campaign_registration (campaign_id, donor_id),
  KEY idx_campaign_registrations_donor (donor_id),
  KEY idx_campaign_registrations_campaign (campaign_id, status),
  CONSTRAINT fk_campaign_registrations_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_campaign_registrations_donor
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  type              ENUM(
                      'appointment_confirmation',
                      'appointment_reminder',
                      'appointment_approved',
                      'appointment_rejected',
                      'appointment_rescheduled',
                      'appointment_cancelled',
                      'appointment_completed',
                      'campaign',
                      'emergency',
                      'general'
                    ) NOT NULL DEFAULT 'general',
  title             VARCHAR(150) NOT NULL,
  message           VARCHAR(1000) NOT NULL,
  related_type      VARCHAR(50) NULL,
  related_id        INT UNSIGNED NULL,
  action_route      VARCHAR(100) NULL,
  is_read           TINYINT(1) NOT NULL DEFAULT 0,
  read_at           DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notifications_user_read (user_id, is_read),
  KEY idx_notifications_created (created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_alerts (
  alert_id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  blood_request_id      INT UNSIGNED NULL,
  blood_group           ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  urgency               ENUM('normal','urgent','emergency') NOT NULL DEFAULT 'urgent',
  district              VARCHAR(100) NULL,
  required_date         DATE NULL,
  quantity              SMALLINT UNSIGNED NULL,
  title                 VARCHAR(150) NOT NULL,
  description           VARCHAR(1000) NULL,
  response_instructions VARCHAR(500) NULL,
  status                ENUM('active','closed') NOT NULL DEFAULT 'active',
  published_by_user_id  INT UNSIGNED NOT NULL,
  published_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at             DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (alert_id),
  -- One donor-facing alert per hospital blood request; publishing the same
  -- request twice is rejected. Multiple NULLs (stand-alone alerts) are allowed.
  UNIQUE KEY uk_emergency_alerts_request (blood_request_id),
  KEY idx_emergency_alerts_status (status),
  KEY idx_emergency_alerts_group (blood_group),
  KEY idx_emergency_alerts_district (district),
  CONSTRAINT fk_emergency_alerts_request
    FOREIGN KEY (blood_request_id) REFERENCES blood_requests(request_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_emergency_alerts_publisher
    FOREIGN KEY (published_by_user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_alert_responses (
  response_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  alert_id      INT UNSIGNED NOT NULL,
  donor_id      INT UNSIGNED NOT NULL,
  status        ENUM('interested') NOT NULL DEFAULT 'interested',
  note          VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (response_id),
  UNIQUE KEY uk_emergency_alert_response (alert_id, donor_id),
  KEY idx_emergency_alert_responses_donor (donor_id),
  CONSTRAINT fk_emergency_alert_responses_alert
    FOREIGN KEY (alert_id) REFERENCES emergency_alerts(alert_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_emergency_alert_responses_donor
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

