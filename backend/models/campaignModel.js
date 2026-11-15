const pool = require('../config/db');
const { toDateString } = require('../utils/date');

const PUBLISHED_STATUSES = ['Upcoming', 'Active'];
const REGISTRATION_OPEN_STATUSES = ['Upcoming', 'Active'];

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const splitGroups = (value) =>
  value
    ? String(value)
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

const joinGroups = (value) =>
  Array.isArray(value) ? value.map((g) => String(g).trim()).filter(Boolean).join(',') : value || null;

const mapCampaignRow = (r) => ({
  id: r.campaign_id,
  reference: `CM-${String(r.campaign_id).padStart(5, '0')}`,
  name: r.name,
  title: r.title,
  shortDescription: r.short_description,
  detailedDescription: r.detailed_description,
  image: r.image_url,
  status: r.status,
  date: toDateString(r.campaign_date),
  startTime: r.start_time,
  endTime: r.end_time,
  venueName: r.venue_name,
  address: r.address,
  district: r.district,
  city: r.city,
  locationNotes: r.location_notes,
  organizerName: r.organizer_name,
  contactPerson: r.contact_person,
  contactNumber: r.contact_number,
  contactEmail: r.contact_email,
  whoCanParticipate: r.who_can_participate,
  eligibilityInfo: r.eligibility_info,
  whatToBring: r.what_to_bring,
  preparationInstructions: r.preparation_instructions,
  specialInstructions: r.special_instructions,
  availableFacilities: r.available_facilities,
  emergencyContact: r.emergency_contact,
  neededBloodGroups: splitGroups(r.needed_blood_groups),
  targetDonors: Number(r.target_donors || 0),
  goal: r.goal,
  participants: Number(r.participant_count || 0),
  createdAt: toDateString(r.created_at),
});

const mapRegistrationRow = (r) => ({
  id: r.registration_id,
  reference: `CR-${String(r.registration_id).padStart(5, '0')}`,
  status: r.status,
  note: r.note,
  registeredAt: toDateString(r.created_at),
  updatedAt: toDateString(r.updated_at),
  campaign: mapCampaignRow(r),
});

const CAMPAIGN_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM campaign_registrations cr
      WHERE cr.campaign_id = c.campaign_id AND cr.status = 'registered') AS participant_count
  FROM campaigns c`;

/**
 * Published = what a donor is allowed to see. Draft campaigns stay invisible to
 * donors; the blood bank sees everything.
 */
const listCampaigns = async ({ role, district, date, period, status } = {}) => {
  const conditions = [];
  const params = [];

  if (role !== 'blood_bank') {
    conditions.push(`c.status IN ('Upcoming','Active')`);
  }
  if (role==='blood_bank' && status) {conditions.push('c.status=?');params.push(status);}
  if (district) {
    conditions.push('c.district = ?');
    params.push(district);
  }
  if (date) {
    conditions.push('c.campaign_date = ?');
    params.push(date);
  }
  if (period === 'upcoming') {
    conditions.push('c.campaign_date >= CURDATE()');
  } else if (period === 'past') {
    conditions.push('c.campaign_date < CURDATE()');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${CAMPAIGN_SELECT} ${where} ORDER BY c.campaign_date ASC, c.start_time ASC`,
    params
  );
  return rows.map(mapCampaignRow);
};

const getCampaignById = async (campaignId, { role } = {}, executor = pool) => {
  const [rows] = await executor.query(`${CAMPAIGN_SELECT} WHERE c.campaign_id = ?`, [campaignId]);
  const row = rows[0];
  if (!row) return null;
  if (role !== 'blood_bank' && !PUBLISHED_STATUSES.includes(row.status)) return null;
  return mapCampaignRow(row);
};

/** Raw row for internal decisions (visibility is checked by callers). */
const getCampaignRowById = async (campaignId, executor, lock = false) => {
  const db = executor || pool;
  const [rows] = await db.query('SELECT * FROM campaigns WHERE campaign_id = ?'+(lock?' FOR UPDATE':''), [campaignId]);
  return rows[0] || null;
};

const createCampaign = async (payload, userId) => {
  const [result] = await pool.query(
    `INSERT INTO campaigns (
      created_by_user_id, name, title, short_description, detailed_description, image_url,
      status, campaign_date, start_time, end_time, venue_name, address, district, city,
      location_notes, organizer_name, contact_person, contact_number, contact_email,
      who_can_participate, eligibility_info, what_to_bring, preparation_instructions,
      special_instructions, available_facilities, emergency_contact, needed_blood_groups,
      target_donors, goal
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      payload.name,
      payload.title || null,
      payload.shortDescription || null,
      payload.detailedDescription || null,
      payload.imageUrl || null,
      payload.status || 'Draft',
      payload.date,
      payload.startTime,
      payload.endTime,
      payload.venueName || null,
      payload.address || null,
      payload.district || null,
      payload.city || null,
      payload.locationNotes || null,
      payload.organizerName,
      payload.contactPerson || null,
      payload.contactNumber || null,
      payload.contactEmail || null,
      payload.whoCanParticipate || null,
      payload.eligibilityInfo || null,
      payload.whatToBring || null,
      payload.preparationInstructions || null,
      payload.specialInstructions || null,
      payload.availableFacilities || null,
      payload.emergencyContact || null,
      joinGroups(payload.neededBloodGroups),
      payload.targetDonors ?? 0,
      payload.goal || null,
    ]
  );
  return getCampaignById(result.insertId, { role: 'blood_bank' });
};

const updateCampaign = async (campaignId, payload, executor = pool) => {
  const fields = {};
  const map = {
    name: 'name',
    title: 'title',
    shortDescription: 'short_description',
    detailedDescription: 'detailed_description',
    imageUrl: 'image_url',
    status: 'status',
    date: 'campaign_date',
    startTime: 'start_time',
    endTime: 'end_time',
    venueName: 'venue_name',
    address: 'address',
    district: 'district',
    city: 'city',
    locationNotes: 'location_notes',
    organizerName: 'organizer_name',
    contactPerson: 'contact_person',
    contactNumber: 'contact_number',
    contactEmail: 'contact_email',
    whoCanParticipate: 'who_can_participate',
    eligibilityInfo: 'eligibility_info',
    whatToBring: 'what_to_bring',
    preparationInstructions: 'preparation_instructions',
    specialInstructions: 'special_instructions',
    availableFacilities: 'available_facilities',
    emergencyContact: 'emergency_contact',
    targetDonors: 'target_donors',
    goal: 'goal',
  };
  for (const [key, column] of Object.entries(map)) {
    if (payload[key] !== undefined) fields[column] = payload[key] === '' ? null : payload[key];
  }
  if (payload.neededBloodGroups !== undefined) {
    fields.needed_blood_groups = joinGroups(payload.neededBloodGroups);
  }
  if (Object.hasOwn(fields, 'target_donors') && (fields.target_donors === null || fields.target_donors === '')) {
    fields.target_donors = 0;
  }

  const columns = Object.keys(fields);
  if (columns.length > 0) {
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    await executor.query(`UPDATE campaigns SET ${setClause} WHERE campaign_id = ?`, [
      ...Object.values(fields),
      campaignId,
    ]);
  }
  return getCampaignById(campaignId, { role: 'blood_bank' },executor);
};

/**
 * Registers a donor. Re-registering after a cancellation flips the same row
 * back to 'registered' so history is preserved.
 */
const registerForCampaign = async ({ campaignId, donorId, note }, executor) => {
  const db = executor || pool;
  const [existing] = await db.query(
    'SELECT registration_id, status FROM campaign_registrations WHERE campaign_id = ? AND donor_id = ? FOR UPDATE',
    [campaignId, donorId]
  );

  if (existing.length > 0) {
    const row = existing[0];
    if (row.status === 'registered') {
      throw httpError(409, 'You are already registered for this campaign.');
    }
    await db.query(
      `UPDATE campaign_registrations SET status = 'registered', note = ? WHERE registration_id = ?`,
      [note || null, row.registration_id]
    );
    return row.registration_id;
  }

  const [result] = await db.query(
    `INSERT INTO campaign_registrations (campaign_id, donor_id, note) VALUES (?, ?, ?)`,
    [campaignId, donorId, note || null]
  );
  return result.insertId;
};

const countActiveRegistrations = async (campaignId, executor) => {
  const db = executor || pool;
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM campaign_registrations
      WHERE campaign_id = ? AND status = 'registered'`,
    [campaignId]
  );
  return Number(rows[0]?.cnt || 0);
};

const getRegistrationForDonor = async (campaignId, donorId, executor) => {
  const db = executor || pool;
  const [rows] = await db.query(
    'SELECT * FROM campaign_registrations WHERE campaign_id = ? AND donor_id = ?',
    [campaignId, donorId]
  );
  return rows[0] || null;
};

/** Campaign + the donor's own registration, joined with aliases (no column clashes). */
const getRegistrationWithCampaign = async (registrationId, executor) => {
  const db = executor || pool;
  const [rows] = await db.query(
    `SELECT cr.registration_id, cr.status AS registration_status, cr.note,
            cr.created_at AS registration_created_at, cr.updated_at AS registration_updated_at,
            c.*,
            (SELECT COUNT(*) FROM campaign_registrations x
              WHERE x.campaign_id = c.campaign_id AND x.status = 'registered') AS participant_count
       FROM campaign_registrations cr
       JOIN campaigns c ON c.campaign_id = cr.campaign_id
      WHERE cr.registration_id = ?`,
    [registrationId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.registration_id,
    reference: `CR-${String(r.registration_id).padStart(5, '0')}`,
    status: r.registration_status,
    note: r.note,
    registeredAt: toDateString(r.registration_created_at),
    updatedAt: toDateString(r.registration_updated_at),
    campaign: mapCampaignRow(r),
  };
};

const listRegistrationsForDonor = async (donorId) => {
  const [rows] = await pool.query(
    `SELECT cr.registration_id, cr.status AS registration_status, cr.note,
            cr.created_at AS registration_created_at, cr.updated_at AS registration_updated_at,
            c.*,
            (SELECT COUNT(*) FROM campaign_registrations x
              WHERE x.campaign_id = c.campaign_id AND x.status = 'registered') AS participant_count
       FROM campaign_registrations cr
       JOIN campaigns c ON c.campaign_id = cr.campaign_id
      WHERE cr.donor_id = ?
      ORDER BY c.campaign_date ASC, c.start_time ASC`,
    [donorId]
  );
  return rows.map((r) => ({
    id: r.registration_id,
    reference: `CR-${String(r.registration_id).padStart(5, '0')}`,
    status: r.registration_status,
    note: r.note,
    registeredAt: toDateString(r.registration_created_at),
    updatedAt: toDateString(r.registration_updated_at),
    campaign: mapCampaignRow(r),
  }));
};

/** Cancels (never deletes) the donor's own registration. */
const cancelRegistration = async (campaignId, donorId, executor) => {
  const db = executor || pool;
  const [result] = await db.query(
    `UPDATE campaign_registrations
        SET status = 'cancelled'
      WHERE campaign_id = ? AND donor_id = ? AND status = 'registered'`,
    [campaignId, donorId]
  );
  return result.affectedRows > 0;
};

module.exports = {
  PUBLISHED_STATUSES,
  REGISTRATION_OPEN_STATUSES,
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
};
