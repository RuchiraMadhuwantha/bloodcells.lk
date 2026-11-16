import React, { useEffect, useRef, useState } from 'react';
import {
  Hospital as HospitalIcon, ClipboardClock, ShieldCheck, ShieldX, Search, Filter, Eye, CheckCircle, XCircle, FileText, Check, AlertCircle, Loader2,
} from 'lucide-react';
import { DashboardLayout } from './DashboardShell';
import { StatCard, Badge, Button, SectionCard, Table } from './UIComponents';
import { useHospitals, HOSPITAL_TYPES, hospitalStatusBadge } from '../data/hospitals';
import { DISTRICTS } from '../data/districts';
import { useAuth } from '../context/AuthContext';
import { Dialog, useBankPermissions } from './bank/BankUI';

/* ── Reusable modal shell ── */
const Modal = ({ title, onClose, busy = false, children }) => (
  <Dialog title={title} onClose={onClose} busy={busy}>{children}</Dialog>
);

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
    <span className="sm:w-44 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-700 break-words">{value || '—'}</span>
  </div>
);

/* ── Hospital details panel ── */
const HospitalDetails = ({ hospital, onClose, onApprove, onReject, onReviewAgain, permitted }) => {
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
              <HospitalIcon className="w-6 h-6" />
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
              <Button disabled={!permitted} icon={CheckCircle} onClick={() => onApprove(h)}>Approve Hospital</Button>
              <Button disabled={!permitted} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" icon={XCircle} onClick={() => onReject(h)}>Reject Application</Button>
            </>
          )}
          {isActive && (
            <Button variant="outline" onClick={() => onClose()}>Close</Button>
          )}
          {isRejected && (
            <Button disabled={!permitted} icon={CheckCircle} onClick={() => onReviewAgain(h)}>Review Again</Button>
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
  const { user } = useAuth();
  const permitted = useBankPermissions();
  const decisionLock = useRef(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [toastError, setToastError] = useState(false);
  const { hospitals, pendingCount, loading, error, approve, reject, reviewAgain, refresh } = useHospitals();

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
  const [actionBusy, setActionBusy] = useState(false);

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
        (h.hospitalName || '').toLowerCase().includes(q) ||
        (h.hospitalCode || '').toLowerCase().includes(q) ||
        (h.district || '').toLowerCase().includes(q)
    );
  }
  list = [...list].sort((a, b) => {
    if (sort === 'Hospital Name') return (a.hospitalName || '').localeCompare(b.hospitalName || '');
    const diff = new Date(a.registrationDate) - new Date(b.registrationDate);
    return sort === 'Oldest Registration' ? diff : -diff;
  });

  const summary = {
    total: hospitals.length,
    pending: hospitals.filter((h) => h.status === 'Pending').length,
    active: hospitals.filter((h) => h.status === 'Active').length,
    rejected: hospitals.filter((h) => h.status === 'Rejected' || h.status === 'Inactive').length,
  };

  const confirmApprove = async () => {
    if (!permitted || decisionLock.current) return;
    decisionLock.current = true;
    setToastError(false);
    setActionBusy(true);
    try {
      await approve(approveTarget.id);
      setApproveTarget(null);
      setToast('Hospital registration approved successfully.');
    } catch (e) {
      setToastError(true);
      setToast(e.message || 'Failed to approve hospital.');
      setApproveTarget(null);
    } finally {
      decisionLock.current = false;
      setActionBusy(false);
    }
  };
  const confirmReject = async () => {
    if (!rejectReason.trim()) return;
    if (!permitted || decisionLock.current) return;
    decisionLock.current = true;
    setToastError(false);
    setActionBusy(true);
    try {
      // The reason is persisted so the hospital can read exactly why it was rejected.
      await reject(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      setToast('Hospital registration has been rejected.');
    } catch (e) {
      setToastError(true);
      setToast(e.message || 'Failed to reject hospital.');
    } finally {
      decisionLock.current = false;
      setActionBusy(false);
    }
  };
  const doReviewAgain = (h) => { setDetails(null); setReviewTarget(h); };
  const confirmReviewAgain = async () => {
    const h = reviewTarget;
    if (!permitted || decisionLock.current) return;
    decisionLock.current = true;
    setToastError(false);
    setActionBusy(true);
    try {
      await reviewAgain(h.id);
      setDetails(null);
      setReviewTarget(null);
      setToast('Hospital moved back to pending for review.');
    } catch (e) {
      setToastError(true);
      setToast(e.message || 'Failed to move hospital to pending.');
      setDetails(null);
    } finally {
      decisionLock.current = false;
      setActionBusy(false);
    }
  };

  const renderActions = (h) => {
    if (h.status === 'Pending')
      return (
        <>
          <button onClick={() => setDetails(h)} title="View Details" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Eye className="w-4 h-4" /></button>
          <button disabled={!permitted || actionBusy} onClick={() => setApproveTarget(h)} title="Approve" className="p-1.5 text-gray-400 hover:text-green-600 rounded"><CheckCircle className="w-4 h-4" /></button>
          <button disabled={!permitted || actionBusy} onClick={() => { setRejectTarget(h); setRejectReason(''); }} title="Reject" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><XCircle className="w-4 h-4" /></button>
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
        <button disabled={!permitted || actionBusy} onClick={() => doReviewAgain(h)} title="Review Again" className="p-1.5 text-gray-400 hover:text-red-600 rounded"><CheckCircle className="w-4 h-4" /></button>
      </>
    );
  };

  const emptyMessage =
    tab === 'pending' ? 'No pending hospital approvals' :
    tab === 'active' ? 'No active hospitals found' :
    tab === 'rejected' ? 'No rejected hospitals found' :
    'No hospitals found';

  return (
    <DashboardLayout
      {...nav}
      title="Hospital Management"
      subtitle="Review hospital registrations, manage approval requests, and view registered hospitals."
      userName={user?.username || 'Blood Bank'}
      role="Bank Manager"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={HospitalIcon} value={loading ? 'Loading...' : error ? 'Unavailable' : summary.total} label="Total Hospitals" accent="red" />
        <StatCard icon={ClipboardClock} value={loading ? 'Loading...' : error ? 'Unavailable' : summary.pending} label="Pending Approvals" accent="amber" />
        <StatCard icon={ShieldCheck} value={loading ? 'Loading...' : error ? 'Unavailable' : summary.active} label="Active Hospitals" accent="green" />
        <StatCard icon={ShieldX} value={loading ? 'Loading...' : error ? 'Unavailable' : summary.rejected} label="Rejected / Inactive" accent="red" />
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
              aria-label="Search hospitals" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hospitals by name, code, or district..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select aria-label="Hospital account status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              <option>Pending</option>
              <option>Active</option>
              <option>Rejected</option>
              <option>Suspended</option>
            </select>
            <select aria-label="Hospital type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {HOSPITAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select aria-label="Hospital district" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>All</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select aria-label="Hospital sort order" value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
              <option>Newest Registration</option>
              <option>Oldest Registration</option>
              <option>Hospital Name</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading hospitals…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button variant="outline" onClick={refresh}>Retry</Button>
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <HospitalIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-600 mb-1">{emptyMessage}</p>
            <p className="text-sm text-gray-400">Hospital registrations appear here, including pending applications.</p>
          </div>
        ) : (
          <Table columns={['Hospital', 'Code', 'Type', 'District', 'Status', 'Actions']}>
            {list.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HospitalIcon className="w-4 h-4" />
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
          </Table>
        )}
      </SectionCard>

      {/* Detail modal */}
      {details && (
        <HospitalDetails
          hospital={details}
          onClose={() => setDetails(null)}
          onApprove={(h) => { setDetails(null); setApproveTarget(h); }}
          onReject={(h) => { setDetails(null); setRejectTarget(h); setRejectReason(''); }}
          onReviewAgain={doReviewAgain}
          permitted={permitted && !actionBusy}
        />
      )}

      {/* Approve confirmation */}
      {approveTarget && (
        <Modal busy={actionBusy} title="Approve Hospital Registration?" onClose={() => setApproveTarget(null)} maxWidth="max-w-md">
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to approve this hospital registration? The hospital will be marked as active.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setApproveTarget(null)} disabled={!permitted || actionBusy}>Cancel</Button>
            <Button className="flex-1" icon={CheckCircle} onClick={confirmApprove} disabled={!permitted || actionBusy}>
              {actionBusy ? 'Processing…' : 'Approve Hospital'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal busy={actionBusy} title="Reject Hospital Registration" onClose={() => setRejectTarget(null)} maxWidth="max-w-md">
          <label htmlFor="hospital-rejection" className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
          <textarea
            id="hospital-rejection" maxLength={500} rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the reason for rejecting this hospital registration..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
          />
          {!rejectReason.trim() && (
            <p className="text-xs text-red-600 mt-1">A rejection reason is required.</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)} disabled={!permitted || actionBusy}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" icon={XCircle} onClick={confirmReject} disabled={!permitted || !rejectReason.trim() || actionBusy}>
              {actionBusy ? 'Processing…' : 'Reject Application'}
            </Button>
          </div>
        </Modal>
      )}

      {reviewTarget && <Modal title="Return hospital to review?" busy={actionBusy} onClose={() => setReviewTarget(null)}>
        <p className="text-sm text-gray-600 mb-4">Return {reviewTarget.hospitalName} to pending approval?</p>
        <Button disabled={!permitted || actionBusy} onClick={confirmReviewAgain}>{actionBusy ? 'Processing...' : 'Confirm review'}</Button>
      </Modal>}
      {/* Available decision fields are shown in details; no audit endpoint exists. */}

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
        <div role={toastError ? "alert" : "status"} className={`fixed bottom-6 right-6 z-[60] text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm ${toastError ? "bg-red-600" : "bg-green-600"}`}>
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}
    </DashboardLayout>
  );
};

export default HospitalManagement;
