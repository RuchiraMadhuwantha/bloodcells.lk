const {
  getInventory,
  getInventoryStats,
  getInventoryForGroup,
  adjustInventory,
  updateThresholds,
} = require('../models/inventoryModel');
const { toFriendlyError } = require('../validators/common');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const listInventory = async (req, res, next) => {
  try {
    const [inventory, stats] = await Promise.all([getInventory(), getInventoryStats()]);
    res.json({ success: true, inventory, stats });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load blood inventory.'));
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await getInventoryStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load inventory statistics.'));
  }
};

const adjustStock = async (req, res, next) => {
  try {
    const { bloodGroup, amount, mode = 'add' } = req.body;
    const numeric = Number(amount);

    if (mode === 'set' && numeric === 0) {
      throw httpError(400, 'Set mode requires the new total number of units.');
    }
    if (mode === 'remove' && numeric === 0) {
      throw httpError(400, 'Enter how many units to remove.');
    }

    const item = await adjustInventory({ bloodGroup, amount: numeric, mode });
    const stats = await getInventoryStats();

    const verb = mode === 'add' ? 'added to' : mode === 'remove' ? 'removed from' : 'set for';
    res.json({
      success: true,
      message: `${numeric} unit(s) ${verb} ${bloodGroup}. Stock is now ${item.availableUnits}.`,
      item,
      stats,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update the inventory.'));
  }
};

const setThresholds = async (req, res, next) => {
  try {
    const { bloodGroup, lowStockThreshold, criticalStockThreshold } = req.body;

    const low = lowStockThreshold === undefined ? undefined : Number(lowStockThreshold);
    const critical = criticalStockThreshold === undefined ? undefined : Number(criticalStockThreshold);

    if (low !== undefined && critical !== undefined && critical > low) {
      throw httpError(400, 'The critical threshold must be lower than or equal to the low stock threshold.');
    }

    const item = await updateThresholds({
      bloodGroup,
      lowStockThreshold: low,
      criticalStockThreshold: critical,
    });

    res.json({ success: true, message: `Alert thresholds updated for ${bloodGroup}.`, item });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update the alert thresholds.'));
  }
};

const getItem = async (req, res, next) => {
  try {
    const item = await getInventoryForGroup(req.params.bloodGroup);
    if (!item) {
      throw httpError(404, 'No inventory record exists for that blood group.');
    }
    res.json({ success: true, item });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load that inventory record.'));
  }
};

module.exports = {
  listInventory,
  getStats,
  adjustStock,
  setThresholds,
  getItem,
};
