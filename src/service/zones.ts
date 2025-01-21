import type * as AsyncHooksModule from 'node:async_hooks';
import { NamedLogger } from '../logger/logger';

const logger = new NamedLogger('zones');

type AsyncHooks = typeof AsyncHooksModule;

export type ZoneId = number;

const isNode = () => typeof window === 'undefined';

let nodeAsyncHooksModulePromise: Promise<AsyncHooks> | undefined;
export const asyncHooksZonator = async () => {
  const asyncHooks = await (nodeAsyncHooksModulePromise ??= import('node:async_hooks'));
  const zoneIndex = new Map<number, ZoneId>();
  let zoneId: ZoneId = 0;
  asyncHooks
    .createHook({
      init(asyncId, _type, triggerAsyncId) {
        zoneIndex.set(asyncId, zoneIndex.get(triggerAsyncId) ?? 0);
      },
      before(asyncId) {
        zoneId = zoneIndex.get(asyncId) ?? 0; // root zone
      },
      destroy(asyncId) {
        zoneIndex.delete(asyncId);
      },
    })
    .enable();
  return {
    getZoneId: () => zoneId,
    ensureZone: () => {
      zoneId = asyncHooks.executionAsyncId();
      zoneIndex.set(zoneId, zoneId);
    },
    createCheckDestroy: () => {
      const keepZoneId = zoneId;
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
  ensureZone(): void; // Function for set current zone_id when new isolate starts
  createCheckDestroy(): () => void;
}

let zonator: Zonator | undefined;

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
