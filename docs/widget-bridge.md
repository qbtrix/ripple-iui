<!-- @file docs/widget-bridge.md
     @description Host contract for the widget capability bridge
       (`invoke_tool/v1`) between a sandboxed `mode=srcdoc` embed and its host.
     @created 2026-08-25 — T1 of the widget capability bridge arc.
     @changes
       - Initial creation: wire protocol, host MUSTs, shim API, limits. -->

# Widget capability bridge (`invoke_tool/v1`)

An `embed` widget with `mode=srcdoc` runs agent-authored HTML/CSS/JS inside an
opaque-origin sandbox. It can draw, but on its own it cannot call anything. The
bridge gives that frame one verb — `invoke_tool` — and nothing else.

**The bridge is transport, not permission.** The host forwards a validated call
into the tool path it already has: the same per-pocket allowlist, the same trust
gates, the same Instinct parking for writes, the same audit trail. A bridged
widget reaches exactly what the pocket's human-set allowlist already permits. If
that allowlist is empty, the bridge does nothing.

Ripple ships the widget half: the wire types, the guards, and the shim injected
into the srcdoc. **The host half lives in the host application** and must follow
the contract below.

---

## Wire protocol

Widget → host:

```jsonc
{
  "paw": "invoke_tool/v1",
  "token": "<per-instance capability token, injected by the renderer>",
  "callId": "<unique per frame; correlates the reply>",
  "tool": "github.list_issues",
  "args": { "repo": "qbtrix/ripple" }   // optional, plain JSON
}
```

Host → widget:

```jsonc
{
  "paw": "invoke_tool/result/v1",
  "callId": "<echoes the call>",
  "ok": true,
  "status": 200,
  "code": "instinct_pending",   // optional machine code
  "result": { },                 // completed reads only — NEVER when pending
  "error": "…"                   // human-readable reason when not ok
}
```

Import the constants and guards rather than retyping the strings:

```ts
import {
  INVOKE_TOOL_CALL_V1,
  INVOKE_TOOL_RESULT_V1,
  INSTINCT_PENDING_STATUS,
  INSTINCT_PENDING_CODE,
  WIDGET_BRIDGE_CONTEXT_KEY,
  isInvokeToolCallV1,
  classifyInvokeToolResult,
  type WidgetBridgeHost
} from '@ripple-ui/svelte';
```

The protocol string is versioned from day one. A breaking change ships as
`invoke_tool/v2`; a host may speak both, and must ignore any tag it does not
recognise.

---

## What the host MUST do

### 1. Publish a bridge on Svelte context

Before mounting `<Ripple>`, set context under `WIDGET_BRIDGE_CONTEXT_KEY`
(`'ui-widget-bridge'`) to a `WidgetBridgeHost`:

```ts
interface WidgetBridgeHost {
  connect(info: { widgetId?: string }): WidgetBridgeHandle;
}

interface WidgetBridgeHandle {
  readonly token: string;          // unguessable, per INSTANCE
  attach(frame: Window | null): void;  // bind the token to that contentWindow
  revoke(): void;                  // idempotent
}
```

Context — not a component prop — is what keeps the token out of the spec's
reach: a spec is JSON, and JSON cannot carry a function, so only the host can
mint a token. If no host publishes a bridge, `mode=srcdoc` embeds render exactly
as they always have, with no shim injected. **The bridge is opt-in per host.**

`Embed.svelte` calls `connect()` once at mount, calls `attach()` with the
iframe's `contentWindow`, and calls `revoke()` in `onDestroy`. Revocation is
synchronous with teardown, so a torn-down widget's token stops working
immediately.

### 2. Check `event.source` BEFORE you trust the token

This is the load-bearing check. A `window.addEventListener('message')` listener
hears **every** frame on the page — including third-party pages loaded by
`mode=url` embeds, which are not yours and are not trusted.

```ts
window.addEventListener('message', (event) => {
  const handle = bridges.get(event.source as Window); // keyed by contentWindow
  if (!handle) return;                                 // drop silently
  if (!isInvokeToolCallV1(event.data)) return;
  if (event.data.token !== handle.token) return;       // drop + count
  // … only now is this a call from a widget you minted a token for
});
```

Order matters. Resolving the frame first means a hostile page cannot get its
token compared, replayed, or logged. Tokens are bound to `contentWindow`, never
to a spec id — two instances of the same widget get different tokens, and one
instance can never use another's.

### 3. Never treat `event.origin` as identity

For an opaque-origin frame `event.origin` is the string `"null"`. Every such
frame on the page reports the same thing. It is not identity and must not be
used as one.

### 4. Reply to the held `contentWindow` with `targetOrigin: '*'`

An opaque origin has no origin string to target, so `'*'` is the only option in
both directions — the shim posts upward with `'*'` too. Safety comes from
posting to the **specific window reference you hold**, not from an origin
string. Never reply by broadcasting on `window.parent` or by iterating frames.

```ts
handle.frame.postMessage(
  { paw: INVOKE_TOOL_RESULT_V1, callId, ok: true, status: 200, result },
  '*'
);
```

Always echo the `callId` you were given. A reply with a `callId` the frame does
not recognise is silently ignored by the shim.

### 5. Report a parked write as pending, and never attach a `result`

A write routes through Instinct and returns `202` / `instinct_pending`. Forward
that faithfully:

```ts
{ paw: INVOKE_TOOL_RESULT_V1, callId, ok: true, status: 202, code: 'instinct_pending' }
```

The shim classifies pending **before** it looks at `ok`, so a host that flags a
parked write either way still surfaces as pending — but do not send a `result`
field with it. A widget that renders a parked write as done lies to the user.

### 6. Validate, cap and rate-limit — fail closed at every step

```
1. event.source is a known bridged frame     else drop silently
2. token matches that instance               else drop + count
3. message shape valid, args under cap       else error reply
4. rate limit + outstanding-pending cap      else error reply
5. forward → the existing tool-run path      (unchanged)
6. reply to that frame only, by callId
```

Exceeding a limit should disable that instance's bridge for the session **and
say so visibly**. A widget that goes quiet with no explanation is a worse bug
than one that reports it was cut off.

`args` crosses a structured-clone boundary — treat it as untrusted input and
size-cap it. The tool name is untrusted too: authority comes from the allowlist
lookup, never from the string the frame sent.

### 7. Honest limits

- Host-side rate limiting is sufficient only because the sandbox can reach the
  backend *through* the host. It does not protect against a non-widget caller;
  a per-pocket cap in the backend is the real fix and is a named follow-up.
- The token sits in the DOM, so anything with host DOM access can read it. That
  is acceptable: DOM access already implies more authority than the bridge
  grants. Stated so nobody assumes otherwise.
- v1 has no tool discovery. A widget cannot ask what it may call; the author
  hardcodes tool names. Discovery would leak the allowlist shape into an
  untrusted frame.
- `mode=url` embeds get no bridge, ever.

---

## What the widget author sees

The renderer injects a shim that publishes `window.paw`. The token is baked in
by the renderer — the author never sees it, sets it, or passes it.

```js
const outcome = await paw.invokeTool('github.list_issues', { repo: 'qbtrix/ripple' });

if (outcome.status === 'ok') {
  render(outcome.result);
} else if (outcome.status === 'pending') {
  render('Waiting for approval');   // NOT done
} else {
  render('Failed: ' + outcome.error);
}
```

`invokeTool` **never rejects**. It resolves with one of three shapes:

| `status`    | fields              | meaning                                            |
|-------------|---------------------|----------------------------------------------------|
| `'ok'`      | `result`            | the call completed                                  |
| `'pending'` | `code`, `message`   | parked for human approval — **no `result` field**   |
| `'error'`   | `code`, `error`     | rejected, timed out (`timeout`), or torn down (`destroyed`) |

Pending carries no `result` at all, so a widget that destructures `result` shows
nothing rather than claiming a write happened. Errors resolve rather than throw
because an unhandled rejection inside an opaque-origin frame is invisible — the
widget would just spin forever.

A call that gets no reply within 15s (default) resolves as
`{ status: 'error', code: 'timeout' }`. That timeout covers transport only: the
202 acknowledgement of a parked write arrives immediately, and the human
approval that follows is not on a clock.
