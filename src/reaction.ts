import { un } from 'unsubscriber';
import {
  autorun as autorunOrigin,
  reaction as reactionOrigin,
  when as whenOrigin
} from 'mobx';

export const autorun = (expression: () => void) => (
  un(autorunOrigin(expression))
);

export const reaction = <T>(expression: () => T, listener: (value: T, prev: T) => void) => (
  un(reactionOrigin(expression, listener))
);

export const sync = <T>(expression: () => T, listener: (value: T, prev: T | undefined) => void) => (
  un(reactionOrigin(expression, listener, { fireImmediately: true }))
);

export const when = (expression: () => boolean): Promise<void> & { cancel(): void } => {
  const promise = whenOrigin(expression);
  un(promise.cancel);
  return promise;
}