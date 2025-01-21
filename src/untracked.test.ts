import { expect, it, vi } from 'vitest';
import { autorun, signal, untracked } from '.';

it('untracked should work', () => {
  const spy = vi.fn();

  const s = signal(0);
  autorun(() => {
    spy(untracked(s.get));
  });

  expect(spy).toBeCalledWith(0);
  spy.mockClear();
  s(1);
  expect(spy).not.toBeCalled();
});

it('untracked func should work', () => {
  const spy = vi.fn();

  const s = signal(0);
  autorun(
    untracked.func(() => {
      spy(s.value);
    }),
  );

  expect(spy).toBeCalledWith(0);
  spy.mockClear();
  s(1);
  expect(spy).not.toBeCalled();
});
