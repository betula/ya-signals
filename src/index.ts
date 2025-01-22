export { type Signal, type SignalReadonly, signal, wrapSignal, useSignal } from './signal';
export {
  type StructSignal,
  type StructSignalReadonly,
  structSignal,
  wrapStructSignal,
  useStructSignal,
} from './structSignal';
export { isSignal, isStructSignal } from './isSignal';

export { observer, useObserver } from 'mobx-react-lite';
export {
  transaction,
  makeAutoObservable,
  makeObservable,
  createAtom,
  computed,
  observable,
  action,
  comparer,
  toJS,
  type IAtom,
  type IObservableValue,
} from 'mobx';
export { runInAction, type IReactionPublic, trace } from 'mobx';
export { computedFn } from 'mobx-utils';

import './configure';

export { un } from './unsubscriber';
export { Destroyable } from './classes/Destroyable';
export { Initable } from './classes/Initable';

export { autorun, reaction, sync, when } from './reaction';

export { contextHook } from './contextHook';
export { event, type Event } from './event';
export { service, isolate, isolated, scoped, ScopedAsyncResource, initAsyncHooksZonator } from './service';
export { hook, type HookWithParams, type HookWithoutParams } from './hook';
export { untracked } from './untracked';

/**
 * just for subscription to properties
 * */
export function subscribe(...args: unknown[]) {
  return args;
}
