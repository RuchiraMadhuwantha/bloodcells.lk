const pool = require('../config/db');
const { toDateString, toDateTimeString } = require('../utils/date');

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
  requestedByUserId: r.requested_by_user_id,
  createdAt: toDateString(r.created_at),
  reviewedAt: r.reviewed_at ? toDateString(r.reviewed_at) : '',
  fulfilledAt: r.fulfilled_at ? toDateString(r.fulfilled_at) : '',
  updatedAt: toDateTimeString(r.updated_at),
  submittedAt: toDateTimeString(r.created_at),
});
// A request's requester is always a signed-in hospital user, so the display
// name comes from `users.username`.
const buildSelect = (extraWhere = '', params = []) => `
  SELECT
    br.request_id,
    br.requested_by_user_id,
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
    br.updated_at,
    h.hospital_name,
    h.hospital_code,
    h.district,
    req.username AS requested_by_name
  FROM blood_requests br
  JOIN hospitals h ON br.hospital_id = h.hospital_id
  JOIN users req ON br.requested_by_user_id = req.user_id
  ${extraWhere}
  ORDER BY FIELD(br.urgency, 'emergency', 'urgent', 'normal'), br.required_date IS NULL, br.required_date ASC, br.created_at ASC, br.request_id ASC`;

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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT hospital_id FROM hospitals WHERE hospital_id=? FOR UPDATE', [hospitalId]);
    const [duplicates] = await connection.query(
      "SELECT request_id FROM blood_requests WHERE hospital_id=? AND blood_group=? AND quantity=? AND urgency=? AND required_date <=> ? AND department <=> ? AND reason <=> ? AND status='pending' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND) LIMIT 1",
      [hospitalId,bloodGroup,quantity,urgency,requiredDate || null,department || null,reason || null]);
    if (duplicates.length) { await connection.commit(); return duplicates[0].request_id; }
    const [result] = await connection.query(
      'INSERT INTO blood_requests (hospital_id,requested_by_user_id,blood_group,quantity,urgency,required_date,department,reason) VALUES (?,?,?,?,?,?,?,?)',
      [hospitalId,requestedByUserId,bloodGroup,quantity,urgency,requiredDate || null,department || null,reason || null]);
    await connection.commit();
    return result.insertId;
  } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }

};

/**
 * Blood bank view: every request, newest/most urgent first, with optional
 * status filter and free-text search.
 */
const getAllRequests = async ({ status, search, bloodGroup, urgency, district, start, end } = {}) => {
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

  for(const [value,column] of [[bloodGroup,'br.blood_group'],[urgency,'br.urgency'],[district,'h.district']])if(value){conditions.push(column+'=?');params.push(value);}
  if(start){conditions.push('br.created_at>=?');params.push(start);}
  if(end){conditions.push('br.created_at<DATE_ADD(?,INTERVAL 1 DAY)');params.push(end);}
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(buildSelect(where, params), params);
  return rows.map(mapRequestRow);
};

/** Hospital view: only that hospital's own requests. */
const getRequestsForHospital = async (hospitalId, filters = {}) => {
  const conditions = ['br.hospital_id=?']; const values = [hospitalId];
  for (const [key,column] of [['status','br.status'],['bloodGroup','br.blood_group'],['urgency','br.urgency']]) {
    if (filters[key]) { conditions.push(column+'=?'); values.push(filters[key]); }
  }
  if (filters.start) { conditions.push('br.created_at>=?'); values.push(filters.start); }
  if (filters.end) { conditions.push('br.created_at<DATE_ADD(?,INTERVAL 1 DAY)'); values.push(filters.end); }
  let sql = buildSelect('WHERE '+conditions.join(' AND '));
  if (filters.sort === 'newest') sql=sql.slice(0,sql.indexOf('ORDER BY'))+'ORDER BY br.created_at DESC,br.request_id DESC';
  if (filters.sort === 'required') sql=sql.slice(0,sql.indexOf('ORDER BY'))+'ORDER BY br.required_date IS NULL,br.required_date,br.request_id';
  if (Number.isInteger(filters.maxRows) && filters.maxRows>0 && filters.maxRows<=10001) { sql+=' LIMIT ?';values.push(filters.maxRows); }
  const [rows] = await pool.query(sql,values);
  return rows.map(mapRequestRow);
};

const getRequestById = async (requestId) => {
  const [rows] = await pool.query(buildSelect('WHERE br.request_id = ?', [requestId]), [requestId]);
  return rows[0] ? mapRequestRow(rows[0]) : null;
};

const getRequestCountByStatus = async (hospitalId) => {
  const [rows] = await pool.query('SELECT status,COUNT(*) AS cnt FROM blood_requests '+(hospitalId ? 'WHERE hospital_id=? ' : '')+'GROUP BY status',hospitalId ? [hospitalId] : []);
  const counts = { pending:0,approved:0,rejected:0,fulfilled:0,cancelled:0 };
  rows.forEach(r => { counts[r.status]=Number(r.cnt); });
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

  if (newStatus === 'fulfilled') throw Object.assign(new Error('Use the verified batch fulfillment transaction.'), {statusCode:409});
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE blood_requests SET status=?,decision_note=?,reviewed_by_user_id=?,reviewed_at=NOW()
       WHERE request_id=? AND status=?`,
      [newStatus,note || null,reviewedByUserId || null,requestId,current.status]);
    if(result.affectedRows!==1) throw Object.assign(new Error('Request changed. Refresh before retrying.'),{statusCode:409});
    if(newStatus==='cancelled' || newStatus==='rejected') await require('./bankTransferModel').release(conn,requestId,reviewedByUserId || current.requestedByUserId);
    try {await require('./bankInventoryModel').audit(conn,reviewedByUserId || current.requestedByUserId,'request-'+newStatus,null,null,requestId,{from:current.status,status:newStatus,note:note || null});}
    catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
    await conn.commit();
  } catch(e) { await conn.rollback(); throw e; } finally {conn.release();}
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
     ORDER BY FIELD(br.urgency, 'emergency', 'urgent', 'normal'), br.required_date IS NULL, br.required_date ASC, br.created_at ASC, br.request_id ASC`,
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
const fulfilRequest = async (data) => {
  await require('./bankTransferModel').fulfill(data);
  return getRequestById(data.requestId);
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
