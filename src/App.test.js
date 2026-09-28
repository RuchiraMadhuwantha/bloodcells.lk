import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

test('renders the public homepage by default', async () => {
  render(<App />);

  expect(await screen.findByText(/welcome to/i)).toBeInTheDocument();
  // Both a desktop and a mobile Login button are rendered.
  expect(screen.getAllByRole('button', { name: /login/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /register/i }).length).toBeGreaterThan(0);
});

test('never exposes a dashboard to a signed-out visitor', async () => {
  render(<App />);

  expect(await screen.findByText(/welcome to/i)).toBeInTheDocument();
  // Portal-only copy must not be reachable without a session.
  expect(screen.queryByText(/donor portal/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/blood bank portal/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/hospital portal/i)).not.toBeInTheDocument();
});
