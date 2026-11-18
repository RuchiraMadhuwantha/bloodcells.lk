const crypto = require('crypto');
const pool = require('../config/db');
const { toDateString } = require('../utils/date');
const { mapBatch } = require('./hospitalOperationsModel');
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const transaction = async work => {
  const c = await pool.getConnection();
  try { await c.beginTransaction(); const result = await work(c); await c.commit(); return result; }
  catch (e) { await c.rollback(); throw e; } finally { c.release(); }
};
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const mutate = (actor, operation, key, payload, work) => transaction(async c => {
  const [users] = await c.query("SELECT user_id FROM users WHERE user_id=? AND role='blood_bank' AND account_status='active' FOR UPDATE", [actor]);
  if (!users.length) throw fail(403, 'Active blood bank access required.');
  const hash = crypto.createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex');
  const [prior] = await c.query('SELECT payload_hash,result_json FROM bank_operations WHERE actor_user_id=? AND operation=? AND idempotency_key=?', [actor, operation, key]);
  if (prior.length) {
    if (prior[0].payload_hash !== hash) throw fail(409, 'Submission key already used with different data.');
    return { ...(typeof prior[0].result_json === 'string' ? JSON.parse(prior[0].result_json) : prior[0].result_json), replayed: true };
  }
  const result = await work(c);
  await c.query('INSERT INTO bank_operations (actor_user_id,operation,idempotency_key,payload_hash,result_json) VALUES (?,?,?,?,?)', [actor, operation, key, hash, JSON.stringify(result)]);
  return { ...result, replayed: false };
});
const audit = (c, actor, event, location, batch, entity, details) => c.query('INSERT INTO bank_audit (actor_user_id,event,location_id,batch_id,entity_id,details) VALUES (?,?,?,?,?,?)', [actor, event, location || null, batch || null, entity || null, JSON.stringify(details)]);
const authorize = async (c, actor, location) => {
  const [rows] = await c.query("SELECT l.* FROM stock_locations l JOIN bank_location_access a ON a.location_id=l.location_id WHERE a.user_id=? AND l.location_id=? AND l.kind='blood_bank' AND l.active=1 FOR UPDATE", [actor, location]);
  if (!rows.length) throw fail(403, 'You are not assigned to this active blood centre.');
  return rows[0];
};
const selectBatch = 'SELECT b.*,CURDATE() AS database_today,l.name AS location_name,l.district FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id';
const lockBatch = async (c, actor, id) => {
  const [found] = await c.query(selectBatch + " JOIN bank_location_access a ON a.location_id=l.location_id WHERE b.batch_id=? AND a.user_id=? AND l.kind='blood_bank' AND l.active=1 FOR UPDATE", [id, actor]);
  if (!found.length) throw fail(404, 'Assigned blood centre packet not found.');
  return found[0];
};
const usable = (batch, quantity, reserved = false) => {
  if (batch.status !== 'usable' || toDateString(batch.expiry_date) < (batch.database_today || toDateString(new Date()))) throw fail(409, 'Packet is expired or unavailable.');
  if (Number(batch.quantity) - (reserved ? 0 : Number(batch.reserved_units)) < quantity) throw fail(409, 'There are not enough available blood units for this action.');
};
const centres = async (actor, directory = false) => {
  if(directory){
    const [rows]=await pool.query(`SELECT l.location_id AS id,l.name,l.district,l.kind,l.hospital_id AS hospitalId,NULL AS assignedUserId
      FROM stock_locations l WHERE l.active=1 AND (l.kind='blood_bank' OR (l.kind='hospital' AND EXISTS (
        SELECT 1 FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE h.hospital_id=l.hospital_id AND u.role='hospital' AND u.account_status='active'
      ))) ORDER BY l.name`);
    return rows;
  }
  const [rows] = await pool.query("SELECT l.location_id AS id,l.name,l.district," + (directory ? 'NULL' : 'a.user_id') + " AS assignedUserId FROM stock_locations l " + (directory ? '' : 'JOIN bank_location_access a ON a.location_id=l.location_id ') + "WHERE l.kind='blood_bank' AND l.active=1 " + (directory ? '' : 'AND a.user_id=? ') + 'ORDER BY l.name', directory ? [] : [actor]);
  return rows;
};
const createCentre = (actor, data, key) => mutate(actor, 'centre-create', key, data, async c => {
  const [r] = await c.query("INSERT INTO stock_locations (name,district,kind) VALUES (?,?,'blood_bank')", [data.name,data.district]);
  await c.query('INSERT INTO bank_location_access (user_id,location_id) VALUES (?,?)', [actor,r.insertId]);
  await audit(c,actor,'centre-created',r.insertId,null,null,data);
  return { id:r.insertId };
});
const batches = async (actor, filters = {}, c = pool) => {
  const where = ["l.kind='blood_bank'",'l.active=1','a.user_id=?']; const values = [actor];
  for (const [k,col] of [['id','b.batch_id'],['bloodGroup','b.blood_group'],['centreId','l.location_id'],['district','l.district'],['status','b.status']]) if (filters[k]) { where.push(col+'=?'); values.push(filters[k]); }
  if (filters.start) { where.push((filters.dateField==='expiry'?'b.expiry_date':'b.collection_date')+'>=?'); values.push(filters.start); }
  if (filters.end) { where.push((filters.dateField==='expiry'?'b.expiry_date':'b.collection_date')+'<=?'); values.push(filters.end); }
  const [rows] = await c.query(selectBatch + ' JOIN bank_location_access a ON a.location_id=l.location_id WHERE '+where.join(' AND ')+' ORDER BY b.expiry_date,b.batch_id LIMIT 10001',values);
  if (rows.length > 10000) throw fail(413,'More than 10000 packets. Narrow the filters.');
  return rows.map(r => {const today=r.database_today || toDateString(new Date());const end=new Date(today+'T12:00:00');end.setDate(end.getDate()+7);return {...mapBatch(r),availableUnits:r.status==='usable'&&toDateString(r.expiry_date)>=today?Math.max(0,Number(r.quantity)-Number(r.reserved_units)):0,storageLocation:r.location_name,level:toDateString(r.expiry_date)<today?'Expired':r.status==='usable'?'Usable':r.status,expiryStatus:toDateString(r.expiry_date)<today?'expired':toDateString(r.expiry_date)<=toDateString(end)?'expiring':'current'};});
};
const createBatch = (actor, data, key) => mutate(actor,'batch-create',key,data,async c => {
  await authorize(c,actor,data.locationId);
  if(data.volumeMl!=null&&((data.quantity===0&&data.volumeMl!==0)||(data.quantity>0&&data.volumeMl<=0)))throw fail(400,'Volume must match recorded quantity.');
  const [r] = await c.query('INSERT INTO stock_batches (location_id,reference,blood_group,component,quantity,reserved_units,collection_date,expiry_date,status) VALUES (?,?,?,?,?,0,?,?,?)',[data.locationId,data.reference,data.bloodGroup,data.component,data.quantity,data.collectionDate,data.expiryDate,data.status || 'usable']);
  if(data.volumeMl!=null)await c.query('UPDATE stock_batches SET volume_ml=? WHERE batch_id=?',[data.volumeMl,r.insertId]);
  await audit(c,actor,'batch-receipt',data.locationId,r.insertId,null,{delta:data.quantity,after:data.quantity,reason:data.reason});
  return {id:r.insertId};
});
const updateBatch = (actor,id,data,key) => mutate(actor,'batch-update',key,{id,...data},async c => {
  const b = await lockBatch(c,actor,id);
  if (b.version !== data.version) throw fail(409,'Packet changed. Refresh first.');
  if (b.status === 'discarded') throw fail(409,'Discarded packet is immutable.');
  if (data.quantity < Number(b.reserved_units)) throw fail(409,'Quantity is below committed reservations.');
  if (Number(b.reserved_units)>0 && data.status!=='usable') throw fail(409,'Release reservations before quarantine or disposal.');
  if (data.status==='usable' && toDateString(b.expiry_date)<(b.database_today || toDateString(new Date()))) throw fail(409,'Expired stock cannot be marked usable.');
  if(b.volume_ml!=null&&Number(b.quantity)!==data.quantity&&data.volumeMl==null)throw fail(400,'Enter the actual updated volume when adjusting units.');
  if(data.volumeMl!=null&&((data.quantity===0&&data.volumeMl!==0)||(data.quantity>0&&data.volumeMl<=0)))throw fail(400,'Volume must match recorded quantity.');
  await c.query('UPDATE stock_batches SET quantity=?,status=?,version=version+1 WHERE batch_id=?',[data.quantity,data.status,id]);
  if(data.volumeMl!=null)await c.query('UPDATE stock_batches SET volume_ml=? WHERE batch_id=?',[data.volumeMl,id]);
  await audit(c,actor,'batch-adjustment',b.location_id,id,null,{delta:data.quantity-Number(b.quantity),after:data.quantity,fromStatus:b.status,status:data.status,reason:data.reason});
  return {id};
});
const regional = async (actor, filters = {}) => {
  const where=["l.kind='blood_bank'",'l.active=1','a.user_id=?'];const values=[actor];
  for(const [k,col] of [['centreId','l.location_id'],['district','l.district'],['bloodGroup','g.blood_group']]) if(filters[k]){where.push(col+'=?');values.push(filters[k]);}
  const [rows]=await pool.query(`SELECT l.location_id,l.name AS centreName,l.district,g.blood_group AS bloodGroup,COALESCE(th.low_threshold,g.low_stock_threshold) AS lowStockThreshold,COALESCE(th.critical_threshold,g.critical_stock_threshold) AS criticalStockThreshold,
    COALESCE(SUM(CASE WHEN b.status='usable' AND b.expiry_date>=CURDATE() THEN b.quantity-b.reserved_units ELSE 0 END),0) AS availableUnits,
    COALESCE(SUM(b.reserved_units),0) AS reservedUnits,MAX(b.updated_at) AS updatedAt
    FROM stock_locations l JOIN bank_location_access a ON a.location_id=l.location_id CROSS JOIN blood_inventory g
    LEFT JOIN bank_stock_thresholds th ON th.location_id=l.location_id AND th.blood_group COLLATE utf8mb4_unicode_ci=g.blood_group COLLATE utf8mb4_unicode_ci
    LEFT JOIN stock_batches b ON b.location_id=l.location_id AND b.blood_group COLLATE utf8mb4_unicode_ci=g.blood_group COLLATE utf8mb4_unicode_ci
    WHERE ${where.join(' AND ')} GROUP BY l.location_id,l.name,l.district,g.blood_group,g.low_stock_threshold,g.critical_stock_threshold,th.low_threshold,th.critical_threshold ORDER BY l.name,g.blood_group`,values);
  return rows.map(r=>({...r,id:r.location_id+'-'+r.bloodGroup,locationId:r.location_id,availableUnits:Number(r.availableUnits),reservedUnits:Number(r.reservedUnits),level:Number(r.availableUnits)<=Number(r.criticalStockThreshold)?'Critical':Number(r.availableUnits)<=Number(r.lowStockThreshold)?'Low':'Available',thresholdScope:'Existing configured group thresholds, operational comparison only'}));
};
const history = async (actor, batchId) => {
  const [rows] = await pool.query('SELECT e.audit_id AS id,e.event,e.batch_id AS batchId,e.entity_id AS entityId,e.details,e.created_at AS createdAt FROM bank_audit e JOIN bank_location_access a ON a.location_id=e.location_id WHERE a.user_id=?'+(batchId?' AND e.batch_id=?':'')+' ORDER BY e.audit_id DESC LIMIT 1000',batchId?[actor,batchId]:[actor]);
  return rows;
};
const thresholds=(actor,id,data,key)=>mutate(actor,'centre-thresholds',key,{id,...data},async c=>{
  await authorize(c,actor,id);
  await c.query('INSERT INTO bank_stock_thresholds (location_id,blood_group,low_threshold,critical_threshold) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE low_threshold=VALUES(low_threshold),critical_threshold=VALUES(critical_threshold)',[id,data.bloodGroup,data.lowStockThreshold,data.criticalStockThreshold]);
  await audit(c,actor,'centre-thresholds',id,null,null,data);return {id};
});
const eventHistory=async(actor,event,id)=>{
 const [rows]=await pool.query(`SELECT DISTINCT e.audit_id AS id,e.event,e.details,e.created_at AS createdAt FROM bank_audit e LEFT JOIN bank_location_access a ON a.location_id=e.location_id WHERE e.entity_id=? AND e.event LIKE ? AND (e.location_id IS NULL OR a.user_id=?) ORDER BY e.audit_id DESC LIMIT 1000`,[id,event+'-%',actor]);return rows;
};
module.exports={eventHistory,thresholds,pool,fail,transaction,mutate,audit,authorize,lockBatch,usable,centres,createCentre,batches,createBatch,updateBatch,regional,history};
