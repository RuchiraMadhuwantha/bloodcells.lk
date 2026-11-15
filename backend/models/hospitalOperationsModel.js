const crypto = require('crypto');
const pool = require('../config/db');
const { toDateString } = require('../utils/date');
const error = (code, message) => Object.assign(new Error(message), { statusCode: code });
const mapBatch = (r) => ({
  id: r.batch_id, reference: r.reference, bloodGroup: r.blood_group, component: r.component,
  quantity: Number(r.quantity), reservedUnits: Number(r.reserved_units),
  availableUnits: r.status === 'usable' && toDateString(r.expiry_date) >= toDateString(new Date()) ? Math.max(0, Number(r.quantity) - Number(r.reserved_units)) : 0,
  collectionDate: toDateString(r.collection_date), expiryDate: toDateString(r.expiry_date),
  status: r.status, level: toDateString(r.expiry_date) < toDateString(new Date()) ? 'Expired' : r.status === 'usable' ? 'Usable' : r.status,
  updatedAt: r.updated_at, version: r.version, locationId: r.location_id, locationName: r.location_name, district: r.district,
});
const batchSelect = 'SELECT b.*, l.name AS location_name, l.district FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id';
const scopeFilters = (hospitalId,filters,dateColumn) => {
  const where=['l.hospital_id=?'];const values=[hospitalId];
  if(filters.bloodGroup){where.push('b.blood_group=?');values.push(filters.bloodGroup);}
  if(filters.start){where.push(dateColumn+'>=?');values.push(filters.start);}
  if(filters.end){where.push(dateColumn+'<=?');values.push(filters.end);}
  return {where:where.join(' AND '),values};
};
const getStock = async (hospitalId, executor = pool, filters = {}) => {
  const f=scopeFilters(hospitalId,filters,'b.collection_date');
  const limit=filters.maxRows ? ' LIMIT '+Number(filters.maxRows) : '';
  const [rows] = await executor.query(batchSelect + ' WHERE '+f.where+' ORDER BY b.expiry_date,b.batch_id'+limit, f.values);
  return rows.map(mapBatch);
};
const getBatch = async (hospitalId, id, executor = pool) => {
  const [rows] = await executor.query(batchSelect + ' WHERE l.hospital_id=? AND b.batch_id=?', [hospitalId, id]);
  return rows[0] ? mapBatch(rows[0]) : null;
};
const usageSelect = `SELECT u.*, b.blood_group, b.reference AS batch_reference FROM hospital_blood_usage u JOIN stock_batches b ON b.batch_id=u.batch_id`;
const mapUsage = (r) => ({ id: r.usage_id, reference: 'HU-' + r.usage_id, batchId: r.batch_id, batchReference: r.batch_reference,
  bloodGroup: r.blood_group, quantity: Number(r.quantity), usageDate: toDateString(r.usage_date),
  category: r.category, notes: r.notes, requestId: r.request_id, requestReference: r.request_id ? 'BR-' + String(r.request_id).padStart(5,'0') : null, createdAt: r.created_at });
const getUsage = async (hospitalId, executor = pool, filters = {}) => {
  const where=['u.hospital_id=?'];const values=[hospitalId];
  if(filters.bloodGroup){where.push('b.blood_group=?');values.push(filters.bloodGroup);}
  if(filters.start){where.push('u.usage_date>=?');values.push(filters.start);}
  if(filters.end){where.push('u.usage_date<=?');values.push(filters.end);}
  const limit=filters.maxRows ? ' LIMIT '+Number(filters.maxRows) : '';
  const [rows] = await executor.query(usageSelect+' WHERE '+where.join(' AND ')+' ORDER BY u.usage_date DESC,u.usage_id DESC'+limit, values);
  return rows.map(mapUsage);
};
const hashPayload = (data) => crypto.createHash('sha256').update(JSON.stringify(Object.keys(data).sort().map(k => [k,data[k]]))).digest('hex');
// Serializing on the hospital parent row gives durable retry protection, including
// simultaneous identical requests. The key/result and mutation commit together.
const runOperation = async ({ hospitalId, operation, key, payload }, work) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [owners] = await conn.query(`SELECT h.hospital_id FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE h.hospital_id=? AND u.account_status='active' AND u.role='hospital' FOR UPDATE`, [hospitalId]);
    if (!owners.length) throw error(403, 'Active hospital access is required.');
    const digest = hashPayload(payload);
    const [existing] = await conn.query('SELECT payload_hash,result_id FROM hospital_operation_keys WHERE hospital_id=? AND operation=? AND idempotency_key=?', [hospitalId,operation,key]);
    if (existing.length) {
      if (existing[0].payload_hash !== digest) throw error(409, 'This submission key was already used with different data.');
      await conn.commit();
      return { id: existing[0].result_id, replayed: true };
    }
    const id = await work(conn);
    await conn.query('INSERT INTO hospital_operation_keys (hospital_id,operation,idempotency_key,payload_hash,result_id) VALUES (?,?,?,?,?)', [hospitalId,operation,key,digest,id]);
    await conn.commit();
    return { id, replayed: false };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};
const movement = (c, hospitalId, batchId, delta, after, reason, actor, usageId = null) => c.query(
  'INSERT INTO stock_movements (hospital_id,batch_id,quantity_delta,quantity_after,reason,actor_user_id,usage_id) VALUES (?,?,?,?,?,?,?)',
  [hospitalId,batchId,delta,after,reason,actor,usageId]);
const createBatch = (hospital, actor, data, key) => runOperation({ hospitalId: hospital.hospitalId, operation: 'batch-create', key, payload: data }, async c => {
  await c.query(`INSERT INTO stock_locations (hospital_id,name,district,kind) VALUES (?,?,?,'hospital') ON DUPLICATE KEY UPDATE hospital_id=VALUES(hospital_id)`, [hospital.hospitalId,hospital.hospitalName,hospital.district]);
  const [locations] = await c.query('SELECT location_id FROM stock_locations WHERE hospital_id=?', [hospital.hospitalId]);
  const [result] = await c.query('INSERT INTO stock_batches (location_id,reference,blood_group,component,quantity,reserved_units,collection_date,expiry_date,status) VALUES (?,?,?,?,?,?,?,?,?)',
    [locations[0].location_id,data.reference,data.bloodGroup,data.component,data.quantity,data.reservedUnits || 0,data.collectionDate,data.expiryDate,data.status || 'usable']);
  await movement(c,hospital.hospitalId,result.insertId,data.quantity,data.quantity,data.reason,actor);
  return result.insertId;
});
const updateBatch = (hospitalId, actor, id, data, key) => runOperation({ hospitalId, operation: 'batch-update', key, payload: { id,...data } }, async c => {
  const [rows] = await c.query(batchSelect + ' WHERE l.hospital_id=? AND b.batch_id=? FOR UPDATE', [hospitalId,id]);
  if (!rows.length) throw error(404,'Hospital stock record not found.');
  const r = rows[0];
  if (Number(data.version) !== r.version) throw error(409,'Stock changed. Refresh before updating.');
  if (data.quantity < data.reservedUnits) throw error(400,'Reserved quantity cannot exceed stock.');
  if (data.status==='usable' && toDateString(r.expiry_date)<toDateString(new Date())) throw error(409,'Expired stock cannot be marked usable.');
  if (r.status === 'discarded') throw error(409,'Discarded stock cannot be edited.');
  await c.query('UPDATE stock_batches SET quantity=?,reserved_units=?,status=?,version=version+1 WHERE batch_id=?', [data.quantity,data.reservedUnits,data.status,id]);
  await movement(c,hospitalId,id,data.quantity-r.quantity,data.quantity,data.reason,actor);
  return id;
});
const recordUsage = (hospitalId, actor, data, key) => runOperation({ hospitalId, operation: 'usage', key, payload: data }, async c => {
  const [rows] = await c.query(batchSelect + ' WHERE l.hospital_id=? AND b.batch_id=? FOR UPDATE', [hospitalId,data.batchId]);
  if (!rows.length) throw error(404,'Hospital stock record not found.');
  const b = rows[0];
  if (b.blood_group !== data.bloodGroup) throw error(400,'Blood group must match the selected stock batch.');
  if (b.status !== 'usable' || toDateString(b.expiry_date) < toDateString(new Date()) || data.usageDate > toDateString(b.expiry_date) || data.usageDate < toDateString(b.collection_date)) throw error(409,'The batch is not usable for this usage date.');
  if (Number(b.quantity)-Number(b.reserved_units) < data.quantity) throw error(409,'Insufficient unreserved hospital stock.');
  if (data.requestId) {
    const [requests] = await c.query('SELECT request_id,blood_group FROM blood_requests WHERE request_id=? AND hospital_id=?', [data.requestId,hospitalId]);
    if (!requests.length) throw error(404,'Related hospital request not found.');
    if (requests[0].blood_group !== data.bloodGroup) throw error(400,'Related request blood group does not match.');
  }
  const [result] = await c.query('INSERT INTO hospital_blood_usage (hospital_id,batch_id,request_id,quantity,usage_date,category,notes,created_by_user_id) VALUES (?,?,?,?,?,?,?,?)',
    [hospitalId,data.batchId,data.requestId || null,data.quantity,data.usageDate,data.category,data.notes || null,actor]);
  await c.query('UPDATE stock_batches SET quantity=quantity-?,version=version+1 WHERE batch_id=?', [data.quantity,data.batchId]);
  await movement(c,hospitalId,data.batchId,-data.quantity,Number(b.quantity)-data.quantity,'Recorded usage: ' + data.category,actor,result.insertId);
  return result.insertId;
});
const getChanges = async hospitalId => {
  const [rows] = await pool.query('SELECT m.movement_id AS id,m.batch_id AS batchId,m.quantity_delta AS quantityDelta,m.quantity_after AS quantityAfter,m.reason,m.created_at AS createdAt FROM stock_movements m WHERE m.hospital_id=? ORDER BY m.movement_id DESC LIMIT 1000',[hospitalId]);
  return rows;
};
const getAvailability = async filters => {
  const conditions = ["l.kind='blood_bank'",'l.active=1',"b.status='usable'",'b.expiry_date>=CURDATE()','b.quantity>b.reserved_units'];
  const values = [];
  for (const [key,column] of [['bloodGroup','b.blood_group'],['district','l.district'],['centreId','l.location_id']]) if (filters[key]) { conditions.push(column+'=?'); values.push(filters[key]); }
  const [rows] = await pool.query(`SELECT l.location_id AS id,l.name AS centreName,l.district,b.blood_group AS bloodGroup,SUM(b.quantity-b.reserved_units) AS availableUnits,MAX(b.updated_at) AS updatedAt FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id WHERE ${conditions.join(' AND ')} GROUP BY l.location_id,l.name,l.district,b.blood_group ORDER BY l.name,b.blood_group`,values);
  return rows.map(r=>({...r,availableUnits:Number(r.availableUnits),level:'Usable recorded stock'}));
};
module.exports = { getStock,getBatch,getUsage,getChanges,getAvailability,createBatch,updateBatch,recordUsage,runOperation,mapBatch,error };
