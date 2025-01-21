import { expect, it, vi } from 'vitest';
import { event } from './event';

it('light event works', () => {
  const spy = vi.fn();

  const a = event();
  a(spy);

  expect(spy).not.toBeCalled();
  a.fire();
  expect(spy).toBeCalled();
  a.fire();
  expect(spy).toBeCalledTimes(2);
});

it('params event works', () => {
  const spy = vi.fn();

  const a = event<number>();
  a(spy);

  expect(spy).not.toBeCalled();
  a.fire(1);
  expect(spy).toBeCalledWith(1);
  a.fire(2);
  expect(spy).toBeCalledTimes(2);
  expect(spy).toHaveBeenLastCalledWith(2);
});

it('connected event works', () => {
  const spy = vi.fn();

  const a = event<number>();
  const b = event<number>();
  const un = b.connect(a);
  b(spy);

  a.fire(1);
  expect(spy).toBeCalledTimes(1);
  expect(spy).toBeCalledWith(1);

  a.fire(2);
  expect(spy).toBeCalledTimes(2);
  expect(spy).toHaveBeenLastCalledWith(2);

  un();
  a.fire(3);
  expect(spy).toBeCalledTimes(2);
});
