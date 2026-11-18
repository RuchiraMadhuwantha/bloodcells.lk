import React, { createContext, useContext, useRef, useState } from 'react';
import { DashboardLayout } from '../DashboardShell';
import { Button } from '../UIComponents';
import { useAuth } from '../../context/AuthContext';
import { Dialog, ErrorPanel, Field, inputClass, disabledClass } from '../donor/DonorUI';
export { useDonorResource as useBankResource, Loading, ErrorPanel, Notice, EmptyState, ResourceState, Field, Filters, Dialog, Details, inputClass, disabledClass } from '../donor/DonorUI';
export { BLOOD_GROUPS, formatDate, todayStr } from '../donor/donorUtils';
export { titleCase, statusColor } from '../hospital/hospitalUtils';
const Selection = createContext(null);
export const BankSelectionProvider = ({ children }) => {
  const [recipients, setRecipients] = useState([]);
  const [notificationTab, setNotificationTab] = useState(null);
  return <Selection.Provider value={{ recipients, setRecipients, notificationTab, setNotificationTab }}>{children}</Selection.Provider>;
};
export const useBankSelection = () => useContext(Selection);
export const BankLayout = ({ nav, children, ...props }) => {
  const { user } = useAuth();
  return <DashboardLayout {...nav} onNotifications={()=>nav.onNavigate('bank-notifications')} userName={user?.username || 'Blood Bank'} role="Bank Manager" {...props}>{children}</DashboardLayout>;
};
export const useBankPermissions = () => {
  const { user } = useAuth();
  // Current backend mutation/read-management routes accept blood_bank only.
  return user?.role === 'blood_bank';
};
export const useConfirmedAction = (refresh) => {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [note, setNote] = useState('');
  const lock = useRef(false);
  const confirm = async () => {
    if (lock.current || (target.requireNote && !note.trim())) return;
    lock.current = true; setBusy(true); setError(null); setSuccess(null);
    try {
      const message = await target.run(note.trim());
      setSuccess(message); setTarget(null); refresh();
    } catch (e) { setError(e.message || 'The action could not be completed.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return {
    busy, ask: (next) => { setNote(''); setError(null); setTarget(next); },
    content: <>
      {success && <p role="status" className="p-3 mb-4 bg-green-50 text-green-800 rounded-lg">{success}</p>}
      {target && <Dialog title={target.title} busy={busy} onClose={() => setTarget(null)}>
        <p className="text-sm text-gray-600 mb-4">{target.description}</p>
        {target.requireNote && <Field label="Decision reason"><textarea maxLength={500} rows={3} disabled={busy} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>}
        {error && <div className="mt-4"><ErrorPanel message={error} /></div>}
        <div className="flex flex-wrap justify-end gap-3 mt-5"><Button variant="ghost" disabled={busy} onClick={() => setTarget(null)}>Back</Button><Button disabled={busy || (target.requireNote && !note.trim())} className={disabledClass} onClick={confirm}>{busy ? 'Processing...' : 'Confirm'}</Button></div>
      </Dialog>}
    </>,
  };
};
