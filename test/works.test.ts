import { computed, reaction, signal, transaction, sync, when } from "../src";

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

it('computed works', () => {
  const spy = jest.fn();
  const a = signal(0);
  const b = signal(0);
  const c = computed(() => a.value + b.value);
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

it('signal decorator works', () => {
  const spy = jest.fn();
  class S {
    @signal a = 10;
  }
  const s = new S();
  sync(() => s.a, (v) => spy(v));
  s.a = 1;
  s.a += 1;

  expect(spy).nthCalledWith(1, 10);
  expect(spy).nthCalledWith(2, 1);
  expect(spy).nthCalledWith(3, 2);
  expect(spy).toBeCalledTimes(3);
});

it('computed decorator works', () => {
  const spy = jest.fn();
  class S {
    @signal a = 0;
    @signal b = 0;
    @computed get c() {
      return this.a + this.b;
    }
  }
  const s = new S();

  sync(() => s.c, (v) => spy(v));
  s.a = 1;

  transaction(() => {
    s.a += 1;
    s.b += 2;
  });

  expect(spy).nthCalledWith(1, 0);
  expect(spy).nthCalledWith(2, 1);
  expect(spy).nthCalledWith(3, 4);

  transaction(() => {
    s.a ++;
    s.b --;
  });
  expect(spy).toBeCalledTimes(3);
});

it('decorator works with class extends', () => {
  const spy = jest.fn();
  class A {
    @signal a = 10;
  }
  class B extends A {
    @signal b = 11;
  }
  class C extends B {
    @computed get c() {
      return this.a + this.b;
    };
  }
  const s = new C();
  sync(() => s.c, (v) => spy(v));
  s.a = 1;
  s.b += 1;

  expect(spy).nthCalledWith(1, 21);
  expect(spy).nthCalledWith(2, 12);
  expect(spy).nthCalledWith(3, 13);
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