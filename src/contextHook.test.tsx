import React, { useState } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { autorun, contextHook, observer, signal, StructSignalReadonly, sync, un } from '.';

it('contextHook works', async () => {
  const create_spy = vi.fn();
  const destroy_spy = vi.fn();
  const init_spy = vi.fn();

  class A {
    a = signal<number>(0);
    b = 0;
    constructor() {
      create_spy();
    }
    init() {
      un(destroy_spy);
      init_spy();
      autorun(() => {
        this.b = (this.a.value || 0) + 10;
      });
    }
  }
  const [useA, Provider] = contextHook(A);

  const render = async () => {
    let refresh: (p: {}) => void;
    let instance: A;
    const B = () => (
      <Provider>
        <C />
      </Provider>
    );
    const C = observer(() => {
      refresh = useState<{}>()[1];
      instance = useA();

      return (
        <i>
          {instance.a.value},{instance.b}
        </i>
      );
    });

    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<B />);
    });

    return {
      inst: instance!,
      renderer: renderer!,
      refresh: () => refresh!({}),
    };
  };

  const { inst, renderer, refresh } = await render();

  expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['0', ',', '0'] });
  expect(inst.b).toBe(10);

  await act(() => {
    inst.a(10);
    refresh();
  });
  expect(inst.b).toBe(20);
  expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['10', ',', '20'] });

  expect(create_spy).toBeCalled();
  expect(init_spy).toBeCalled();
  expect(destroy_spy).not.toBeCalled();

  await act(() => {
    renderer.unmount();
  });
  expect(destroy_spy).toBeCalled();
});

it('contextHook struct params works', async () => {
  const create_spy = vi.fn();
  const destroy_spy = vi.fn();
  const params_spy = vi.fn();
  const init_spy = vi.fn();

  type Params = {
    a: number;
    b: string;
  };

  class A {
    constructor(public params: StructSignalReadonly<Params>) {
      create_spy();
    }
    init() {
      un(destroy_spy);
      init_spy();
      sync(() => {
        params_spy(this.params.toJSON());
      });
    }
  }

  const [useA, Provider] = contextHook(A);

  const render = async (initial: Params) => {
    let setParams: (p: Params) => void;
    let instance: A;
    const B = () => {
      const [params, _setParams] = useState<Params>(initial);
      setParams = _setParams;

      return (
        <Provider {...params}>
          <C />
        </Provider>
      );
    };
    const C = observer(() => {
      instance = useA();

      return (
        <i>
          {instance.params.a},{instance.params.b}
        </i>
      );
    });

    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<B />);
    });

    return {
      inst: instance!,
      renderer: renderer!,
      setParams: (params: Params) => {
        setParams!(params);
      },
    };
  };

  const { renderer, setParams } = await render({ a: 10, b: 'a' });

  expect(params_spy).toBeCalledWith({ a: 10, b: 'a' });
  params_spy.mockClear();

  await act(() => {
    setParams({ a: 10, b: 'a' });
  });

  expect(params_spy).not.toBeCalled();

  await act(() => {
    setParams({ a: 10, b: 'b' });
  });

  expect(params_spy).toBeCalledWith({ a: 10, b: 'b' });
  params_spy.mockClear();

  await act(() => {
    setParams({ a: 10, b: 'b' });
  });
  expect(params_spy).not.toBeCalled();

  expect(create_spy).toBeCalled();
  expect(init_spy).toBeCalled();
  expect(destroy_spy).not.toBeCalled();

  await act(() => {
    renderer.unmount();
  });
  expect(destroy_spy).toBeCalled();
});
