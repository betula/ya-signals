import React from 'react';
import { collect, unsubscriber, run } from 'unsubscriber';
import { signal, wrap, SignalReadonly } from './signal';

export function hook<T>(Class: (() => T) | (new () => T)): (() => T);
export function hook<T, M>(Class: ((params: SignalReadonly<M>) => T) | (new (params: SignalReadonly<M>) => T)): ((params: M) => T);
export function hook<T, M>(Class: ((params?: SignalReadonly<M>) => T) | (new (params?: SignalReadonly<M>) => T)): ((params?: M) => T) {
  return (params: M) => {
    const [instance, unsubs, signalParams] = React.useMemo(() => {
      const signalParams = signal(params);
      const wrapped = wrap(signalParams.get);
      const unsubs = unsubscriber();
      return [
        collect(unsubs, () => (
          Class.prototype === void 0
            ? (Class as (params?: SignalReadonly<M>) => T)(wrapped)
            : new (Class as new (params?: SignalReadonly<M>) => T)(wrapped)
        )),
        unsubs,
        signalParams
      ]
    }, []);

    React.useEffect(() => () => run(unsubs), [unsubs]);
    signalParams(params);
    return instance;
  }
}