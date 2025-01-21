import type { IAutorunOptions, IReactionOptions } from 'mobx';
import type { IReactionPublic } from 'mobx';
import { autorun as autorunOrigin, reaction as reactionOrigin, when as whenOrigin } from 'mobx';
import { un } from './unsubscriber';

export const autorun = (expression: (r: IReactionPublic) => void, opts?: IAutorunOptions) =>
  un(autorunOrigin(expression, opts));

export const reaction = <T, FireImmediately extends boolean = false>(
  expression: (r: IReactionPublic) => T,
  listener: (value: T, prev: FireImmediately extends true ? T | undefined : T, r: IReactionPublic) => void,
  opts?: IReactionOptions<T, FireImmediately>,
) => un(reactionOrigin(expression, listener, opts));

export const sync = <T>(expression: (r: IReactionPublic) => T, listener?: (value: T, prev: T | undefined) => void) =>
  listener ? un(reactionOrigin(expression, listener, { fireImmediately: true })) : un(autorunOrigin(expression));

// TODO: remove ts errors
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const when: typeof whenOrigin = (...args) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const result = whenOrigin(...args);

  if (result instanceof Promise) {
    un(result.cancel);
    return result;
  }

  return un(result);
};
