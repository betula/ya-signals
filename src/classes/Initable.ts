import { untracked } from 'mobx';
import { runInAction } from '..';
import { Destroyable } from './Destroyable';

export class Initable extends Destroyable {
  get initialized() {
    return this._sDestroyed.value === false;
  }

  /**
   * Разрешает ноде инициализироваться повторно после разрушения
   */
  protected get allowReinitializing() {
    return false;
  }

  /**
   * Run init function in self destroy scope.
   * All side-effects will run, and it unsubscribers will kept
   * and collected to self destroy scope
   */
  runInit() {
    untracked(() => {
      this.runInDestroyScope(() => this.init());
    });
  }

  /**
   * Define all your effects here
   */
  init() {
    if (this.destroyed && !this.allowReinitializing) {
      console.warn(
        'Initable: Reinitializing after destroy',
        (this as unknown as { _typeName: string })._typeName ?? '',
        (this as unknown as { _uid: number })._uid ?? '',
      );
    }
    if (this.initialized) {
      console.error(
        'Initable: Cannot be reinitialized before destroy',
        (this as unknown as { _typeName: string })._typeName ?? '',
        (this as unknown as { _uid: number })._uid ?? '',
      );
    }
    runInAction(() => {
      this._sDestroyed(false);
    });
  }

  /**
   * Ensure initialize be done
   */
  ensureInit() {
    untracked(() => {
      if (!this.initialized) {
        if (this.destroyed) {
          console.warn(
            'Initable: Are you sure you want to reinit destroyed initable instance',
            (this as unknown as { _typeName: string })._typeName ?? '',
            (this as unknown as { _uid: number })._uid ?? '',
          );
        }

        this.runInit();

        if (!this.initialized) {
          console.error(
            'Initable: You are probably forget to call super.init() in your init override',
            (this as unknown as { _typeName: string })._typeName ?? '',
            (this as unknown as { _uid: number })._uid ?? '',
          );
        }
      }
    });
  }
}
