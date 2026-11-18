const test=require('node:test');
const assert=require('node:assert/strict');
const {batchCode}=require('../utils/batchCode');
test('batch IDs are short, stable and based on the globally unique database number',()=>{
  assert.equal(batchCode(1),'B-0001');
  assert.equal(batchCode('42'),'B-0042');
  assert.equal(batchCode(42),batchCode('42'));
});
test('larger IDs grow instead of being truncated or reused',()=>{
  const codes=Array.from({length:20000},(_,i)=>batchCode(i+1));
  assert.equal(new Set(codes).size,codes.length);
  assert.equal(batchCode(10000),'B-10000');
  assert.notEqual(batchCode(1),batchCode(10001));
});
test('missing or invalid batch IDs never receive a made-up code',()=>{
  for(const id of [null,undefined,0,-1,1.5,'unknown'])assert.equal(batchCode(id),null);
});
