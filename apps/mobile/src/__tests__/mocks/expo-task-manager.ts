import { vi } from 'vitest';

export const defineTask = vi.fn();
export const isTaskDefined = vi.fn(() => false);
export const getRegisteredTasksAsync = vi.fn(async () => []);
export const unregisterAllTasksAsync = vi.fn(async () => undefined);

export default {
  defineTask,
  isTaskDefined,
  getRegisteredTasksAsync,
  unregisterAllTasksAsync,
};
