const {
  getAllHospitals,
  getPendingCount,
  approveHospital,
  rejectHospital,
  reviewAgainHospital,
} = require('../models/hospitalModel');

const listHospitals = async (req, res, next) => {
  try {
    const hospitals = await getAllHospitals();
    res.json({ success: true, hospitals });
  } catch (error) {
    next(error);
  }
};

const getPendingHospitalCount = async (req, res, next) => {
  try {
    const count = await getPendingCount();
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await approveHospital(Number(userId));
    res.json({ success: true, message: 'Hospital approved successfully.' });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await rejectHospital(Number(userId));
    res.json({ success: true, message: 'Hospital rejected successfully.' });
  } catch (error) {
    next(error);
  }
};

const reviewAgain = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await reviewAgainHospital(Number(userId));
    res.json({ success: true, message: 'Hospital moved back to pending review.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listHospitals,
  getPendingHospitalCount,
  approve,
  reject,
  reviewAgain,
};
