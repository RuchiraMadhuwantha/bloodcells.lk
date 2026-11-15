const { body,param,query,header } = require('express-validator');
const { BLOOD_GROUPS } = require('./common');
const { toDateString } = require('../utils/date');
const date = (chain) => chain.isDate({ format:'YYYY-MM-DD',strictMode:true }).withMessage('Enter a valid date as YYYY-MM-DD.');
const id = [param('id').isInt({min:1}).toInt()];
const key = [header('Idempotency-Key').matches(/^[A-Za-z0-9_-]{8,100}$/).withMessage('A valid Idempotency-Key is required.')];
const range = [
  query('bloodGroup').optional().isIn(BLOOD_GROUPS),
  date(query('start').optional()), date(query('end').optional()),
  query('end').optional().custom((v,{req})=>!req.query.start || v>=req.query.start).withMessage('End date must follow start date.'),
  query('page').optional().isInt({min:1,max:100000}).toInt(), query('limit').optional().isInt({min:1,max:1000}).toInt(),
];
const requestFilters = [...range, query('status').optional().isIn(['pending','approved','rejected','fulfilled','cancelled']),query('urgency').optional().isIn(['normal','urgent','emergency']),query('sort').optional().isIn(['newest','required','priority'])];
const amounts = [
  body('quantity').isInt({min:0,max:100000}).toInt(),
  body('reservedUnits').optional().isInt({min:0,max:100000}).toInt(),
  body('reservedUnits').optional().custom((v,{req})=>Number(v)<=Number(req.body.quantity)).withMessage('Reserved units cannot exceed stock.'),
  body('reason').trim().isLength({min:1,max:500}),
  body('status').optional().isIn(['usable','quarantined','discarded']),
];
const createStock = [...key,...amounts,
  body('reference').trim().isLength({min:1,max:100}),body('component').trim().isLength({min:1,max:100}),body('bloodGroup').isIn(BLOOD_GROUPS),
  date(body('collectionDate')).custom(v=>v<=toDateString(new Date())).withMessage('Collection date cannot be in the future.'),
  date(body('expiryDate')).custom((v,{req})=>v>=req.body.collectionDate && (req.body.status && req.body.status!=='usable' || v>=toDateString(new Date()))).withMessage('Check expiry and usable status.'),
];
const updateStock = [...id,...key,...amounts,body('reservedUnits').exists(),body('status').exists(),body('version').isInt({min:1}).toInt()];
const createUsage = [...key,
  body('batchId').isInt({min:1}).toInt(),body('bloodGroup').isIn(BLOOD_GROUPS),body('quantity').isInt({min:1,max:100000}).toInt(),
  date(body('usageDate')).custom(v=>v<=toDateString(new Date())).withMessage('Usage date cannot be in the future.'),
  body('category').trim().isLength({min:1,max:100}),body('notes').optional({values:'falsy'}).trim().isLength({max:1000}),
  body('requestId').optional({values:'falsy'}).isInt({min:1}).toInt(),
];
const availability = [query('bloodGroup').optional().isIn(BLOOD_GROUPS),query('district').optional().trim().isLength({max:100}),query('centreId').optional().isInt({min:1}).toInt()];
const report = [...range,query('type').isIn(['requests','fulfillment','inventory','usage']),query('status').optional().isIn(['pending','approved','rejected','fulfilled','cancelled']),query('format').optional().isIn(['json','csv','pdf'])];
const profile = [
  ...['hospitalName','hospitalType','district','address','contactNumber','contactPersonName','contactPersonDesignation','contactPersonPhone','contactPersonEmail'].map(field=>body(field).optional().isString().trim().isLength({max:({address:1000,hospitalName:150,contactNumber:20,contactPersonPhone:20})[field] || 100})),
  body('hospitalName').optional().notEmpty(),body('contactPersonEmail').optional({values:'falsy'}).isEmail(),
  body().custom(value=>Object.keys(value).length>0 && Object.keys(value).every(k=>['hospitalName','hospitalType','district','address','contactNumber','contactPersonName','contactPersonDesignation','contactPersonPhone','contactPersonEmail'].includes(k))).withMessage('Only hospital contact/profile fields can be updated.'),
];
module.exports = { id,key,range,requestFilters,createStock,updateStock,createUsage,availability,report,profile };
