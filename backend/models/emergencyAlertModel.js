const pool = require('../config/db');
const { toDateString, toDateTimeString } = require('../utils/date');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const URGENCY_LABELS = { normal: 'Normal', urgent: 'Urgent', emergency: 'Emergency' };

const mapAlertRow = (r, { responded = undefined } = {}) => {
  const alert = {
    id: r.alert_id,
    reference: `EA-${String(r.alert_id).padStart(5, '0')}`,
    bloodRequestId: r.blood_request_id,
    bloodGroup: r.blood_group,
    urgency: r.urgency,
    urgencyLabel: URGENCY_LABELS[r.urgency] || r.urgency,
    district: r.district,
    requiredDate: toDateString(r.required_date),
    quantity: r.quantity === null || r.quantity === undefined ? null : Number(r.quantity),
    title: r.title,
    description: r.description,
    responseInstructions: r.response_instructions,
    status: r.status,
    responseCount: Number(r.response_count || 0),
    publishedAt: toDateTimeString(r.published_at),
    closedAt: r.closed_at ? toDateTimeString(r.closed_at) : null,
    createdAt: toDateTimeString(r.created_at),
  };
  if (responded !== undefined) alert.responded = responded;
  return alert;
};

const ALERT_SELECT = `
  SELECT a.*,
    (SELECT COUNT(*) FROM emergency_alert_responses resp
      WHERE resp.alert_id = a.alert_id) AS response_count
  FROM emergency_alerts a`;

/**
 * Donor-facing listing: ACTIVE alerts only, with optional filters. Whether an
 * alert is "relevant" to a donor is the caller's decision (blood group /
 * district), never inferred medical eligibility. When donorId is given, each
 * alert carries a `responded` flag for that donor.
 */
const listActiveAlerts = async ({ bloodGroup, district, donorId } = {}) => {
  const conditions = [`a.status = 'active'`];
  const params = [];
  if (bloodGroup) {
    conditions.push('a.blood_group = ?');
    params.push(bloodGroup);
  }
  if (district) {
    conditions.push('a.district = ?');
    params.push(district);
  }
  const respondedSelect = donorId
    ? ', (SELECT COUNT(*) FROM emergency_alert_responses resp WHERE resp.alert_id = a.alert_id AND resp.donor_id = ?) AS responded_count'
    : '';
  const selectParams = donorId ? [donorId] : [];
  const [rows] = await pool.query(
    `SELECT a.*,
       (SELECT COUNT(*) FROM emergency_alert_responses resp WHERE resp.alert_id = a.alert_id) AS response_count
       ${respondedSelect}
      FROM emergency_alerts a
      WHERE ${conditions.join(' AND ')}
      ORDER BY FIELD(a.urgency, 'emergency', 'urgent', 'normal'),
               a.published_at DESC, a.alert_id DESC`,
    [...selectParams, ...params]
  );
  return rows.map((r) => mapAlertRow(r, donorId ? { responded: Number(r.responded_count || 0) > 0 } : {}));
};

const getAlertById = async (alertId, { activeOnly = false, donorId = undefined } = {}) => {
  const [rows] = await pool.query(`${ALERT_SELECT} WHERE a.alert_id = ?`, [alertId]);
  const row = rows[0];
  if (!row) return null;
  if (activeOnly && row.status !== 'active') return null;

  let responded;
  if (donorId !== undefined) {
    const [resp] = await pool.query(
      'SELECT response_id FROM emergency_alert_responses WHERE alert_id = ? AND donor_id = ?',
      [alertId, donorId]
    );
    responded = resp.length > 0;
  }
  return mapAlertRow(row, { responded });
};

const listPublishedAlerts = async () => {
  const [rows] = await pool.query(`${ALERT_SELECT} ORDER BY a.published_at DESC, a.alert_id DESC`);
  return rows.map((r) => mapAlertRow(r));
};

/**
 * Publishes a donor-facing alert. Either from an existing hospital blood
 * request (blood_request_id) or as a stand-alone emergency notification
 * authored by an authorized blood bank user. Publishing is the explicit act
 * that makes a request donor-visible; requests are never auto-published.
 */
const publishAlert = async ({ bloodRequestId, bloodGroup, urgency, district, requiredDate, quantity, title, description, responseInstructions }, publishedByUserId, executor) => {
  const db = executor || pool;

  if (bloodRequestId) {
    const [rows] = await db.query(
      `SELECT br.*, h.district AS hospital_district
         FROM blood_requests br JOIN hospitals h ON h.hospital_id = br.hospital_id
        WHERE br.request_id = ?`,
      [bloodRequestId]
    );
    const request = rows[0];
    if (!request) {
      throw httpError(404, 'The referenced blood request was not found.');
    }
    if (['rejected', 'cancelled'].includes(request.status)) {
      throw httpError(409, 'This blood request was rejected or cancelled and cannot be published as a donor alert.');
    }
    bloodGroup = request.blood_group;
    urgency = request.urgency;
    requiredDate = requiredDate || request.required_date || null;
    quantity = quantity ?? request.quantity;
    district = district || request.hospital_district || null;
    title = title || `Emergency ${bloodGroup} blood needed`;
    description = description || `A verified hospital blood request for ${quantity ?? '—'} unit(s) of ${bloodGroup} is open. Donation centres will assess you before donation.`;
  }

  if (!title) {
    title = `Emergency ${bloodGroup} blood needed`;
  }

  const [result] = await db.query(
    `INSERT INTO emergency_alerts
       (blood_request_id, blood_group, urgency, district, required_date, quantity,
        title, description, response_instructions, published_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bloodRequestId || null,
      bloodGroup,
      urgency || 'urgent',
      district || null,
      requiredDate || null,
      quantity ?? null,
      title,
      description || null,
      responseInstructions || null,
      publishedByUserId,
    ]
  );
  const alertId = result.insertId;
  return {
    alertId,
    alert: {
      id: alertId,
      reference: `EA-${String(alertId).padStart(5, '0')}`,
      bloodGroup,
      urgency: urgency || 'urgent',
      district: district || null,
      requiredDate: requiredDate ? toDateString(requiredDate) : null,
      title,
      description: description || null,
      responseInstructions: responseInstructions || null,
      status: 'active',
    },
  };
};

const closeAlert = async (alertId, executor) => {
  const db = executor || pool;
  const [result] = await db.query(
    `UPDATE emergency_alerts SET status = 'closed', closed_at = NOW()
      WHERE alert_id = ? AND status = 'active'`,
    [alertId]
  );
  return result.affectedRows > 0;
};

/** Records a donor's expression of interest. Never a medical eligibility decision. */
const recordResponse = async ({ alertId, donorId, note }, executor) => {
  const db = executor || pool;
  const [existing] = await db.query(
    'SELECT response_id, created_at FROM emergency_alert_responses WHERE alert_id = ? AND donor_id = ?',
    [alertId, donorId]
  );
  if (existing.length > 0) {
    throw httpError(409, 'You have already registered your interest in this alert.');
  }
  const [result] = await db.query(
    'INSERT INTO emergency_alert_responses (alert_id, donor_id, note) VALUES (?, ?, ?)',
    [alertId, donorId, note || null]
  );
  return { responseId: result.insertId, alertId, donorId };
};

module.exports = {
  listActiveAlerts,
  getAlertById,
  listPublishedAlerts,
  publishAlert,
  closeAlert,
  recordResponse,
};
