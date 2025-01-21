import { Initable } from './classes/Initable';
import { collect, Unsubscriber } from './unsubscriber/index';
import { untracked } from './untracked';

export function runInstanceInit(instance: unknown, unsubs: Unsubscriber) {
  collect(
    unsubs,
    untracked.func(() => {
      if (instance instanceof Initable) {
        instance.runInit();
        return;
      }
      if (instance instanceof Object && 'init' in instance && typeof instance.init === 'function') {
        instance.init();
        return;
      }
    }),
  );
}
