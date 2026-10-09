---
title: Prompting a model with the manifest
description: Give a model the widget catalog, ask it for a spec, and check what comes back.
order: 5
---

A model writes good specs when it sees three things: the spec format, the widgets it may use, and an instruction to return JSON and nothing else. The manifest covers the first two.

## Pick a manifest

- The **slim manifest** (`https://github.com/qbtrix/ripple-iui/releases/latest/download/manifest.slim.json`) is a few kilobytes: the envelope, the core actions and five basic widgets. Use it when the UI is simple or the prompt budget is tight.
- The **full manifest** (`@ripple-ui/svelte/manifest.json`) describes every widget. It is large, so trim it to the widgets your app needs.

Both are described in [Catalog and validation](/docs/concepts/catalog-and-validation).

## Build the system prompt on the server

Read the manifest once, at startup, and keep the prompt text stable. A prompt that is byte-identical across requests is cheaper with providers that cache prompt prefixes.

```ts
// src/lib/server/ripple-prompt.ts
import manifest from '@ripple-ui/svelte/manifest.json' with { type: 'json' };

// The widgets this app wants the model to use.
const WIDGETS = new Set(['flex', 'grid', 'card', 'heading', 'text', 'badge', 'button', 'input', 'select', 'checkbox', 'table', 'metric', 'each', 'if']);

const catalog = {
  spec: manifest.spec,
  actions: manifest.actions,
  widgets: manifest.widgets.filter((w) => WIDGETS.has(w.type))
};

export const SYSTEM_PROMPT = `You write user interfaces as Ripple specs.

Reply with one JSON object and nothing else: no prose, no Markdown fences.
The object has "version": "1.0", an optional "state" object, and a "ui" node tree.
Use only the widget types, props and actions listed in the catalog below.
Put every value a widget shows or edits in "state" and read it with {state.path}.
Use "bind" for inputs. Use fictional names and data.

Catalog:
${JSON.stringify(catalog)}`;
```

What the instructions are for:

- **"One JSON object and nothing else"**: Ripple streams and parses the text as it arrives, so a sentence before the brace or a Markdown fence breaks the parse.
- **"Only the widget types listed"**: the model otherwise invents plausible names (`price-card`, `navbar2`) that fail the catalog check.
- **State and bind**: keeps the UI interactive without your code; the model wires inputs to state instead of hard-coding values.

The catalog's `spec` block adds rules that keep a spec short, so it streams and paints sooner. If you write your own prompt without it, include them:

- Leave out any prop whose value equals the widget's documented default.
- For repeated rows or cards, keep the records as an array in `state` and render them with one `each` node.
- Bulk data (more than a few dozen records) comes from the host, through a `sources` binding or an `api` action, not typed into the spec.

## Ask for a spec

The user message is the request itself. Short and concrete works best:

```
A signup form with name, email and a plan picker (Free, Pro). Show a summary line under it.
```

If you have data to show, put it in the message as JSON and say where it goes ("Show these orders in a table, newest first"). The model copies it into `state`.

## Check what comes back

Run the three checks from [Catalog and validation](/docs/concepts/catalog-and-validation#three-checks-from-cheap-to-strict) on the final text: JSON, schema, catalog. When a check fails, you can send the error back as a new user message ("That spec has unknown widgets: price-card at ui.children[1]. Use only the catalog.") and ask again. `formatSpecIssues(specIssues(json))` writes that message for you, covering the schema and catalog checks. Cap the retries, for example at two.

When you stream, `<Ripple>` renders as the text arrives, so run the checks once the stream ends, and decide then whether to keep the result or retry.

## With a provider

The provider guides plug this prompt into a streaming endpoint:

- [Claude](/docs/guides/claude-api)
- [OpenAI](/docs/guides/openai)
- [Any model](/docs/guides/any-model), with plain `fetch` against an OpenAI-compatible API

The page side is the same for all of them, see [SvelteKit end to end](/docs/guides/sveltekit).
