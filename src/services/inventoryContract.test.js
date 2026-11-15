import { adjustInventory } from './api';
import { apiPost } from './apiClient';
jest.mock('./apiClient', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn() }));
test('stock adjustment matches the inspected backend bloodGroup contract', () => {
  adjustInventory({ bloodGroup: 'AB-', amount: 4, mode: 'add' });
  expect(apiPost).toHaveBeenCalledWith('/inventory/adjust', { bloodGroup: 'AB-', amount: 4, mode: 'add' });
});
