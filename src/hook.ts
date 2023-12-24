import React from 'react';
import { collect, unsubscriber, run } from 'unsubscriber';
import { signal, wrap, SignalReadonly } from './signal';
import { untracked } from './untracked';

export function hook<T>(Class: (() => T) | (new () => T)): (() => T);
export function hook<T, M>(Class: ((params: SignalReadonly<M>) => T) | (new (params: SignalReadonly<M>) => T)): ((params: M) => T);
export function hook<T, M>(Class: ((params?: SignalReadonly<M>) => T) | (new (params?: SignalReadonly<M>) => T)): ((params?: M) => T) {
  return (params: M) => {
    const [instance, unsubs, signalParams] = React.useMemo(() => {
      const signalParams = signal(params);
      const wrapped = wrap(signalParams.get);
      const unsubs = unsubscriber();
      return [
        collect(unsubs, untracked.func(() => (
          Class.prototype === void 0
            ? (Class as (params?: SignalReadonly<M>) => T)(wrapped)
            : new (Class as new (params?: SignalReadonly<M>) => T)(wrapped)
        ))),
        unsubs,
        signalParams
      ]
    }, []);

    React.useEffect(() => () => run(unsubs), [unsubs]);


    // For prevent the error 
    // Error: Cannot update a component (`Unknown`) while rendering a different component (`Unknown`).
    // We should add time for render phase finished before update params,
    // that can initiate next update sycle inside current. We use Promise microtask queue for prevent it.
    // (I believe one time MobX will implement "Unit of Work" pattern for observer updating)

    Promise.resolve().then(() => {
      signalParams(params);
    });
    return instance;
  }
}