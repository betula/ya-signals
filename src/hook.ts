import React from 'react';
import { collect, unsubscriber, run } from 'unsubscriber';
import { signal, wrap, SignalReadonly } from './signal';

export const hook = <T>(Class: ((params?: SignalReadonly<any>) => T) | (new (params?: SignalReadonly<any>) => T)): ((params?: any) => T) => {

  return (params: any) => {
    const [instance, unsubs, signalParams] = React.useMemo(() => {
      const signalParams = signal(params);
      const wrapped = wrap(signalParams.get);
      const unsubs = unsubscriber();
      return [
        collect(unsubs, () => (
          Class.prototype === void 0
            ? (Class as (params?: SignalReadonly<any>) => T)(wrapped)
            : new (Class as new (params?: SignalReadonly<any>) => T)(wrapped)
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