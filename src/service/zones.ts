import type * as AsyncHooksModule from 'node:async_hooks';
import { NamedLogger } from '../logger/logger';

const logger = new NamedLogger('zones');

type AsyncHooks = typeof AsyncHooksModule;
type AsyncResource = AsyncHooksModule.AsyncResource;

export type ZoneId = number;

const isNode = () => typeof window === 'undefined';

let nodeAsyncHooksModulePromise: Promise<AsyncHooks> | undefined;
let asyncHooks!: AsyncHooks;

export const asyncHooksZonator = async () => {
  asyncHooks ??= await (nodeAsyncHooksModulePromise ??= import('node:async_hooks'));
  const zoneIndex = new Map<number, ZoneId>();
  let zoneId: ZoneId = 0;
  asyncHooks
    .createHook({
      init(asyncId, _type, triggerAsyncId) {
        zoneIndex.set(asyncId, zoneIndex.get(triggerAsyncId) ?? 0);
      },
      before(asyncId) {
        // Called only before start new async context execution
        zoneId = zoneIndex.get(asyncId) ?? 0; // root zone
      },
      after() {
        // Called only after current async context execution backwards one level up
        zoneId = zoneIndex.get(asyncHooks.triggerAsyncId()) ?? 0; // root zone
      },
      destroy(asyncId) {
        zoneIndex.delete(asyncId);
      },
    })
    .enable();
  return {
    getZoneId: () => zoneId,
    ensureZone: (overrideZoneId?: ZoneId) => {
      if (overrideZoneId === undefined) {
        zoneId = asyncHooks.executionAsyncId();
        zoneIndex.set(zoneId, zoneId);
      } else {
        zoneIndex.set(overrideZoneId, overrideZoneId);
      }
    },
    createCheckDestroy: (overrideZoneId?: ZoneId) => {
      const keepZoneId = overrideZoneId ?? zoneId;
      return () => {
        if (zoneIndex.has(keepZoneId)) {
          logger.warn('Isolation destroyed but zone has not fulfilled async resources');
        }
      };
    },
  } satisfies Zonator;
};

let asyncHooksZonatorPromise: Promise<Zonator>;
export const initAsyncHooksZonator = async () => {
  if (!isNode()) {
    throw new Error('AsyncHooks zonator is not available in current environment');
  }
  if (zonator) {
    logger.warn('Attempt reinit zonator for current process');
  }
  zonator = await (asyncHooksZonatorPromise ??= asyncHooksZonator());
};

export interface Zonator {
  getZoneId(): ZoneId;
  ensureZone(overrideZoneId?: ZoneId): void; // Function for set current zone_id when new isolate starts
  createCheckDestroy(overrideZoneId?: ZoneId): () => void;
}

let zonator!: Zonator;

export const getZoneId = () => zonator?.getZoneId() ?? 0;

export const createIsolate =
  (destroy: () => void) =>
  <T>(fn: () => Promise<T>): Promise<T> => {
    if (!zonator) {
      throw new Error('initAsyncHooksZonator should be called for isolate usage');
    }

    let checkZoneDestroy: () => void;
    const zonePromise = new Promise<T>((resolve, reject) => {
      process.nextTick(() => {
        zonator!.ensureZone();
        checkZoneDestroy = zonator!.createCheckDestroy();
        fn()
          .finally(() => destroy())
          .then(resolve)
          .catch(reject);
      });
    });
    zonePromise.finally(() => checkZoneDestroy());
    return zonePromise;
  };

export const createIsolatedAsyncResourceClass = (destroy: () => void) => {
  return class IsolatedAsyncResource {
    private resource: AsyncResource;
    private zoneId: ZoneId;
    private checkZoneDestroy: () => void;

    runInAsyncScope<This, A extends unknown[], R = unknown>(
      target: (this: This, ...args: A) => R,
      thisArg?: This,
      ...args: A
    ): R {
      return this.resource.runInAsyncScope(target, thisArg, ...args);
    }

    constructor(name = 'IsolatedAsyncResource') {
      if (!zonator) {
        throw new Error('initAsyncHooksZonator should be called for isolate usage');
      }
      this.resource = new asyncHooks.AsyncResource(name, { requireManualDestroy: true });
      this.zoneId = this.resource.asyncId();
      zonator.ensureZone(this.zoneId);
      this.checkZoneDestroy = zonator.createCheckDestroy(this.zoneId);
    }

    emitDestroy(): this {
      this.runInAsyncScope(destroy);
      this.resource.emitDestroy();
      this.checkZoneDestroy();
      return this;
    }
  };
};
