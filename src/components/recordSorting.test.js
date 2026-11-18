import {sortRecords,SORT_OPTIONS} from './recordSorting';

test('inventory numeric sorting preserves zero, puts unknown amounts last and never mutates cached rows',()=>{
  const rows=Object.freeze([{id:1,availableUnits:10},{id:2,availableUnits:2},{id:3,availableUnits:null},{id:4,availableUnits:0}].map(Object.freeze));
  expect(sortRecords(rows,'batches','low').map(r=>r.id)).toEqual([4,2,1,3]);
  expect(sortRecords(rows,'batches','high').map(r=>r.id)).toEqual([1,2,4,3]);
  expect(rows.map(r=>r.id)).toEqual([1,2,3,4]);
});

test('missing dates remain last in both date directions and same-day appointments use their time slots',()=>{
  const rows=[{id:3,appointmentDate:null},{id:2,appointmentDate:'2026-11-17',timeSlot:'14:00'},{id:1,appointmentDate:'2026-11-17',timeSlot:'09:00'}];
  expect(sortRecords(rows,'appointments','date').map(r=>r.id)).toEqual([1,2,3]);
  expect(sortRecords(rows,'appointments','latest').map(r=>r.id)).toEqual([2,1,3]);
});

test('name comparisons ignore case and sort numeric references naturally with deterministic ties',()=>{
  const rows=[{id:10,fullName:'ALICE'},{id:2,fullName:'alice'},{id:3,fullName:'Bob'}];
  expect(sortRecords(rows,'donors','name').map(r=>r.id)).toEqual([2,10,3]);
  expect(sortRecords(rows,'donors','name-desc').map(r=>r.id)).toEqual([3,10,2]);
});

test('pending approval order does not change appointment statuses or the selected records',()=>{
  const rows=[{id:1,status:'completed'},{id:2,status:'approved'},{id:3,status:'pending'},{id:4,status:'cancelled'}];
  expect(sortRecords(rows,'appointments','pending').map(r=>r.id)).toEqual([3,2,1,4]);
  expect(rows[0].status).toBe('completed');
});

test('hospital inventory sorts whole blood-group totals and keeps unknown usable expiry last',()=>{
  const rows=[{bloodGroup:'O+',availableUnits:5,nextUsableExpiry:null},{bloodGroup:'A+',availableUnits:2,nextUsableExpiry:'2026-11-20'},{bloodGroup:'B+',availableUnits:10,nextUsableExpiry:'2026-11-18'}];
  expect(sortRecords(rows,'stockGroups','expiry').map(r=>r.bloodGroup)).toEqual(['B+','A+','O+']);
  expect(sortRecords(rows,'stockGroups','group').map(r=>r.bloodGroup)).toEqual(['A+','B+','O+']);
});

test('registered campaigns sort by event details while preserving registration identity',()=>{
  const rows=[{id:1,status:'registered',campaign:{id:20,name:'Zulu',date:'2026-12-02'}},{id:2,status:'cancelled',campaign:{id:10,name:'Alpha',date:'2026-12-01'}}];
  expect(sortRecords(rows,'campaigns','date',r=>r.campaign).map(r=>r.id)).toEqual([2,1]);
  expect(sortRecords(rows,'campaigns','latest',r=>r.campaign).map(r=>r.id)).toEqual([1,2]);
});

test.each(Object.keys(SORT_OPTIONS))('%s sort options handle empty lists and unknown choices',profile=>{
  expect(sortRecords([],profile,'invalid')).toEqual([]);
  const rows=[{id:1}];expect(sortRecords(rows,profile,'invalid')).toEqual(rows);
});
