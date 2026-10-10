---
title: Streaming
description: How Ripple renders a spec that is still arriving, what it holds back, and when to parse a growing string yourself.
order: 5
---

A model writes a spec token by token. Ripple can render it as it arrives: it parses whatever JSON has come in so far, closes the open brackets in its head, and draws that tree. Each new chunk grows the UI instead of replacing a spinner at the end.

The step-by-step setup, from a SvelteKit endpoint to the page, is in [Stream a spec](/docs/getting-started/stream-a-spec). This page covers how it behaves.

## The pieces

Everything lives in the `@ripple-ui/svelte/streaming` entry point, kept apart from the main bundle because it brings in a partial JSON parser.

- `streamSpec(source, options)` reads a `ReadableStream` or async iterable of strings or bytes and returns a reactive store with `current`, `done`, `error` and `cancel()`.
- `<Ripple streaming={store} />` renders `store.current` and ignores `spec`. Until the first parse, it shows the `skeleton` placeholder (`card`, `dashboard`, `text`, or `none` to draw your own).
- `parsePartialSpec(text)` is the same parser without the stream, for when you already hold the text.

## What happens to a half-written value

A partial parser turns `{"type": "fl` into `{ type: "fl" }`, and `fl` is not a widget. Ripple holds back a value that is still being written for the keys that name things: `type`, `intent`, `version`, `action` and `variant`. The node appears once its closing quote arrives, so a stream never flashes an "unknown widget" box.

Other strings render as they grow, so a heading types itself out.

A widget whose props are still arriving can fail to render, for example a chart that has one of the three items it needs. While the stream is open, Ripple shows a quiet placeholder in its place and tries again with each new chunk. If the widget still fails once the stream ends, it gets the usual error card.

## Timing

Ripple parses at most once every `throttleMs` (50 ms by default). Text that arrives inside the window is parsed when the window closes, so a stream that pauses mid-sentence still shows everything received so far.

`maxBufferBytes` (2 MB by default) caps how much text one stream may send. Past it, Ripple cancels the source and sets an `overflow` error.

## Size and order

The [manifest](/docs/concepts/catalog-and-validation#the-manifests) tells models to write `ui` before `state`, so the first widget draws while the seed data is still arriving.

Every parse reads the whole buffer again, so a long spec paints late. In development, `streamSpec` warns in the console once per stream when the text passes `warnAtBytes` (100,000 by default). Set it to `0` or `Infinity` to turn the warning off; production builds never warn. A spec that large is usually carrying data: have the host supply it through a `sources` binding or an `api` action instead of the model typing it into the spec.

## Errors

`streamSpec` never throws. `store.error` is a `StreamParseError` with a `kind`:

| Kind | Meaning |
|---|---|
| `malformed` | The source threw. `error.lastValid` holds the last spec that parsed. |
| `incomplete` | The stream ended before anything parsed. |
| `overflow` | The text passed `maxBufferBytes`. |

Cancelling, by `cancel()` or an aborted `signal`, sets `done` without an error. If a stream fails after part of the UI has rendered, Ripple keeps showing that part.

## Parsing a growing string

If your app already accumulates the model's reply, for example a chat message that grows token by token, you have a string rather than a stream. Parse it on each update:

```svelte
<script lang="ts">
  import { Ripple } from '@ripple-ui/svelte';
  import { parsePartialSpec } from '@ripple-ui/svelte/streaming';

  let { text }: { text: string } = $props();

  const spec = $derived(parsePartialSpec(text).value);
</script>

{#if spec}
  <Ripple {spec} />
{/if}
```

`value` is `null` until the text parses at all.

## Watching from outside a component

Pass `onUpdate` to see every new spec, for logging or to save the final one:

```ts
import { streamSpec } from '@ripple-ui/svelte/streaming';

const store = streamSpec(source, {
  onUpdate: (spec) => console.log('spec now has', JSON.stringify(spec).length, 'chars')
});
```

## Limits

- Streaming suits a first render. If a later chunk changes an input's props while someone types in it, their keystrokes are lost on the re-render.
- Only web streams and async iterables are accepted. Wrap a Node `Readable` with `Readable.toWeb()`.
- The held-back keys are a fixed list. A custom widget prop that takes a fixed set of values isn't protected and can render its partial value for a moment.
