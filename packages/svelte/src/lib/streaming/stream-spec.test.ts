// stream-spec.test.ts — Unit tests for streamSpec().
// Covers the scenarios listed under "Unit tests" in
// docs/design/streaming-render-plan.md.
// Created: 2026-04-16

import { describe, it, expect } from 'vitest';
import { streamSpec } from './stream-spec.svelte.js';
import { parse } from 'partial-json';
import { DEFAULT_ALLOW, parsePartialSpec } from './json-parse.js';
import type { StreamSpec } from '$lib/streaming/index.js';

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

/** A ReadableStream the test feeds by hand and can leave open (a model that pauses). */
function openStream(): { stream: ReadableStream<string>; push: ReadableStreamDefaultController<string> } {
  let push!: ReadableStreamDefaultController<string>;
  const stream = new ReadableStream<string>({ start: (c) => void (push = c) });
  return { stream, push };
}

function uiType(spec: unknown): unknown {
  const ui = spec && typeof spec === 'object' && 'ui' in spec ? spec.ui : undefined;
  return ui && typeof ui === 'object' && 'type' in ui ? ui.type : undefined;
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

describe('streamSpec — trailing-edge throttle', () => {
  it('parses the received tail during a pause (throttle has a trailing parse)', async () => {
    const { stream, push } = openStream();
    const store = streamSpec(stream, { throttleMs: 40 });
    push.enqueue('{"version":"1.0","state":{"a":1}');
    push.enqueue(',"ui":{"type":"text"}}');
    // The stream stays open, so only a trailing parse can surface the second chunk.
    await waitFor(() => uiType(store.current) === 'text');
    expect(store.current).toMatchObject({ state: { a: 1 }, ui: { type: 'text' } });
    expect(store.done).toBe(false);
  });

  it('parses once on the leading edge and once on the trailing edge of a window', async () => {
    const { stream, push } = openStream();
    let updates = 0;
    const store = streamSpec(stream, { throttleMs: 40, onUpdate: () => updates++ });
    for (const chunk of ['{"version":"1.0"', ',"state":{"a":1}', ',"ui":{"type":"text"}', '}']) {
      push.enqueue(chunk);
    }
    await sleep(150);
    expect(updates).toBe(2);
    expect(uiType(store.current)).toBe('text');
  });

  type Handle = {
    store: ReturnType<typeof streamSpec>;
    controller: AbortController;
    push: ReadableStreamDefaultController<string>;
  };
  it.each<[string, (h: Handle) => void]>([
    ['cancel()', (h) => h.store.cancel()],
    ['abort', (h) => h.controller.abort()],
    ['end of stream', (h) => h.push.close()],
    ['source error', (h) => h.push.error(new Error('boom'))],
  ])('a pending trailing parse never fires after %s', async (_, finish) => {
    const { stream, push } = openStream();
    const controller = new AbortController();
    let updates = 0;
    const store = streamSpec(stream, {
      throttleMs: 40,
      signal: controller.signal,
      onUpdate: () => updates++,
    });
    push.enqueue('{"version":"1.0"');
    push.enqueue(',"ui":{"type":"text"}}');
    await sleep(0); // leading parse ran; the second chunk sits inside the window
    expect(updates).toBe(1);
    finish({ store, controller, push });
    await waitFor(() => store.done);
    const settled = updates;
    await sleep(100);
    expect(updates).toBe(settled);
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

  // A finished `""` earlier in the buffer used to make a just-opened `"type":"`
  // look closed, so the renderer painted a "isn't in the catalog" card per row.
  it('drops a just-opened empty type even when the buffer already holds ""', () => {
    const { value } = parsePartialSpec('{"state":{"name":""},"ui":{"type":"card","children":[{"type":"');
    const child = (value as { ui: { children: Record<string, unknown>[] } }).ui.children[0];
    expect(child).not.toHaveProperty('type');
  });

  it('drops a just-opened child type that repeats its closed parent type', () => {
    const { value } = parsePartialSpec('{"ui":{"type":"flex","children":[{"type":"flex');
    const ui = (value as { ui: { type: string; children: Record<string, unknown>[] } }).ui;
    expect(ui.type).toBe('flex');
    expect(ui.children[0]).not.toHaveProperty('type');
  });

  it('honours backslash escapes when deciding the last string is closed', () => {
    // One `\"` flips naive quote parity; `\\"` is an escaped backslash then a real close.
    const closed = parsePartialSpec('{"text":"a \\"b","path":"C:\\\\","type":"card"');
    expect((closed.value as Record<string, unknown>).type).toBe('card');
    // A trailing `\"` or lone `\` leaves the value open.
    expect(parsePartialSpec('{"type":"car\\"').value).not.toHaveProperty('type');
    expect(parsePartialSpec('{"type":"car\\').value).not.toHaveProperty('type');
  });

  it('keeps closed empty strings at the very end of the buffer', () => {
    expect(parsePartialSpec('{"a":""}').value).toEqual({ a: '' });
    expect(parsePartialSpec('{"ui":{"type":""').value).toEqual({ ui: { type: '' } });
  });
});

const textProp = (buffer: string) =>
  (parsePartialSpec(buffer).value as { ui: { props: { text?: unknown } } }).ui.props.text;

describe('streamSpec — truncated expression safety', () => {
  const OPEN = '{"ui":{"type":"text","props":{"text":"';

  it('drops an unclosed expression at the end of a string value', () => {
    expect(textProp(`${OPEN}{item.drinks * st`)).toBe('');
    expect(textProp(`${OPEN}{`)).toBe('');
  });

  // partial-json trims the buffer, so a trailing space in an open string goes too.
  it('keeps the text before an unclosed expression', () => {
    expect(textProp(`${OPEN}Card 1 of {state.cards`)).toBe('Card 1 of');
    expect(textProp(`${OPEN}{state.bill} {state.un`)).toBe('{state.bill}');
  });

  it('leaves a closed expression at the end of the buffer alone', () => {
    expect(textProp(`${OPEN}Total {state.bill}`)).toBe('Total {state.bill}');
    expect(textProp(`${OPEN}Total {state.bill} and mo`)).toBe('Total {state.bill} and mo');
  });

  it('never touches braces in an earlier closed string', () => {
    const { value } = parsePartialSpec('{"ui":{"type":"text","props":{"label":"a { b","text":"Hello wor');
    expect((value as { ui: { props: unknown } }).ui.props).toEqual({ label: 'a { b', text: 'Hello wor' });
  });

  it('honours escaped quotes inside the trailing string', () => {
    expect(textProp(`${OPEN}say \\"hi\\" {state.na`)).toBe('say "hi"');
    expect(textProp(`${OPEN}say \\"{\\" `)).toBe('say "');
  });

  it('cuts an unclosed expression in an array element too', () => {
    expect(parsePartialSpec('{"options":["a","b {state.x').value).toEqual({ options: ['a', 'b'] });
  });

  it('does not mangle a truncated property name', () => {
    const buffer = '{"ui":{"type":"text","props":{"te{x';
    expect(parsePartialSpec(buffer).value).toEqual(parse(buffer, DEFAULT_ALLOW));
    const afterComma = '{"ui":{"type":"text","props":{"a":"x","b{c';
    expect(parsePartialSpec(afterComma).value).toEqual(parse(afterComma, DEFAULT_ALLOW));
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
