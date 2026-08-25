/**
 * @file widget-bridge-shim.ts
 * @description The small runtime the renderer injects into an agent-authored
 * `mode=srcdoc` document so the widget can call `paw.invokeTool(name, args)`
 * instead of hand-rolling `postMessage` correlation, timeouts and 202
 * handling. Ships as a `<script>` prepended to the author's HTML.
 *
 * STRUCTURAL CONSTRAINT — read before editing `widgetBridgeShim`:
 *   That function is serialized with `Function.prototype.toString()` and
 *   injected as source text. It must therefore be COMPLETELY self-contained:
 *   no imports, no module-scope references, no closure over anything. Every
 *   value it needs arrives through its `config` argument. A captured
 *   identifier does not fail the build — it fails silently inside the frame,
 *   at runtime, where nobody can see it. `widget-bridge-shim.test.ts` guards
 *   this by round-tripping the serialized source through `new Function`.
 *
 * OUTCOME SHAPE — why it is a union and not a throw:
 *   `invokeTool` resolves with a discriminated union and never rejects.
 *   `{ status: 'pending' }` is a first-class outcome carrying NO `result`
 *   field, so a widget that destructures `result` gets `undefined` rather
 *   than rendering a parked write as done. Timeouts and teardown surface as
 *   `{ status: 'error', code: 'timeout' | 'destroyed' }` rather than as a
 *   rejection: an unhandled rejection inside an opaque-origin frame is
 *   invisible, and the widget would just spin forever.
 *
 * @created 2026-08-25 — T1 of the widget capability bridge arc.
 * @changes
 *   - Initial creation: self-contained shim + script builder.
 */

import {
  INVOKE_TOOL_CALL_V1,
  INVOKE_TOOL_RESULT_V1,
  INSTINCT_PENDING_CODE,
  INSTINCT_PENDING_STATUS
} from './widget-bridge-protocol.js';

/** How long a call waits for ANY reply before it gives up. Transport only. */
export const WIDGET_BRIDGE_DEFAULT_TIMEOUT_MS = 15_000;

/** Everything the injected shim needs. Passed in — never closed over. */
export interface WidgetBridgeShimConfig {
  token: string;
  callType: string;
  resultType: string;
  pendingStatus: number;
  pendingCode: string;
  timeoutMs: number;
}

/** A read (or an already-approved write) that completed. */
export interface PawToolOk {
  status: 'ok';
  result: unknown;
}

/** Parked for human approval in the Instinct tray. NOT done. NOT failed. */
export interface PawToolPending {
  status: 'pending';
  code: string;
  message: string;
}

/** The call did not happen: rejected, timed out, or the widget went away. */
export interface PawToolError {
  status: 'error';
  code: string;
  error: string;
}

export type PawToolOutcome = PawToolOk | PawToolPending | PawToolError;

/** The object the shim publishes as `window.paw` inside the sandbox. */
export interface PawBridgeApi {
  readonly protocol: string;
  invokeTool(tool: string, args?: Record<string, unknown>): Promise<PawToolOutcome>;
  destroy(): void;
}

/**
 * The injected runtime. SELF-CONTAINED — see the file header before editing.
 *
 * Exported directly so tests can drive it against a fake host window without
 * a real iframe (jsdom cross-frame `postMessage` is too weak to trust).
 *
 * @param config values baked in by the renderer, including the capability
 *   token the widget author never sees or sets.
 * @param win the frame's own window. Its `parent` is the host page.
 */
export function widgetBridgeShim(
  config: WidgetBridgeShimConfig,
  win: Window & typeof globalThis
): PawBridgeApi {
  var pending: Record<string, { settle: (o: PawToolOutcome) => void; timer: unknown }> =
    Object.create(null);
  var seq = 0;
  var alive = true;

  function finish(callId: string, outcome: PawToolOutcome): void {
    var entry = pending[callId];
    if (!entry) return;
    delete pending[callId];
    if (entry.timer !== undefined) win.clearTimeout(entry.timer as number);
    entry.settle(outcome);
  }

  function onMessage(event: MessageEvent): void {
    var data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if ((data as { paw?: unknown }).paw !== config.resultType) return;
    var callId = (data as { callId?: unknown }).callId;
    // A reply bearing an unknown callId is not ours — a stale in-flight call,
    // another frame's traffic, or noise. Ignore it, never throw.
    if (typeof callId !== 'string' || !pending[callId]) return;

    var msg = data as {
      ok?: unknown;
      status?: unknown;
      code?: unknown;
      result?: unknown;
      error?: unknown;
    };
    var status = typeof msg.status === 'number' ? msg.status : 0;
    var code = typeof msg.code === 'string' ? msg.code : '';

    // Pending is checked FIRST and does not depend on `ok`, so a parked write
    // can never read as success no matter how the host flags it.
    if (status === config.pendingStatus || code === config.pendingCode) {
      finish(callId, {
        status: 'pending',
        code: code || config.pendingCode,
        message:
          typeof msg.error === 'string' && msg.error
            ? msg.error
            : 'Waiting for human approval.'
      });
      return;
    }

    if (msg.ok === true) {
      finish(callId, { status: 'ok', result: msg.result });
      return;
    }

    finish(callId, {
      status: 'error',
      code: code || 'tool_failed',
      error: typeof msg.error === 'string' && msg.error ? msg.error : 'Tool call failed.'
    });
  }

  function invokeTool(tool: string, args?: Record<string, unknown>): Promise<PawToolOutcome> {
    if (!alive) {
      return Promise.resolve<PawToolOutcome>({
        status: 'error',
        code: 'destroyed',
        error: 'The widget bridge has been torn down.'
      });
    }
    if (typeof tool !== 'string' || tool === '') {
      return Promise.resolve<PawToolOutcome>({
        status: 'error',
        code: 'bad_request',
        error: 'invokeTool(name) requires a non-empty tool name.'
      });
    }

    seq += 1;
    var callId =
      'c' + seq + '-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);

    return new Promise<PawToolOutcome>(function (resolve) {
      var timer = win.setTimeout(function () {
        finish(callId, {
          status: 'error',
          code: 'timeout',
          error: 'No reply from the host within ' + config.timeoutMs + 'ms.'
        });
      }, config.timeoutMs);

      pending[callId] = { settle: resolve, timer: timer };

      try {
        // An opaque origin has no origin string to target, so '*' is the only
        // option here. The host's safety comes from checking `event.source`,
        // not from an origin string.
        win.parent.postMessage(
          {
            paw: config.callType,
            token: config.token,
            callId: callId,
            tool: tool,
            args: args && typeof args === 'object' ? args : undefined
          },
          '*'
        );
      } catch (err) {
        finish(callId, {
          status: 'error',
          code: 'transport',
          error: 'Could not reach the host: ' + String(err)
        });
      }
    });
  }

  function destroy(): void {
    if (!alive) return;
    alive = false;
    win.removeEventListener('message', onMessage as EventListener);
    for (var callId in pending) {
      finish(callId, {
        status: 'error',
        code: 'destroyed',
        error: 'The widget bridge was torn down before the host replied.'
      });
    }
  }

  win.addEventListener('message', onMessage as EventListener);

  var api: PawBridgeApi = {
    protocol: config.callType,
    invokeTool: invokeTool,
    destroy: destroy
  };
  (win as unknown as { paw: PawBridgeApi }).paw = api;
  return api;
}

/**
 * Build the `<script>` block the renderer prepends to author content.
 *
 * The token is baked in here, by the renderer. The widget author never sees
 * it, never sets it, and cannot mint one from a spec.
 */
export function buildWidgetBridgeShimScript(options: {
  token: string;
  timeoutMs?: number;
}): string {
  const config: WidgetBridgeShimConfig = {
    token: options.token,
    callType: INVOKE_TOOL_CALL_V1,
    resultType: INVOKE_TOOL_RESULT_V1,
    pendingStatus: INSTINCT_PENDING_STATUS,
    pendingCode: INSTINCT_PENDING_CODE,
    timeoutMs: options.timeoutMs ?? WIDGET_BRIDGE_DEFAULT_TIMEOUT_MS
  };
  // JSON.stringify escapes `<` so a token or code can never close the script
  // tag; belt-and-braces the sequence is replaced anyway.
  const serializedConfig = JSON.stringify(config).replace(/</g, '\\u003c');
  return (
    '<script>(' +
    widgetBridgeShim.toString() +
    ')(' +
    serializedConfig +
    ',window);<' +
    '/script>'
  );
}
