// src/lib/core/toast-bus.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createToastBus } from './toast-bus.svelte.js';

describe('ToastBus', () => {
  it('push adds an entry with a generated id and returns the id', () => {
    const bus = createToastBus();
    const id = bus.push({ message: 'hi', variant: 'info' });
    expect(typeof id).toBe('string');
    expect(bus.toasts).toHaveLength(1);
    expect(bus.toasts[0]).toMatchObject({ id, message: 'hi', variant: 'info' });
  });

  it('dismiss removes the entry by id', () => {
    const bus = createToastBus();
    const id = bus.push({ message: 'a', variant: 'info' });
    bus.push({ message: 'b', variant: 'info' });
    bus.dismiss(id);
    expect(bus.toasts).toHaveLength(1);
    expect(bus.toasts[0].message).toBe('b');
  });

  it('auto-dismisses after ttlMs', async () => {
    vi.useFakeTimers();
    const bus = createToastBus();
    bus.push({ message: 'a', variant: 'info', ttlMs: 1000 });
    expect(bus.toasts).toHaveLength(1);
    vi.advanceTimersByTime(1001);
    expect(bus.toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('ttlMs of 0 disables auto-dismiss', () => {
    vi.useFakeTimers();
    const bus = createToastBus();
    bus.push({ message: 'a', variant: 'info', ttlMs: 0 });
    vi.advanceTimersByTime(60_000);
    expect(bus.toasts).toHaveLength(1);
    vi.useRealTimers();
  });
});
