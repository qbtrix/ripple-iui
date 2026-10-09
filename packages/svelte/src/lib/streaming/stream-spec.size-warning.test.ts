// stream-spec.size-warning.test.ts: the dev-only `warnAtBytes` warning.
// streamSpec warns once per stream when the buffer first passes the
// threshold, never below it, never twice, not at all when disabled, and not
// in a production build (esm-env DEV false).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamSpec } from './stream-spec.svelte.js';

async function* chunks(parts: string[]): AsyncGenerator<string> {
  for (const p of parts) yield p;
}

async function waitDone(store: { done: boolean }): Promise<void> {
  const start = Date.now();
  while (!store.done) {
    if (Date.now() - start > 1000) throw new Error('stream never finished');
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** A valid spec split into `n` chunks, padded with a long string to `size` chars. */
function bigSpec(size: number, n: number): string[] {
  const head = '{"ui":{"type":"text","props":{"text":"';
  const tail = '"}}}';
  const json = head + 'x'.repeat(Math.max(0, size - head.length - tail.length)) + tail;
  const step = Math.ceil(json.length / n);
  const out: string[] = [];
  for (let i = 0; i < json.length; i += step) out.push(json.slice(i, i + step));
  return out;
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe('streamSpec warnAtBytes', () => {
  it('warns once when the buffer passes the threshold, naming the size and the fix', async () => {
    // 5 chunks of ~400 chars: chunks 3, 4 and 5 are all past 1000.
    const store = streamSpec(chunks(bigSpec(2000, 5)), { warnAtBytes: 1000 });
    await waitDone(store);
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toMatch(/\d+ bytes/);
    expect(msg).toMatch(/`sources`|`api`/);
  });

  it('does not warn below the threshold', async () => {
    const store = streamSpec(chunks(bigSpec(900, 3)), { warnAtBytes: 1000 });
    await waitDone(store);
    expect(warn).not.toHaveBeenCalled();
  });

  it('defaults to 100_000', async () => {
    const small = streamSpec(chunks(bigSpec(99_000, 4)));
    await waitDone(small);
    expect(warn).not.toHaveBeenCalled();
    const big = streamSpec(chunks(bigSpec(101_000, 4)));
    await waitDone(big);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns once per stream, not once per process', async () => {
    for (let i = 0; i < 2; i++) {
      const store = streamSpec(chunks(bigSpec(2000, 4)), { warnAtBytes: 1000 });
      await waitDone(store);
    }
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('is disabled by 0 and by Infinity', async () => {
    for (const warnAtBytes of [0, Infinity]) {
      const store = streamSpec(chunks(bigSpec(200_000, 4)), { warnAtBytes });
      await waitDone(store);
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('streamSpec warnAtBytes in a production build', () => {
  afterEach(() => {
    vi.doUnmock('esm-env');
    vi.resetModules();
  });

  it('stays silent when esm-env DEV is false', async () => {
    vi.resetModules();
    vi.doMock('esm-env', () => ({ DEV: false, BROWSER: true, NODE: false }));
    const { streamSpec: prodStreamSpec } = await import('./stream-spec.svelte.js');
    const store = prodStreamSpec(chunks(bigSpec(2000, 4)), { warnAtBytes: 1000 });
    await waitDone(store);
    expect(warn).not.toHaveBeenCalled();
  });
});
