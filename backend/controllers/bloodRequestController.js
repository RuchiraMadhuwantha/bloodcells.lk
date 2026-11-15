const pool = require('../config/db');
const {
  createBloodRequest,
  getAllRequests,
  getRequestsForHospital,
  getRequestById,
  getRequestCountByStatus,
  updateRequestStatus,
  fulfilRequest,
  listOpenRequestsForGroup,
} = require('../models/bloodRequestModel');
const { getInventoryForGroup } = require('../models/inventoryModel');
const { getHospitalByUserId } = require('../models/hospitalModel');
const { toFriendlyError } = require('../validators/common');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/* ───────────────────────── Hospital side ───────────────────────── */

const createRequest = async (req, res, next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital) {
      throw httpError(404, 'No hospital record is linked to this account.');
    }

    const { blood_group: bloodGroup, quantity, urgency, required_date: requiredDate, department, reason } = req.body;

    const [stock] = await pool.query(
      'SELECT available_units, low_stock_threshold, critical_stock_threshold FROM blood_inventory WHERE blood_group = ?',
      [bloodGroup]
    );
    const current = stock[0] ? Number(stock[0].available_units) : 0;

    const requestId = await createBloodRequest({
      hospitalId: hospital.hospitalId,
      requestedByUserId: req.user.user_id,
      bloodGroup,
      quantity: Number(quantity),
      urgency: urgency || 'normal',
      requiredDate: requiredDate || null,
      department: department || null,
      reason: reason || null,
    });

    const created = await getRequestById(requestId);
    const counts = await getRequestCountByStatus(hospital.hospitalId);

    res.status(201).json({
      success: true,
      message: `Blood request ${created.reference} submitted to the blood bank.`,
      request: created,
      counts,
      stockWarning:
        current < Number(quantity)
          ? `Only ${current} unit(s) of ${bloodGroup} are currently in stock. The blood bank will review this request.`
          : null,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not submit the blood request.'));
  }
};

const listMyRequests = async (req, res, next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital) {
      throw httpError(404, 'No hospital record is linked to this account.');
    }
    const all = await getRequestsForHospital(hospital.hospitalId, req.query);
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const page = Number(req.query.page || 1);
    const requests = limit ? all.slice((page-1)*limit,page*limit) : all;
    const counts = await getRequestCountByStatus(hospital.hospitalId);
    res.json({ success: true, requests, counts, ...(limit ? { pagination: { page,limit,total:all.length },hasMore:page*limit<all.length } : {}) });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your blood requests.'));
  }
};

const getMyRequest = async (req,res,next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    const request = await getRequestById(Number(req.params.id));
    if (!hospital || !request || request.hospitalId !== hospital.hospitalId) throw httpError(404,'Hospital request not found.');
    res.json({ success:true,request });
  } catch(e) { next(toFriendlyError(e,'Could not load this hospital request.')); }
};

const cancelMyRequest = async (req, res, next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital) {
      throw httpError(404, 'No hospital record is linked to this account.');
    }

    const request = await getRequestById(Number(req.params.id));
    if (!request) {
      throw httpError(404, 'Blood request not found.');
    }
    if (request.hospitalId !== hospital.hospitalId) {
      throw httpError(403, 'You can only cancel your own hospital requests.');
    }

    const updated = await updateRequestStatus({
      requestId: request.id,
      newStatus: 'cancelled',
      reviewedByUserId: req.user.user_id,
      note: 'Cancelled by the hospital.',
    });

    res.json({ success: true, message: `Request ${request.reference} cancelled.`, request: updated });
  } catch (error) {
    next(toFriendlyError(error, 'Could not cancel this request.'));
  }
};

/* ───────────────────────── Blood bank side ───────────────────────── */

const listAllRequests = async (req, res, next) => {
  try {
    const [requests, counts] = await Promise.all([
      getAllRequests(req.query),
      getRequestCountByStatus(),
    ]);
    res.json({ success: true, requests, counts });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load blood requests.'));
  }
};

const getRequest = async (req, res, next) => {
  try {
    const request = await getRequestById(Number(req.params.id));
    if (!request) {
      throw httpError(404, 'Blood request not found.');
    }
    res.json({ success: true, request });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this blood request.'));
  }
};

const changeStatus = async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const { status, note } = req.body;

    const request = await getRequestById(requestId);
    if (!request) {
      throw httpError(404, 'Blood request not found.');
    }

    if (status === 'rejected' && !note && !note?.trim()) {
      throw httpError(400, 'Please provide a reason for rejecting this request.');
    }

    // Approving an emergency/normal request is only a reservation decision.
    // Fulfilment is what actually consumes inventory, and it happens inside a
    // single transaction so stock is never deducted for a rejected transition.
    let updated;
    if (status === 'fulfilled') {
      updated = await fulfilRequest({
        requestId,
        reviewedByUserId: req.user.user_id,
        note,
      });
    } else {
      updated = await updateRequestStatus({
        requestId,
        newStatus: status,
        reviewedByUserId: req.user.user_id,
        note,
      });
    }

    const counts = await getRequestCountByStatus();
    const stockAfter = await getInventoryForGroup(request.bloodGroup);

    res.json({
      success: true,
      message:
        status === 'fulfilled'
          ? `Request ${request.reference} fulfilled. ${request.quantity} unit(s) of ${request.bloodGroup} issued to ${request.hospitalName}.`
          : `Request ${request.reference} marked as ${updated.statusLabel.toLowerCase()}.`,
      request: updated,
      counts,
      stock: stockAfter,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update this blood request.'));
  }
};

/* ───────────────────────── Donor side ───────────────────────── */

/**
 * Donors only ever see open requests for their own blood group, and only the
 * public-safe projection. The group is taken from the donor's own profile
 * rather than the query string, so it cannot be used to browse other groups.
 */
const listMatching = async (req, res, next) => {
  try {
    const [donor] = await pool.query(
      'SELECT blood_group FROM donors WHERE user_id = ?',
      [req.user.user_id]
    );
    if (donor.length === 0) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }

    const requests = await listOpenRequestsForGroup(donor[0].blood_group);
    res.json({
      success: true,
      bloodGroup: donor[0].blood_group,
      requests,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load matching blood requests.'));
  }
};

module.exports = {
  createRequest,
  getMyRequest,
  listMyRequests,
  cancelMyRequest,
  listAllRequests,
  getRequest,
  changeStatus,
  listMatching,
};
