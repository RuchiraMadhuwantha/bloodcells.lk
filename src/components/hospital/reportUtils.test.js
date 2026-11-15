import { buildRequestReport, reportToCsv, reportToHtml } from './reportUtils';
import { summarizeRequests, filterRequests, isValidDate } from './hospitalUtils';
const items = [
  { id: 1, reference: 'BR-1', bloodGroup: 'O+', quantity: 3, createdAt: '2026-01-02', urgency: 'normal', status: 'fulfilled' },
  { id: 2, reference: 'BR-2', bloodGroup: 'A-', quantity: 2, createdAt: '2026-01-01', urgency: 'emergency', status: 'pending' },
  { id: 3, reference: 'BR-3', bloodGroup: 'O+', quantity: 4, createdAt: '2026-01-03', urgency: 'urgent', status: 'approved' },
];
const hospital = { hospitalName: 'Test Hospital', hospitalCode: 'TEST' };
test('priority sorting and counts depend only on supplied hospital records', () => {
  expect(filterRequests(items).map((r) => r.id)).toEqual([2, 3, 1]);
  expect(filterRequests(items, { sort: 'newest' }).map((r) => r.id)).toEqual([3, 1, 2]);
  expect(summarizeRequests(items)).toMatchObject({ total: 3, emergency: 1, fulfilled: 1, pending: 1, approved: 1 });
});
test('reports apply submission date, blood group and status filters to all rows and totals', () => {
  const report = buildRequestReport(hospital, items, { type: 'fulfillment', group: 'O+', start: '2026-01-01', end: '2026-01-02', status: 'fulfilled' }, true);
  expect(report.rows).toHaveLength(1);
  expect(report.rows[0][0]).toBe('BR-1');
  expect(report.summary).toMatchObject({ 'Total requests': 1, Fulfilled: 1, 'Requested units on fulfilled requests': 3, 'Fulfilled / all filtered requests': '100.0%' });
});
test('reports reject incomplete data, unsupported sources and reversed date ranges', () => {
  expect(() => buildRequestReport(hospital, items, { type: 'requests' }, false)).toThrow('complete');
  expect(() => buildRequestReport(hospital, items, { type: 'usage' }, true)).toThrow('not available');
  expect(() => buildRequestReport(hospital, items, { type: 'requests', start: '2026-02-01', end: '2026-01-01' }, true)).toThrow('start date');
});
test('CSV escapes separators, quotes and formula prefixes; printable HTML escapes markup', () => {
  const report = buildRequestReport({ hospitalName: '=HYPERLINK("unsafe")<script>bad()</script>' }, items, { type: 'requests' }, true);
  const csv = reportToCsv(report);
  expect(csv).toContain('"\'=HYPERLINK(""unsafe"")<script>bad()</script>"');
  const html = reportToHtml(report);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('BR-1');
});
test('calendar date validation rejects impossible dates', () => {
  expect(isValidDate('2026-02-30')).toBe(false);
  expect(isValidDate('2026-02-28')).toBe(true);
  expect(isValidDate('')).toBe(false);
});
