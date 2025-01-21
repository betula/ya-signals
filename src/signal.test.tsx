import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { useSignal } from './signal';
import { observer, signal } from '.';

describe('Signal hook', () => {
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
      const st = useSignal(() => {
        return {
          s: s.value,
          a,
          b,
        };
      }, [a, b]);

      return (
        <i>
          {st.value.s},{st.value.a},{st.value.b}
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
