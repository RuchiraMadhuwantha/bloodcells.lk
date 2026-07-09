import React from 'react';

export const RegistrationTypeSelector = ({ value, onChange }) => {
  return (
    <div className="inline-flex rounded-full bg-white border border-gray-100 shadow-sm p-1">
      <button
        onClick={() => onChange('donor')}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${value === 'donor' ? 'bg-red-600 text-white' : 'text-red-600'}`}
        aria-pressed={value === 'donor'}
      >
        Donor Registration
      </button>
      <button
        onClick={() => onChange('hospital')}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${value === 'hospital' ? 'bg-red-600 text-white' : 'text-red-600'}`}
        aria-pressed={value === 'hospital'}
      >
        Hospital Registration
      </button>
    </div>
  );
};

export default RegistrationTypeSelector;
