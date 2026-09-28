const pool = require('../config/db');
const { toDateTimeString } = require('../utils/date');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const mapInventoryRow = (r) => {
  const available = Number(r.available_units);
  const low = Number(r.low_stock_threshold);
  const critical = Number(r.critical_stock_threshold);

  let level = 'Available';
  if (available <= critical) level = 'Critical';
  else if (available <= low) level = 'Low';

  return {
    id: r.inventory_id,
    bloodGroup: r.blood_group,
    availableUnits: available,
    lowStockThreshold: low,
    criticalStockThreshold: critical,
    level,
    isLow: level !== 'Available',
    lastRestockedAt: toDateTimeString(r.last_restocked_at),
  };
};

const getInventory = async () => {
  const [rows] = await pool.query('SELECT * FROM blood_inventory ORDER BY FIELD(blood_group, ?) DESC', [
    // FIELD() needs a literal list; build it from the canonical group order.
    BLOOD_GROUPS.map((g) => `'${g}'`).join(','),
  ]);
  return rows.map(mapInventoryRow);
};

const getInventoryStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(available_units), 0) AS total_units,
       COALESCE(SUM(CASE WHEN available_units > critical_stock_threshold
                          AND available_units <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS low_stock,
       COALESCE(SUM(CASE WHEN available_units <= critical_stock_threshold THEN 1 ELSE 0 END), 0) AS critical_stock,
       COALESCE(SUM(CASE WHEN available_units > low_stock_threshold THEN available_units ELSE 0 END), 0) AS available_units
     FROM blood_inventory`
  );
  const r = rows[0] || {};
  return {
    totalUnits: Number(r.total_units || 0),
    availableUnits: Number(r.available_units || 0),
    lowStockGroups: Number(r.low_stock || 0),
    criticalStockGroups: Number(r.critical_stock || 0),
  };
};

const getInventoryForGroup = async (bloodGroup) => {
  const [rows] = await pool.query('SELECT * FROM blood_inventory WHERE blood_group = ?', [bloodGroup]);
  return rows[0] ? mapInventoryRow(rows[0]) : null;
};

/**
 * Adjusts stock. `mode` is either:
 *   'add'   — increase by `amount` (restock / collection)
 *   'set'   — set the absolute value (`amount` is the new total)
 *   'remove'— decrease by `amount` (issued to a hospital, wastage)
 * Never allows a negative balance.
 */
const adjustInventory = async ({ bloodGroup, amount, mode = 'add', note = null }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM blood_inventory WHERE blood_group = ? FOR UPDATE',
      [bloodGroup]
    );
    const row = rows[0];
    if (!row) {
      throw httpError(404, `No inventory record exists for blood group ${bloodGroup}.`);
    }

    const current = Number(row.available_units);
    let next;
    if (mode === 'add') next = current + amount;
    else if (mode === 'set') next = amount;
    else next = current - amount;

    if (next < 0) {
      throw httpError(
        409,
        `Only ${current} unit(s) of ${bloodGroup} are in stock. Inventory cannot go below zero.`
      );
    }

    await connection.query(
      `UPDATE blood_inventory
          SET available_units = ?,
              last_restocked_at = CASE WHEN ? > available_units THEN NOW() ELSE last_restocked_at END
        WHERE blood_group = ?`,
      [next, mode === 'add' ? amount : 0, bloodGroup]
    );

    await connection.commit();
    return getInventoryForGroup(bloodGroup);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateThresholds = async ({ bloodGroup, lowStockThreshold, criticalStockThreshold }) => {
  const fields = [];
  const values = [];
  if (lowStockThreshold !== undefined) {
    fields.push('low_stock_threshold = ?');
    values.push(lowStockThreshold);
  }
  if (criticalStockThreshold !== undefined) {
    fields.push('critical_stock_threshold = ?');
    values.push(criticalStockThreshold);
  }
  if (fields.length === 0) {
    throw httpError(400, 'No threshold values were supplied.');
  }
  values.push(bloodGroup);

  const [result] = await pool.query(
    `UPDATE blood_inventory SET ${fields.join(', ')} WHERE blood_group = ?`,
    values
  );
  if (result.affectedRows === 0) {
    throw httpError(404, `No inventory record exists for blood group ${bloodGroup}.`);
  }
  return getInventoryForGroup(bloodGroup);
};

/**
 * Issues `quantity` units of `bloodGroup` from stock. Used when a blood bank
 * user fulfils an approved request.
 */
const issueUnits = ({ bloodGroup, quantity }) =>
  adjustInventory({ bloodGroup, amount: quantity, mode: 'remove' });

module.exports = {
  BLOOD_GROUPS,
  getInventory,
  getInventoryStats,
  getInventoryForGroup,
  adjustInventory,
  updateThresholds,
  issueUnits,
};
