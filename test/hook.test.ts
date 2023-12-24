import React from 'react';
import { scope } from 'unsubscriber';
import { SignalReadonly, autorun, hook, signal, un } from "../src";

const waitNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

let useMemoCache;
let unmount;
let unsubs;

beforeAll(() => {
  jest.spyOn(React, 'useMemo')
    .mockImplementation((fn, deps) => {
      expect(deps).toStrictEqual([]);

      if (useMemoCache) return useMemoCache;
      return useMemoCache = fn();
    });

  jest.spyOn(React, 'useEffect')
    .mockImplementation((fn, deps) => {
      expect(deps).toStrictEqual([unsubs]);
      unmount = fn();
    });
});

afterEach(() => {
  useMemoCache = void 0;
});

afterAll(() => {
  jest.restoreAllMocks()
})


it('hook works', () => {
  const create_spy = jest.fn();
  const destroy_spy = jest.fn();
  
  class A {
    a = signal<number>(0);
    b = 0;
    constructor() {
      unsubs = scope();
      create_spy();
      un(destroy_spy);

      autorun(() => {
        this.b = (this.a.value || 0) + 10;
      });
    }
  }

  const useA = hook(A);
  const inst = useA();

  expect(inst.b).toBe(10);
  inst.a(10);
  expect(inst.b).toBe(20);

  expect(create_spy).toBeCalled();
  expect(destroy_spy).not.toBeCalled();

  unmount();
  expect(destroy_spy).toBeCalled();
});

it('hook array params works', async () => {
  const create_spy = jest.fn();
  const destroy_spy = jest.fn();
  const params_spy = jest.fn();

  class A {
    constructor(params: SignalReadonly<[number, string]>) {
      unsubs = scope();
      create_spy();
      un(destroy_spy);

      params.sync((state) => {
        params_spy(state);
      });
    }
  }

  const useA = hook(A);
  const inst = useA([10, 'a']);

  expect(params_spy).toBeCalledWith([10, 'a']); params_spy.mockClear();
  expect(inst).toBe(useA([10, 'a']));
  await waitNextTick();
  expect(params_spy).not.toBeCalled();

  expect(inst).toBe(useA([10, 'b']));
  await waitNextTick();
  expect(params_spy).toBeCalledWith([10, 'b']); params_spy.mockClear();

  expect(inst).toBe(useA([10, 'b']));
  await waitNextTick();
  expect(params_spy).not.toBeCalled();

  expect(create_spy).toBeCalled();
  expect(destroy_spy).not.toBeCalled();

  unmount();
  expect(destroy_spy).toBeCalled();
});

it('hook struct params works', async () => {
  const create_spy = jest.fn();
  const destroy_spy = jest.fn();
  const params_spy = jest.fn();

  class A {
    constructor(params: SignalReadonly<{ a: number; b: string }>) {
      unsubs = scope();
      create_spy();
      un(destroy_spy);

      params.sync((state) => {
        params_spy(state);
      });
    }
  }

  const useA = hook(A);
  const inst = useA({a: 10, b: 'a'});

  expect(params_spy).toBeCalledWith({a: 10, b: 'a'}); params_spy.mockClear();
  expect(inst).toBe(useA({a: 10, b: 'a'}));
  await waitNextTick();
  expect(params_spy).not.toBeCalled();

  expect(inst).toBe(useA({a: 10, b: 'b'}));
  await waitNextTick();
  expect(params_spy).toBeCalledWith({a: 10, b: 'b'}); params_spy.mockClear();

  expect(inst).toBe(useA({a: 10, b: 'b'}));
  await waitNextTick();
  expect(params_spy).not.toBeCalled();

  expect(create_spy).toBeCalled();
  expect(destroy_spy).not.toBeCalled();

  unmount();
  expect(destroy_spy).toBeCalled();
});