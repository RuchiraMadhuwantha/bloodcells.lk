-- Existing databases: node backend/scripts/setupRequestTransfers.js
-- Adds tracking only. Existing stock quantities are never deducted again.
ALTER TABLE bank_transfers
 ADD COLUMN request_id INT UNSIGNED NULL,
 ADD COLUMN request_allocation_id INT UNSIGNED NULL,
 ADD UNIQUE KEY uq_transfer_request_allocation (request_allocation_id),
 ADD CONSTRAINT fk_transfer_request FOREIGN KEY (request_id) REFERENCES blood_requests(request_id),
 ADD CONSTRAINT fk_transfer_request_allocation FOREIGN KEY (request_allocation_id) REFERENCES bank_request_allocations(allocation_id);
