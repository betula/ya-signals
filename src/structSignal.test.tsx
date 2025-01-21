import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { structSignal, useStructSignal } from './structSignal';
import { reaction, sync } from '.';
import { observer, signal } from '.';

describe('Struct signal', () => {
  it('should works', () => {
    const a_watch = vi.fn();
    const b_watch = vi.fn();

    const s = structSignal({ a: 10, b: 11 });

    reaction(
      () => s.a,
      val => a_watch(val),
    );
    reaction(
      () => s.b,
      val => b_watch(val),
    );

    expect(a_watch).not.toBeCalled();
    expect(b_watch).not.toBeCalled();

    s({ a: 10, b: 11 });
    expect(a_watch).not.toBeCalled();
    expect(b_watch).not.toBeCalled();
    s({ a: 10, b: 12 });
    expect(a_watch).not.toBeCalled();
    expect(b_watch).toBeCalled();
    s({ a: 11, b: 12 });
    expect(a_watch).toBeCalled();
  });

  it('should works with undefined', () => {
    const a_watch = vi.fn();
    const b_watch = vi.fn();

    const s = structSignal(undefined as any);

    sync(
      () => s.a,
      val => a_watch(val),
    );
    sync(
      () => 'b' in s,
      val => b_watch(val),
    );

    expect(a_watch).toBeCalledWith(undefined);
    expect(b_watch).toBeCalledWith(false);

    a_watch.mockClear();
    b_watch.mockClear();

    s({ a: 10 });
    expect(a_watch).toBeCalledWith(10);
    expect(b_watch).not.toBeCalled();

    a_watch.mockClear();

    s({ a: 10, b: 'b' });
    expect(a_watch).not.toBeCalled();
    expect(b_watch).toBeCalledWith(true);

    b_watch.mockClear();

    s(undefined as any);
    expect(a_watch).toBeCalledWith(undefined);
    expect(b_watch).toBeCalledWith(false);
  });
});

describe('Struct signal hook', () => {
  const render = () => {
    const s = signal(1);

    let setA: (value: number) => void = () => void 0;
    let setB: (value: number) => void = () => void 0;

    const A = () => {
      const [a, sA] = useState(2);
      const [b, sB] = useState(3);

      setA = sA;
      setB = sB;

      return <C a={a} b={b} />;
    };

    const C: React.FC<{ a: number; b: number }> = observer(({ a, b }) => {
      const st = useStructSignal(() => {
        return {
          s: s.value,
          a,
          b,
        };
      }, [a, b]);

      return (
        <i>
          {st.s},{st.a},{st.b}
        </i>
      );
    });

    const renderer = create(<A />);

    return {
      renderer,
      s,
      setA,
      setB,
    };
  };

  it('should be rendered', async () => {
    const { renderer, s, setA, setB } = render();

    expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['1', ',', '2', ',', '3'] });
    await act(() => {
      setA(10);
    });

    expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['1', ',', '10', ',', '3'] });
    await act(() => {
      setB(11);
    });

    expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['1', ',', '10', ',', '11'] });
    await act(() => {
      s(12);
    });
    expect(renderer.toJSON()).toStrictEqual({ type: 'i', props: {}, children: ['12', ',', '10', ',', '11'] });
  });
});
