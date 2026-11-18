-- Additive bank operations. Requires migration 003. REVIEW ONLY; no live application authorized.
CREATE TABLE IF NOT EXISTS bank_location_access (
 user_id INT UNSIGNED NOT NULL, location_id INT UNSIGNED NOT NULL,
 PRIMARY KEY(user_id,location_id),
 FOREIGN KEY(user_id) REFERENCES users(user_id),
 FOREIGN KEY(location_id) REFERENCES stock_locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_operations (
 operation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NOT NULL,
 operation VARCHAR(50) NOT NULL, idempotency_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii NOT NULL, result_json JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uk_bank_operation(actor_user_id,operation,idempotency_key),
 FOREIGN KEY(actor_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_audit (
 audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NOT NULL,
 event VARCHAR(60) NOT NULL, location_id INT UNSIGNED NULL, batch_id INT UNSIGNED NULL,
 entity_id INT UNSIGNED NULL, details JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 KEY idx_bank_audit_location(location_id,created_at),
 FOREIGN KEY(actor_user_id) REFERENCES users(user_id), FOREIGN KEY(location_id) REFERENCES stock_locations(location_id),
 FOREIGN KEY(batch_id) REFERENCES stock_batches(batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_request_allocations (
 allocation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, request_id INT UNSIGNED NOT NULL, batch_id INT UNSIGNED NOT NULL,
 quantity INT UNSIGNED NOT NULL, status ENUM('reserved','issued','released') NOT NULL DEFAULT 'reserved',
 actor_user_id INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CHECK(quantity>0), KEY idx_bank_allocation_request(request_id,status),
 FOREIGN KEY(request_id) REFERENCES blood_requests(request_id), FOREIGN KEY(batch_id) REFERENCES stock_batches(batch_id),
 FOREIGN KEY(actor_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_transfers (
 request_id INT UNSIGNED NULL, request_allocation_id INT UNSIGNED NULL,
 UNIQUE KEY uq_transfer_request_allocation (request_allocation_id),
 CONSTRAINT fk_transfer_request FOREIGN KEY (request_id) REFERENCES blood_requests(request_id),
 CONSTRAINT fk_transfer_request_allocation FOREIGN KEY (request_allocation_id) REFERENCES bank_request_allocations(allocation_id),
 transfer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, source_location_id INT UNSIGNED NOT NULL, destination_location_id INT UNSIGNED NOT NULL,
 volume_ml DECIMAL(12,2) UNSIGNED NULL,
 source_batch_id INT UNSIGNED NOT NULL, destination_batch_id INT UNSIGNED NULL, quantity INT UNSIGNED NOT NULL,
 reason VARCHAR(500) NOT NULL, status ENUM('requested','approved','dispatched','received','rejected','cancelled') DEFAULT 'requested',
 created_by_user_id INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CHECK(source_location_id<>destination_location_id), CHECK(quantity>0),
 FOREIGN KEY(source_location_id) REFERENCES stock_locations(location_id), FOREIGN KEY(destination_location_id) REFERENCES stock_locations(location_id),
 FOREIGN KEY(source_batch_id) REFERENCES stock_batches(batch_id), FOREIGN KEY(destination_batch_id) REFERENCES stock_batches(batch_id),
 FOREIGN KEY(created_by_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_outreach (
 campaign_id INT UNSIGNED NULL,
 FOREIGN KEY(campaign_id) REFERENCES campaigns(campaign_id),
 outreach_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_user_id INT UNSIGNED NOT NULL, type VARCHAR(50) NOT NULL,
 title VARCHAR(150) NOT NULL, message VARCHAR(1000) NOT NULL, channel ENUM('in_app','sms','email') NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(actor_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_deliveries (
 delivery_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, outreach_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
 recipient_email VARCHAR(100) NULL,message_id VARCHAR(255) NULL,sending_started_at DATETIME NULL,accepted_at DATETIME NULL,
 status ENUM('stored','provider_unconfigured','queued','sending','delivered','failed') NOT NULL, attempts INT UNSIGNED NOT NULL DEFAULT 0,
 error_code VARCHAR(100) NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_bank_delivery_status (status,delivery_id),
 UNIQUE KEY uk_bank_delivery(outreach_id,user_id),
 FOREIGN KEY(outreach_id) REFERENCES bank_outreach(outreach_id), FOREIGN KEY(user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bank_stock_thresholds (
 location_id INT UNSIGNED NOT NULL, blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
 low_threshold INT UNSIGNED NOT NULL, critical_threshold INT UNSIGNED NOT NULL,
 PRIMARY KEY(location_id,blood_group), CHECK(critical_threshold<=low_threshold),
 FOREIGN KEY(location_id) REFERENCES stock_locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
