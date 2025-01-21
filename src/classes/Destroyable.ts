import { type Signal, signal } from '..';
import { collect, run, type Unsubscriber, unsubscriber } from '../unsubscriber';
import { untracked } from '../untracked';

export class Destroyable {
  protected _unsubscriber?: Unsubscriber;

  private __sDestroyed?: Signal<void | boolean>;
  /**
   * Признак того, что ноду уничтожили
   */
  protected get _sDestroyed(): Signal<void | boolean> {
    return (this.__sDestroyed ??= signal<void | boolean>(undefined));
  }

  get destroyed() {
    return Boolean(this._sDestroyed.value);
  }

  // just for usability
  get active() {
    return !this.destroyed;
  }

  /**
   * Return current unsubscriber. Create it if not exists.
   * @returns Unsubscriber
   */
  get unsubscriber() {
    return (this._unsubscriber ??= unsubscriber());
  }

  /**
   * Run any function in self destroy scope
   */
  runInDestroyScope<T>(fn: () => T): T {
    return collect(this.unsubscriber, fn);
  }

  /**
   * Add destroy event listener
   * @param fn destoy event listener
   * @returns unlink destroy event listener
   */
  onDestroy(fn: () => void): () => void {
    this.unsubscriber.add(fn);
    return () => {
      this.unsubscriber.delete(fn);
    };
  }

  /**
   * Safely run all unsubscribers and clearing it.
   */
  destroy() {
    const destroyed = untracked(() => this._sDestroyed.value);
    if (destroyed) {
      return;
    }

    this._sDestroyed(true);
    try {
      if (this._unsubscriber) {
        untracked(() => {
          run(this._unsubscriber!);
        });
      }
    } catch (error) {
      // some global error log
      console.error('Destroyable: destroy unknown error', error);
    }
  }
}
