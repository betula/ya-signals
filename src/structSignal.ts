import type { IComputedValue } from 'mobx';
import { comparer, computed as mobxComputed, observable } from 'mobx';
import { useEffect, useMemo } from 'react';
import { signal } from './signal';
import { un } from './unsubscriber';

export const STRUCT_SIGNAL = Symbol('StructSignal');

export type LikeStruct = { [index: string | symbol]: unknown };

interface StructSignalInternal<T> {
  [STRUCT_SIGNAL]: true;
  toJSON(): T;
}

export type StructSignalReadonly<T> = Readonly<T> & StructSignalInternal<T>;
export type StructSignal<T, M = T> = Readonly<T> & StructSignalInternal<T> & ((value: M) => void);

export function structSignal<T extends LikeStruct>(value: T): StructSignal<T> {
  const box = observable.box(value, {
    equals: comparer.shallow,
    deep: false,
  });
  return makeWriteOptimizer(box.get.bind(box), box.set.bind(box));
}

export function wrapStructSignal<T extends LikeStruct>(get: () => T): StructSignalReadonly<T>;
export function wrapStructSignal<T extends LikeStruct, M = T>(
  get: () => T,
  set: (value: M) => void,
): StructSignal<T, M>;
export function wrapStructSignal<T extends LikeStruct>(
  get: () => T,
  set?: (value: T) => void,
): StructSignal<T> | StructSignalReadonly<T> {
  const box = mobxComputed(get, { equals: comparer.shallow });

  if (set) {
    return makeWriteOptimizer(box.get.bind(box), set) as StructSignal<T>;
  } else {
    return makeReadOptimizer(box.get.bind(box)) as StructSignalReadonly<T>;
  }
}

function makeWriteOptimizer<T extends LikeStruct>(get: () => T, set: (value: T) => void): StructSignal<T> {
  return makeReadOptimizer(get, {
    apply(_target, _thisArg, argArray) {
      set(argArray[0]);
    },
  }) as StructSignal<T>;
}

function makeReadOptimizer<T extends LikeStruct>(
  get: () => T,
  extraProxyHandler?: ProxyHandler<StructSignal<T>>,
): StructSignalReadonly<T> {
  const cacheGet = new Map<string | symbol, IComputedValue<unknown>>();
  const cacheHas = new Map<string | symbol, IComputedValue<unknown>>();
  un(() => {
    cacheGet.clear();
    cacheHas.clear();
  });

  const target = extraProxyHandler && 'apply' in extraProxyHandler ? () => {} : {};

  return new Proxy(target as StructSignalReadonly<T>, {
    ...extraProxyHandler,
    get(_target, prop) {
      if (prop === STRUCT_SIGNAL) {
        return true;
      }
      if (prop === 'toJSON') {
        return get;
      }

      let ret;
      if (cacheGet.has(prop)) {
        ret = cacheGet.get(prop);
      } else {
        ret = mobxComputed(() => get()?.[prop], { equals: comparer.default });
        cacheGet.set(prop, ret);
      }
      return ret?.get();
    },
    has(_target, prop) {
      if (prop === STRUCT_SIGNAL) {
        return true;
      }

      let ret;
      if (cacheHas.has(prop)) {
        ret = cacheHas.get(prop);
      } else {
        ret = mobxComputed(
          () => {
            const obj = get();
            return obj instanceof Object && prop in obj;
          },
          { equals: comparer.identity },
        );
        cacheHas.set(prop, ret);
      }
      return !!ret?.get();
    },
  });
}

export function useStructSignal<T extends { [index: string | symbol]: unknown }, D extends unknown[]>(
  fn: () => T,
  deps?: D,
) {
  const [instance, signalFn] = useMemo(() => {
    const signalFn = signal(fn);

    const instance = wrapStructSignal(() => {
      const fn = signalFn.value;
      return fn();
    });

    return [instance, signalFn];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For prevent the error
  // Error: Cannot update a component (`Unknown`) while rendering a different component (`Unknown`).
  // We should add time for render phase finished before update params,
  // that can initiate next update sycle inside current. We use Promise microtask queue for prevent it.
  // (I believe one time MobX will implement "Unit of Work" pattern for observer updating)

  useEffect(() => {
    signalFn(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);

  return instance;
}
