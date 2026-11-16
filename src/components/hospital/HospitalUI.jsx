import React, { createContext, useContext, useEffect } from 'react';
import { DashboardLayout } from '../DashboardShell';
import { Button } from '../UIComponents';
import { useAuth } from '../../context/AuthContext';
import * as service from '../../services/hospitalService';
import { accountMessage } from './hospitalUtils';
// Reuse the existing portal-neutral primitives without changing donor behavior.
import { useDonorResource as useResource, Loading, ErrorPanel, Notice } from '../donor/DonorUI';
export { useDonorResource as useHospitalResource, Loading, ErrorPanel, Notice, EmptyState, ResourceState, Filters, Field, Dialog, Details, inputClass, disabledClass } from '../donor/DonorUI';

const HospitalContext = createContext(null);
export const useHospital = () => useContext(HospitalContext);
export const HospitalLayout = ({ nav, children, ...props }) => {
  const { user } = useAuth();
  const context = useHospital();
  return <DashboardLayout {...nav} notifications={(context?.inbox?.data?.notifications || []).filter(n => !n.isRead)} onNotifications={() => nav.onNavigate('hospital-notifications')} userName={context?.hospital?.hospitalName || user?.username || 'Hospital'} role="Hospital" {...props}>{children}</DashboardLayout>;
};
const ApprovedHospital = ({ nav, children }) => {
  const resource = useResource(service.getHospital);
  const inbox = useResource(service.getNotifications);
  const refreshInbox = inbox.refresh;
  useEffect(() => {
    window.addEventListener('focus', refreshInbox);
    const timer = window.setInterval(() => { if (!document.hidden) refreshInbox(); }, 30000);
    return () => { window.removeEventListener('focus', refreshInbox); window.clearInterval(timer); };
  }, [refreshInbox]);
  if (resource.loading) return <HospitalLayout nav={nav} title="Hospital Portal"><Loading label="Verifying hospital access..." /></HospitalLayout>;
  if (resource.error) return <HospitalLayout nav={{ ...nav, items: [] }} title="Hospital access unavailable"><ErrorPanel message={resource.error} onRetry={resource.refresh} /></HospitalLayout>;
  const hospital = resource.data;
  if (!hospital || hospital.accountStatus !== 'active') return <HospitalLayout nav={{ ...nav, items: [] }} title="Hospital approval required"><Notice>{accountMessage(hospital?.accountStatus)} {hospital?.rejectionReason}</Notice><Button onClick={nav.onLogout}>Return to sign in</Button></HospitalLayout>;
  return <HospitalContext.Provider value={{ hospital, refresh: resource.refresh, inbox }}>{children}</HospitalContext.Provider>;
};
// A hospital-only presentation guard; existing JWT/session/role handling is intact.
export const HospitalPortal = ({ nav, children }) => {
  const { user } = useAuth();
  if (user?.role !== 'hospital' || user?.account_status !== 'active') return <HospitalLayout nav={{ ...nav, items: [] }} title="Hospital approval required"><Notice>{accountMessage(user?.account_status)}</Notice><Button onClick={nav.onLogout}>Return to sign in</Button></HospitalLayout>;
  return <ApprovedHospital nav={nav}>{children}</ApprovedHospital>;
};
