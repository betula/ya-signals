import { useState } from 'react';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { autorun, hook, observer, signal, StructSignal, structSignal, StructSignalReadonly, sync, un } from '.';

it('hook works', async () => {
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
  const useA = hook(A);

  const render = async () => {
    let refresh: (p: {}) => void;
    let instance: A;
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
      renderer = create(<C />);
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

it('hook struct params works', async () => {
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

  const useA = hook(A);

  const render = async (initial: Params) => {
    let setParams: (p: Params) => void;
    let instance: A;
    const C = observer(() => {
      const [params, _setParams] = useState<Params>(initial);
      setParams = _setParams;
      instance = useA(params);

      return (
        <i>
          {instance.params.a},{instance.params.b}
        </i>
      );
    });

    let renderer: ReactTestRenderer;

    await act(() => {
      renderer = create(<C />);
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

it('hook struct params as struct works', async () => {
  const params_spy = vi.fn();

  type Params = {
    a: number;
    b: string;
  };

  class A {
    constructor(public params: StructSignalReadonly<Params>) {}
    init() {
      sync(() => {
        params_spy(this.params.toJSON());
      });
    }
  }

  const useA = hook(A);

  const render = async (structParams: StructSignal<Params>) => {
    const C = () => {
      useA(structParams);
      return null;
    };

    await act(() => {
      create(<C />);
    });
  };

  const structParams = structSignal({
    a: 10,
    b: 'a',
  });

  await render(structParams);

  expect(params_spy).toBeCalledWith({ a: 10, b: 'a' });
  params_spy.mockClear();

  structParams({ a: 11, b: 'a' });
  expect(params_spy).toBeCalledWith({ a: 11, b: 'a' });
});
