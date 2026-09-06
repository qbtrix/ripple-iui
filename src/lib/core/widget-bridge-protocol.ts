/**
 * @file widget-bridge-protocol.ts
 * @description The `invoke_tool/v1` wire protocol between a sandboxed
 * `mode=srcdoc` embed and its host page. Types, version strings, runtime
 * type guards, and the renderer-only context contract the host implements.
 *
 * WHY THIS EXISTS
 *   `Embed.svelte` with `mode=srcdoc` runs agent-authored HTML/JS inside an
 *   opaque-origin sandbox. That frame can draw, but it cannot call anything —
 *   it has no bridge. This module is the transport half: a versioned message
 *   pair that lets the frame emit the `invoke_tool` verb the renderer already
 *   supports (`event-dispatcher.ts`, action `invoke_tool`).
 *
 * WHAT THIS IS NOT
 *   It is NOT authority. The host validates every message and forwards it into
 *   the existing per-pocket allowlist / trust / Instinct path unchanged. A
 *   bridged widget can reach exactly what the pocket's human-set allowlist
 *   already permits, and nothing more. The iframe sandbox attribute, the
 *   permissions enum and the 64KB srcdoc cap in `Embed.svelte` are untouched
 *   by this work — `postMessage` crosses an opaque origin by design and needs
 *   none of them widened.
 *
 * SECURITY NOTES FOR HOST IMPLEMENTERS (full contract: docs/widget-bridge.md)
 *   * A `message` listener hears EVERY frame on the page, including
 *     third-party `mode=url` embeds. The host MUST compare `event.source`
 *     against the specific `iframe.contentWindow` it minted a token for
 *     BEFORE it looks at the token. That check is load-bearing.
 *   * `event.origin` is the string `"null"` for opaque-origin frames. It is
 *     not identity and must never be used as one.
 *   * Replies must be posted to the held `contentWindow` reference with
 *     `targetOrigin: '*'` — an opaque origin has no origin string to target.
 *     Holding the right window reference is what makes that safe.
 *
 * @created 2026-08-25 — T1 of the widget capability bridge arc.
 * @changes
 *   - Initial creation: v1 call/result messages, guards, bridge context type.
 */

/** Message tag a sandboxed widget sends to request a tool call. */
export const INVOKE_TOOL_CALL_V1 = 'invoke_tool/v1';

/** Message tag the host sends back with the outcome of one call. */
export const INVOKE_TOOL_RESULT_V1 = 'invoke_tool/result/v1';

/** HTTP-ish status the host reports when a write parked for human approval. */
export const INSTINCT_PENDING_STATUS = 202;

/** Machine code that accompanies {@link INSTINCT_PENDING_STATUS}. */
export const INSTINCT_PENDING_CODE = 'instinct_pending';

/** Svelte context key under which a host publishes its bridge. Renderer-only. */
export const WIDGET_BRIDGE_CONTEXT_KEY = 'ui-widget-bridge';

/** Widget → host. Every field is required except `args`. */
export interface InvokeToolCallV1 {
  paw: typeof INVOKE_TOOL_CALL_V1;
  /** Per-instance capability token, injected by the renderer. */
  token: string;
  /** Correlates this call with its reply. Unique per frame. */
  callId: string;
  /** Tool id, e.g. `github.list_issues`. Authority still comes from the allowlist. */
  tool: string;
  /** Tool arguments. Plain JSON only — it crosses a structured-clone boundary. */
  args?: Record<string, unknown>;
}

/** Host → widget. `ok` reports whether the host accepted and ran the call. */
export interface InvokeToolResultV1 {
  paw: typeof INVOKE_TOOL_RESULT_V1;
  /** Echoes the `callId` of the call being answered. */
  callId: string;
  ok: boolean;
  /** Transport/backing status. `202` means parked for human approval. */
  status: number;
  /** Machine-readable outcome code, e.g. `instinct_pending`, `forbidden`. */
  code?: string;
  /** Present only on a completed read. Never present when pending. */
  result?: unknown;
  /** Human-readable failure reason. Present when the call did not succeed. */
  error?: string;
}

/**
 * The three outcomes a widget author must handle. `pending` is deliberately
 * neither `ok` nor `error`: a write parks for human approval, and a widget
 * that renders it as done lies to the user.
 */
export type InvokeToolOutcomeKind = 'ok' | 'pending' | 'error';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when `value` is a well-formed widget → host call. */
export function isInvokeToolCallV1(value: unknown): value is InvokeToolCallV1 {
  if (!isPlainObject(value)) return false;
  if (value.paw !== INVOKE_TOOL_CALL_V1) return false;
  if (typeof value.token !== 'string' || value.token === '') return false;
  if (typeof value.callId !== 'string' || value.callId === '') return false;
  if (typeof value.tool !== 'string' || value.tool === '') return false;
  if (value.args !== undefined && !isPlainObject(value.args)) return false;
  return true;
}

/** True when `value` is a well-formed host → widget reply. */
export function isInvokeToolResultV1(value: unknown): value is InvokeToolResultV1 {
  if (!isPlainObject(value)) return false;
  if (value.paw !== INVOKE_TOOL_RESULT_V1) return false;
  if (typeof value.callId !== 'string' || value.callId === '') return false;
  if (typeof value.ok !== 'boolean') return false;
  if (typeof value.status !== 'number') return false;
  if (value.code !== undefined && typeof value.code !== 'string') return false;
  if (value.error !== undefined && typeof value.error !== 'string') return false;
  return true;
}

/**
 * Classify a reply the same way the injected shim does.
 *
 * `pending` is checked FIRST and does not depend on `ok`, so a host that
 * reports a parked write as `ok: true` and one that reports it as `ok: false`
 * both surface as pending rather than silently reading as done or failed.
 */
export function classifyInvokeToolResult(message: InvokeToolResultV1): InvokeToolOutcomeKind {
  if (message.status === INSTINCT_PENDING_STATUS || message.code === INSTINCT_PENDING_CODE) {
    return 'pending';
  }
  return message.ok ? 'ok' : 'error';
}

/**
 * One bridged frame's lifecycle, as handed to the renderer by the host.
 *
 * Minted at mount, attached once the iframe has a `contentWindow`, revoked
 * synchronously at unmount so a torn-down widget's token stops working.
 */
export interface WidgetBridgeHandle {
  /** Unguessable, per-INSTANCE (never per spec id). Injected into the srcdoc. */
  readonly token: string;
  /** Bind the token to the frame the host will accept messages from. */
  attach(frame: Window | null): void;
  /** Revoke the token and drop the frame binding. Idempotent. */
  revoke(): void;
}

/**
 * Host-supplied bridge, published via Svelte context under
 * {@link WIDGET_BRIDGE_CONTEXT_KEY}.
 *
 * Context — not a component prop — is what keeps the token out of reach of
 * the spec: a spec is JSON, JSON cannot carry a function, and only the host
 * that set the context can mint a token. If no host publishes a bridge,
 * `mode=srcdoc` embeds render exactly as they do today, with no shim.
 */
export interface WidgetBridgeHost {
  /** Mint a handle for one about-to-mount widget instance. */
  connect(info: { widgetId?: string }): WidgetBridgeHandle;
}
