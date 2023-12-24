import { untracked as untrackedOrigin } from 'mobx';

interface Untracked {
  <T>(action: () => T): T;
  func: <T extends any[], R>(fn: (...args: T) => R) => ((...args: T) => R);
}

export const untracked: Untracked = (action) => {
  return untrackedOrigin(action);
}

untracked.func = (fn) => {
  return function handle() {
    return untracked(() => fn.apply(this, arguments));
  }
}