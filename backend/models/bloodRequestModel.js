const pool = require('../config/db');
const { toDateString } = require('../utils/date');

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

/** Allowed status transitions — enforced in one place. */
const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['fulfilled', 'cancelled'],
  rejected: [],
  fulfilled: [],
  cancelled: [],
};

const URGENCY_ORDER = { emergency: 0, urgent: 1, normal: 2 };


const mapRequestRow = (r) => ({
  id: r.request_id,
  reference: `BR-${String(r.request_id).padStart(5, '0')}`,
  hospitalId: r.hospital_id,
  hospitalName: r.hospital_name,
  hospitalCode: r.hospital_code,
  district: r.district,
  bloodGroup: r.blood_group,
  quantity: r.quantity,
  urgency: r.urgency,
  urgencyLabel: { normal: 'Normal', urgent: 'Urgent', emergency: 'Emergency' }[r.urgency] || r.urgency,
  requiredDate: toDateString(r.required_date),
  department: r.department,
  reason: r.reason,
  status: r.status,
  statusLabel: STATUS_LABELS[r.status] || r.status,
  decisionNote: r.decision_note,
  requestedBy: r.requested_by_name,
  createdAt: toDateString(r.created_at),
  reviewedAt: r.reviewed_at ? toDateString(r.reviewed_at) : '',
  fulfilledAt: r.fulfilled_at ? toDateString(r.fulfilled_at) : '',
});
// A request's requester is always a signed-in hospital user, so the display
// name comes from `users.username`.
const buildSelect = (extraWhere = '', params = []) => `
  SELECT
    br.request_id,
    br.hospital_id,
    br.blood_group,
    br.quantity,
    br.urgency,
    br.required_date,
    br.department,
    br.reason,
    br.status,
    br.decision_note,
    br.reviewed_at,
    br.fulfilled_at,
    br.created_at,
    h.hospital_name,
    h.hospital_code,
    h.district,
    req.username AS requested_by_name
  FROM blood_requests br
  JOIN hospitals h ON br.hospital_id = h.hospital_id
  JOIN users req ON br.requested_by_user_id = req.user_id
  ${extraWhere}
  ORDER BY FIELD(br.urgency, 'emergency', 'urgent', 'normal'), br.created_at DESC`;

const createBloodRequest = async ({
  hospitalId,
  requestedByUserId,
  bloodGroup,
  quantity,
  urgency = 'normal',
  requiredDate = null,
  department = null,
  reason = null,
}) => {
  const [result] = await pool.query(
    `INSERT INTO blood_requests
      (hospital_id, requested_by_user_id, blood_group, quantity, urgency, required_date, department, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [hospitalId, requestedByUserId, bloodGroup, quantity, urgency, requiredDate || null, department || null, reason || null]
  );
  return result.insertId;
};

/**
 * Blood bank view: every request, newest/most urgent first, with optional
 * status filter and free-text search.
 */
const getAllRequests = async ({ status, search } = {}) => {
  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    conditions.push('br.status = ?');
    params.push(status);
  }
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(h.hospital_name LIKE ? OR h.hospital_code LIKE ? OR br.blood_group LIKE ? OR br.reason LIKE ?)');
    params.push(q, q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(buildSelect(where, params), params);
  return rows.map(mapRequestRow);
};

/** Hospital view: only that hospital's own requests. */
const getRequestsForHospital = async (hospitalId) => {
  const [rows] = await pool.query(buildSelect('WHERE br.hospital_id = ?', [hospitalId]), [hospitalId]);
  return rows.map(mapRequestRow);
};

const getRequestById = async (requestId) => {
  const [rows] = await pool.query(buildSelect('WHERE br.request_id = ?', [requestId]), [requestId]);
  return rows[0] ? mapRequestRow(rows[0]) : null;
};

const getRequestCountByStatus = async () => {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS cnt FROM blood_requests GROUP BY status`
  );
  const counts = { pending: 0, approved: 0, rejected: 0, fulfilled: 0, cancelled: 0 };
  rows.forEach((r) => {
    counts[r.status] = Number(r.cnt);
  });
  return counts;
};

/**
 * Applies a status change with a guard against invalid transitions.
 * `expectedStatus` (optional) allows the caller to require a specific state.
 */
const updateRequestStatus = async ({ requestId, newStatus, reviewedByUserId, note, expectedStatus }) => {
  const current = await getRequestById(requestId);
  if (!current) {
    throw Object.assign(new Error('Blood request not found.'), { statusCode: 404 });
  }

  if (expectedStatus && current.status !== expectedStatus) {
    throw Object.assign(
      new Error(`This request is already ${current.statusLabel.toLowerCase()} and can no longer be changed.`),
      { statusCode: 409 }
    );
  }

  const allowed = ALLOWED_TRANSITIONS[current.status] || [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`A ${current.statusLabel.toLowerCase()} request cannot be changed to ${STATUS_LABELS[newStatus].toLowerCase()}.`),
      { statusCode: 409 }
    );
  }

  const isFulfilled = newStatus === 'fulfilled';
  await pool.query(
    `UPDATE blood_requests
        SET status = ?,
            decision_note = ?,
            reviewed_by_user_id = ?,
            reviewed_at = NOW(),
            fulfilled_at = ?
      WHERE request_id = ?`,
    [newStatus, note || null, reviewedByUserId || null, isFulfilled ? new Date() : null, requestId]
  );

  return getRequestById(requestId);
};

/**
 * Donor-facing: open requests that match a blood group, so a donor can see
 * where their donation is needed. Only public-safe fields are returned — no
 * requester identity, no internal review notes, no account data.
 */
const listOpenRequestsForGroup = async (bloodGroup) => {
  const [rows] = await pool.query(
    `SELECT
       br.request_id,
       br.blood_group,
       br.quantity,
       br.urgency,
       br.required_date,
       h.hospital_name,
       h.district,
       hu.account_status
     FROM blood_requests br
     JOIN hospitals h ON br.hospital_id = h.hospital_id
     JOIN users hu ON h.user_id = hu.user_id
     WHERE br.blood_group = ?
       AND br.status IN ('pending', 'approved')
       AND hu.account_status = 'active'
     ORDER BY FIELD(br.urgency, 'emergency', 'urgent', 'normal'), br.created_at DESC`,
    [bloodGroup]
  );
  return rows.map((r) => ({
    id: r.request_id,
    reference: `BR-${String(r.request_id).padStart(5, '0')}`,
    bloodGroup: r.blood_group,
    quantity: Number(r.quantity),
    urgency: r.urgency,
    urgencyLabel: { normal: 'Normal', urgent: 'Urgent', emergency: 'Emergency' }[r.urgency] || r.urgency,
    requiredDate: toDateString(r.required_date),
    hospitalName: r.hospital_name,
    district: r.district,
  }));
};

/**
 * Fulfils a request and issues stock in a single transaction.
 *
 * The request row and the inventory row are both locked FOR UPDATE, so the
 * status transition is validated *before* any stock is deducted and two
 * concurrent fulfilments can never both pass the availability check. If any
 * step fails the whole thing rolls back and no inventory is lost.
 */
const fulfilRequest = async ({ requestId, reviewedByUserId, note }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT request_id, blood_group, quantity, status FROM blood_requests WHERE request_id = ? FOR UPDATE',
      [requestId]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Blood request not found.'), { statusCode: 404 });
    }
    const row = rows[0];

    const allowed = ALLOWED_TRANSITIONS[row.status] || [];
    if (!allowed.includes('fulfilled')) {
      const label = (STATUS_LABELS[row.status] || row.status).toLowerCase();
      throw Object.assign(
        new Error(`A ${label} request cannot be changed to fulfilled.`),
        { statusCode: 409 }
      );
    }

    const [stock] = await connection.query(
      'SELECT available_units FROM blood_inventory WHERE blood_group = ? FOR UPDATE',
      [row.blood_group]
    );
    if (stock.length === 0) {
      throw Object.assign(
        new Error(`No inventory record exists for ${row.blood_group}.`),
        { statusCode: 400 }
      );
    }
    if (Number(stock[0].available_units) < Number(row.quantity)) {
      throw Object.assign(
        new Error(
          `Cannot fulfil this request: only ${stock[0].available_units} unit(s) of ${row.blood_group} are in stock but ${row.quantity} are required.`
        ),
        { statusCode: 409 }
      );
    }

    const [decrement] = await connection.query(
      `UPDATE blood_inventory
          SET available_units = available_units - ?,
              last_restocked_at = last_restocked_at
        WHERE blood_group = ? AND available_units >= ?`,
      [row.quantity, row.blood_group, row.quantity]
    );
    if (decrement.affectedRows !== 1) {
      throw Object.assign(
        new Error(`Cannot fulfil this request: ${row.blood_group} stock changed while confirming.`),
        { statusCode: 409 }
      );
    }

    await connection.query(
      `UPDATE blood_requests
          SET status = 'fulfilled',
              decision_note = ?,
              reviewed_by_user_id = ?,
              reviewed_at = NOW(),
              fulfilled_at = NOW()
        WHERE request_id = ?`,
      [note || null, reviewedByUserId || null, requestId]
    );

    await connection.commit();
    return getRequestById(requestId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createBloodRequest,
  getAllRequests,
  getRequestsForHospital,
  getRequestById,
  getRequestCountByStatus,
  updateRequestStatus,
  fulfilRequest,
  listOpenRequestsForGroup,
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  URGENCY_ORDER,
};
