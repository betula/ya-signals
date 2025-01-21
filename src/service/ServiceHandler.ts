import { Initable } from '../classes/Initable';
import { attach, collect, run, unsubscriber } from '../unsubscriber';
import { untracked } from '../untracked';
import { getZoneId, type ZoneId } from './zones';

export type Ctor<T> = new () => T;

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export const SERVICE_KEY = Symbol('service');

export interface ServiceInternal<T extends object> {
  [SERVICE_KEY]: ServiceHandler<T>;
}

export const getGlobalServicesRegistry = () => {
  const zoneId = getZoneId();
  if (!globalServicesRegistryByZones.has(zoneId)) {
    const registry = new Set<object>();
    globalServicesRegistryByZones.set(zoneId, registry);
    return registry;
  }
  return globalServicesRegistryByZones.get(zoneId)!;
};

/**
 * Registry of all currently active services
 * Necessary for destroy all machanism
 */
const globalServicesRegistryByZones = new Map<ZoneId, Set<object>>();

class ServiceState<T extends object> {
  /**
   * Instance of service
   */
  public rawInstance?: T;

  /**
   * Set of destroy listeners
   */
  public unsubs = unsubscriber();
}

/**
 * Service implementation
 */
export class ServiceHandler<T extends object> {
  /**
   * Service state splitted by zones
   */
  private stateByZones = new Map<ZoneId, ServiceState<T>>();

  /**
   * Service class can be overrided in child packages
   */
  private FinalClass: Ctor<T>;

  /**
   * List of configures functions
   */
  private configures: ((instance: T & ServiceInternal<T>) => void)[] = [];

  /**
   * Proxy of service
   */
  public proxy: T & ServiceInternal<T>;

  /**
   * Service handler constructor
   */
  constructor(Class: Ctor<T>) {
    this.FinalClass = Class;
    this.proxy = this.createProxy();
  }

  /**
   * run all configure functions for all overrided constructors
   */
  private runConfigures() {
    this.configures.forEach(fn => fn(this.proxy));
  }

  /**
   * Clear service artifacts
   */
  private clearing() {
    // Delete info about service existance in global service registry
    getGlobalServicesRegistry().delete(this.proxy);

    // Delete state for current zone in service handler
    this.stateByZones.delete(getZoneId());
  }

  /**
   * Register function who clearing service after destroy, and
   * register service in global registry
   */
  private register() {
    getGlobalServicesRegistry().add(this.proxy);
    this.unsubs.add(this.clearing.bind(this));
  }

  /**
   * run service init
   */
  private init() {
    const { rawInstance } = this;

    if (rawInstance instanceof Initable) {
      rawInstance.runInit();

      // Add Initable destroy to scoped unsubscribers
      attach(rawInstance.destroy.bind(rawInstance));
      return;
    }
    if (rawInstance instanceof Object && 'init' in rawInstance && typeof rawInstance.init === 'function') {
      rawInstance.init();
      return;
    }
  }

  /**
   * run service init, and collect all unsubscribers during init phase
   */
  private runInit() {
    collect(this.unsubs, this.init.bind(this));
  }

  /**
   * Create the proxy for service
   */
  private createProxy() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    const handler = this;

    const getRawInstance = this.getRawInstance.bind(this) as () => { [prop: string | symbol]: unknown };
    const ensureInstantiate = this.ensureInstantiate.bind(this);

    // Create the proxy for service
    return new Proxy({} as T & ServiceInternal<T>, {
      get(_target, prop) {
        if (prop === SERVICE_KEY) {
          return handler;
        }
        ensureInstantiate();
        return getRawInstance()[prop];
      },
      set(_target, prop, value) {
        ensureInstantiate();
        getRawInstance()[prop] = value;
        return true;
      },
      ownKeys(_target) {
        ensureInstantiate();
        return Object.keys(getRawInstance());
      },
      has(_target, key) {
        ensureInstantiate();
        return key in getRawInstance();
      },
      getOwnPropertyDescriptor(_target, prop) {
        ensureInstantiate();
        const descriptor = Object.getOwnPropertyDescriptor(getRawInstance(), prop);
        if (!descriptor) {
          return descriptor;
        }
        return Object.assign(descriptor, { configurable: true });
      },
      defineProperty(_target, prop, attributes) {
        ensureInstantiate();
        Object.defineProperty(getRawInstance(), prop, attributes);
        return true;
      },
      deleteProperty(_target, prop) {
        ensureInstantiate();
        delete getRawInstance()[prop];
        return true;
      },
    });
  }

  /**
   * Return state only for current zone
   */
  private getStateByCurrentZone() {
    const zoneId = getZoneId();
    let state = this.stateByZones.get(zoneId);
    if (!state) {
      state = new ServiceState();
      this.stateByZones.set(zoneId, state);
    }
    return state;
  }

  /**
   * Zoned get raw instance
   */
  private get rawInstance(): T | undefined {
    return this.getStateByCurrentZone().rawInstance;
  }

  /**
   * Zoned set raw instance
   */
  private set rawInstance(value: T | undefined) {
    this.getStateByCurrentZone().rawInstance = value;
  }

  /**
   * Zoned get unsubs
   */
  private get unsubs() {
    return this.getStateByCurrentZone().unsubs;
  }

  // Public:

  /**
   * Get raw instance
   */
  public getRawInstance() {
    return this.rawInstance;
  }

  /**
   * We should create instance of service class if it doesnot exists yet
   */
  public ensureInstantiate() {
    if (!this.rawInstance) {
      untracked(() => {
        this.rawInstance = new this.FinalClass();
        this.register();
        this.runConfigures();
        this.runInit();
      });
    }
  }

  /**
   * Set overrided class for service
   */
  public override(OverridedClass: Ctor<T>) {
    if (this.rawInstance) {
      throw new Error('You should override service before its instantiate');
    }
    this.FinalClass = OverridedClass;
  }

  /**
   * Destroy service, run unsubscribers, and cleaning from global service registry
   */
  public destroy() {
    if (this.rawInstance && this.unsubs) {
      run(this.unsubs);
    }
  }

  /**
   * Add configure function for service
   */
  public configure(config: (instance: T & ServiceInternal<T>) => void) {
    this.configures.push(config);
  }

  /**
   * Add mock for service
   */
  public mock(impl: DeepPartial<T>) {
    this.rawInstance = impl as T;
    this.register();
  }
}
