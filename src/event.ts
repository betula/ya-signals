import { event as originEvent, listen } from 'evemin';
import { un } from 'unsubscriber';

export interface Event<T> {
  <T>(value: T): void;
  subscribe(listener: (value: T) => void): (() => void);
}

export interface LightEvent extends Event<void> {
  (): void;
  subscribe(listener: () => void): (() => void);
}

export const event = <T = void>(): T extends void ? LightEvent : Event<T> => {
  const fn = originEvent() as any;
  fn.subscribe = (listener) => un(listen(fn, listener));
  return fn;
}