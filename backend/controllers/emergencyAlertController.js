const pool = require('../config/db');
const {
  listActiveAlerts,
  getAlertById,
  listPublishedAlerts,
  publishAlert,
  closeAlert,
  recordResponse,
} = require('../models/emergencyAlertModel');
const { getDonorIdByUserId } = require('../models/appointmentModel');
const { findDonorUserIdsForBloodGroup } = require('../models/donorModel');
const { createNotification } = require('../models/notificationModel');
const { toFriendlyError } = require('../validators/common');
const { toDateString } = require('../utils/date');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const URGENCY_LABELS = { normal: 'Normal', urgent: 'Urgent', emergency: 'Emergency' };

const loadDonorContext = async (req) => {
  const [rows] = await pool.query('SELECT donor_id, blood_group, district FROM donors WHERE user_id = ?', [
    req.user.user_id,
  ]);
  return rows[0] || null;
};

/* ───────────────────────── Donor side ───────────────────────── */

const listAlerts = async (req, res, next) => {
  try {
    if (req.user.role === 'donor') {
      const donor = await loadDonorContext(req);
      if (!donor) {
        throw httpError(404, 'No donor profile is linked to this account.');
      }
      // `mine=true` narrows to alerts for the donor's own registered blood
      // group (relevance hint, not medical eligibility).
      const mine = req.query.mine === 'true';
      const bloodGroup = req.query.bloodGroup || (mine ? donor.blood_group : undefined);
      if (bloodGroup && !mine && bloodGroup !== donor.blood_group) {
        // Donors never browse other groups' alerts by guessing query params.
        throw httpError(403, 'You can only view alerts for your registered blood group.');
      }
      const alerts = await listActiveAlerts({
        bloodGroup,
        district: req.query.district || undefined,
        donorId: donor.donor_id,
      });
      return res.json({ success: true, alerts, bloodGroup: donor.blood_group });
    }

    // Blood bank: full history, optionally filtered.
    const alerts = await listPublishedAlerts();
    return res.json({ success: true, alerts });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load emergency alerts.'));
  }
};

const getAlert = async (req, res, next) => {
  try {
    const alertId = Number(req.params.id);
    if (req.user.role === 'donor') {
      const donorId = await getDonorIdByUserId(req.user.user_id);
      if (!donorId) {
        throw httpError(404, 'No donor profile is linked to this account.');
      }
      const alert = await getAlertById(alertId, { activeOnly: true, donorId });
      if (!alert) {
        throw httpError(404, 'Alert not found or no longer active.');
      }
      return res.json({ success: true, alert });
    }
    const alert = await getAlertById(alertId);
    if (!alert) {
      throw httpError(404, 'Alert not found.');
    }
    return res.json({ success: true, alert });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this alert.'));
  }
};

const respondToAlert = async (req, res, next) => {
  let connection;
  try {
    const [donorRows] = await pool.query('SELECT donor_id, blood_group FROM donors WHERE user_id = ?', [
      req.user.user_id,
    ]);
    const donor = donorRows[0];
    if (!donor) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const donorId = donor.donor_id;
    const alertId = Number(req.params.id);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // The response is only valid while the alert is active; the lock makes
    // check-and-insert atomic with a concurrent close.
    const [rows] = await connection.query(
      'SELECT alert_id, status, blood_group FROM emergency_alerts WHERE alert_id = ? FOR UPDATE',
      [alertId]
    );
    const alert = rows[0];
    if (!alert) {
      throw httpError(404, 'Alert not found.');
    }
    if (alert.status !== 'active') {
      throw httpError(409, 'This alert is no longer accepting responses.');
    }
    // Only donors whose registered group matches the alert's requirement may
    // record interest. Blood group is a coarse filter, never a medical
    // clearance — the centre still screens first.
    if (donor.blood_group !== alert.blood_group) {
      throw httpError(403, 'You can only respond to alerts for your registered blood group.');
    }

    const saved = await recordResponse({ alertId, donorId, note: req.body.note }, connection);
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Your interest has been recorded. A donation centre will confirm the next steps and assess you before donation.',
      response: { id: saved.responseId, alertId, status: 'interested' },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') {
      return next(toFriendlyError(httpError(409, 'You have already registered your interest in this alert.'), 'Could not record your response.'));
    }
    next(toFriendlyError(error, 'Could not record your response.'));
  } finally {
    if (connection) connection.release();
  }
};

/* ───────────────────────── Blood bank side ───────────────────────── */

/**
 * Publishes a donor-facing alert. Either backed by a genuine hospital blood
 * request (blood_request_id) or stand-alone, but ALWAYS an explicit act by an
 * authorized blood bank user — requests are never auto-published.
 */
const publish = async (req, res, next) => {
  let connection;
  try {
    const {
      blood_request_id: bloodRequestId,
      blood_group: bloodGroup,
      urgency,
      district,
      required_date: requiredDate,
      quantity,
      title,
      description,
      response_instructions: responseInstructions,
    } = req.body;

    if (!bloodRequestId && !bloodGroup) {
      throw httpError(400, 'Provide either blood_request_id or blood_group.');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let published;
    try {
      published = await publishAlert(
        {
          bloodRequestId: bloodRequestId ? Number(bloodRequestId) : undefined,
          bloodGroup,
          urgency,
          district,
          requiredDate: requiredDate ? toDateString(requiredDate) : null,
          quantity: quantity ? Number(quantity) : undefined,
          title,
          description,
          responseInstructions,
        },
        req.user.user_id,
        connection
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw httpError(409, 'An alert has already been published for this blood request.');
      }
      throw error;
    }

    // The alert view is returned by the model (pool reads can't see the
    // uncommitted row inside this transaction).
    const alertView = published.alert;
    const alertId = published.alertId;

    // Notify donors whose registered blood group matches the alert (and the
    // district, when the alert names one). This is a notification fan-out,
    // not an eligibility decision.
    const recipientUserIds = await findDonorUserIdsForBloodGroup(
      { bloodGroup: alertView.bloodGroup, district: alertView.district },
      connection
    );
    const urgencyLabel = URGENCY_LABELS[alertView.urgency] || alertView.urgency;
    for (const userId of recipientUserIds) {
      await createNotification(
        {
          userId,
          type: 'emergency',
          title: `Emergency alert: ${alertView.bloodGroup} blood needed`,
          message: `${urgencyLabel} request for ${alertView.bloodGroup} blood${alertView.district ? ` in ${alertView.district}` : ''}${alertView.requiredDate ? ` (needed by ${alertView.requiredDate})` : ''}. If you may be able to help, register your interest in the app — the centre decides final eligibility after screening.`,
          relatedType: 'emergency_alert',
          relatedId: alertId,
          actionRoute: 'donor-emergency-alerts',
        },
        connection
      );
    }

    await connection.commit();

    const alert = await getAlertById(alertId);

    res.status(201).json({
      success: true,
      message: `Emergency alert ${alert.reference} published. ${recipientUserIds.length} matching donor account(s) were notified.`,
      alert,
      notifiedDonors: recipientUserIds.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Could not publish the emergency alert.'));
  } finally {
    if (connection) connection.release();
  }
};

const close = async (req, res, next) => {
  try {
    const alertId = Number(req.params.id);
    const closed = await closeAlert(alertId);
    if (!closed) {
      throw httpError(404, 'Active alert not found.');
    }
    const alert = await getAlertById(alertId);
    res.json({ success: true, message: `Alert ${alert.reference} closed.`, alert });
  } catch (error) {
    next(toFriendlyError(error, 'Could not close this alert.'));
  }
};

module.exports = {
  listAlerts,
  getAlert,
  respondToAlert,
  publish,
  close,
};
