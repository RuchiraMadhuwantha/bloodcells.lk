import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

export const HOSPITAL_TYPES = [
  'Government Hospital', 'Teaching Hospital', 'Base Hospital',
  'District General Hospital', 'Private Hospital', 'Other',
];

export const hospitalStatusBadge = (status) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Pending':
      return 'yellow';
    case 'Rejected':
    case 'Inactive':
    default:
      return 'gray';
  }
};

const HospitalContext = createContext(null);
export const useHospitals = () => useContext(HospitalContext);

export const HospitalProvider = ({ children }) => {
  const { role, isAuthenticated } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setHospitals([]);
      setStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Only the blood bank may see the full list; everyone else gets the
      // approved/active centres from the database.
      if (role === 'blood_bank' || role === 'admin') {
        const data = await api.listAllHospitals();
        setHospitals(data.hospitals || []);
        setStats(data.stats || null);
      } else {
        const data = await api.listActiveHospitals();
        setHospitals(data.hospitals || []);
        setStats(null);
      }
    } catch (e) {
      setError(e.message);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [role, isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingCount = stats?.pending ?? hospitals.filter((h) => h.status === 'Pending').length;

  const approve = async (id) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api.approveHospital(hospital.userId);
    await refresh();
    return hospital;
  };

  const reject = async (id, reason) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api.rejectHospital(hospital.userId, reason);
    await refresh();
    return hospital;
  };

  const reviewAgain = async (id) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api.reviewHospitalAgain(hospital.userId);
    await refresh();
    return hospital;
  };

  const value = {
    hospitals,
    stats,
    pendingCount,
    loading,
    error,
    approve,
    reject,
    reviewAgain,
    refresh,
  };

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
};
