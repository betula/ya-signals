import { service } from './service';
import { createIsolate } from './zones';

export const isolate = createIsolate(() => service.destroy());
export const isolated =
  <Args extends unknown[], T>(fn: (...args: Args) => Promise<T>) =>
  (...args: Args) =>
    isolate(() => fn(...args));
