const test=require('node:test');
const assert=require('node:assert/strict');
const {moveVolume}=require('../utils/bloodVolume');
const {buildHospitalReport,reportCsv,reportPdf}=require('../utils/hospitalReports');
test('unknown historical volume remains unknown instead of assuming a unit size',()=>{
  assert.equal(moveVolume({quantity:5,volume_ml:null},2),null);
  assert.equal(moveVolume({quantity:5,volume_ml:null},2,870),870);
});
test('recorded volume splits without losing millilitres',()=>{
  let batch={quantity:3,volume_ml:1000};
  const first=moveVolume(batch,1);batch={quantity:2,volume_ml:1000-first};
  const second=moveVolume(batch,1);batch={quantity:1,volume_ml:batch.volume_ml-second};
  const last=moveVolume(batch,1);
  assert.equal(Math.round((first+second+last)*100),100000);
});
for(const volume of [0,-1,1001,450.123,Infinity])test('invalid recorded movement volume rejected '+volume,()=>assert.throws(()=>moveVolume({quantity:2,volume_ml:900},1,volume),{statusCode:409}));
test('full-batch move requires its exact recorded volume',()=>{
  assert.throws(()=>moveVolume({quantity:2,volume_ml:900},2,450),{statusCode:409});
  assert.throws(()=>moveVolume({quantity:2,volume_ml:900},1,900),{statusCode:409});
  assert.equal(moveVolume({quantity:2,volume_ml:900},2,900),900);
});
test('collection report totals actual amounts and identifies incomplete historical records',()=>{
  const report=buildHospitalReport({hospitalName:'Fixture'},[{reference:'AP-1',collectedUnits:1,collectedVolumeMl:450},{reference:'AP-2',collectedUnits:null,collectedVolumeMl:null}],{type:'collections'});
  assert.equal(report.summary['Collected units'],1);assert.equal(report.summary['Recorded collected volume (mL)'],450);assert.equal(report.summary['Donations missing quantities'],1);
});
for(const type of ['incoming-transfers','outgoing-transfers'])test(type+' exports units, volume and status',async()=>{
  const report=buildHospitalReport({hospitalName:'Fixture'},[{reference:'TR-1',quantity:2,volumeMl:900,status:'received'},{reference:'TR-2',quantity:1,volumeMl:null,status:'dispatched'}],{type});
  assert.equal(report.summary['Transferred units'],3);assert.equal(report.summary['Recorded volume (mL)'],900);assert.equal(report.summary['Transfers missing volume'],1);
  assert.match(reportCsv(report),/Volume \(mL\)/);assert.equal((await reportPdf(report)).subarray(0,4).toString(),'%PDF');
});
