import { vi } from 'vitest';

// ResizeObserver mock
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as any;

// window.open mock
window.open = vi.fn();
