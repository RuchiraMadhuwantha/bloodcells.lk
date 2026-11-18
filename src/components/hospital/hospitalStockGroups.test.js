import {groupHospitalStock,matchesStockGroup} from './hospitalStockGroups';

test('blood-group totals retain packet references and exclude unavailable stock from next usable expiry',()=>{
  const groups=groupHospitalStock([
    {id:1,reference:'O-BATCH-A',bloodGroup:'O+',quantity:5,availableUnits:4,reservedUnits:1,volumeMl:2250,expiryDate:'2099-01-01'},
    {id:2,reference:'O-BATCH-B',bloodGroup:'O+',quantity:3,availableUnits:3,reservedUnits:0,volumeMl:1350,expiryDate:'2030-01-01'},
    {id:3,reference:'O-QUARANTINE',bloodGroup:'O+',quantity:2,availableUnits:0,reservedUnits:0,volumeMl:null,expiryDate:'2020-01-01'},
    {id:4,reference:'A-BATCH',bloodGroup:'A+',quantity:1,availableUnits:1,reservedUnits:0,volumeMl:450},
  ]);
  expect(groups).toHaveLength(2);
  expect(groups.find(g=>g.bloodGroup==='O+')).toMatchObject({quantity:10,availableUnits:7,reservedUnits:1,volumeMl:3600,missingVolumeBatches:1,nextUsableExpiry:'2030-01-01'});
  expect(groups.find(g=>g.bloodGroup==='O+').batches.map(b=>b.reference)).toEqual(['O-BATCH-A','O-BATCH-B','O-QUARANTINE']);
});
test('packet searches keep the complete blood-group total and missing mL remains identifiable',()=>{
  const [group]=groupHospitalStock([{id:1,bloodGroup:'O+',reference:'PKT-1',quantity:1,availableUnits:1},{id:2,bloodGroup:'O+',reference:'PKT-2',quantity:2,availableUnits:0}]);
  expect(matchesStockGroup(group,'pkt-2')).toBe(true);expect(matchesStockGroup(group,'unknown')).toBe(false);
  expect(group.quantity).toBe(3);expect(group.batches).toHaveLength(2);expect(group.missingVolumeBatches).toBe(2);expect(group.nextUsableExpiry).toBeNull();
});
