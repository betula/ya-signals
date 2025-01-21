import React, { createContext, PropsWithChildren, useContext } from 'react';
import type { HookWithoutParams, LogicWithoutParams, LogicWithParams } from './hook';
import { hook } from './hook';
import { type LikeStruct } from './structSignal';

type ReturnTypeWithParams<T, M extends LikeStruct> = readonly [
  HookWithoutParams<T>,
  (props: PropsWithChildren<M>) => JSX.Element,
  React.Consumer<T>,
];
type ReturnTypeWithoutParams<T> = readonly [
  HookWithoutParams<T>,
  (props: PropsWithChildren) => JSX.Element,
  React.Consumer<T>,
];

export function contextHook<T>(Class: LogicWithoutParams<T>): ReturnTypeWithoutParams<T>;
export function contextHook<T, M extends LikeStruct>(Class: LogicWithParams<T, M>): ReturnTypeWithParams<T, M>;
export function contextHook<T, Params extends LikeStruct>(
  Logic: LogicWithoutParams<T> | LogicWithParams<T, Params>,
): ReturnTypeWithoutParams<T> | ReturnTypeWithParams<T, Params> {
  const useInstance = hook(Logic as LogicWithParams<T, Params>);
  const Context = createContext(undefined as T);
  const useStore = () => useContext(Context);
  const Provider = ({ children, ...p }: PropsWithChildren<Params>) => {
    const store = useInstance(p as Params);
    return <Context.Provider value={store}>{children}</Context.Provider>;
  };

  return [useStore, Provider, Context.Consumer] as const;
}
