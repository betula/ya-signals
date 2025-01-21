import { expect, it, vi } from 'vitest';
import { attach, collect, run, scope, un, Unsubscriber, unsubscriber } from '.';

it('unsubscriber works', () => {
  const spy1 = vi.fn();

  const unsubs = unsubscriber();
  expect(unsubs.size).toBe(0);

  attach(unsubs, spy1);

  expect(unsubs.size).toBe(1);
  expect(spy1).toBeCalledTimes(0);
  run(unsubs);

  expect(spy1).toBeCalledTimes(1);
  expect(unsubs.size).toBe(0);
});

it('un should return argument function', () => {
  const fn = () => {};
  expect(un(fn)).toBe(fn);
  expect(attach(fn)).not.toBe(fn);
});

it('attach should works', () => {
  const spy1 = vi.fn();
  const spy2 = vi.fn();
  const spy3 = vi.fn();
  const spy4 = vi.fn();
  const spy5 = vi.fn();
  const spy6 = vi.fn();
  const spy7 = vi.fn();

  let detach2: () => void;

  const unsubs = unsubscriber();

  // Run code and collect "un" calls.
  collect(unsubs, () => {
    attach(spy1);
    detach2 = attach(spy2);
    un(spy3);
  });

  const detach5 = attach(unsubs, spy4);
  attach(unsubs, spy5);

  // no unsubscribe scope, no error, nothing to do
  un(spy6);
  attach(spy7)(); // no error if detach out of scope

  expect(unsubs.size).toBe(5);

  detach2!();
  detach5();

  expect(unsubs.size).toBe(3);

  expect(spy1).toBeCalledTimes(0);
  expect(spy3).toBeCalledTimes(0);
  expect(spy5).toBeCalledTimes(0);

  run(unsubs);

  expect(unsubs.size).toBe(0);
  expect(spy1).toBeCalledTimes(1);
  expect(spy3).toBeCalledTimes(1);
  expect(spy5).toBeCalledTimes(1);

  expect(spy2).toBeCalledTimes(0);
  expect(spy4).toBeCalledTimes(0);
  expect(spy6).toBeCalledTimes(0);
  expect(spy7).toBeCalledTimes(0);
});

it('collect should works', () => {
  const spy1 = vi.fn();
  const spy2 = vi.fn();
  let detach2: () => void;
  let inner_scope: Unsubscriber;

  const unsubs = unsubscriber();

  // Run code and collect "un" unsubscribers.
  const ret = collect(unsubs, () => {
    // each function will be added only one times
    un(spy1);
    un(spy1);
    attach(spy1);

    detach2 = attach(spy2);
    inner_scope = scope()!;
    return 'foo';
  });
  expect(ret).toBe('foo');
  expect(inner_scope!).toBe(unsubs);

  expect(unsubs.size).toBe(2);
  detach2!();
  expect(unsubs.size).toBe(1);

  expect(spy1).toBeCalledTimes(0);
  run(unsubs);

  expect(spy1).toBeCalledTimes(1);
  expect(unsubs.size).toBe(0);
  expect(spy2).toBeCalledTimes(0);
});
