import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventsNewsPage from './EventsNewsPage';
import { listPublicCampaigns } from './services/api';
jest.mock('./services/api');

test('Events loads saved published campaigns and refreshes after an error', async () => {
  listPublicCampaigns.mockRejectedValueOnce(new Error('Server unavailable'));
  render(<EventsNewsPage onNavigate={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
  listPublicCampaigns.mockResolvedValueOnce({ campaigns: [{ id: 9, name: 'Saved blood bank campaign', status: 'Upcoming', date: '2099-12-20', startTime: '09:00', endTime: '12:00', venueName: 'Approved centre', district: 'Kandy', targetDonors: 50 }] });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh campaigns' }));
  expect(await screen.findByRole('heading', { name: 'Saved blood bank campaign' })).toBeInTheDocument();
  expect(screen.getByText('Approved centre, Kandy')).toBeInTheDocument();
  expect(screen.queryByText('Colombo Mega Blood Drive 2026')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Campaigns', exact: true }));
  expect(screen.getByRole('heading', { name: 'Saved blood bank campaign' })).toBeInTheDocument();
});
