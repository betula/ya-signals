import { un } from './unsubscriber';

/*
Modern and blazing fast event emitter

- Zero-cost abstraction
- High performance
- Super small

🌈 2x times faster standard node.js event emitter
 */

const LISTENERS = Symbol('listeners');

interface EventParametrized<T> {
  [LISTENERS]: ((value: T) => void)[];
  (listener: (value: T) => void): () => void;
  fire(value: T): void;
  connect(source: Event<T>): () => void;
  clear(): void;
}

interface EventLite extends EventParametrized<void> {
  [LISTENERS]: (() => void)[];
  (listener: () => void): () => void;
  fire(): void;
}

export type Event<T = void> = [T] extends [void] ? EventLite : EventParametrized<T>;

const subscribe = <T>(ev: Event<T>, fn: (value?: T) => void) => {
  if (!ev[LISTENERS].includes(fn)) {
    ev[LISTENERS] = ev[LISTENERS].concat(fn);
  }
  return () => {
    ev[LISTENERS] = ev[LISTENERS].filter(f => f !== fn);
  };
};

export const event = <T = void>(): Event<T> => {
  const ev = ((listener: (value?: T) => void) => un(subscribe(ev, listener))) as Event<T>;
  const fire = (data: T) => {
    const listeners = ev[LISTENERS];
    // eslint-disable-next-line unicorn/no-for-loop
    for (let i = 0; i < listeners.length; i++) {
      listeners[i]?.(data);
    }
  };
  const connect = (source: Event<T>) => {
    return source(fire as () => void);
  };
  const clear = () => {
    ev[LISTENERS] = [];
  };
  ev[LISTENERS] = [];
  ev.fire = fire;
  ev.connect = connect;
  ev.clear = clear;
  return ev;
};
