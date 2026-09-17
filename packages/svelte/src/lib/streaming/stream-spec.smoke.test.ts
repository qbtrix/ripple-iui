// stream-spec.smoke.test.ts — Smoke tests: is the module importable,
// is the skeleton widget registered, do the exported types exist.
// Fast checks that catch packaging regressions before the simulation
// and unit suites run.
// Created: 2026-04-16

import { describe, it, expect } from 'vitest';
import { streamSpec, StreamParseError } from './index.js';
import type { StreamSpecStore, StreamSpecOptions } from './index.js';
import { getWidget, hasWidget } from '../widgets/index.js';

describe('smoke — module imports', () => {
  it('streamSpec is a function', () => {
    expect(typeof streamSpec).toBe('function');
  });

  it('StreamParseError is a constructible class', () => {
    const err = new StreamParseError('overflow', null, 'test');
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe('overflow');
    expect(err.lastValid).toBeNull();
  });

  it('types surface at runtime as interfaces (no-op check)', () => {
    const sample: StreamSpecOptions = { throttleMs: 42 };
    expect(sample.throttleMs).toBe(42);
    // StreamSpecStore is shape-only; just prove it compiles
    const shape: Partial<StreamSpecStore> = { done: false };
    expect(shape.done).toBe(false);
  });
});

describe('smoke — widget registry', () => {
  it('skeleton is registered', () => {
    expect(hasWidget('skeleton')).toBe(true);
    expect(getWidget('skeleton')).toBeTruthy();
  });

  it('core widgets still resolve (no accidental unregistering)', () => {
    for (const type of ['flex', 'card', 'text', 'button', 'input', 'dashboard']) {
      expect(hasWidget(type)).toBe(true);
    }
  });
});

describe('smoke — streamSpec basic lifecycle', () => {
  async function* empty(): AsyncGenerator<string> {
    return;
  }

  it('immediate cancel does not throw', async () => {
    const store = streamSpec(empty());
    store.cancel();
    expect(store.done).toBe(true);
    expect(store.error).toBeNull();
  });

  it('cancel() is idempotent', async () => {
    const store = streamSpec(empty());
    store.cancel();
    store.cancel();
    store.cancel();
    expect(store.done).toBe(true);
  });
});
