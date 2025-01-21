import { observable } from 'mobx';
import { LikeStruct, structSignal, StructSignalReadonly } from './structSignal';

interface HasInit {
  init?: () => void;
}

export const createHookInstance = <T extends LikeStruct, M>(
  Class: new (params: StructSignalReadonly<T>) => M,
  params: T,
): M => {
  const classInstance = new Class(structSignal(params)) as M & HasInit;

  if (classInstance.init) {
    classInstance.init();
  }

  return classInstance;
};

export const observableStruct = <T extends object>(value: T) => observable(value, {}, { deep: false });
