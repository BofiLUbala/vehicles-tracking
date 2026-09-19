import { vi } from 'vitest';

export const requireNativeModule = vi.fn((_name: string): Record<string, unknown> => ({}));
export const requireOptionalNativeModule = vi.fn((_name: string): null => null);
export const NativeModulesProxy: Record<string, unknown> = {};
export const EventEmitter = vi.fn(function EventEmitter() {
  return {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    emit: vi.fn(),
  };
});

export default {
  requireNativeModule,
  requireOptionalNativeModule,
  NativeModulesProxy,
  EventEmitter,
};
