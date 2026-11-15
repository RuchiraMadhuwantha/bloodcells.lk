-- ============================================================================
-- Bloodcells.lk — Donor modules (D03 campaigns, D04 notifications,
-- D05 emergency alerts). ADDITIVE ONLY.
--
-- Creates five new tables. It does NOT drop, truncate or alter any existing
-- table or constraint. Safe to run on a database that already contains live
-- donor/hospital/blood bank data.
--
-- Apply with:  cd backend && mysql -u <user> -p <database> < database/migrations/001_donor_modules.sql
-- (or run `npm run db:setup`, which applies database/schema.sql — the same
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
