import { wrap, reaction, signal, transaction, sync, when } from "../src";

it('signal works', () => {
  const spy = jest.fn();
  const s = signal(0);
  sync(() => s.value, (v) => spy(v));
  s(1);
  s(s.value + 1);

  expect(spy).nthCalledWith(1, 0);
  expect(spy).nthCalledWith(2, 1);
  expect(spy).nthCalledWith(3, 2);
  expect(spy).toBeCalledTimes(3);
});

it('wrap works', () => {
  const spy = jest.fn();
  const a = signal(0);
  const b = signal(0);
  const c = wrap(() => a.value + b.value);
  sync(() => c.value, (v) => spy(v));
  a(1);

  transaction(() => {
    a(a.value + 1);
    b(b.value + 2);
  });

  expect(spy).nthCalledWith(1, 0);
  expect(spy).nthCalledWith(2, 1);
  expect(spy).nthCalledWith(3, 4);

  transaction(() => {
    a(a.value - 1);
    b(b.value + 1);
  });
  expect(spy).toBeCalledTimes(3);
});

it('reaction works', () => {
  const spy = jest.fn();
  const s = signal(0);
  reaction(() => s.value, (v) => spy(v));
  expect(spy).not.toBeCalled();

  s(s.value + 1);
  s(1);
  s(s.value + 1);

  expect(spy).nthCalledWith(1, 1);
  expect(spy).nthCalledWith(2, 2);
  expect(spy).toBeCalledTimes(2);
});

it('sync works', () => {
  const spy = jest.fn();
  const s = signal(0);
  sync(() => s.value, (v) => spy(v));
  expect(spy).toBeCalled();

  s(s.value + 1);
  s(1);
  s(s.value + 1);

  expect(spy).nthCalledWith(1, 0);
  expect(spy).nthCalledWith(2, 1);
  expect(spy).nthCalledWith(3, 2);
  expect(spy).toBeCalledTimes(3);
});

it('when works', async () => {
  const spy = jest.fn();
  const s = signal(0);
  when(() => s.value > 0).then(() => spy());
  await new Promise(r => setTimeout(() => r(0), 0));
  expect(spy).not.toBeCalled();
  s(1);
  await new Promise(r => setTimeout(() => r(0), 0));
  expect(spy).toBeCalled();
});

it('when rejected works', async () => {
  const spy = jest.fn();
  try {
    await when(() => {
      throw 0;
    })
  }
  catch {
    spy()
  }
  expect(spy).toBeCalled();
});