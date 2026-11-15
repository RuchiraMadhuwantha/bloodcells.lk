const express = require('express');
const {
  listHospitals,
  listActiveHospitals,
  getPendingHospitalCount,
  hospitalStats,
  myHospital,
  approve,
  reject,
  reviewAgain,
} = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();

/* Public-safe read paths (any signed-in role). */
router.get('/active', authMiddleware, listActiveHospitals);
router.get('/mine', authMiddleware, allowRoles('hospital'), myHospital);

/* Blood bank only. */
router.get('/', authMiddleware, allowRoles('blood_bank'),[require('express-validator').query('status').optional().isIn(['pending','active','inactive','suspended']),require('express-validator').query('search').optional().isString().isLength({max:100}),require('express-validator').query('district').optional().isString().isLength({max:100})],require('../validators/common').handleValidationErrors,listHospitals);
router.get('/stats', authMiddleware, allowRoles('blood_bank'), hospitalStats);
router.get('/pending-count', authMiddleware, allowRoles('blood_bank'), getPendingHospitalCount);
router.get('/:userId',authMiddleware,allowRoles('blood_bank'),require('express-validator').param('userId').isInt({min:1}),require('../validators/common').handleValidationErrors,async(req,res,next)=>{
  try{const hospital=await require('../models/hospitalModel').getHospitalByUserId(Number(req.params.userId));if(!hospital)return res.status(404).json({success:false,message:'Hospital not found.'});res.json({success:true,hospital});}catch(e){next(e);}
});
router.put('/:userId/approve', authMiddleware, allowRoles('blood_bank'), approve);
router.put('/:userId/reject', authMiddleware, allowRoles('blood_bank'), reject);
router.put('/:userId/review-again', authMiddleware, allowRoles('blood_bank'), reviewAgain);

module.exports = router;
