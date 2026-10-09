---
title: Catalog and validation
description: The widget catalog a model writes against, the manifests that describe it, and how to check model output before you render it.
order: 8
---

The catalog is the set of widget types Ripple can draw. It does two jobs: it is what you teach a model, through a manifest, and it is the allowlist a spec is checked against before or during rendering.

## The manifests

A manifest is a JSON description of the catalog, built from the same declarations the widgets use, so it can't drift from the code.

| Manifest | Where | What's in it |
|---|---|---|
| Full | `https://ripple.pocketpaw.xyz/manifest.json`, or `@ripple-ui/svelte/manifest.json` in your app | The spec envelope, every action with its fields, the motion grammar, and every widget with its props, events, node fields and an example |
| Slim | `https://github.com/qbtrix/ripple-iui/releases/latest/download/manifest.slim.json`, or `@ripple-ui/svelte/manifest.slim.json` | The spec envelope, the core actions (`set`, `toggle`, `push`, `remove`, `open`, `navigate`, `toast`, `emit`, `pin`, `unpin`) and five standard widgets (`text`, `heading`, `badge`, `button`, `flex`) |

The full manifest is large. Send it to a model when you want the whole catalog available. The slim one is small enough for any prompt and is what the [slim headless runtime](/docs/concepts/headless#a-smaller-runtime) runs. To give a model a middle ground, build your own list from the full manifest's `widgets` array, keeping only the types your app needs. The [prompting guide](/docs/guides/prompting) shows how.

Every manifest starts with a `spec` block, the envelope contract: the tree lives under `ui` (never `root`, `tree`, `view`, `body` or `content`), `state` seeds the data, and `version` is `1.0`.

## Three checks, from cheap to strict

Model output can be wrong in three ways: it isn't JSON, it is JSON in the wrong shape, or it is the right shape with a widget type that doesn't exist. Check in that order.

```ts
import { safeParseUISpec, validateCatalog, type UISpec } from '@ripple-ui/svelte';

type Checked = { ok: true; spec: UISpec } | { ok: false; error: string };

export function checkSpec(text: string): Checked {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not JSON: ${(e as Error).message}` };
  }

  const parsed = safeParseUISpec(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `Bad spec at ${first.path.join('.') || '(root)'}: ${first.message}` };
  }

  const unknown = validateCatalog(parsed.data);
  if (unknown.length) {
    return { ok: false, error: `Unknown widgets: ${unknown.map((u) => `${u.type} at ${u.path}`).join(', ')}` };
  }

  return { ok: true, spec: parsed.data };
}
```

The error strings are written to go back to the model. Sending one back, such as "Unknown widgets: pricetag at ui.children[2]", tells the model exactly what to fix.

### Error shapes

- **`JSON.parse`** throws a `SyntaxError`.
- **`safeParseUISpec`** returns `{ success: false, error }`, where `error` is a Zod error. `error.issues` is a list of `{ path, message, code }`; `path` is an array such as `['ui', 'children', 2, 'on_click']`. A different major version is refused here with a message naming the version.
- **`validateCatalog`** returns an array of `{ path, type }`, for example `{ path: 'ui.children[2]', type: 'pricetag' }`. Empty means every node is known. It walks `children` and `else_children`, treats `if` and `each` as known, and returns `[]` for `null` or `undefined`.

The schema checks structure only. It doesn't know which widget types exist, so a spec can pass `safeParseUISpec` and still fail `validateCatalog`.

### validateCatalog and custom widgets

The `validateCatalog` exported from `@ripple-ui/svelte` reads the live registry, so widgets you added with `registerWidget` count as known. Types your app resolves some other way go in `extraWidgetTypes`:

```ts
validateCatalog(spec, { extraWidgetTypes: ['my-host-widget'] });
```

The version in `@ripple-ui/core` has no widgets of its own, so it needs the list passed in, for example on a server that doesn't load Svelte:

```ts
import { validateCatalog } from '@ripple-ui/core';
import manifest from '@ripple-ui/svelte/manifest.json' with { type: 'json' };

const widgetTypes = manifest.widgets.map((w) => w.type);
const unknown = validateCatalog(spec, { widgetTypes });
```

## What happens if you don't check

Ripple renders what it can. An unknown type becomes a red box naming the type and node id, and the rest of the spec renders around it. A spec that isn't valid JSON can't render at all. During [streaming](/docs/concepts/streaming), Ripple renders each partial parse and keeps the last good one if the stream fails, so checking happens best after the stream ends:

```ts
$effect(() => {
  if (store.done && !store.error) {
    const unknown = validateCatalog(store.current);
    if (unknown.length) console.warn('Unknown widgets', unknown);
  }
});
```

To see unknown types in development without writing a check, pass `checkCatalog` to `<Ripple>`. It logs them to the console whenever the spec changes.

## Validating on the server

If you store specs, or render them for other users, validate on the server before saving. The checks above run in Node with `@ripple-ui/core` alone. Add a [headless](/docs/concepts/headless) resolve if you want to go further and assert what the spec actually shows, such as "the form has an email input".
