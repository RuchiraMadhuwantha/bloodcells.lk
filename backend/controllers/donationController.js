const {
  listDonationsForDonor,
  getDonationForDonor,
  countDonationsForDonor,
} = require('../models/donationModel');
const { getDonorIdByUserId } = require('../models/appointmentModel');
const { toFriendlyError } = require('../validators/common');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const listMyDonations = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }

    const { year, date, sort, page, pageSize } = req.query;
    const { items, pagination } = await listDonationsForDonor(donorId, {
      year,
      date,
      sort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    const totalCompleted = await countDonationsForDonor(donorId);

    res.json({
      success: true,
      donations: items,
      // Frontend list shape (keeps one key name for the records array).
      items,
      pagination,
      totalCompleted,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your donation history.'));
  }
};

const getMyDonation = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const donation = await getDonationForDonor(Number(req.params.id), donorId);
    if (!donation) {
      throw httpError(404, 'Donation record not found.');
    }
    res.json({ success: true, donation });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this donation record.'));
  }
};

module.exports = {
  listMyDonations,
  getMyDonation,
};
