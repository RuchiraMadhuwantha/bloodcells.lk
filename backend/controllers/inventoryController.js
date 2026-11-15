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

const adjustStock = (req,res) => res.status(409).json({success:false,message:'Aggregate stock adjustments are disabled. Record verified batches through /api/bank/inventory so expiry, centre ownership and stock history are preserved.'});

const setThresholds = (req,res) => res.status(409).json({success:false,message:'Update thresholds for an assigned centre through /api/bank/centres/:id/thresholds. Existing aggregate thresholds are retained as fallback configuration.'});

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
