const {
  getAllHospitals,
  getActiveHospitals,
  getHospitalStats,
  getPendingCount,
  getHospitalByUserId,
  approveHospital,
  rejectHospital,
  reviewAgainHospital,
} = require('../models/hospitalModel');
const { toFriendlyError } = require('../validators/common');

const listHospitals = async (req, res, next) => {
  try {
    const [hospitals, stats] = await Promise.all([getAllHospitals(), getHospitalStats()]);
    res.json({ success: true, hospitals, stats });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load hospitals.'));
  }
};

/** Active hospitals — donors use this to pick a real donation centre. */
const listActiveHospitals = async (req, res, next) => {
  try {
    const hospitals = await getActiveHospitals();
    res.json({ success: true, hospitals });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load donation centres.'));
  }
};

const getPendingHospitalCount = async (req, res, next) => {
  try {
    const count = await getPendingCount();
    res.json({ success: true, count });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load the pending approval count.'));
  }
};

const hospitalStats = async (req, res, next) => {
  try {
    const stats = await getHospitalStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load hospital statistics.'));
  }
};

const myHospital = async (req, res, next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'No hospital record found for this account.' });
    }
    return res.json({ success: true, hospital });
  } catch (error) {
    return next(toFriendlyError(error, 'Could not load your hospital record.'));
  }
};

const approve = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid hospital reference.' });
    }

    const statsBefore = await getHospitalStats();
    await approveHospital(userId, req.user.user_id);
    const statsAfter = await getHospitalStats();

    return res.json({
      success: true,
      message: 'Hospital approved. The account is now active and can sign in.',
      stats: statsAfter,
      changed: statsBefore.pending !== statsAfter.pending,
    });
  } catch (error) {
    return next(toFriendlyError(error, 'Could not approve this hospital.'));
  }
};

const reject = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid hospital reference.' });
    }
    if (!req.body.reason || !req.body.reason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }

    const statsBefore = await getHospitalStats();
    await rejectHospital(userId, req.user.user_id, req.body.reason.trim());
    const statsAfter = await getHospitalStats();

    return res.json({
      success: true,
      message: 'Hospital rejected. The account can no longer access the dashboard.',
      stats: statsAfter,
      changed: statsBefore.pending !== statsAfter.pending,
    });
  } catch (error) {
    return next(toFriendlyError(error, 'Could not reject this hospital.'));
  }
};

const reviewAgain = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid hospital reference.' });
    }

    const statsBefore = await getHospitalStats();
    await reviewAgainHospital(userId, req.user.user_id);
    const statsAfter = await getHospitalStats();

    return res.json({
      success: true,
      message: 'Hospital moved back to pending review.',
      stats: statsAfter,
      changed: statsBefore.pending !== statsAfter.pending,
    });
  } catch (error) {
    return next(toFriendlyError(error, 'Could not move this hospital back to pending.'));
  }
};

module.exports = {
  listHospitals,
  listActiveHospitals,
  getPendingHospitalCount,
  hospitalStats,
  myHospital,
  approve,
  reject,
  reviewAgain,
};
