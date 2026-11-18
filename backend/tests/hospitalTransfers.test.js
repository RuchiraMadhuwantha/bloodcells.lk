const test=require('node:test');
const assert=require('node:assert/strict');
let connection,read=async()=>[[]];
const pool={getConnection:async()=>connection,query:(...args)=>read(...args)};
require.cache[require.resolve('../config/db')]={id:require.resolve('../config/db'),filename:require.resolve('../config/db'),loaded:true,exports:pool};
const previousMain=process.env.MAIN_BLOOD_BANK_LOCATION_ID;process.env.MAIN_BLOOD_BANK_LOCATION_ID='2';
test.after(()=>{if(previousMain===undefined)delete process.env.MAIN_BLOOD_BANK_LOCATION_ID;else process.env.MAIN_BLOOD_BANK_LOCATION_ID=previousMain;});
const transfers=require('../models/hospitalTransferModel');
const owner={hospitalId:10,hospitalName:'Fixture Hospital'};
const payload={batchId:1,destinationId:2,quantity:3,reason:'Transfer to bank'};
function fixture(options={}){
 const state={quantity:8,transfers:[],movements:[],audits:[],notifications:[],keys:[],commits:0};let snapshot;
 connection={beginTransaction:async()=>{snapshot=JSON.parse(JSON.stringify(state));},commit:async()=>{state.commits++;},rollback:async()=>{Object.assign(state,snapshot);},release:()=>{},query:async(sql,p=[])=>{
  if(sql.startsWith('SELECT h.hospital_id'))return [[{hospital_id:10}]];
  if(sql.startsWith('SELECT payload_hash'))return [state.keys.filter(k=>k.key===p[2]).map(k=>({payload_hash:k.hash,result_id:k.id}))];
  if(sql.startsWith('SELECT b.*,CURDATE()'))return [options.foreign?[]:[{batch_id:1,location_id:5,reference:'TEST-BATCH',blood_group:'O+',component:'Whole blood',quantity:state.quantity,reserved_units:2,status:options.status||'usable',expiry_date:options.expiry||'2099-01-01',database_today:'2026-11-17'}]];
  if(sql.startsWith('SELECT l.location_id')){assert.deepEqual(p,[2]);return [options.invalidDestination?[]:[{location_id:2,name:'Main Blood Bank',district:'Colombo'}]];}
  if(sql.startsWith('UPDATE stock_batches')){if(options.conflict)return [{affectedRows:0}];state.quantity-=p[0];return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO bank_transfers')){state.transfers.push(p);return [{insertId:55}];}
  if(sql.startsWith('INSERT INTO stock_movements')){state.movements.push(p);return [{insertId:1}];}
  if(sql.startsWith('INSERT INTO bank_audit')){if(options.failAudit)throw new Error('audit failed');state.audits.push(p);return [{insertId:1}];}
  if(sql.startsWith('SELECT DISTINCT u.user_id'))return [[{user_id:2}]];
  if(sql.startsWith('INSERT INTO notifications')){if(options.failNotification)throw new Error('notification failed');state.notifications.push(p);return [{insertId:1}];}
  if(sql.startsWith('INSERT INTO hospital_operation_keys')){state.keys.push({key:p[2],hash:p[3],id:p[4]});return [{insertId:1}];}
  throw new Error('Unexpected SQL: '+sql);
 }};return state;
}
test('hospital transfer deducts source once, records transit and notifies receiving bank',async()=>{
 const s=fixture();assert.deepEqual(await transfers.send(owner,1,payload,'transfer-key-001'),{id:55,replayed:false});
 assert.equal(s.quantity,5);assert.equal(s.transfers.length,1);assert.equal(s.movements[0][2],-3);
 assert.equal(s.notifications[0][0],2);assert.equal(s.notifications[0][6],'bank-transfers');
 assert.deepEqual(await transfers.send(owner,1,payload,'transfer-key-001'),{id:55,replayed:true});
 assert.equal(s.quantity,5);assert.equal(s.transfers.length,1);assert.equal(s.notifications.length,1);
 await assert.rejects(transfers.send(owner,1,{...payload,quantity:4},'transfer-key-001'),{statusCode:409});
});
for(const [label,options,body] of [['other hospital',{foreign:true},payload],['expired',{expiry:'2000-01-01'},payload],['quarantined',{status:'quarantined'},payload],['discarded',{status:'discarded'},payload],['reserved stock',{}, {...payload,quantity:7}],['destination unavailable',{invalidDestination:true},payload],['concurrent change',{conflict:true},payload],['audit failure',{failAudit:true},payload],['notification failure',{failNotification:true},payload]])test('transfer rolls back for '+label,async()=>{
 const s=fixture(options);await assert.rejects(transfers.send(owner,1,body,'transfer-key-001'));
 assert.equal(s.quantity,8);assert.equal(s.transfers.length,0);assert.equal(s.notifications.length,0);assert.equal(s.keys.length,0);
});
test('hospital transfer list and details scope by authenticated hospital',async()=>{
 let captured;read=async(sql,values)=>{captured={sql,values};return [[]];};
 await transfers.list(10,55);assert.match(captured.sql,/src.hospital_id=\?/);assert.match(captured.sql,/dst.hospital_id=\?/);assert.deepEqual(captured.values,[10,10,10,55]);
});

function receiptFixture(options={}){
 const s={status:options.status||'dispatched',batches:[],movements:[],notifications:[],keys:[]};let snapshot;
 connection={beginTransaction:async()=>{snapshot=JSON.parse(JSON.stringify(s));},commit:async()=>{},rollback:async()=>Object.assign(s,snapshot),release:()=>{},query:async(sql,p=[])=>{
  if(sql.startsWith('SELECT h.hospital_id'))return [[{hospital_id:10}]];
  if(sql.startsWith('SELECT payload_hash'))return [s.keys.filter(k=>k.key===p[2]).map(k=>({payload_hash:k.hash,result_id:k.id}))];
  if(sql.startsWith('SELECT t.*')){assert.deepEqual(p,[55,10]);return [options.foreign?[]:[{transfer_id:55,source_location_id:2,destination_location_id:5,source_batch_id:1,quantity:3,status:s.status}]];}
  if(sql.startsWith('SELECT *,CURDATE()'))return [[{batch_id:1,blood_group:'O+',component:'Whole blood',collection_date:'2026-11-10',expiry_date:options.expired?'2000-01-01':'2099-01-01',status:'usable',database_today:'2026-11-17'}]];
  if(sql.startsWith('INSERT INTO stock_batches')){s.batches.push(p);return [{insertId:99}];}
  if(sql.startsWith('INSERT INTO stock_movements')){s.movements.push(p);return [{insertId:1}];}
  if(sql.startsWith('UPDATE bank_transfers')){s.status='received';return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO bank_audit')){if(options.failAudit)throw new Error('audit failed');return [{insertId:1}];}
  if(sql.startsWith('SELECT DISTINCT u.user_id'))return [[{user_id:2}]];
  if(sql.startsWith('INSERT INTO notifications')){s.notifications.push(p);return [{insertId:1}];}
  if(sql.startsWith('INSERT INTO hospital_operation_keys')){s.keys.push({key:p[2],hash:p[3],id:p[4]});return [{insertId:1}];}
  throw new Error('Unexpected receipt SQL: '+sql);
 }};return s;
}
const receiving={accepted:true,note:'Receiving checks completed'};
test('hospital receipt creates stock once and notifies sending bank',async()=>{
 const s=receiptFixture();await transfers.receive(owner,1,55,receiving,'receipt-key-001');
 assert.equal(s.status,'received');assert.equal(s.batches[0][4],3);assert.equal(s.batches[0][7],'usable');
 assert.equal(s.movements[0][2],3);assert.equal(s.notifications[0][0],2);
 assert.equal((await transfers.receive(owner,1,55,receiving,'receipt-key-001')).replayed,true);
 assert.equal(s.batches.length,1);assert.equal(s.notifications.length,1);
 await assert.rejects(transfers.receive(owner,1,55,receiving,'receipt-key-002'),{statusCode:409});
});
for(const options of [{foreign:true},{status:'requested'},{status:'received'},{failAudit:true}])test('invalid or failed incoming receipt rolls back '+JSON.stringify(options),async()=>{
 const s=receiptFixture(options);await assert.rejects(transfers.receive(owner,1,55,receiving,'receipt-key-001'));
 assert.equal(s.status,options.status||'dispatched');assert.equal(s.batches.length,0);assert.equal(s.notifications.length,0);
});
for(const scenario of [{expired:true,accepted:true},{accepted:false}])test('expired or unchecked receipts are quarantined '+JSON.stringify(scenario),async()=>{
 const s=receiptFixture(scenario);await transfers.receive(owner,1,55,{...receiving,accepted:scenario.accepted},'receipt-key-001');
 assert.equal(s.batches[0][7],'quarantined');
});

test('all hospitals send to the configured main bank without a client destination',async()=>{
 const s=fixture();const {destinationId,...body}=payload;await transfers.send({...owner,district:'Kandy'},1,body,'automatic-main-bank');
 assert.equal(s.transfers[0][1],2);assert.equal(s.audits[0][2],2);assert.equal(s.quantity,5);
});
test('a client cannot redirect a hospital transfer to a regional bank',async()=>{
 const s=fixture();await assert.rejects(transfers.send(owner,1,{...payload,destinationId:3},'regional-bank-attempt'),{statusCode:400});
 assert.equal(s.quantity,8);assert.equal(s.transfers.length,0);assert.equal(s.notifications.length,0);
});
test('missing main bank configuration blocks sending without changing stock',async()=>{
 const s=fixture();delete process.env.MAIN_BLOOD_BANK_LOCATION_ID;try{await assert.rejects(transfers.send(owner,1,payload,'no-main-bank'),{statusCode:503});assert.equal(s.quantity,8);assert.equal(s.transfers.length,0);}finally{process.env.MAIN_BLOOD_BANK_LOCATION_ID='2';}
});
test('the hospital destination list exposes only the configured main bank',async()=>{
 let query;read=async(sql,values)=>{query={sql,values};return [[{location_id:2,name:'Main Blood Bank',district:'Colombo'}]];};
 assert.deepEqual(await transfers.destinations(),[{id:2,name:'Main Blood Bank',district:'Colombo',isMain:true}]);assert.deepEqual(query.values,[2]);assert.match(query.sql,/account_status='active'/);assert.doesNotMatch(query.sql,/ORDER BY l.name/);
});
