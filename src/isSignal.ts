import { SIGNAL } from './signal';
import { STRUCT_SIGNAL, StructSignal, StructSignalReadonly } from './structSignal';

export function isSignal<T, S extends StructSignal<T> | StructSignalReadonly<T>>(reactive: S | unknown): reactive is S {
  return reactive instanceof Object && SIGNAL in reactive;
}
export function isStructSignal<T, S extends StructSignal<T> | StructSignalReadonly<T>>(
  reactive: S | unknown,
): reactive is S {
  return reactive instanceof Object && STRUCT_SIGNAL in reactive;
}
