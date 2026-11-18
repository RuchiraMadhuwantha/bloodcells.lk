import { filterRequests, summarizeRequests, titleCase } from './hospitalUtils';

export const REPORT_TYPES = [
  ['requests', 'Hospital Blood Request Report'], ['fulfillment', 'Blood Issued for Requests Report'],
  ['usage', 'Hospital Blood Usage Report'], ['inventory', 'Hospital Inventory Report'],
  ['collections','Hospital Donation Collection Report'],['incoming-transfers','Incoming Blood Transfer Report'],['outgoing-transfers','Outgoing Blood Transfer Report'],
];
export const buildRequestReport = (hospital, items, filters, complete = false) => {
  if (!complete) throw new Error('A complete hospital request dataset is required for report generation.');
  if (!['requests', 'fulfillment'].includes(filters.type)) throw new Error('This report source is not available yet.');
  if (filters.start && filters.end && filters.start > filters.end) throw new Error('The report start date must be on or before its end date.');
  const records = filterRequests(items, { ...filters, sort: 'newest' });
  const summary = summarizeRequests(records);
  return {
    title: REPORT_TYPES.find(([key]) => key === filters.type)[1], hospital: hospital.hospitalName,
    hospitalCode: hospital.hospitalCode, generatedAt: new Date().toISOString(),
    period: `${filters.start || 'First recorded date'} to ${filters.end || 'Latest recorded date'} (submission dates)`,
    group: filters.group || 'All groups', status: filters.status ? titleCase(filters.status) : 'All statuses',
    columns: ['Request ID', 'Blood group', 'Requested units', 'Submission date', 'Required date', 'Urgency', 'Status'],
    rows: records.map((r) => [r.reference || r.id, r.bloodGroup, r.quantity, r.createdAt || 'Not provided', r.requiredDate || 'Not provided', r.urgencyLabel || titleCase(r.urgency), r.statusLabel || titleCase(r.status)]),
    summary: {
      'Total requests': summary.total, Pending: summary.pending, Approved: summary.approved,
      Rejected: summary.rejected, Fulfilled: summary.fulfilled, Cancelled: summary.cancelled,
      'Requested units on fulfilled requests': records.filter((r) => r.status === 'fulfilled').reduce((sum, r) => sum + Number(r.quantity), 0),
      'Fulfilled / all filtered requests': summary.total ? `${(summary.fulfilled / summary.total * 100).toFixed(1)}%` : 'Not applicable',
    },
  };
};
const csvCell = (value) => {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export const reportToCsv = (report) => '\uFEFF' + [
  [report.title], [report.scopeLabel || 'Hospital', report.hospital], [report.codeLabel || 'Hospital code', report.hospitalCode],
  ['Reporting period', report.period], ['Generated at', report.generatedAt], ['Blood group', report.group], ['Status filter', report.status],
  ...Object.entries(report.summary), [], report.columns, ...report.rows,
].map((row) => row.map(csvCell).join(',')).join('\r\n');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const reportToHtml = (report) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font:14px Arial,sans-serif;color:#111827;margin:30px}h1{font-size:22px;color:#b91c1c}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}thead{display:table-header-group}tr{break-inside:avoid}@page{size:landscape;margin:12mm}</style></head><body><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.scopeLabel || 'Hospital')}: ${escapeHtml(report.hospital)} (${escapeHtml(report.hospitalCode || 'Code not provided')})</p><p>Reporting period: ${escapeHtml(report.period)}</p><p>Generated at: ${escapeHtml(report.generatedAt)}</p><p>Blood group: ${escapeHtml(report.group)}; status filter: ${escapeHtml(report.status)}</p><p>${Object.entries(report.summary).map(([key, value]) => escapeHtml(key) + ': ' + escapeHtml(value)).join(' | ')}</p><table><thead><tr>${report.columns.map((c) => '<th>' + escapeHtml(c) + '</th>').join('')}</tr></thead><tbody>${report.rows.map((row) => '<tr>' + row.map((v) => '<td>' + escapeHtml(v) + '</td>').join('') + '</tr>').join('')}</tbody></table><p>${escapeHtml(report.sourceNote || 'All matching hospital requests for the submission dates you selected. Amounts show the units requested. Patient details are not included. Refresh the report to see later changes.')}</p></body></html>`;

export const downloadReportCsv = (report) => {
  const url = URL.createObjectURL(new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'hospital-blood-report-' + report.generatedAt.slice(0, 10) + '.csv';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const printReport = (report) => {
  const frame = document.createElement('iframe');
  frame.title = 'Printable hospital report';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  frame.onload = () => {
    const target = frame.contentWindow;
    target.onafterprint = () => frame.remove();
    target.focus();
    target.print();
  };
  frame.srcdoc = reportToHtml(report);
  document.body.appendChild(frame);
};
