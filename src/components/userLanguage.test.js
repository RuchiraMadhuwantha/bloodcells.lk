import {displayStatus,fieldLabel,changeSummary,STOCK_STATUS_OPTIONS} from './userLanguage';

test('plain stock labels keep their original submitted values',()=>{
  expect(STOCK_STATUS_OPTIONS.map(o=>o.value)).toEqual(['usable','quarantined','discarded']);
  expect(displayStatus('quarantined')).toBe('Waiting for checks');
  expect(displayStatus('discarded')).toBe('Removed from use');
  expect(displayStatus('fulfilled')).toBe('Blood issued');
  expect(displayStatus('dispatched')).toBe('On the way');
});
test('detail field names use readable labels without altering references',()=>{
  expect(fieldLabel('volumeMl')).toBe('Volume (mL)');
  expect(fieldLabel('reservedUnits')).toBe('Units set aside');
  expect(displayStatus('AP-0038')).toBe('AP-0038');
});
test('change history reads saved JSON and preserves numbers, false values and notes',()=>{
  expect(changeSummary('{"quantity":0,"status":"quarantined","checked":false,"note":"Check again"}')).toBe('Units: 0; Status: Waiting for checks; Checked: No; Note: Check again');
  expect(changeSummary('Existing staff note')).toBe('Existing staff note');
  expect(changeSummary({items:[{batchId:2,quantity:3}]})).toBe('Items: Packet number: 2; Units: 3');
});
