import React, { useEffect } from 'react';
import { isStructSignal } from './isSignal';
import { runInstanceInit } from './runInstanceInit';
import { type LikeStruct, StructSignal, structSignal, StructSignalReadonly } from './structSignal';
import { collect, run, unsubscriber } from './unsubscriber';
import { untracked } from './untracked';

type ClassLogic<T, P> = new (params: P) => T;
type FunctionLogic<T, P> = (params: P) => T;

export type LogicWithoutParams<T> = ClassLogic<T, void> | FunctionLogic<T, void>;
export type LogicWithParams<T, P> = ClassLogic<T, StructSignalReadonly<P>> | FunctionLogic<T, StructSignalReadonly<P>>;

function instantiateLogic<T>(Logic: LogicWithoutParams<T>): T;
function instantiateLogic<T, P>(Logic: LogicWithParams<T, P>, params: P): T;
function instantiateLogic<T, P>(Logic: LogicWithParams<T, P> | LogicWithoutParams<T>, params?: P): T {
  // It's very challenging to differentiate a function from a class
  // the type-check below only ensures that we won't call a new on an arrow function
  // it still can fire `new` on the plain function.
  // But it should be okay for us here, because we're always waiting an object from the functions
  if (Logic.prototype === undefined) {
    // The function overloading ensures that param would be `undefined` if Logic is LogicWithoutParams
    // but, still, we pass param as undefined, which is not absolutely the same as not passing param at all
    // keeping that in mind
    return (Logic as FunctionLogic<T, P>)(params!);
  }
  return new (Logic as ClassLogic<T, P>)(params!);
}

type HookParams<M extends LikeStruct> = M | StructSignalReadonly<M>;
export type HookWithParams<T, M extends LikeStruct> = (params: HookParams<M>) => T;
export type HookWithoutParams<T> = () => T;

export function hook<T>(Class: LogicWithoutParams<T>): HookWithoutParams<T>;
export function hook<T, M extends LikeStruct>(Class: LogicWithParams<T, M>): HookWithParams<T, M>;
export function hook<T, Params extends LikeStruct>(
  Logic: LogicWithoutParams<T> | LogicWithParams<T, Params>,
): HookWithoutParams<T> | HookWithParams<T, Params> {
  return (params?: HookParams<Params>) => {
    const isWithParams = params !== undefined;
    const isParamsStructSignal = isStructSignal(params);

    const [instance, unsubs, signalParams] = React.useMemo(() => {
      let signalParams: StructSignal<Params> | StructSignalReadonly<Params> | null = isParamsStructSignal
        ? params
        : null;
      if (signalParams === null && isWithParams) {
        signalParams = structSignal(params);
      }

      const unsubs = unsubscriber();
      return [
        collect(
          unsubs,
          untracked.func(() => {
            if (signalParams) {
              return instantiateLogic(Logic as LogicWithParams<T, Params>, signalParams);
            }
            return instantiateLogic(Logic as LogicWithoutParams<T>);
          }),
        ),
        unsubs,
        signalParams,
      ];
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      runInstanceInit(instance, unsubs);
      return () => run(unsubs);
    }, [unsubs, instance]);

    // For prevent the error
    // Error: Cannot update a component (`Unknown`) while rendering a different component (`Unknown`).
    // We should add time for render phase finished before update params,
    // that can initiate next update sycle inside current. We use Promise microtask queue for prevent it.
    // (I believe one time MobX will implement "Unit of Work" pattern for observer updating)

    const deps = isWithParams && !isParamsStructSignal ? Object.values(params) : [];
    useEffect(() => {
      if (!isParamsStructSignal && isWithParams && typeof signalParams === 'function') {
        signalParams(params);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return instance;
  };
}
