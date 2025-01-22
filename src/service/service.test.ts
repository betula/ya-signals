import { expect, it, vi } from 'vitest';
import { Initable, signal, un, wrapSignal } from '..';
import { service } from './service';
import { getGlobalServicesRegistry } from './ServiceHandler';
import { initAsyncHooksZonator, isolate } from '.';

it('service works', () => {
  const create_spy = vi.fn();
  const destroy_spy = vi.fn();

  class A {
    m = signal(1);
    c = wrapSignal(() => this.m.value + 1);

    constructor() {
      create_spy();
    }
    init() {
      un(destroy_spy);
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
  const create_spy = vi.fn();

  const s = service(
    class {
      constructor() {
        create_spy();
      }
    },
  );
  expect(create_spy).not.toBeCalled();

  service.instantiate(s);
  expect(create_spy).toBeCalled();
});

it('service mock works', () => {
  const create_spy = vi.fn();
  class A {
    a = 10;
    constructor() {
      create_spy();
    }
  }

  const s = service(A);
  service.mock(s, { a: 12 });
  expect(create_spy).not.toBeCalled();

  expect(s.a).toBe(12);

  service.instantiate(s);
  expect(create_spy).not.toBeCalled();
});

it('two services should be independent each other', () => {
  class A {
    a = 10;
  }
  const a1 = service(A);
  const a2 = service(A);

  a1.a = 11;
  a2.a = 12;
  expect(a1.a).toBe(11);
  expect(a2.a).toBe(12);

  service.destroy(a1);
  expect(a1.a).toBe(10);

  expect(a2.a).toBe(12);
  service.destroy(a2);
  expect(a2.a).toBe(10);
});

it('service configure works', () => {
  const configureSpy = vi.fn();

  class A {
    a = 10;
  }

  const a = service(A);

  service.configure(a, instance => {
    instance.a = 20;

    configureSpy();
  });

  service.instantiate(a);

  expect(configureSpy).toBeCalled();

  expect(a.a).toBe(20);
});

it('service override works', () => {
  class A {
    a = 10;
    action() {}
  }

  const a = service(A);

  class B extends A {
    action() {
      this.a++;
    }
    act() {
      this.action();
    }
  }

  const b = service.override(a, B);
  b.act();

  expect(a.a).toBe(11);
  expect(b.a).toBe(11);

  expect((a as unknown as B).act).toBeTruthy();
});

it('service overrides this configures works', () => {
  const spy = vi.fn();

  class A {
    action(a: string) {
      spy(a);
    }
  }

  const a = service(A);

  service.configure(a, inst => {
    inst.action('a_configure');
  });

  class B extends A {
    bAction(a: string) {
      this.action(a);
    }
  }

  const b = service.override(a, B);

  service.configure(b, inst => {
    inst.bAction('b_configure');
  });

  class C extends B {
    cAction(a: string) {
      this.bAction(a);
    }
  }

  const c = service.override(b, C);

  service.configure(c, inst => {
    inst.cAction('c_configure');
  });

  expect(spy).toBeCalledTimes(0);

  // make the service and call action
  c.cAction('c_action');

  expect(a).toBe(c);
  expect(spy).toHaveBeenNthCalledWith(1, 'a_configure');
  expect(spy).toHaveBeenNthCalledWith(2, 'b_configure');
  expect(spy).toHaveBeenNthCalledWith(3, 'c_configure');
  expect(spy).toHaveBeenNthCalledWith(4, 'c_action');
});

it('destroy all should works', () => {
  service.destroy();

  const spy_a = vi.fn();
  const spy_b = vi.fn();
  const spy_c = vi.fn();

  class A {
    init() {
      un(spy_a);
    }
  }

  service.instantiate(service(A));

  class B {
    init() {
      un(spy_b);
    }
  }

  service.instantiate(service(B));

  class C extends Initable {
    init() {
      un(spy_c);
    }
  }

  service.instantiate(service(C));

  expect(spy_a).not.toBeCalled();
  expect(spy_b).not.toBeCalled();
  expect(spy_c).not.toBeCalled();

  expect(getGlobalServicesRegistry().size).toBe(3);
  service.destroy();

  expect(spy_a).toBeCalled();
  expect(spy_b).toBeCalled();
  expect(spy_c).toBeCalled();

  expect(getGlobalServicesRegistry().size).toBe(0);
});

it('service isolation', async () => {
  await initAsyncHooksZonator();

  class A {
    a = 10;
    test() {
      return this.a;
    }
  }

  const a = service(A);

  expect(a.test()).toBe(10);

  await isolate(async () => {
    class B extends A {
      b = 5;
      test() {
        return this.a + this.b;
      }
    }

    service.override(a, B);

    expect(a.test()).toBe(15);
  });

  expect(a.test()).toBe(10);

  class D {
    a = 10;
    test() {
      return this.a;
    }
  }

  const d = service(D);

  class C extends D {
    c = 2;
    test() {
      return this.a - this.c;
    }
  }

  service.override(d, C);

  expect(d.test()).toBe(8);

  await isolate(async () => {
    expect(d.test()).toBe(8);
  });

  expect(d.test()).toBe(8);
});
