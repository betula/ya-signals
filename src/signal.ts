import { observable, untracked, computed as mobxComputed } from 'mobx';

export interface ReadonlySignal<T> {
  get value(): T;
  get(): T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  (value: T): T,
  update(fn: (value: T) => T);
}

export function signalFactory<T>(value: T, equals?: (a: T, b: T) => boolean): Signal<T> {
    const box = observable.box(value, { equals });
    const set = box.set.bind(box);
    const get = box.get.bind(box);

    Object.defineProperty(set, 'value', { get });
    set.get = get;
    set.update = (fn: (value: T) => T) => set(fn(untracked(set.get)));

    return set;
}

export function computedFactory<T>(fn: () => T, equals?: (a: T, b: T) => boolean): ReadonlySignal<T> {
    const box = mobxComputed(fn, { equals });
    const get = box.get.bind(box);
    const h = {
      get,
      get value() {
        return get();
      }
    };

    return h;
}