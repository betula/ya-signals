import { service, un, signal, wrap } from "../src";

it('service works', () => {
  const create_spy = jest.fn();
  const destroy_spy = jest.fn();

  class A {
    m = signal(1);
    c = wrap(() => this.m.value + 1);

    constructor() {
      create_spy();
      un(destroy_spy)
    }

    a() {
      return 1;
    }
  }

  const s = service(A);

  expect(create_spy).not.toBeCalled();
  expect(s.a()).toBe(1);
  expect(create_spy).toBeCalled();

  expect(s.c.value).toBe(2);
  s.m.update(v => v + 1);
  expect(s.c.value).toBe(3);

  expect(destroy_spy).not.toBeCalled();
  service.destroy(s);
  expect(destroy_spy).toBeCalled();

  create_spy.mockReset();
  destroy_spy.mockReset();

  s.m(2);
  expect(s.c.value).toBe(3);
  expect(create_spy).toBeCalled();

  expect(destroy_spy).not.toBeCalled();
  service.destroy(s);
  expect(destroy_spy).toBeCalled();
});

it('service instantiate works', () => {
  const create_spy = jest.fn();

  const s = service(class {
    constructor() {
      create_spy();
    }
  });
  expect(create_spy).not.toBeCalled();

  service.instantiate(s);
  expect(create_spy).toBeCalled();
});