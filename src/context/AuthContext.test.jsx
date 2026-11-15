import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../services/api';
jest.mock('../services/api');
const user = { username: 'bank', role: 'blood_bank' };
const Probe = () => {
  const auth = useAuth();
  return <><span>{auth.booting ? 'Checking' : auth.isAuthenticated ? 'Signed in' : 'Signed out'}</span><span>{auth.verificationError}</span><button onClick={auth.retrySession}>Retry</button></>;
};
beforeEach(() => { localStorage.clear(); jest.resetAllMocks(); localStorage.setItem('authToken', 'stored-token'); localStorage.setItem('authUser', JSON.stringify(user)); });
test('restores the saved session after a refresh', async () => {
  api.me.mockResolvedValue({ user });
  const page = render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Signed in'); page.unmount();
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Signed in');
  expect(localStorage.getItem('authToken')).toBe('stored-token');
});
test('temporary server failure preserves credentials and allows retry', async () => {
  api.me.mockRejectedValueOnce(Object.assign(new Error('Server unavailable'), { status: 503 })).mockResolvedValueOnce({ user });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Server unavailable');
  expect(localStorage.getItem('authToken')).toBe('stored-token');
  fireEvent.click(screen.getByText('Retry'));
  await waitFor(() => expect(screen.queryByText('Server unavailable')).not.toBeInTheDocument());
  await screen.findByText('Signed in');
});
test.each([401, 403])('invalid or disabled session (%s) is cleared', async (status) => {
  api.me.mockRejectedValue(Object.assign(new Error('Session rejected'), { status }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('Signed out');
  expect(localStorage.getItem('authToken')).toBeNull();
});
