const pool = require('../config/db');
const {
  listCampaigns,
  getCampaignById,
  getCampaignRowById,
  createCampaign,
  updateCampaign,
  registerForCampaign,
  countActiveRegistrations,
  getRegistrationForDonor,
  getRegistrationWithCampaign,
  listRegistrationsForDonor,
  cancelRegistration,
  REGISTRATION_OPEN_STATUSES,
} = require('../models/campaignModel');
const { getDonorIdByUserId } = require('../models/appointmentModel');
const { getUserIdByDonorId } = require('../models/donorModel');
const { createNotification } = require('../models/notificationModel');
const { toFriendlyError } = require('../validators/common');
const { toDateString } = require('../utils/date');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/* ───────────────────────── Browser (donor + blood bank) ───────────────────────── */

const listPublished = async (req, res, next) => {
  try {
    const campaigns = await listCampaigns({
      role: req.user.role,
      status:req.query.status,
      district: req.query.district || undefined,
      date: req.query.date || undefined,
      period: req.query.period || undefined,
    });
    res.json({ success: true, campaigns });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load campaigns.'));
  }
};

const getCampaign = async (req, res, next) => {
  try {
    const campaign = await getCampaignById(Number(req.params.id), { role: req.user.role });
    if (!campaign) {
      throw httpError(404, 'Campaign not found.');
    }
    res.json({ success: true, campaign });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this campaign.'));
  }
};

/* ───────────────────────── Registration (donor) ───────────────────────── */

const registerMe = async (req, res, next) => {
  let connection;
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const campaignId = Number(req.params.id);
    const { note } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const campaign = await getCampaignRowById(campaignId, connection,true);
    if (!campaign) {
      throw httpError(404, 'Campaign not found.');
    }
    if (!REGISTRATION_OPEN_STATUSES.includes(campaign.status)) {
      throw httpError(409, 'Registration for this campaign is not open.');
    }
    if (toDateString(campaign.campaign_date) < toDateString(new Date())) {
      throw httpError(409, 'This campaign has already taken place.');
    }

    // Capacity check inside the transaction. The unique key
    // (campaign_id, donor_id) prevents duplicate active registrations even
    // under concurrent requests; capacity is enforced with a row lock on the
    // campaign so concurrent registrations cannot overshoot target_donors.
    const [locked] = await connection.query('SELECT target_donors FROM campaigns WHERE campaign_id = ? FOR UPDATE', [campaignId]);
    const target = Number(locked[0]?.target_donors || 0);
    if (target > 0) {
      const active = await countActiveRegistrations(campaignId, connection);
      if (active >= target) {
        throw httpError(409, 'This campaign has reached its donor target.');
      }
    }

    const registrationId = await registerForCampaign({ campaignId, donorId, note }, connection);
    const registration = await getRegistrationWithCampaign(registrationId, connection);

    const userId = await getUserIdByDonorId(donorId, connection);
    if (userId && registration.status === 'registered') {
      await createNotification(
        {
          userId,
          type: 'campaign',
          title: 'Campaign registration confirmed',
          message: `Your registration for "${campaign.name}" on ${toDateString(campaign.campaign_date)} is confirmed.`,
          relatedType: 'campaign',
          relatedId: campaignId,
          actionRoute: 'donor-my-campaigns',
        },
        connection
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Registered for "${campaign.name}".`,
      registration,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Could not register for this campaign.'));
  } finally {
    if (connection) connection.release();
  }
};

const listMyRegistrations = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const registrations = await listRegistrationsForDonor(donorId);
    res.json({ success: true, registrations });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your campaign registrations.'));
  }
};

const cancelMyRegistration = async (req, res, next) => {
  let connection;
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const campaignId = Number(req.params.id);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const campaign = await getCampaignRowById(campaignId, connection,true);
    if (!campaign) {
      throw httpError(404, 'Campaign not found.');
    }
    const existing = await getRegistrationForDonor(campaignId, donorId, connection);
    if (!existing) {
      throw httpError(404, 'You are not registered for this campaign.');
    }
    if (existing.status === 'cancelled') {
      throw httpError(409, 'Your registration for this campaign is already cancelled.');
    }
    if (!REGISTRATION_OPEN_STATUSES.includes(campaign.status)) {
      throw httpError(409, 'Registration for this campaign can no longer be changed.');
    }

    await cancelRegistration(campaignId, donorId, connection);
    await connection.commit();

    res.json({ success: true, message: 'Your campaign registration was cancelled.' });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Could not cancel this registration.'));
  } finally {
    if (connection) connection.release();
  }
};

/* ───────────────────────── Blood bank: manage campaigns ───────────────────────── */

const createManagedCampaign = async (req, res, next) => {
  try {
    if (req.body.startTime && req.body.endTime && req.body.endTime <= req.body.startTime) {
      throw httpError(400, 'Campaign end time must be after the start time.');
    }
    if(['Upcoming','Active'].includes(req.body.status) && req.body.date<toDateString(new Date())) throw httpError(400,'Cannot publish a campaign in the past.');
    const campaign = await createCampaign(req.body, req.user.user_id);
    res.status(201).json({ success: true, message: 'Campaign saved.', campaign });
  } catch (error) {
    next(toFriendlyError(error, 'Could not save the campaign.'));
  }
};

const updateManagedCampaign = async (req, res, next) => {
  let connection;
  try {
    connection=await pool.getConnection();await connection.beginTransaction();
    const campaignId = Number(req.params.id);
    const existing = await getCampaignRowById(campaignId,connection,true);
    if (!existing) {
      throw httpError(404, 'Campaign not found.');
    }
    if (existing.created_by_user_id !== req.user.user_id) throw httpError(403,'Only the campaign creator may edit this campaign.');
    const nextStatus=req.body.status || existing.status;
    const allowed={Draft:['Draft','Upcoming','Cancelled'],Upcoming:['Upcoming','Active','Cancelled'],Active:['Active','Completed','Cancelled']};
    if(!(allowed[existing.status] || []).includes(nextStatus)) throw httpError(409,'Campaign is closed or this transition is not allowed.');
    if(['Upcoming','Active'].includes(nextStatus) && (req.body.date || toDateString(existing.campaign_date))<toDateString(new Date())) throw httpError(400,'Cannot publish a campaign in the past.');
    const startTime = req.body.startTime ?? existing.start_time;
    const endTime = req.body.endTime ?? existing.end_time;
    if (endTime <= startTime) {
      throw httpError(400, 'Campaign end time must be after the start time.');
    }
    const campaign = await updateCampaign(campaignId, req.body,connection);
    await connection.commit();
    res.json({ success: true, message: 'Campaign updated.', campaign });
  } catch (error) {
    if(connection)await connection.rollback();
    next(toFriendlyError(error, 'Could not update the campaign.'));
  } finally {if(connection)connection.release();}
};

module.exports = {
  listPublished,
  getCampaign,
  registerMe,
  listMyRegistrations,
  cancelMyRegistration,
  createManagedCampaign,
  updateManagedCampaign,
};
