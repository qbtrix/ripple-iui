/**
 * @file widget-bridge-shim.test.ts
 * @description Drives the injected shim against a FAKE host window — no real
 * iframe. jsdom's cross-frame `postMessage` is too weak to prove anything
 * about this protocol, so the fake host is the honest test surface: it is
 * exactly what a correct host does (listen, validate, reply by callId).
 * @created 2026-08-25 — T1 of the widget capability bridge arc.
 * @changes
 *   - Initial creation: happy path, concurrency, timeout, unknown callId,
 *     202 pending, teardown, and the self-containment round-trip guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  widgetBridgeShim,
  buildWidgetBridgeShimScript,
  WIDGET_BRIDGE_DEFAULT_TIMEOUT_MS,
  type PawBridgeApi,
  type WidgetBridgeShimConfig
} from './widget-bridge-shim.js';
import {
  INVOKE_TOOL_CALL_V1,
  INVOKE_TOOL_RESULT_V1,
  INSTINCT_PENDING_CODE,
  INSTINCT_PENDING_STATUS,
  isInvokeToolCallV1,
  type InvokeToolCallV1,
  type InvokeToolResultV1
} from './widget-bridge-protocol.js';

const TOKEN = 'tok_instance_abc123';

const CONFIG: WidgetBridgeShimConfig = {
  token: TOKEN,
  callType: INVOKE_TOOL_CALL_V1,
  resultType: INVOKE_TOOL_RESULT_V1,
  pendingStatus: INSTINCT_PENDING_STATUS,
  pendingCode: INSTINCT_PENDING_CODE,
  timeoutMs: 1000
};

/**
 * A fake sandboxed frame plus its host page. `sent` records what the widget
 * posted upward; `reply` plays the host answering that frame.
 */
function makeFrame() {
  const listeners = new Set<(event: MessageEvent) => void>();
  const sent: InvokeToolCallV1[] = [];

  const win = {
    parent: {
      postMessage(message: unknown) {
        sent.push(message as InvokeToolCallV1);
      }
    },
    addEventListener(type: string, fn: (event: MessageEvent) => void) {
      if (type === 'message') listeners.add(fn);
    },
    removeEventListener(type: string, fn: (event: MessageEvent) => void) {
      if (type === 'message') listeners.delete(fn);
    },
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id)
  } as unknown as Window & typeof globalThis;

  function reply(message: Partial<InvokeToolResultV1>) {
    const event = { data: { paw: INVOKE_TOOL_RESULT_V1, ...message } } as MessageEvent;
    for (const fn of [...listeners]) fn(event);
  }

  return { win, sent, reply, listenerCount: () => listeners.size };
}

describe('widgetBridgeShim', () => {
  let frame: ReturnType<typeof makeFrame>;
  let paw: PawBridgeApi;

  beforeEach(() => {
    vi.useFakeTimers();
    frame = makeFrame();
    paw = widgetBridgeShim(CONFIG, frame.win);
  });

  afterEach(() => {
    paw.destroy();
    vi.useRealTimers();
  });

  it('publishes itself as window.paw', () => {
    expect((frame.win as unknown as { paw: PawBridgeApi }).paw).toBe(paw);
    expect(paw.protocol).toBe(INVOKE_TOOL_CALL_V1);
  });

  it('sends a well-formed v1 call carrying the injected token', async () => {
    const call = paw.invokeTool('github.list_issues', { repo: 'qbtrix/ripple' });

    expect(frame.sent).toHaveLength(1);
    const sent = frame.sent[0];
    expect(isInvokeToolCallV1(sent)).toBe(true);
    expect(sent.paw).toBe(INVOKE_TOOL_CALL_V1);
    expect(sent.token).toBe(TOKEN);
    expect(sent.tool).toBe('github.list_issues');
    expect(sent.args).toEqual({ repo: 'qbtrix/ripple' });
    expect(typeof sent.callId).toBe('string');

    frame.reply({ callId: sent.callId, ok: true, status: 200, result: { issues: 3 } });

    await expect(call).resolves.toEqual({ status: 'ok', result: { issues: 3 } });
  });

  it('routes concurrent calls to the right callId', async () => {
    const a = paw.invokeTool('read.a');
    const b = paw.invokeTool('read.b');
    const c = paw.invokeTool('read.c');

    const [idA, idB, idC] = frame.sent.map((m) => m.callId);
    expect(new Set([idA, idB, idC]).size).toBe(3);

    // Reply out of order — correlation must not depend on arrival order.
    frame.reply({ callId: idC, ok: true, status: 200, result: 'C' });
    frame.reply({ callId: idA, ok: true, status: 200, result: 'A' });
    frame.reply({ callId: idB, ok: false, status: 403, code: 'forbidden', error: 'nope' });

    await expect(a).resolves.toEqual({ status: 'ok', result: 'A' });
    await expect(b).resolves.toEqual({ status: 'error', code: 'forbidden', error: 'nope' });
    await expect(c).resolves.toEqual({ status: 'ok', result: 'C' });
  });

  it('times out a call that never gets a reply, instead of hanging', async () => {
    const call = paw.invokeTool('read.silent');
    await vi.advanceTimersByTimeAsync(CONFIG.timeoutMs + 1);

    const outcome = await call;
    expect(outcome.status).toBe('error');
    expect(outcome).toMatchObject({ code: 'timeout' });
  });

  it('ignores a reply bearing an unknown callId and still settles the real one', async () => {
    const call = paw.invokeTool('read.one');
    const realId = frame.sent[0].callId;

    // Noise: another frame's traffic, or a stale in-flight reply.
    expect(() =>
      frame.reply({ callId: 'not-a-real-call-id', ok: true, status: 200, result: 'ghost' })
    ).not.toThrow();
    // Also noise: a message that is not this protocol at all.
    expect(() => frame.reply({ paw: 'something/else' } as never)).not.toThrow();

    frame.reply({ callId: realId, ok: true, status: 200, result: 'real' });
    await expect(call).resolves.toEqual({ status: 'ok', result: 'real' });
  });

  describe('202 instinct_pending', () => {
    it('surfaces as a distinct outcome that is neither ok nor error', async () => {
      const call = paw.invokeTool('github.create_issue', { title: 'hi' });
      frame.reply({
        callId: frame.sent[0].callId,
        ok: true,
        status: INSTINCT_PENDING_STATUS,
        code: INSTINCT_PENDING_CODE
      });

      const outcome = await call;
      expect(outcome.status).toBe('pending');
      expect(outcome.status).not.toBe('ok');
      expect(outcome.status).not.toBe('error');
      // No `result` field at all — a widget that renders `result` shows
      // nothing rather than claiming the write happened.
      expect('result' in outcome).toBe(false);
      expect(outcome).toMatchObject({ code: INSTINCT_PENDING_CODE });
    });

    it('stays pending even when the host flags the parked write as not ok', async () => {
      const call = paw.invokeTool('github.create_issue');
      frame.reply({
        callId: frame.sent[0].callId,
        ok: false,
        status: INSTINCT_PENDING_STATUS,
        code: INSTINCT_PENDING_CODE
      });
      await expect(call).resolves.toMatchObject({ status: 'pending' });
    });

    it('stays pending when only the code is set', async () => {
      const call = paw.invokeTool('github.create_issue');
      frame.reply({
        callId: frame.sent[0].callId,
        ok: true,
        status: 200,
        code: INSTINCT_PENDING_CODE
      });
      await expect(call).resolves.toMatchObject({ status: 'pending' });
    });
  });

  it('abandons in-flight calls on teardown and unhooks its listener', async () => {
    const call = paw.invokeTool('read.slow');
    paw.destroy();

    await expect(call).resolves.toMatchObject({ status: 'error', code: 'destroyed' });
    expect(frame.listenerCount()).toBe(0);

    // A late reply after teardown must not resurrect anything.
    expect(() => frame.reply({ callId: 'anything', ok: true, status: 200 })).not.toThrow();
    await expect(paw.invokeTool('read.after')).resolves.toMatchObject({ code: 'destroyed' });
  });

  it('rejects a call with no tool name without touching the wire', async () => {
    await expect(paw.invokeTool('')).resolves.toMatchObject({ code: 'bad_request' });
    expect(frame.sent).toHaveLength(0);
  });
});

describe('buildWidgetBridgeShimScript', () => {
  it('bakes the token in and never lets it close the script tag', () => {
    const script = buildWidgetBridgeShimScript({ token: '</script><b>x' });
    expect(script.startsWith('<script>')).toBe(true);
    expect(script.endsWith('</script>')).toBe(true);
    // Exactly one closing tag: the shim's own.
    expect(script.split('</script>')).toHaveLength(2);
  });

  it('defaults the timeout', () => {
    expect(buildWidgetBridgeShimScript({ token: 't' })).toContain(
      String(WIDGET_BRIDGE_DEFAULT_TIMEOUT_MS)
    );
  });

  /**
   * The shim ships as SOURCE TEXT. A refactor that adds an import or closes
   * over module scope compiles fine and breaks silently inside the frame,
   * so evaluate the serialized string in a bare scope and use the result.
   */
  it('round-trips through new Function — proves it is self-contained', async () => {
    const frame = makeFrame();
    const factory = new Function('return (' + widgetBridgeShim.toString() + ');')();
    const api = factory(CONFIG, frame.win) as PawBridgeApi;

    const call = api.invokeTool('read.roundtrip');
    expect(frame.sent[0].token).toBe(TOKEN);
    frame.reply({ callId: frame.sent[0].callId, ok: true, status: 200, result: 'ok!' });
    await expect(call).resolves.toEqual({ status: 'ok', result: 'ok!' });
    api.destroy();
  });
});
