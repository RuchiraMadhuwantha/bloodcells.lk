const { query, param } = require('express-validator');
const {
  listDonors,
  getDonorById,
  getDonorDirectoryStats,
  getDonorBloodGroupBreakdown,
  getDonorSelfSummary,
} = require('../models/donorDirectoryModel');
const { getAppointmentsForDonor } = require('../models/appointmentModel');
const { toFriendlyError, BLOOD_GROUPS } = require('../validators/common');

const list = async (req, res, next) => {
  try {
    const [donors, stats, breakdown] = await Promise.all([
      listDonors({
        search: req.query.search,
        bloodGroup: req.query.bloodGroup,
        district: req.query.district,
        eligible: req.query.eligible === 'true' ? true : req.query.eligible === 'false' ? false : undefined,
      }),
      getDonorDirectoryStats(),
      getDonorBloodGroupBreakdown(),
    ]);
    res.json({ success: true, donors, stats, breakdown });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load the donor directory.'));
  }
};

const listValidation = [
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term is too long.'),
  query('bloodGroup').optional().custom((v) => v === 'All' || BLOOD_GROUPS.includes(v)).withMessage('Invalid blood group filter.'),
  query('district').optional().trim().isLength({ max: 100 }).withMessage('Invalid district filter.'),
];

const details = async (req, res, next) => {
  try {
    const donor = await getDonorById(Number(req.params.id));
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }
    const appointments = await getAppointmentsForDonor(donor.donorId);
    return res.json({ success: true, donor, appointments });
  } catch (error) {
    return next(toFriendlyError(error, 'Could not load this donor.'));
  }
};

const idValidation = [param('id').isInt({ min: 1 }).withMessage('Invalid donor reference.')];

const mySummary = async (req, res, next) => {
  try {
    const summary = await getDonorSelfSummary(req.user.user_id);
    res.json({ success: true, summary });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your dashboard summary.'));
  }
};

module.exports = { list, listValidation, details, idValidation, mySummary };
