import { untracked as untrackedOrigin } from 'mobx';

interface Untracked {
  <T>(action: () => T): T;
  func: <T extends unknown[], R>(fn: (...args: T) => R) => (...args: T) => R;
}

export const untracked: Untracked = action => {
  return untrackedOrigin(action);
};

untracked.func = fn => {
  return function handle(this: unknown, ...args) {
    return untracked(() => fn.apply(this, args));
  };
};
