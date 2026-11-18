const pool = require('../config/db');
const { getHospitalStats } = require('../models/hospitalModel');
const { getRequestCountByStatus } = require('../models/bloodRequestModel');
const { getDonorDirectoryStats } = require('../models/donorDirectoryModel');
const { toFriendlyError } = require('../validators/common');
const { toDateString } = require('../utils/date');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TREND_MONTHS = 6;

/**
 * Builds a continuous last-N-month series so charts never have gaps. Months
 * with no rows are reported as 0 rather than being omitted.
 */
const buildMonthSeries = (rows, key) => {
  const byMonth = new Map(rows.map((r) => [r.ym, Number(r.cnt)]));
  const series = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (TREND_MONTHS - 1));

  for (let i = 0; i < TREND_MONTHS; i += 1) {
    const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    series.push({ key: ym, label: MONTH_LABELS[cursor.getMonth()], value: byMonth.get(ym) || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
};

/**
 * Monthly activity trends, read straight from the users and appointments
 * tables. Nothing here is estimated or pre-filled.
 */
const getTrends = async () => {
  const [registrations, donations] = await Promise.all([
    pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS cnt
         FROM users
        WHERE created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${TREND_MONTHS - 1} MONTH), '%Y-%m-01')
        GROUP BY ym`
    ),
    pool.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS ym, COUNT(*) AS cnt
         FROM appointments
        WHERE status = 'completed'
          AND appointment_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${TREND_MONTHS - 1} MONTH), '%Y-%m-01')
        GROUP BY ym`
    ),
  ]);

  return {
    months: TREND_MONTHS,
    registrations: buildMonthSeries(registrations[0], 'registrations'),
    donations: buildMonthSeries(donations[0], 'donations'),
  };
};

/**
 * Everything the Blood Bank dashboard shows, read straight from MySQL.
 * Nothing on that screen is hardcoded.
 */
const verifiedInventory = async actor => {
  try {
    const regional=await require('../models/bankInventoryModel').regional(actor);
    const map=new Map();
    for(const row of regional){const prior=map.get(row.bloodGroup)||{bloodGroup:row.bloodGroup,availableUnits:0};prior.availableUnits+=row.availableUnits;map.set(row.bloodGroup,prior);}
    const groups=[...map.values()];
    return {available:true,totalUnits:groups.reduce((n,r)=>n+r.availableUnits,0),availableUnits:groups.reduce((n,r)=>n+r.availableUnits,0),lowStockGroups:regional.filter(r=>r.level==='Low').length,criticalStockGroups:regional.filter(r=>r.level==='Critical').length,byBloodGroup:groups,regional};
  }catch(e){if(['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code))return {available:false,totalUnits:null,availableUnits:null,lowStockGroups:null,criticalStockGroups:null,byBloodGroup:[],regional:[],reason:'Blood inventory setup is not complete. Contact your system administrator.'};throw e;}
};
const getBloodBankStats = async (actor) => {
  const [inventory, hospitalStats, requestCounts, donorStats, trends] = await Promise.all([
    verifiedInventory(actor),
    getHospitalStats(),
    getRequestCountByStatus(),
    getDonorDirectoryStats(),
    getTrends(),
  ]);

  const [upcoming] = await pool.query(
    `SELECT a.appointment_id, a.appointment_date, a.time_slot, a.status,
            d.full_name AS donor_name, d.blood_group, h.hospital_name
       FROM appointments a
       JOIN donors d ON a.donor_id = d.donor_id
       JOIN hospitals h ON a.hospital_id = h.hospital_id
       JOIN users hu ON h.user_id = hu.user_id
      WHERE a.appointment_date >= CURDATE() AND a.status IN ('pending', 'approved') AND hu.account_status='active'
      ORDER BY a.appointment_date ASC, a.time_slot ASC
      LIMIT 5`
  );

  const [upcomingAppointments] = await pool.query(
    `SELECT COUNT(*) AS cnt
       FROM appointments a
       JOIN hospitals h ON a.hospital_id = h.hospital_id
       JOIN users hu ON h.user_id = hu.user_id
      WHERE a.appointment_date >= CURDATE() AND a.status IN ('pending', 'approved') AND hu.account_status = 'active'`
  );

  const [accounts] = await pool.query(
    `SELECT
       SUM(CASE WHEN role = 'donor' THEN 1 ELSE 0 END) AS donors,
       SUM(CASE WHEN role = 'hospital' THEN 1 ELSE 0 END) AS hospitals,
       SUM(CASE WHEN role = 'blood_bank' THEN 1 ELSE 0 END) AS blood_banks
     FROM users`
  );

  const [campaignCounts]=await pool.query("SELECT COUNT(*) AS active FROM campaigns WHERE status IN ('Upcoming','Active') AND campaign_date>=CURDATE()");
  let operations={activeCampaigns:Number(campaignCounts[0]?.active||0),pendingTransfers:null,expiringUnits:null};
  if(inventory.available){const [batches,transfers]=await Promise.all([require('../models/bankInventoryModel').batches(actor),require('../models/bankTransferModel').list(actor)]);operations={...operations,pendingTransfers:transfers.filter(r=>['requested','approved','dispatched'].includes(r.status)).length,expiringUnits:batches.filter(r=>r.expiryStatus==='expiring').reduce((n,r)=>n+r.quantity,0)};}
  const lowStockGroups = inventory.regional.filter((i) => i.level!=='Available');

  return {
    inventory,
    operations,
    hospitals: hospitalStats,
    requests: {
      ...requestCounts,
      total: Object.values(requestCounts).reduce((a, b) => a + b, 0),
    },
    donors: donorStats,
    appointments: {
      upcoming: Number(upcomingAppointments[0]?.cnt || 0),
      next: upcoming.map((r) => ({
        id: r.appointment_id,
        date: toDateString(r.appointment_date),
        timeSlot: r.time_slot,
        status: r.status,
        donorName: r.donor_name,
        bloodGroup: r.blood_group,
        hospitalName: r.hospital_name,
      })),
    },
    accounts: {
      donors: Number(accounts[0]?.donors || 0),
      hospitals: Number(accounts[0]?.hospitals || 0),
      bloodBanks: Number(accounts[0]?.blood_banks || 0),
    },
    alerts: {
      lowStock: lowStockGroups.map((i) => ({
        bloodGroup: i.bloodGroup,
        availableUnits: i.availableUnits,
        level: i.level,
      })),
    },
    trends,
  };
};

const stats = async (req, res, next) => {
  try {
    const data = await getBloodBankStats(req.user.user_id);
    res.json({ success: true, stats: data });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load blood bank statistics.'));
  }
};

module.exports = { getBloodBankStats, stats };
