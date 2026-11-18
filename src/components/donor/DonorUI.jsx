import {fieldLabel,displayStatus} from '../userLanguage';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2, X, Inbox } from 'lucide-react';
import { DashboardLayout } from '../DashboardShell';
import { Button } from '../UIComponents';
import { useAuth } from '../../context/AuthContext';

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500';
export const disabledClass = 'disabled:opacity-50 disabled:cursor-not-allowed';

export const DonorLayout = ({ nav, children, ...props }) => {
  const { user } = useAuth();
  return <DashboardLayout {...nav} userName={user?.username || 'Donor'} role="Donor"
    onNotifications={() => nav.onNavigate('donor-notifications')} {...props}>{children}</DashboardLayout>;
};

export const useDonorResource = (loader) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: null });
    Promise.resolve().then(loader).then((data) => {
      if (active) setState({ loading: false, data, error: null });
    }).catch((error) => {
      if (active) setState({ loading: false, data: null, error: error.message || 'Unable to load this information.' });
    });
    return () => { active = false; };
  }, [loader, revision]);
  return { ...state, refresh };
};

export const Loading = ({ label = 'Loading…' }) => <div role="status" className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" />{label}</div>;
export const ErrorPanel = ({ message, onRetry }) => <div role="alert" className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-5 text-center"><AlertCircle className="w-6 h-6 mx-auto mb-2" /><p>{message}</p>{onRetry && <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>Retry</Button>}</div>;
export const Notice = ({ children }) => <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-4 text-sm mb-5">{children}</div>;
export const EmptyState = ({ title, children }) => <div role="status" className="text-center py-12 px-4 text-gray-500"><Inbox className="w-9 h-9 mx-auto mb-3 text-gray-400" /><h2 className="font-semibold text-gray-800 mb-2">{title}</h2><div className="text-sm">{children}</div></div>;
export const ResourceState = ({ resource, emptyTitle, children }) => {
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorPanel message={resource.error} onRetry={resource.refresh} />;
  if (resource.data?.available === false) return <EmptyState title="Service not available yet">{resource.data.reason}</EmptyState>;
  if (!resource.data?.items?.length) return <EmptyState title={emptyTitle} />;
  return children;
};
export const Field = ({ label, children }) => <label className="block text-sm text-gray-700 min-w-0"><span className="block mb-1 font-medium">{label}</span>{children}</label>;
export const Filters = ({ children }) => <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{children}</div>;
export const Details = ({ entries }) => <dl className="grid sm:grid-cols-2 gap-4 text-sm">{entries.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-gray-500">{fieldLabel(label)}</dt><dd className="mt-1 font-medium text-gray-800 break-words whitespace-pre-wrap">{displayStatus(value) ?? 'Not provided'}</dd></div>)}</dl>;

// A single focus-trapped, keyboard-accessible dialog for details and confirmations.
export const Dialog = ({ title, onClose, busy = false, children }) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.focus();
    const handleKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!busyRef.current) closeRef.current(); }
      if (e.key === 'Tab') {
        const targets = [...ref.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')];
        const first = targets[0]; const last = targets[targets.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-5 sm:p-6 focus:outline-none">
      <div className="flex items-start justify-between gap-3 mb-5"><h2 id={titleId} className="text-xl font-bold text-gray-800">{title}</h2><button aria-label="Close dialog" disabled={busy} onClick={onClose} className={`p-1 rounded hover:bg-gray-100 ${disabledClass}`}><X className="w-5 h-5" /></button></div>
      {children}
    </div>
  </div>;
};
