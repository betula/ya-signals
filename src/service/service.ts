import {
  Ctor,
  DeepPartial,
  getGlobalServicesRegistry,
  SERVICE_KEY,
  ServiceHandler,
  ServiceInternal,
} from './ServiceHandler';

interface ServiceFactory {
  <T extends object>(Class: Ctor<T>): T & ServiceInternal<T>;
  mock<T extends object>(serviceInstance: ServiceInternal<T>, impl: DeepPartial<T>): T;
  instantiate<T extends object>(...serviceInstances: ServiceInternal<T>[]): void;
  destroy<T extends object>(...serviceInstances: ServiceInternal<T>[]): void;
  isService<T extends object>(instance: T): instance is T & ServiceInternal<T>;
  configure<T extends object>(instance: ServiceInternal<T>, config: (instance: T & ServiceInternal<T>) => void): void;
  override<P extends object, T extends P>(instance: ServiceInternal<P>, Class: Ctor<T>): T & ServiceInternal<T>;
}

export const service: ServiceFactory = <T extends object>(Class: Ctor<T>): T & ServiceInternal<T> => {
  const handler = new ServiceHandler(Class);
  return handler.proxy;
};

service.instantiate = <T extends object>(...instances: ServiceInternal<T>[]) => {
  instances.forEach(instance => instance[SERVICE_KEY].ensureInstantiate());
};

service.destroy = <T extends object>(...instances: ServiceInternal<T>[]) => {
  if (instances.length === 0) {
    instances = [...getGlobalServicesRegistry()] as ServiceInternal<T>[];
  }

  instances.forEach(instance => instance[SERVICE_KEY].destroy());
};

service.configure = <T extends object>(
  instance: ServiceInternal<T>,
  config: (instance: T & ServiceInternal<T>) => void,
): void => {
  instance[SERVICE_KEY].configure(config);
};

service.mock = <T extends object, M extends DeepPartial<T>>(instance: ServiceInternal<T>, impl: M): T => {
  const obj = impl as unknown as T;
  instance[SERVICE_KEY].mock(obj as DeepPartial<T>);
  return obj;
};

service.isService = <T extends object>(instance: T): instance is T & ServiceInternal<T> => {
  return !!instance && !!(instance as ServiceInternal<object>)[SERVICE_KEY];
};

service.override = <P extends object, T extends P>(
  instance: ServiceInternal<P>,
  Class: Ctor<T>,
): T & ServiceInternal<T> => {
  instance[SERVICE_KEY].override(Class);
  return instance as T & ServiceInternal<T>;
};
