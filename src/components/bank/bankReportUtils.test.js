import { buildBankReport } from './bankReportUtils';
import { reportToCsv, reportToHtml } from '../hospital/reportUtils';
import { requestActions, appointmentActions } from './BankOperations';
import { validateTransfer } from './BankRegional';
test('only actual request and appointment transitions are offered', () => {
  expect(requestActions('pending')).toEqual(['approved', 'rejected', 'cancelled']);
  expect(requestActions('approved')).toEqual(['fulfilled', 'cancelled']);
  expect(requestActions('fulfilled')).toEqual([]);
  expect(appointmentActions('pending')).toEqual(['cancelled']);
  expect(appointmentActions('approved')).toEqual(['cancelled']);
});
test('inventory reports use real units, unknown location and a current snapshot', () => {
  const report = buildBankReport({ available: true, complete: true, items: [{ bloodGroup: 'O+', availableUnits: 4, level: 'Low' }] }, { type: 'inventory' }, 'testbank');
  expect(report.summary['Recorded units']).toBe(4);
  expect(report.rows[0][2]).toContain('Not supplied');
  expect(report.period).toContain('historical stock unavailable');
  expect(reportToCsv(report)).toContain('"Scope","Blood Bank network"');
  expect(reportToHtml(report)).toContain('Scope: Blood Bank network');
});
test('donation reports show completed appointments only and never invent collected quantity', () => {
  const report = buildBankReport({ available: true, complete: true, items: [{ reference: 'AP-1', status: 'completed', bloodGroup: 'A+', appointmentDate: '2026-01-01', hospitalName: 'Test Centre' }, { reference: 'AP-2', status: 'pending' }] }, { type: 'donations', group: 'A+' }, 'testbank');
  expect(report.rows).toHaveLength(1);
  expect(report.rows[0][3]).toBe('Not recorded');
  expect(report.title).toBe('Recorded Donation Report');
  expect(report.sourceNote).toContain('historical unknown quantities');
});
test('partial sources and reversed ranges block complete report claims', () => {
  expect(() => buildBankReport({ available: true, complete: false, items: [] }, { type: 'requests' })).toThrow('complete');
  expect(() => buildBankReport({ available: true, complete: true, items: [] }, { type: 'requests', start: '2026-02-01', end: '2026-01-01' })).toThrow('Start date');
});

test('donation reports include recorded units and millilitres',()=>{
 const report=buildBankReport({available:true,complete:true,items:[{reference:'AP-1',status:'completed',collectedUnits:1,collectedVolumeMl:450,appointmentDate:'2020-01-01'}]},{type:'donations'},'bank');
 expect(report.rows[0][3]).toBe(1);expect(report.rows[0][4]).toBe(450);
 expect(report.summary['Collected units']).toBe(1);expect(report.summary['Collected volume (mL)']).toBe(450);
});
test('future transfer validation rejects same-centre and invalid-quantity inputs', () => {
  expect(validateTransfer({ source: 'A', destination: 'A', quantity: 2 })).toContain('differ');
  expect(validateTransfer({ source: 'A', destination: 'B', quantity: -1 })).toContain('positive');
  expect(validateTransfer({ source: 'A', destination: 'B', quantity: 2 })).toBeNull();
});
