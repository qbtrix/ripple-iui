---
title: SvelteKit end to end
description: A complete SvelteKit app that asks a model for a UI, streams it into Ripple, handles its events, and shows errors.
order: 4
---

This guide puts the pieces together: a server endpoint that streams a model's spec, a page that renders it while it streams, an `onEvent` handler for what the spec asks your app to do, and error states. It builds on [Stream a spec](/docs/getting-started/stream-a-spec), which explains the streaming store itself.

## Files

```
src/lib/server/ripple-prompt.ts   the system prompt with the catalog
src/routes/api/ui/+server.ts      calls the model, streams the text
src/routes/+page.svelte           the prompt box and <Ripple>
```

## 1. The system prompt

Build it once on the server from the manifest. The full version, with the reasoning for each instruction, is in [Prompting a model with the manifest](/docs/guides/prompting):

```ts
// src/lib/server/ripple-prompt.ts
import manifest from '@ripple-ui/svelte/manifest.json' with { type: 'json' };

const WIDGETS = new Set(['flex', 'card', 'heading', 'text', 'badge', 'button', 'input', 'select', 'checkbox', 'table', 'each', 'if']);

export const SYSTEM_PROMPT = `You write user interfaces as Ripple specs.
Reply with one JSON object and nothing else: no prose, no Markdown fences.
Use only the widgets and actions in this catalog:
${JSON.stringify({ spec: manifest.spec, actions: manifest.actions, widgets: manifest.widgets.filter((w) => WIDGETS.has(w.type)) })}`;
```

## 2. The endpoint

The endpoint returns the model's text as a streaming body. Pick the provider guide that matches your model and copy its `+server.ts`:

- [Claude](/docs/guides/claude-api), with the Anthropic SDK
- [OpenAI](/docs/guides/openai), with the OpenAI SDK
- [Any model](/docs/guides/any-model), with `fetch` against an OpenAI-compatible API

Each one validates the request body, keeps the API key on the server, and cancels the model call when the browser goes away.

## 3. The page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Ripple, validateCatalog, type RippleEvent, type UISpec } from '@ripple-ui/svelte';
  import { streamSpec, type StreamSpecStore } from '@ripple-ui/svelte/streaming';

  let prompt = $state('A signup form with name, email and a plan picker');
  let store = $state.raw<StreamSpecStore | null>(null);
  let requestError = $state('');
  let notice = $state('');
  let controller: AbortController | undefined;

  async function generate() {
    controller?.abort();
    controller = new AbortController();
    requestError = '';
    store = null;

    try {
      const res = await fetch('/api/ui', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });
      if (!res.ok || !res.body) {
        requestError = `The model request failed (${res.status}).`;
        return;
      }
      store = streamSpec(res.body, { signal: controller.signal });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') requestError = 'Could not reach the server.';
    }
  }

  // Once the stream ends, check the result against the catalog.
  const unknown = $derived(store?.done && store.current ? validateCatalog(store.current as UISpec) : []);

  async function onEvent(event: RippleEvent) {
    switch (event.type) {
      case 'navigate':
        if (event.url?.startsWith('/')) goto(event.url);
        return;
      case 'toast':
        notice = event.message ?? '';
        return;
      case 'emit':
        if (event.name === 'signup') {
          const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(event.payload)
          });
          notice = res.ok ? 'Signed up.' : 'Signup failed.';
        }
        return;
    }
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); generate(); }}>
  <label>Describe a UI <input bind:value={prompt} /></label>
  <button disabled={store != null && !store.done}>Generate</button>
</form>

{#if requestError}
  <p role="alert">{requestError}</p>
{/if}

{#if store}
  {#if store.error && !store.current}
    <p role="alert">The model's reply couldn't be read ({store.error.kind}). Try again.</p>
  {:else}
    <Ripple streaming={store} {onEvent} />
  {/if}
  {#if unknown.length}
    <p role="alert">This UI uses widgets we don't have: {unknown.map((u) => u.type).join(', ')}.</p>
  {/if}
{/if}

{#if notice}
  <p role="status">{notice}</p>
{/if}
```

## What each part does

**Starting a request.** `generate` aborts any stream still running, so a second click doesn't leave two streams writing. The same signal goes to `fetch` and to `streamSpec`, so aborting stops both.

**Rendering.** `<Ripple streaming={store}>` shows a skeleton until the first chunk parses, then grows the UI as text arrives. The store is held in `$state.raw` because it is already reactive.

**Handling events.** The spec can't call your code; it sends requests to `onEvent`. This handler only follows relative links, shows toasts in its own status line, and turns one named `emit` into a real request. A spec that asks for anything else is ignored. Teach the model the event names you handle by mentioning them in the prompt, for example "When the form is submitted, emit `signup` with the form values."

**Errors.** There are three kinds, shown in three places:

| What went wrong | Where it shows up | What the page does |
|---|---|---|
| The endpoint failed (bad key, rate limit, model down) | `res.ok` is false | Shows `requestError` |
| The reply wasn't a usable spec | `store.error` with no `store.current` | Shows the error kind and asks for a retry |
| The reply used widgets that don't exist | `validateCatalog` after the stream ends | Lists them under the UI |

If the stream fails after part of the UI has rendered, `store.current` keeps the last good spec, so the page keeps showing it.

For the full set of checks, and how to send errors back to the model for a retry, see [Catalog and validation](/docs/concepts/catalog-and-validation). For what to check in an event before acting on it, see [Security and safe URLs](/docs/concepts/security).
