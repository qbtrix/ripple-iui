# Streaming render

Ripple can render a UI spec as it streams in from an LLM, so users stop
staring at a blank screen while the JSON finishes. The `@ripple-ui/svelte/streaming`
entrypoint exports a small helper that turns any streaming source into a
reactive store. Feed the store to `<Ripple>` and it progressively fills the
UI as tokens arrive.

## Quick start

```svelte
<script>
  import { Ripple } from '@ripple-ui/svelte';
  import { streamSpec } from '@ripple-ui/svelte/streaming';

  const response = await fetch('/api/generate-ui');
  const store = streamSpec(response.body);
</script>

<Ripple streaming={store} skeleton="card" />
```

While `store.current` is null, Ripple shows a skeleton. Once partial JSON
parses to a valid tree, Ripple switches to rendering it. As more tokens
arrive, the tree grows.

## API

### `streamSpec(source, options?)`

Returns a `StreamSpecStore`.

```ts
function streamSpec(
  source: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array>,
  options?: StreamSpecOptions
): StreamSpecStore
```

**source** — anything that yields string or Uint8Array chunks. Node `Readable`
is not directly supported; use `Readable.toWeb()` or a manual `for await`
wrapper that yields chunks.

**options:**

| Option | Default | What it does |
|---|---|---|
| `throttleMs` | `50` | Minimum ms between parse attempts. Tied to perception, not frame rate. Text arriving inside the window gets one parse when it closes, so a pausing stream still shows everything received. |
| `maxBufferBytes` | `2_000_000` | Safety cap. Stream is cancelled with an `overflow` error if the buffer grows past this. |
| `warnAtBytes` | `100_000` | Dev-only. The first time the buffer grows past this, `console.warn` fires once for that stream, naming the size and pointing at host data (`sources` or an `api` action) instead of inline records. Every frame re-parses the whole buffer, so a large spec paints slowly. Measured like `maxBufferBytes`. `0` or `Infinity` turns it off; production builds (esm-env `DEV` false) never warn. |
| `allow` | `OBJ \| ARR \| STR` | `partial-json` flags. Whatever the flags, a value for an enum-like key (`type`, `intent`, `version`, `action`, `variant`) stays out of the tree while the buffer ends inside it. |
| `signal` | — | AbortSignal for caller-driven cancellation. |
| `onUpdate` | — | Called once per new emission with the new spec. |

### `StreamSpecStore`

```ts
interface StreamSpecStore {
  readonly current: UniversalSpec | UISpec | null;
  readonly done: boolean;
  readonly error: StreamParseError | null;
  cancel(): void;
}
```

All three readable properties are reactive inside Svelte components. Access
them directly or wrap in `$derived`.

### `StreamParseError`

Thrown never — always captured into `store.error`. Inspect `error.kind`:

- `'malformed'` — source threw or emitted unparseable chunks; `lastValid` holds the previous good spec
- `'incomplete'` — source ended before any valid parse
- `'overflow'` — buffer exceeded `maxBufferBytes`
- `'aborted'` — reserved; cancellation generally sets `done` without an error

## Ripple component props

```ts
interface Props {
  spec?: UniversalSpec | UISpec;
  streaming?: StreamSpecStore;
  skeleton?: 'card' | 'dashboard' | 'text' | 'none';
  // ... existing props unchanged
}
```

When `streaming` is passed, Ripple uses `streaming.current` and ignores
`spec`. While `streaming.current` is null, Ripple renders the `skeleton`
variant (defaults to `'card'`).

`skeleton="none"` suppresses the placeholder entirely — useful when a
caller wraps `<Ripple>` in their own loading UI.

## Recipes

### Stream from `fetch`

```svelte
<script>
  import { Ripple } from '@ripple-ui/svelte';
  import { streamSpec } from '@ripple-ui/svelte/streaming';

  let store = $state(null);

  async function generate() {
    const res = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Build a contact form' })
    });
    store = streamSpec(res.body);
  }
</script>

<button onclick={generate}>Generate</button>
{#if store}
  <Ripple streaming={store} skeleton="card" />
{/if}
```

### Cancel on route change

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { streamSpec } from '@ripple-ui/svelte/streaming';

  const controller = new AbortController();
  const store = streamSpec(someSource, { signal: controller.signal });

  onDestroy(() => controller.abort());
</script>
```

### Subscribe outside a component

Inside a `.ts` file (no `$state` available), you can still observe the
store via polling or by wiring an `onUpdate` callback:

```ts
import { streamSpec } from '@ripple-ui/svelte/streaming';

const store = streamSpec(source, {
  onUpdate: (spec) => console.log('new spec version', spec.version),
});
```

## Limitations

- **Mid-stream state.** If a streamed spec updates an `input` widget's
  props while a user is typing, keystrokes are not preserved across the
  re-render. Streaming is intended for display-first renders and initial
  loads, not mid-interaction patching.
- **Truncated enum keys.** The parser holds back truncated values for a
  fixed set of enum-like keys. A new enum-like prop on a custom widget
  won't be protected until added to that list.
- **Node streams.** Only web streams and async iterables. Node callers
  wrap their `Readable` with `Readable.toWeb()` or an async generator.
