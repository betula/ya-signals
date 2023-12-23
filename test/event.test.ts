import { event } from "../src";

it('light event works', () => {
  const spy = jest.fn();

  const a = event();
  a.subscribe(spy);

  expect(spy).not.toBeCalled();
  a();
  expect(spy).toBeCalled();
  a();
  expect(spy).toBeCalledTimes(2);
});

it('params event works', () => {
  const spy = jest.fn();

  const a = event<number>();
  a.subscribe(spy);

  expect(spy).not.toBeCalled();
  a(1);
  expect(spy).toBeCalledWith(1);
  a(2);
  expect(spy).toBeCalledTimes(2);
  expect(spy).toHaveBeenLastCalledWith(2);
});