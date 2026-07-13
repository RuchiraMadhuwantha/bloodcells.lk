import React, { useEffect, useState } from 'react';
import {
  Building2, Search, Filter, Eye, CheckCircle, XCircle, Users, Phone, Mail, MapPin, Calendar,
  ArrowLeft, X, FileText, Check, AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, Button, SectionCard, Table } from './UIComponents';
import { useHospitals, HOSPITAL_TYPES, hospitalStatusBadge } from '../data/hospitals';
import { DISTRICTS } from '../data/districts';

/* ── Reusable modal shell ── */
const Modal = ({ title, onClose, children, maxWidth = 'max-w-2xl' }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
    <span className="w-44 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-700 break-words">{value || '—'}</span>
  </div>
);

/* ── Hospital details panel ── */
const HospitalDetails = ({ hospital, onClose, onApprove, onReject, onReviewAgain }) => {
  const h = hospital;
  const isPending = h.status === 'Pending';
  const isActive = h.status === 'Active';
  const isRejected = h.status === 'Rejected' || h.status === 'Inactive';

  return (
    <Modal title="Hospital Registration Details" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{h.hospitalName}</h4>
              <p className="text-sm text-gray-500">{h.hospitalCode}</p>
            </div>
          </div>
          <Badge color={hospitalStatusBadge(h.status)}>{h.status}</Badge>
        </div>

        <Section title="Hospital Information">
          <DetailRow label="Hospital Name" value={h.hospitalName} />
          <DetailRow label="Hospital Code" value={h.hospitalCode} />
          <DetailRow label="Hospital Type" value={h.hospitalType} />
          <DetailRow label="District" value={h.district} />
          <DetailRow label="City / Area" value={h.city} />
          <DetailRow label="Address" value={h.address} />
        </Section>

        <Section title="Account Information">
          <DetailRow label="Username" value={h.username} />
          <DetailRow label="Official Email" value={h.email} />
          <DetailRow label="Account Status" value={h.status} />
          <DetailRow label="Registration Date" value={h.registrationDate} />
          <DetailRow label="Approval Date" value={h.approvalDate} />
        </Section>

        <Section title="Contact Information">
          <DetailRow label="Official Phone" value={h.contactNumber} />
          <DetailRow label="Contact Person" value={h.contactPersonName} />
          <DetailRow label="Designation" value={h.contactPersonDesignation} />
          <DetailRow label="Contact Phone" value={h.contactPersonPhone} />
          <DetailRow label="Contact Email" value={h.contactPersonEmail} />
        </Section>

        {h.rejectionReason && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
              <AlertCircle className="w-3.5 h-3.5" /> Rejection Reason
            </p>
            <p className="text-sm text-gray-700">{h.rejectionReason}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {isPending && (
            <>
              <Button icon={CheckCircle} onClick={() => onApprove(h)}>Approve Hospital</Button>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" icon={XCircle} onClick={() => onReject(h)}>Reject Application</Button>
            </>
          )}
          {isActive && (
            <Button variant="outline" onClick={() => onClose()}>Close</Button>
          )}
          {isRejected && (
            <Button icon={CheckCircle} onClick={() => onReviewAgain(h)}>Review Again</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const Section = ({ title, children }) => (
  <div>
    <h5 className="text-sm font-bold text-gray-800 mb-2">{title}</h5>
    <div className="border border-gray-100 rounded-lg px-4 py-2">{children}</div>
  </div>
);

/* ── Main page ── */
export const HospitalManagement = ({ nav }) => {
  const { hospitals, pendingCount, approve, reject, reviewAgain } = useHospitals();

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [sort, setSort] = useState('Newest Registration');

  const [details, setDetails] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activityTarget, setActivityTarget] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const tabs = [
    { key: 'all', label: 'All Hospitals' },
    { key: 'pending', label: 'Pending Approvals' },
    { key: 'active', label: 'Active Hospitals' },
    { key: 'rejected', label: 'Rejected / Inactive' },
  ];
  const tabStatuses = {
    all: null,
    pending: ['Pending'],
    active: ['Active'],
    rejected: ['Rejected', 'Inactive'],
  }[tab];

  let list = hospitals.filter((h) => !tabStatuses || tabStatuses.includes(h.status));
  if (statusFilter !== 'All') list = list.filter((h) => h.status === statusFilter);
  if (typeFilter !== 'All') list = list.filter((h) => h.hospitalType === typeFilter);
  if (districtFilter !== 'All') list = list.filter((h) => h.district === districtFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (h) =>
        h.hospitalName.toLowerCase().includes(q) ||
        h.hospitalCode.toLowerCase().includes(q) ||
        h.district.toLowerCase().includes(q)
    );
  }
  list = [...list].sort((a, b) => {
    if (sort === 'Hospital Name') return a.hospitalName.localeCompare(b.hospitalName);
    const diff = new Date(a.registrationDate) - new Date(b.registrationDate);
    return sort === 'Oldest Registration' ? diff : -diff;
  });

  const summary = {
    total: hospitals.length,
    pending: hospitals.filter((h) => h.status === 'Pending').length,
    active: hospitals.filter((h) => h.status === 'Active').length,
    rejected: hospitals.filter((h) => h.status === 'Rejected' || h.status === 'Inactive').length,
  };

  const confirmApprove = () => {
    approve(approveTarget.id);
    setApproveTarget(null);
    setToast('Hospital registration approved successfully.');
  };
  const confirmReject = () => {
    if (!rejectReason.trim()) return;
    reject(rejectTarget.id, rejectReason.trim());
    setRejectTarget(null);
    setRejectReason('');
    setToast('Hospital registration has been rejected.');
  };
  const doReviewAgain = (h) => {
    reviewAgain(h.id);
    setDetails(null);
    setToast('Hospital moved back to pending for review.');
  };

  const renderActions = (h) => {
    if (h.status === 'Pending')
      return (
        <>
          <button onClick={() => setDetails(h)} title="View Details" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={() => setApproveTarget(h)} title="Approve" className="p-1.5 text-gray-400 hover:text-green-600 rounded"><CheckCircle className="w-4 h-4" /></button>
          <button onClick={() => { setRejectTarget(h); setRejectReason(''); }} title="Reject" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><XCircle className="w-4 h-4" /></button>
        </>
      );
    if (h.status === 'Active')
      return (
        <>
          <button onClick={() => setDetails(h)} title="View Details" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={() => setActivityTarget(h)} title="View Activity" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><FileText className="w-4 h-4" /></button>
        </>
      );
    return (
      <>
        <button onClick={() => setDetails(h)} title="View Details" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Eye className="w-4 h-4" /></button>
        <button onClick={() => doReviewAgain(h)} title="Review Again" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><CheckCircle className="w-4 h-4" /></button>
      </>
    );
  };

  return (
    <DashboardLayout
      {...nav}
      title="Hospital Management"
      subtitle="Review hospital registrations, manage approval requests, and view registered hospitals."
      userName="Ruwan Jayasuriya"
      role="Bank Manager"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2} value={summary.total} label="Total Hospitals" accent="red" />
        <StatCard icon={AlertCircle} value={summary.pending} label="Pending Approvals" accent="amber" />
        <StatCard icon={CheckCircle} value={summary.active} label="Active Hospitals" accent="green" />
        <StatCard icon={XCircle} value={summary.rejected} label="Rejected / Inactive" accent="blue" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <SectionCard title="Hospitals">
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hospitals by name, code, or district..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              <option>Pending</option>
              <option>Active</option>
              <option>Rejected</option>
              <option>Inactive</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {HOSPITAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>Newest Registration</option>
              <option>Oldest Registration</option>
              <option>Hospital Name</option>
            </select>
          </div>
        </div>

        <Table columns={['Hospital', 'Code', 'Type', 'District', 'Status', 'Actions']}>
          {list.map((h) => (
            <tr key={h.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{h.hospitalName}</p>
                    <p className="text-xs text-gray-400">{h.contactNumber}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{h.hospitalCode}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{h.hospitalType}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{h.district}</td>
              <td className="px-4 py-3"><Badge color={hospitalStatusBadge(h.status)}>{h.status}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">{renderActions(h)}</div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                No hospitals found for the current filters.
              </td>
            </tr>
          )}
        </Table>
      </SectionCard>

      {/* Detail modal */}
      {details && (
        <HospitalDetails
          hospital={details}
          onClose={() => setDetails(null)}
          onApprove={(h) => { setDetails(null); setApproveTarget(h); }}
          onReject={(h) => { setDetails(null); setRejectTarget(h); setRejectReason(''); }}
          onReviewAgain={doReviewAgain}
        />
      )}

      {/* Approve confirmation */}
      {approveTarget && (
        <Modal title="Approve Hospital Registration?" onClose={() => setApproveTarget(null)} maxWidth="max-w-md">
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to approve this hospital registration? The hospital will be marked as active.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button className="flex-1" icon={CheckCircle} onClick={confirmApprove}>Approve Hospital</Button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal title="Reject Hospital Registration" onClose={() => setRejectTarget(null)} maxWidth="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the reason for rejecting this hospital registration..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
          />
          {!rejectReason.trim() && (
            <p className="text-xs text-red-600 mt-1">A rejection reason is required.</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" icon={XCircle} onClick={confirmReject} disabled={!rejectReason.trim()}>Reject Application</Button>
          </div>
        </Modal>
      )}

      {/* View Activity placeholder */}
      {activityTarget && (
        <Modal title={`Activity — ${activityTarget.hospitalName}`} onClose={() => setActivityTarget(null)} maxWidth="max-w-md">
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No activity data available yet. This will be populated when hospital dashboards report usage.</p>
            <Button variant="outline" className="mt-5" onClick={() => setActivityTarget(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}
    </DashboardLayout>
  );
};

export default HospitalManagement;
