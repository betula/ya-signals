import { NamedLogger } from '../logger/logger';

const logger = new NamedLogger('unsubscriber');

export type Unsubscriber = Set<() => void>;

let context_unsubs: Unsubscriber | void;

export function unsubscriber(): Unsubscriber {
  return new Set();
}

export function collect<T>(unsubs: Unsubscriber, fn: () => T): T {
  const stack = context_unsubs;
  context_unsubs = unsubs;
  try {
    return fn();
  } finally {
    context_unsubs = stack;
  }
}

export function attach(unsubscriber: Unsubscriber, fn: () => void): () => void;
export function attach(fn: () => void): () => void;
export function attach(unsubs: Unsubscriber | (() => void), fn?: () => void): () => void {
  if (!fn) {
    fn = unsubs as unknown as () => void;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    unsubs = context_unsubs!;
  }
  if (unsubs) {
    (unsubs as Unsubscriber).add(fn);
  }

  return () => {
    if (unsubs) {
      (unsubs as Unsubscriber).delete(fn!);
    }
  };
}

export function un(fn: () => void): () => void {
  attach(fn);
  return fn;
}

export function run(unsubs: Unsubscriber): void {
  unsubs.forEach(fn => {
    try {
      if (fn) {
        fn();
      } else {
        logger.warn('Unexpected undefined unsubscriber');
      }
    } catch (e) {
      logger.error('Error during unsubscribing', e);
    }
  });
  unsubs.clear();
}

export function scope() {
  return context_unsubs;
}
