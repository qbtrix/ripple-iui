// stream-spec.test.ts — Unit tests for streamSpec().
// Covers the scenarios listed under "Unit tests" in
// docs/design/streaming-render-plan.md.
// Created: 2026-04-16

import { describe, it, expect } from 'vitest';
import { streamSpec } from './stream-spec.svelte.js';
import { parsePartialSpec } from './json-parse.js';
import type { StreamSpec } from './types.js';

// ---------- helpers ----------

async function* chunkStream(chunks: (string | Uint8Array)[], delayMs = 0): AsyncGenerator<string | Uint8Array> {
  for (const chunk of chunks) {
    if (delayMs > 0) await sleep(delayMs);
    yield chunk;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000, stepMs = 5): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await sleep(stepMs);
  }
}

function shredString(s: string, chunkSize: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += chunkSize) {
    out.push(s.slice(i, i + chunkSize));
  }
  return out;
}

// ---------- suites ----------

describe('streamSpec — lifecycle', () => {
  it('empty stream yields no current and marks done', async () => {
    const store = streamSpec(chunkStream([]));
    await waitFor(() => store.done);
    expect(store.current).toBeNull();
    expect(store.done).toBe(true);
    expect(store.error).toBeNull();
  });

  it('whitespace-only stream behaves like empty', async () => {
    const store = streamSpec(chunkStream(['   ', '\n\t', '  ']));
    await waitFor(() => store.done);
    expect(store.current).toBeNull();
    expect(store.error).toBeNull();
  });

  it('single complete JSON in one chunk parses on final emit', async () => {
    const spec = { version: '1.0', ui: { type: 'text', props: { text: 'hi' } } };
    const store = streamSpec(chunkStream([JSON.stringify(spec)]));
    await waitFor(() => store.done);
    expect(store.current).toMatchObject(spec);
    expect(store.error).toBeNull();
  });
});

describe('streamSpec — chunk sizes', () => {
  const fixture = {
    version: '1.0',
    ui: {
      type: 'card',
      props: { title: 'Hello world' },
      children: [
        { type: 'heading', props: { text: 'Welcome', level: 2 } },
        { type: 'text', props: { text: 'Body copy here' } },
      ],
    },
  };

  it.each([1, 4, 17])('final spec equals non-streaming parse (chunk size %i)', async (size) => {
    const full = JSON.stringify(fixture);
    const store = streamSpec(chunkStream(shredString(full, size)), { throttleMs: 0 });
    await waitFor(() => store.done);
    expect(store.current).toMatchObject(fixture);
  });
});

describe('streamSpec — options', () => {
  it('throttleMs prevents back-to-back parses', async () => {
    const full = JSON.stringify({ version: '1.0', ui: { type: 'text', props: { text: 'x' } } });
    const chunks = shredString(full, 3);
    let updates = 0;
    const store = streamSpec(chunkStream(chunks, 1), {
      throttleMs: 500,
      onUpdate: () => updates++,
    });
    await waitFor(() => store.done);
    // With 500ms throttle and chunks arriving every 1ms, we get at most one
    // intermediate emission plus one forced final emission.
    expect(updates).toBeLessThanOrEqual(2);
  });

  it('onUpdate fires on each new emission', async () => {
    const full = JSON.stringify({ version: '1.0', ui: { type: 'text', props: { text: 'hi' } } });
    let count = 0;
    const store = streamSpec(chunkStream(shredString(full, 2)), {
      throttleMs: 0,
      onUpdate: () => count++,
    });
    await waitFor(() => store.done);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('streamSpec — safety', () => {
  it('overflow caps buffer and surfaces error', async () => {
    const huge = 'x'.repeat(10_000);
    const store = streamSpec(chunkStream([huge, huge, huge]), { maxBufferBytes: 15_000 });
    await waitFor(() => store.done);
    expect(store.error).not.toBeNull();
    expect(store.error?.kind).toBe('overflow');
  });

  it('cancel() halts further emissions', async () => {
    const full = JSON.stringify({ version: '1.0', ui: { type: 'text', props: { text: 'abc' } } });
    const chunks = shredString(full, 1);
    let updates = 0;
    const store = streamSpec(chunkStream(chunks, 10), {
      throttleMs: 0,
      onUpdate: () => updates++,
    });
    await sleep(5);
    store.cancel();
    await waitFor(() => store.done);
    const finalCount = updates;
    await sleep(50);
    expect(updates).toBe(finalCount);
  });

  it('AbortSignal triggers cancel', async () => {
    const controller = new AbortController();
    const chunks = shredString(JSON.stringify({ version: '1.0', ui: {} }), 1);
    const store = streamSpec(chunkStream(chunks, 20), { signal: controller.signal });
    controller.abort();
    await waitFor(() => store.done);
    expect(store.done).toBe(true);
  });

  it('already-aborted signal short-circuits to done', () => {
    const controller = new AbortController();
    controller.abort();
    const store = streamSpec(chunkStream([]), { signal: controller.signal });
    expect(store.done).toBe(true);
  });
});

describe('streamSpec — truncated enum-key safety', () => {
  it('drops truncated widget type values', () => {
    // Raw buffer ends with an open-quote-truncated type
    const buffer = '{"version":"1.0","ui":{"type":"fl';
    const { value } = parsePartialSpec(buffer);
    expect(value).toBeTruthy();
    // The truncated type must not survive the filter
    expect((value as any)?.ui?.type).toBeUndefined();
  });

  it('keeps complete widget type values', () => {
    const buffer = '{"version":"1.0","ui":{"type":"flex"';
    const { value } = parsePartialSpec(buffer);
    expect((value as any)?.ui?.type).toBe('flex');
  });

  it('allows progressive text reveal for non-enum fields', () => {
    const buffer = '{"ui":{"type":"text","props":{"text":"Hello wor';
    const { value } = parsePartialSpec(buffer);
    const ui = (value as any)?.ui;
    // type is closed so it's kept; text is open but not an enum key, so
    // partial-json surfaces what it has.
    expect(ui?.type).toBe('text');
    expect(typeof ui?.props?.text === 'string' || ui?.props?.text === undefined).toBe(true);
  });
});

describe('streamSpec — ReadableStream compatibility', () => {
  it('accepts a ReadableStream of strings', async () => {
    const full = JSON.stringify({ version: '1.0', ui: { type: 'text' } });
    const stream = new ReadableStream<string>({
      start(controller) {
        for (const c of shredString(full, 4)) controller.enqueue(c);
        controller.close();
      },
    });
    const store = streamSpec(stream);
    await waitFor(() => store.done);
    expect((store.current as any)?.ui?.type).toBe('text');
  });

  it('accepts a ReadableStream of Uint8Array', async () => {
    const full = JSON.stringify({ version: '1.0', ui: { type: 'text' } });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of shredString(full, 4)) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });
    const store = streamSpec(stream);
    await waitFor(() => store.done);
    expect((store.current as any)?.ui?.type).toBe('text');
  });
});
