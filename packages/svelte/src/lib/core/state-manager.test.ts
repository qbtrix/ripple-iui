import { describe, expect, test, vi } from 'vitest';
import { createStateManager } from './state-manager.svelte.js';

describe('StateManager.subscribe', () => {
  test('notifies subscriber on set with (path, value, state)', () => {
    const sm = createStateManager({ name: 'init' });
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.set('name', 'alice');

    expect(fn).toHaveBeenCalledTimes(1);
    const [path, value, state] = fn.mock.calls[0];
    expect(path).toBe('name');
    expect(value).toBe('alice');
    expect(state).toEqual({ name: 'alice' });
  });

  test('notifies on nested set with full path', () => {
    const sm = createStateManager({});
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.set('user.profile.name', 'bob');

    expect(fn).toHaveBeenCalledWith(
      'user.profile.name',
      'bob',
      expect.objectContaining({ user: { profile: { name: 'bob' } } })
    );
  });

  test('notifies on delete and reset', () => {
    const sm = createStateManager({ a: 1, b: 2 });
    const fn = vi.fn();
    sm.subscribe(fn);

    sm.delete('a');
    sm.reset({ c: 3 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0]).toBe('a');
    expect(fn.mock.calls[1][0]).toBe('');
    expect(fn.mock.calls[1][2]).toEqual({ c: 3 });
  });

  test('subscribe returns an unsubscribe function', () => {
    const sm = createStateManager({});
    const fn = vi.fn();
    const off = sm.subscribe(fn);

    sm.set('x', 1);
    off();
    sm.set('x', 2);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('multiple subscribers all fire', () => {
    const sm = createStateManager({});
    const a = vi.fn();
    const b = vi.fn();
    sm.subscribe(a);
    sm.subscribe(b);

    sm.set('k', 1);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
