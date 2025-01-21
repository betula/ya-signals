import { comparer, computed as mobxComputed, observable, untracked } from 'mobx';
import { useEffect, useMemo } from 'react';

export const SIGNAL = Symbol('Signal');

export interface SignalOptions {
  shallow?: boolean;
}

export interface SignalReadonly<T> {
  [SIGNAL]: true;
  get value(): T;
  get(): T;
}

export interface Signal<T> extends SignalReadonly<T> {
  (value: T): void;
  update(fn: (value: T) => T): void;
}

export function signal<T>(value: T, options?: SignalOptions): Signal<T> {
  const box = observable.box(value, {
    equals: options?.shallow ? comparer.shallow : comparer.default,
    deep: false,
  });
  return makeSignal(box.get.bind(box), box.set.bind(box));
}

export function wrapSignal<T>(get: () => T): SignalReadonly<T>;
export function wrapSignal<T>(get: () => T, set: (value: T) => void): Signal<T>;
export function wrapSignal<T>(get: () => T, set?: (value: T) => void): SignalReadonly<T> | Signal<T> {
  const box = mobxComputed(get, { equals: comparer.shallow });
  return makeSignal(box.get.bind(box), set!);
}

function makeSignal<T>(get: () => T): SignalReadonly<T>;
function makeSignal<T>(get: () => T, set: (value: T) => void): Signal<T>;
function makeSignal<T>(get: () => T, set?: (value: T) => void): SignalReadonly<T> | Signal<T> {
  const sig = (set as Signal<T>) || ({} as SignalReadonly<T>);
  Object.defineProperty(sig, 'value', { get });
  Object.defineProperty(sig, SIGNAL, { enumerable: false, value: true });
  Object.assign(sig, {
    get,
  });
  if (set) {
    Object.assign(sig, {
      update: (fn: (value: T) => T) => set(fn(untracked(get))),
    });
  }

  return sig;
}

export function useSignal<T, D extends unknown[]>(fn: () => T, deps?: D) {
  const [instance, signalFn] = useMemo(() => {
    const signalFn = signal(fn);

    const instance = wrapSignal(() => {
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
