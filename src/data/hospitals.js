import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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

const getAuthToken = () => localStorage.getItem('authToken') || '';

const api = async (path, options = {}) => {
  const res = await fetch(`http://localhost:5000/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed.');
  return data;
};

export const HospitalProvider = ({ children }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setHospitals([]);
        return;
      }
      const data = await api('/hospitals');
      const list = (data.hospitals || []).map((h) => ({
        ...h,
        city: h.city || '',
      }));
      setHospitals(list);
    } catch (e) {
      setError(e.message);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingCount = hospitals.filter((h) => h.status === 'Pending').length;

  const approve = async (id) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api(`/hospitals/${hospital.userId}/approve`, { method: 'PUT' });
    await refresh();
    return hospital;
  };

  const reject = async (id) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api(`/hospitals/${hospital.userId}/reject`, { method: 'PUT' });
    await refresh();
    return hospital;
  };

  const reviewAgain = async (id) => {
    const hospital = hospitals.find((h) => h.id === id);
    if (!hospital) return;
    await api(`/hospitals/${hospital.userId}/review-again`, { method: 'PUT' });
    await refresh();
    return hospital;
  };

  const value = {
    hospitals,
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
