const pool = require('../config/db');
const { getInventory, getInventoryStats } = require('../models/inventoryModel');
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
const getBloodBankStats = async () => {
  const [inventory, inventoryStats, hospitalStats, requestCounts, donorStats, trends] = await Promise.all([
    getInventory(),
    getInventoryStats(),
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
      WHERE a.appointment_date >= CURDATE() AND a.status IN ('pending', 'approved')
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

  const lowStockGroups = inventory.filter((i) => i.isLow);

  return {
    inventory: {
      totalUnits: inventoryStats.totalUnits,
      availableUnits: inventoryStats.availableUnits,
      lowStockGroups: inventoryStats.lowStockGroups,
      criticalStockGroups: inventoryStats.criticalStockGroups,
      byBloodGroup: inventory,
    },
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
    const data = await getBloodBankStats();
    res.json({ success: true, stats: data });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load blood bank statistics.'));
  }
};

module.exports = { getBloodBankStats, stats };
