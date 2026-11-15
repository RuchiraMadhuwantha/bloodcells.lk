const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
process.env.JWT_SECRET='isolated-hospital-test-secret';
let queryHandler=async()=>[[]],connection;
const pool={query:(...args)=>queryHandler(...args),getConnection:async()=>connection};
require.cache[require.resolve('../config/db')]={id:require.resolve('../config/db'),filename:require.resolve('../config/db'),loaded:true,exports:pool};
const model=require('../models/hospitalOperationsModel');
const requests=require('../models/bloodRequestModel');
const auth=require('../middleware/authMiddleware');
const roles=require('../middleware/roleMiddleware');
const errorMiddleware=require('../middleware/errorMiddleware');
const reports=require('../utils/hospitalReports');
const app=express();app.use(express.json());
app.use('/hospitals/mine',require('../routes/hospitalOperationsRoutes'));
app.use('/requests',require('../routes/bloodRequestRoutes'));
app.use('/auth',require('../routes/authRoutes'));
app.use('/hospitals',require('../routes/hospitalRoutes'));app.use(errorMiddleware);
let server,base;
test.before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
test.after(()=>new Promise(r=>server.close(r)));
const hospitalRow={hospital_id:10,user_id:1,hospital_name:'Fixture Hospital',hospital_code:'FIX',account_status:'active'};
const requestRow={request_id:5,hospital_id:10,quantity:3,blood_group:'O+',urgency:'emergency',status:'pending',created_at:'2026-01-01',hospital_name:'Fixture Hospital'};
const token=(id=1)=>jwt.sign({user_id:id},process.env.JWT_SECRET);
const get=async(path,t)=>{const r=await fetch(base+path,{headers:t?{Authorization:'Bearer '+t}:{}});return {status:r.status,data:await r.json()};};
const post=async(path,body,t=token(),key)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
test.beforeEach(()=>{
  queryHandler=async(sql,values=[])=>{
    if(sql.includes('SELECT user_id, username, role'))return [[{user_id:values[0],username:'fixture',role:values[0]===2?'blood_bank':'hospital',account_status:'active'}]];
    if(sql.includes('FROM hospitals h')&&sql.includes('WHERE h.user_id'))return [[{...hospitalRow,user_id:values[0],hospital_id:values[0]===3?30:10}]];
    if(sql.includes('FROM blood_requests br'))return [[requestRow]];
    if(sql.includes('COUNT(*) AS cnt'))return [[{status:'pending',cnt:1}]];
    return [[]];
  };
});
for(const path of ['/hospitals/mine/inventory','/hospitals/mine/blood-usage','/hospitals/mine/reports?type=requests']){
  test('missing JWT blocks '+path,async()=>assert.equal((await get(path)).status,401));
  test('bank role cannot use hospital private '+path,async()=>assert.equal((await get(path,token(2))).status,403));
}
test('invalid JWT is rejected',async()=>assert.equal((await get('/hospitals/mine/inventory','invalid')).status,401));
for(const status of ['pending','inactive','suspended']){
  test(status+' hospital cannot access protected data',async()=>{
    queryHandler=async()=>[[{user_id:1,role:'hospital',account_status:status}]];
    assert.equal((await get('/hospitals/mine/inventory',token())).status,403);
  });
}
test('approved hospital request counts are scoped to its own hospital',async()=>{
  const original=queryHandler;let countValues;
  queryHandler=async(sql,values)=>{if(sql.includes('COUNT(*) AS cnt'))countValues=values;return original(sql,values);};
  const result=await get('/requests/mine',token());
  assert.equal(result.status,200);assert.deepEqual(countValues,[10]);assert.equal(result.data.counts.pending,1);
});
test('cross-hospital request details are hidden',async()=>assert.equal((await get('/requests/mine/5',token(3))).status,404));
test('own request details are returned',async()=>assert.equal((await get('/requests/mine/5',token())).data.request.reference,'BR-00005'));
for(const body of [{blood_group:'X',quantity:1},{blood_group:'O+',quantity:0},{blood_group:'O+',quantity:1.5},{blood_group:'O+',quantity:1,required_date:'2000-01-01'},{blood_group:'O+',quantity:1,required_date:'2026-02-30'}]){
  test('invalid request payload '+JSON.stringify(body),async()=>assert.equal((await post('/requests',body)).status,400));
}
test('hospital role cannot approve hospital accounts',async()=>{
  const a=express();a.use(auth,roles('blood_bank'));a.put('/approve',(req,res)=>res.json({success:true}));
  const s=a.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));
  try{assert.equal((await fetch('http://127.0.0.1:'+s.address().port+'/approve',{method:'PUT',headers:{Authorization:'Bearer '+token()}})).status,403);}finally{await new Promise(r=>s.close(r));}
});
test('missing hospital migration returns 503 without pretending empty stock',async()=>{
  const original=queryHandler;queryHandler=async(sql,values)=>{if(sql.includes('FROM stock_batches'))throw Object.assign(new Error('private SQL'),{code:'ER_NO_SUCH_TABLE'});return original(sql,values);};
  const result=await get('/hospitals/mine/inventory',token());assert.equal(result.status,503);assert.match(result.data.message,/migration/);assert.doesNotMatch(result.data.message,/private SQL/);
});
test('invalid usage rejects before any inventory write',async()=>{
  const r=await post('/hospitals/mine/blood-usage',{batchId:1,bloodGroup:'O+',quantity:-1,usageDate:'2026-01-01',category:'Test'},token(),'test-key-1234');
  assert.equal(r.status,400);
});
const today=()=>require('../utils/date').toDateString(new Date());
function transactionFixture({quantity=8,reserved=2,expiry='2099-01-01',status='usable',existing=false,failAudit=false,foreign=false}={}){
  const state={quantity,usage:0,keys:0,commits:0,rollbacks:0,queries:[]};
  let snapshot;
  connection={
    beginTransaction:async()=>{snapshot={quantity:state.quantity,usage:state.usage,keys:state.keys};},
    commit:async()=>{state.commits++;},rollback:async()=>{Object.assign(state,snapshot);state.rollbacks++;},release:()=>{},
    query:async(sql,values=[])=>{
      state.queries.push(sql);
      if(sql.includes('SELECT h.hospital_id'))return [[{hospital_id:10}]];
      if(sql.includes('SELECT payload_hash'))return [existing?[{payload_hash:'different',result_id:1}]:[]];
      if(sql.includes('FROM stock_batches'))return [foreign?[]:[{batch_id:1,blood_group:'O+',quantity:state.quantity,reserved_units:reserved,expiry_date:expiry,collection_date:'2020-01-01',status,version:1}]];
      if(sql.startsWith('INSERT INTO hospital_blood_usage')){state.usage++;return [{insertId:9}];}
      if(sql.startsWith('UPDATE stock_batches SET quantity=quantity-')){state.quantity-=values[0];return [{affectedRows:1}];}
      if(sql.startsWith('INSERT INTO stock_movements')){if(failAudit)throw new Error('audit failed');return [{insertId:1}];}
      if(sql.startsWith('INSERT INTO hospital_operation_keys')){state.keys++;return [{insertId:1}];}
      return [[]];
    },
  };
  return state;
}
const usage={batchId:1,bloodGroup:'O+',quantity:3,usageDate:today(),category:'Fixture operational use'};
test('usage and deduction commit with audit and retry key in one transaction',async()=>{
  const state=transactionFixture();
  assert.deepEqual(await model.recordUsage(10,1,usage,'usage-key-1234'),{id:9,replayed:false});
  assert.equal(state.quantity,5);assert.equal(state.usage,1);assert.equal(state.keys,1);assert.equal(state.commits,1);
  assert.ok(state.queries.some(q=>q.includes('FOR UPDATE')));
});
for(const scenario of [{quantity:3,reserved:2},{expiry:'2000-01-01'},{status:'quarantined'},{status:'discarded'},{foreign:true}]){
  test('unsafe batch usage rolls back '+JSON.stringify(scenario),async()=>{
    const state=transactionFixture(scenario);await assert.rejects(model.recordUsage(10,1,usage,'usage-key-1234'));
    assert.equal(state.usage,0);assert.equal(state.keys,0);assert.equal(state.rollbacks,1);
  });
}
test('audit failure rolls back both usage and stock',async()=>{
  const state=transactionFixture({failAudit:true});await assert.rejects(model.recordUsage(10,1,usage,'usage-key-1234'),/audit failed/);
  assert.equal(state.quantity,8);assert.equal(state.usage,0);assert.equal(state.keys,0);
});
test('reused key with changed payload is rejected',async()=>{
  const state=transactionFixture({existing:true});await assert.rejects(model.recordUsage(10,1,usage,'usage-key-1234'),/different data/);assert.equal(state.quantity,8);
});
test('identical durable retry does not execute mutation twice',async()=>{
  const digest=crypto.createHash('sha256').update(JSON.stringify(Object.keys(usage).sort().map(k=>[k,usage[k]]))).digest('hex');
  const state=transactionFixture();const original=connection.query;
  connection.query=async(sql,values)=>sql.includes('SELECT payload_hash')?[[{payload_hash:digest,result_id:9}]]:original(sql,values);
  assert.deepEqual(await model.recordUsage(10,1,usage,'usage-key-1234'),{id:9,replayed:true});assert.equal(state.quantity,8);assert.equal(state.usage,0);
});
test('expired or quarantined batches have no usable available units',()=>{
  for(const row of [{status:'usable',expiry_date:'2000-01-01'},{status:'quarantined',expiry_date:'2099-01-01'}])assert.equal(model.mapBatch({...row,quantity:10,reserved_units:2}).availableUnits,0);
});
test('availability SQL excludes unusable/reserved stock and parameterizes filters',async()=>{
  let captured;queryHandler=async(sql,values)=>{captured={sql,values};return [[{availableUnits:'4'}]];};
  const result=await model.getAvailability({bloodGroup:'O+',district:'Colombo',centreId:2});
  assert.equal(result[0].availableUnits,4);assert.match(captured.sql,/expiry_date>=CURDATE/);assert.match(captured.sql,/quantity-b.reserved_units/);assert.match(captured.sql,/kind='blood_bank'/);assert.deepEqual(captured.values,['O+','Colombo',2]);
});
test('bank request transitions reject terminal states',async()=>{
  queryHandler=async()=>[[{...requestRow,status:'fulfilled'}]];
  await assert.rejects(requests.updateRequestStatus({requestId:5,newStatus:'approved'}),/cannot be changed/);
});
test('request filter SQL retains priority and own-hospital parameters',async()=>{
  let captured;queryHandler=async(sql,values)=>{captured={sql,values};return [[]];};
  await requests.getRequestsForHospital(10,{bloodGroup:'O+',urgency:'emergency',start:'2026-01-01',end:'2026-01-31'});
  assert.match(captured.sql,/br.hospital_id=\?/);assert.match(captured.sql,/br.required_date ASC/);assert.deepEqual(captured.values,[10,'O+','emergency','2026-01-01','2026-01-31']);
});
test('report totals use all matching records and PDF/CSV contain actual data',async()=>{
  const report=reports.buildHospitalReport({hospitalName:'Fixture Hospital',hospitalCode:'FIX'},[{reference:'HU-1',bloodGroup:'O+',quantity:3,usageDate:'2026-01-01',category:'=unsafe'}],{type:'usage'});
  assert.equal(report.summary['Recorded usage units'],3);assert.match(reports.reportCsv(report),/'=unsafe/);
  const pdf=await reports.reportPdf(report);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>1000);
});
test('approved hospital login returns a real verifiable JWT with no password fields',async()=>{
  const hash=await bcrypt.hash('FixturePassword123',4);
  queryHandler=async()=>[[{user_id:1,username:'fixture',email:'fixture@example.invalid',role:'hospital',account_status:'active',password_hash:hash}]];
  const response=await post('/auth/login',{username:'fixture',password:'FixturePassword123'});
  assert.equal(response.status,200);assert.equal(jwt.verify(response.data.token,process.env.JWT_SECRET).user_id,1);assert.equal(response.data.user.password_hash,undefined);
});
for(const status of ['pending','inactive']){
  test(status+' hospital cannot log in',async()=>{
    const hash=await bcrypt.hash('FixturePassword123',4);
    queryHandler=async()=>[[{role:'hospital',account_status:status,password_hash:hash}]];
    assert.equal((await post('/auth/login',{username:'fixture',password:'FixturePassword123'})).status,403);
  });
}
test('unknown errors are safely returned as 500 rather than crashing the error handler',()=>{
  let status,body;errorMiddleware(new Error('private SQL'),{method:'GET',originalUrl:'/fixture'},{status:n=>{status=n;return{json:v=>{body=v;}};}},()=>{});
  assert.equal(status,500);assert.doesNotMatch(body.message,/private SQL/);
});

test('valid emergency request is saved pending without deducting bank inventory',async()=>{
  const seen=[];connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async(sql,values)=>{
    seen.push({sql,values});if(sql.startsWith('INSERT INTO blood_requests'))return [{insertId:55}];return [[]];
  }};
  assert.equal(await requests.createBloodRequest({hospitalId:10,requestedByUserId:1,bloodGroup:'O+',quantity:2,urgency:'emergency'}),55);
  const insert=seen.find(r=>r.sql.startsWith('INSERT INTO blood_requests'));
  assert.equal(insert.values[4],'emergency');assert.ok(!seen.some(r=>r.sql.startsWith('UPDATE blood_inventory')));
});
test('immediate identical request retries reuse the confirmed request ID',async()=>{
  let inserts=0;connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async(sql)=>{
    if(sql.startsWith('SELECT request_id'))return [[{request_id:55}]];
    if(sql.startsWith('INSERT'))inserts++;
    return [[]];
  }};
  assert.equal(await requests.createBloodRequest({hospitalId:10,requestedByUserId:1,bloodGroup:'O+',quantity:2}),55);assert.equal(inserts,0);
});
test('own inventory SQL always carries the hospital ownership filter',async()=>{
  let captured;queryHandler=async(sql,values)=>{captured={sql,values};return [[]];};
  await model.getStock(10);assert.match(captured.sql,/l.hospital_id=\?/);assert.deepEqual(captured.values,[10]);
  assert.equal(await model.getBatch(10,999),null);assert.deepEqual(captured.values,[10,999]);
});
test('stale batch versions cannot overwrite newer stock',async()=>{
  const state=transactionFixture();await assert.rejects(model.updateBatch(10,1,1,{quantity:4,reservedUnits:0,status:'usable',version:2,reason:'fixture'},'update-key-1234'),/Refresh/);assert.equal(state.quantity,8);
});
test('negative hospital stock receipt fails validation',async()=>{
  const r=await post('/hospitals/mine/inventory',{quantity:-1,reservedUnits:0,bloodGroup:'O+',reference:'FIX',component:'Red cells',collectionDate:today(),expiryDate:'2099-01-01',reason:'Fixture'},token(),'stock-key-1234');
  assert.equal(r.status,400);
});
test('profile endpoint cannot change account role or status',async()=>{
  const r=await fetch(base+'/hospitals/mine/profile',{method:'PUT',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({account_status:'active',role:'blood_bank'})});
  assert.equal(r.status,400);
});
test('request report PDF endpoint is authenticated and sends a genuine PDF response',async()=>{
  const r=await fetch(base+'/hospitals/mine/reports?type=requests&format=pdf',{headers:{Authorization:'Bearer '+token()}});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\/pdf/);
  const data=Buffer.from(await r.arrayBuffer());assert.equal(data.subarray(0,5).toString(),'%PDF-');
});
test('inventory and fulfillment report summaries use the complete supplied records',()=>{
  const owner={hospitalName:'Fixture Hospital',hospitalCode:'FIX'};
  const stock=reports.buildHospitalReport(owner,[{reference:'B1',bloodGroup:'O+',quantity:8,availableUnits:6,reservedUnits:2,level:'Usable',expiryDate:'2099-01-01'}],{type:'inventory'});
  assert.equal(stock.summary['Usable unreserved units'],6);
  const summary=reports.buildHospitalReport(owner,[{status:'pending'},{status:'fulfilled'}],{type:'fulfillment'});
  assert.equal(summary.summary['Total requests'],2);assert.equal(summary.summary['Fulfillment rate'],'50.0%');
});

test('hospital registration hashes passwords and forces pending hospital role',async()=>{
  let saved;
  connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async(sql,values)=>{
    if(sql.startsWith('INSERT INTO users')){saved=values;return [{insertId:42}];}
    if(sql.includes('INSERT INTO hospitals'))return [{insertId:20}];
    return [[]];
  }};
  const result=await post('/auth/register/hospital',{username:'fixture-hospital',email:'fixture-hospital@example.invalid',password:'FixturePassword123',hospital_name:'Fixture Hospital',hospital_code:'FIX-REG',role:'blood_bank',account_status:'active'});
  assert.equal(result.status,201);assert.equal(saved[3],'hospital');assert.equal(saved[4],'pending');assert.notEqual(saved[2],'FixturePassword123');assert.ok(await bcrypt.compare('FixturePassword123',saved[2]));
});
test('duplicate hospital registration fails without creating another user',async()=>{
  connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async()=>[[{user_id:1}]]};
  const result=await post('/auth/register/hospital',{username:'fixture',email:'fixture@example.invalid',password:'FixturePassword123',hospital_name:'Fixture Hospital',hospital_code:'FIX'});
  assert.equal(result.status,409);
});
test('hospital profile updates are whitelisted and scoped to its hospital ID',async()=>{
  const original=queryHandler;let captured;
  queryHandler=async(sql,values)=>{if(sql.startsWith('UPDATE hospitals')){captured={sql,values};return [{affectedRows:1}];}return original(sql,values);};
  const response=await fetch(base+'/hospitals/mine/profile',{method:'PUT',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({hospitalName:'Changed fixture name'})});
  assert.equal(response.status,200);assert.match(captured.sql,/WHERE hospital_id=\?/);assert.deepEqual(captured.values,['Changed fixture name',10]);
});

test('authorized blood bank approval confirms the hospital status change',async()=>{
  let current='pending';
  const original=queryHandler;
  queryHandler=async(sql,values)=>{
    if(sql.includes('SELECT user_id, username, role'))return [[{user_id:values[0],username:'fixture',role:values[0]===2?'blood_bank':'hospital',account_status:values[0]===2?'active':current}]];
    if(sql.includes('AS total')&&sql.includes('FROM hospitals'))return [[{total:1,pending:current==='pending'?1:0,active:current==='active'?1:0,rejected:0,suspended:0}]];
    return original(sql,values);
  };
  connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async(sql,values)=>{
    if(sql.includes('SELECT user_id, account_status'))return [[{user_id:1,account_status:current}]];
    if(sql.includes('UPDATE users'))current=values[0];
    return [{affectedRows:1}];
  }};
  const r=await fetch(base+'/hospitals/1/approve',{method:'PUT',headers:{Authorization:'Bearer '+token(2)}});
  assert.equal(r.status,200);assert.equal(current,'active');
});
