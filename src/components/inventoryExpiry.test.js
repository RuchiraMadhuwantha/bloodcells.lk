import {expiryInfo,expirySummary,inventoryToday,isExpiredBatch} from './inventoryExpiry';
const batch={quantity:2,status:'usable',asOfDate:'2026-11-17'};
test.each([
  ['2026-11-16','expired','Expired'],['2026-11-17','today','Expires today'],
  ['2026-11-18','expiring','1 day left'],['2026-11-24','expiring','7 days left'],['2026-11-25','current',''],
])('expiry threshold uses inclusive calendar dates: %s',(expiryDate,kind,label)=>{
  expect(expiryInfo({...batch,expiryDate})).toMatchObject({kind,label});
});
test('the server business date takes precedence over the browser date',()=>{
  expect(expiryInfo({...batch,expiryDate:'2026-11-18'},'2099-01-01').kind).toBe('expiring');
});
test.each([{quantity:0},{status:'discarded'}])('empty or discarded stock is excluded from expiry reminders: %o',patch=>{
  expect(expiryInfo({...batch,...patch,expiryDate:'2026-11-16'}).kind).toBe('none');
});
test.each([{quantity:0},{status:'discarded'},{status:'quarantined'},{}])('past-dated packets are expired for inventory filtering: %o',patch=>{
  expect(isExpiredBatch({...batch,...patch,expiryDate:'2026-11-16'})).toBe(true);
});
test.each([['2026-11-17'],['2026-11-25'],['2026-02-30'],[null]])('current, future or unknown dates are not expired for inventory filtering: %s',expiryDate=>{
  expect(isExpiredBatch({...batch,expiryDate})).toBe(false);
});
test('quarantined physical stock still needs an expiry reminder',()=>{
  expect(expiryInfo({...batch,status:'quarantined',expiryDate:'2026-11-18'}).kind).toBe('expiring');
});
test('unknown or invalid dates are never treated as imminent expiry',()=>{
  expect(expiryInfo({...batch,expiryDate:null}).kind).toBe('unknown');
  expect(expiryInfo({...batch,expiryDate:'2026-02-30'}).kind).toBe('unknown');
});
test('group summaries count affected packets and preserve expired priority',()=>{
  const result=expirySummary([{...batch,expiryDate:'2026-11-16'},{...batch,quantity:3,expiryDate:'2026-11-17'},{...batch,quantity:4,expiryDate:'2026-11-24'},{...batch,quantity:0,expiryDate:'2026-11-16'}]);
  expect(result).toMatchObject({expiredCount:1,expiredUnits:2,expiringCount:2,expiringUnits:7,todayCount:1,nearestDays:0,rowClass:expect.stringContaining('bg-rose-50')});
});
test('fallback dates use Sri Lankan time across UTC midnight',()=>{
  expect(inventoryToday(new Date('2026-11-16T20:00:00Z'))).toBe('2026-11-17');
});

test('the reminder countdown uses the nearest non-expired packet within one week',()=>{
  expect(expirySummary([{...batch,expiryDate:'2026-11-16'},{...batch,expiryDate:'2026-11-24'},{...batch,expiryDate:'2026-11-20'},{...batch,status:'discarded',expiryDate:'2026-11-18'}])).toMatchObject({nearestDays:3,expiringCount:2});
});
