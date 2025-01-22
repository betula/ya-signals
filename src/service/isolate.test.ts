import * as fs from 'node:fs';
import { beforeAll, expect, it, vi } from 'vitest';
import { service, un } from '..';
import { getZoneId } from './zones';
import { initAsyncHooksZonator, isolate, ScopedAsyncResource } from '.';

beforeAll(async () => {
  await initAsyncHooksZonator();
});

it('isolate works', async () => {
  const destroy_spy = vi.fn();
  class A {
    value = 0;

    init() {
      un(() => destroy_spy(this.value));
    }
  }

  const a = service(A);

  a.value = 10;

  const zone_id_0 = getZoneId();
  expect(zone_id_0).toBe(0);

  // Serial isolate scope
  await isolate(async () => {
    const zone_id_1 = getZoneId();
    expect(zone_id_1).not.toBe(zone_id_0);

    expect(a.value).toBe(0);

    a.value = 11;

    // Nested isolate scope
    await isolate(async () => {
      const zone_id_2 = getZoneId();
      expect(zone_id_2).not.toBe(zone_id_0);
      expect(zone_id_2).not.toBe(zone_id_1);

      let timeoutPromiseResolve: () => void;
      const timeoutPromise = new Promise<void>(resolve => (timeoutPromiseResolve = resolve));

      expect(a.value).toBe(0);
      a.value = 12;
      expect(a.value).toBe(12);

      // Test that timeout operation not change current zone
      setTimeout(() => {
        const zone_id_timeout_2 = getZoneId();
        expect(zone_id_timeout_2).toBe(zone_id_2);
        expect(a.value).toBe(12);
        a.value = 121;
        expect(a.value).toBe(121);
        timeoutPromiseResolve();
      }, 10);
      await timeoutPromise;

      let intervalPromiseResolve: () => void;
      const intervalPromise = new Promise<void>(resolve => (intervalPromiseResolve = resolve));

      expect(a.value).toBe(121);
      a.value = 122;
      expect(a.value).toBe(122);

      let intervalsCount = 3;
      // Test that interval operation not change current zone
      const int = setInterval(() => {
        intervalsCount--;
        const zone_id_interval_2 = getZoneId();
        expect(zone_id_interval_2).toBe(zone_id_2);
        a.value += 1;
        if (intervalsCount === 0) {
          clearInterval(int);
          intervalPromiseResolve();
        }
      }, 10);
      await intervalPromise;

      expect(a.value).toBe(125);

      // Test that nested async operation not change current zone
      await (async () => {
        const zone_id_async_2 = getZoneId();
        expect(zone_id_async_2).toBe(zone_id_2);
        expect(a.value).toBe(125);
        a.value = 126;
        expect(a.value).toBe(126);
        // Test nested nested async operation
        await (async () => {
          const zone_id_async_2_1 = getZoneId();
          expect(zone_id_async_2_1).toBe(zone_id_2);
          expect(a.value).toBe(126);
          a.value = 127;
          expect(a.value).toBe(127);
        })();
      })();

      expect(a.value).toBe(127);

      expect(destroy_spy).not.toBeCalled();
    });
    expect(destroy_spy).toBeCalledWith(127);
    destroy_spy.mockClear();

    expect(zone_id_1).toBe(getZoneId());

    expect(a.value).toBe(11);
    expect(destroy_spy).not.toBeCalled();
  });
  expect(destroy_spy).toBeCalledWith(11);
  destroy_spy.mockClear();

  expect(zone_id_0).toBe(getZoneId());

  expect(a.value).toBe(10);

  // Next serial isolated scope
  await isolate(async () => {
    expect(a.value).toBe(0);
    a.value = 9;

    expect(destroy_spy).not.toBeCalled();
  });
  expect(destroy_spy).toBeCalledWith(9);
  destroy_spy.mockClear();

  expect(a.value).toBe(10);
});

it('ScopedAsyncResource works', async () => {
  const destroy_spy = vi.fn();
  class A {
    value = 0;

    init() {
      un(() => destroy_spy(this.value));
    }
  }

  const a = service(A);

  a.value = 10;

  const zone_id_0 = getZoneId();

  const asyncResource = new ScopedAsyncResource('test');

  let storedResolve: (value: void) => void;
  const promise = new Promise<void>(resolve => (storedResolve = resolve));

  asyncResource.runInAsyncScope(() => {
    expect(a.value).toBe(0);
    a.value = 11;

    const zone_id_1 = getZoneId();
    expect(zone_id_1).not.toBe(zone_id_0);

    // Test that nested async operation not change current zone
    process.nextTick(() =>
      (async () => {
        const zone_id_async_1 = getZoneId();
        expect(zone_id_async_1).toBe(zone_id_1);
        expect(a.value).toBe(11);

        a.value = 12;
        expect(a.value).toBe(12);
      })().then(() => {
        storedResolve();
      }),
    );

    expect(a.value).toBe(11);
    expect(destroy_spy).not.toBeCalled();
  });

  await promise;

  asyncResource.emitDestroy();
  expect(destroy_spy).toBeCalledWith(12);
  destroy_spy.mockClear();

  expect(zone_id_0).toBe(getZoneId());
  expect(a.value).toBe(10);

  // Next serial isolated resource
  const asyncResource2 = new ScopedAsyncResource('test2');
  asyncResource2.runInAsyncScope(() => {
    expect(a.value).toBe(0);
    a.value = 9;
    expect(destroy_spy).not.toBeCalled();
  });

  asyncResource2.emitDestroy();
  expect(destroy_spy).toBeCalledWith(9);
  destroy_spy.mockClear();

  expect(a.value).toBe(10);
});

vi.mock('node:fs');

it('isolate log not destroyed nested resource', async () => {
  const consoleMock = vi.spyOn(console, 'warn');

  let timeout: NodeJS.Timeout;
  await isolate(async () => {
    timeout = setTimeout(() => {}, 100);
  });
  clearTimeout(timeout!);
  expect(consoleMock).toBeCalledWith('zones: Isolation destroyed but zone has not fulfilled async resources');
});

it('reinit zonator warning', async () => {
  const consoleMock = vi.spyOn(console, 'warn');
  initAsyncHooksZonator();
  expect(consoleMock).toBeCalledWith('zones: Attempt reinit zonator for current process');
});
