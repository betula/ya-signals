import { observable, untracked, computed as mobxComputed, comparer } from 'mobx';
import { reaction, sync } from './reaction';

export interface ReadonlySignal<T> {
  get value(): T;
  get(): T;
  subscribe(listener: (current: T, prev: T) =>void): () => void;
  sync(listener: (current: T, prev: T | undefined) =>void): () => void;
}

export interface Signal<T> extends ReadonlySignal<T> {
  (value: T): T,
  update(fn: (value: T) => T);
}

export function signal<T>(value: T): Signal<T> {
    const box = observable.box(value, { equals: comparer.default });
    const get = box.get.bind(box);
    const set = box.set.bind(box);
    return make(get, set);
}

export function wrap<T>(readfn: () => T): ReadonlySignal<T>;
export function wrap<T>(readfn: () => T, writefn: (value: T) => void): Signal<T>;
export function wrap<T>(readfn: () => T, writefn?: (value: T) => void): (ReadonlySignal<T> | Signal<T>) {
  const box = mobxComputed(readfn, { equals: comparer.shallow });
  const get = box.get.bind(box);
  return make(get, writefn);
}

function make<T>(readfn: () => T): ReadonlySignal<T>;
function make<T>(readfn: () => T, writefn: (value: T) => void): Signal<T>;
function make<T>(readfn: () => T, writefn?: (value: T) => void): (ReadonlySignal<T> | Signal<T>) {
    const get = readfn;
    const h = writefn || {};
    Object.defineProperty(h, 'value', { get })
    Object.assign(h, {
      get,
      subscribe: (listener) => reaction(get, listener),
      sync: (listener) => sync(get, listener)
    });
    if (writefn) {
      Object.assign(h, {
        update: (fn: (value: T) => T) => writefn(fn(untracked(get))),
      })
    }

    return h as any;
}