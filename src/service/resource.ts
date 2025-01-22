import { service } from './service';
import { createIsolatedAsyncResourceClass } from './zones';

export type ScopedAsyncResource = InstanceType<typeof ScopedAsyncResource>;
export const ScopedAsyncResource = createIsolatedAsyncResourceClass(() => service.destroy());

export function scoped<This extends ScopedAsyncResource, A extends unknown[] = unknown[], R = unknown>(
  target: (this: This, ...args: A) => R,
  _context: ClassMethodDecoratorContext<This, (this: This, ...args: A) => R>,
) {
  return function (this: This, ...args: A) {
    return this.runInAsyncScope(target, this, ...args);
  };
}
