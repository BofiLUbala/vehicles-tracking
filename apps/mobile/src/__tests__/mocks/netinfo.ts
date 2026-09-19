import { vi } from 'vitest';

const NetInfo = {
  addEventListener: vi.fn(() => vi.fn()),
  fetch: vi.fn(async () => ({ isConnected: true, isInternetReachable: true })),
};

export default NetInfo;

export { NetInfo };
