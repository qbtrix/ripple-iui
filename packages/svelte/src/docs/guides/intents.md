---
title: Intents and multi-step flows
description: Let Ripple choose a designed layout from what the UI is for, and ship a whole multi-step flow in one spec.
order: 3
---

A UniversalSpec doesn't describe widgets. It says what the UI is for, gives Ripple the data, and Ripple renders a designed layout. It is the quicker format for a model to write when the job fits one of the common shapes: pick from a list, fill in a form, review and confirm.

## Pick an intent

| Intent | Use it for | Renders |
|---|---|---|
| `browse` | Exploring a set of items | Card grid or list, depending on the data |
| `select` | Choosing one or more items | Selectable list or grid |
| `detail` | One item in depth | Detail layout |
| `form` | Collecting input | Form, split into sections or steps when long |
| `confirm` | Reviewing before submit | Summary |
| `quick_confirm` | A lighter review step | Summary card |
| `info` | Read-only information | Info layout |
| `search` | A search box with results | Search layout |
| `slides` | A presentation | One slide per section |
| `dashboard` | A grid of widgets | Dashboard |

Any other intent, including `custom`, `action` and `workspace`, renders the spec's `ui` tree as written. Use `intent: 'custom'` with a `ui` tree when no layout fits.

## Tell the layout about your data

`fields` maps the roles a layout knows about to the field names in your data:

```json
{
  "version": "2.0",
  "intent": "browse",
  "title": "Recipes this week",
  "data": {
    "items": [
      { "id": "1", "name": "Pasta carbonara", "photo": "https://images.example.com/carbonara.jpg", "time": "25 min" },
      { "id": "2", "name": "Green curry", "photo": "https://images.example.com/curry.jpg", "time": "35 min" }
    ]
  },
  "fields": { "id": "id", "title": "name", "image": "photo", "subtitle": "time" },
  "display": { "layout": "grid", "columns": 3, "density": "comfortable" },
  "selection": "single"
}
```

The layout reads the data's shape through those roles. Items with an `image` lean toward a card grid; items with only text lean toward a list; a long form splits into sections. Set `display.layout` to override the choice, and `display.density` (`compact`, `comfortable`, `spacious`) to tighten or loosen it. The composite layouts `comparison`, `checklist`, `invoice`, `report`, `timeline`, `table` and `article` are reached the same way, through `display.layout`.

## Multi-step flows

A flow ships every step in one spec. Each step is a UniversalSpec, and its next step is nested inside it, so moving forward and back needs no round trip to the model.

- `chain`: the next step.
- `chain_map`: the next step chosen by the `id` of the selected item. It is checked before `chain`.
- `flowId`: a name for the step. Its answers are stored as `<flowId>_selection` and `<flowId>_formData`, so later steps and the final result can read them.
- `onComplete`: what to do when the last step finishes.

```json
{
  "version": "2.0",
  "intent": "select",
  "flowId": "plan",
  "title": "Choose a plan",
  "selection": "single",
  "data": {
    "items": [
      { "id": "team", "title": "Team", "description": "Up to 10 seats" },
      { "id": "business", "title": "Business", "description": "Unlimited seats" }
    ]
  },
  "chain_map": {
    "business": {
      "intent": "form",
      "flowId": "contact",
      "title": "Tell us about your company",
      "onComplete": { "kind": "emit", "event": "sales_lead" }
    }
  },
  "chain": {
    "intent": "confirm",
    "flowId": "review",
    "title": "Review your plan",
    "onComplete": { "kind": "navigate", "url": "/checkout" }
  }
}
```

`<Ripple>` notices a spec with any of these four fields and runs it as a flow, with back and forward navigation and a progress indicator. When the last step finishes, it calls `onComplete` with the step's action and everything collected along the way:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { Ripple } from '@ripple-ui/svelte';

  let { spec } = $props();
</script>

<Ripple
  {spec}
  onComplete={({ action, payload }) => {
    if (action?.kind === 'navigate') goto(action.url);
    if (action?.kind === 'emit') saveLead(action.event, payload);
  }}
/>
```

Ripple never runs the final action itself. The kinds a spec can ask for:

| `kind` | Fields | Meaning |
|---|---|---|
| `emit` | `event`, `payload?` | Hand the answers to your app under a name |
| `navigate` | `url` | Go somewhere |
| `chat` | `message` | Send a message to the conversation the flow came from |
| `invoke_tool` | `tool`, `args?`, `then?` | Run a named tool with the answers |
| `call_binding` | `binding`, `path`, `params?`, `then?` | Run a named write on your server |
| `create_pocket` | `name`, `template?`, `spec?`, `seed_from_flow?`, `then?` | Save the answers as a new item in the host app |

The three write kinds take an optional `then`, another flow action to run after the write succeeds, typically a `navigate`. For those, return a promise from `onComplete`; Ripple shows the success view once it resolves.

`onComplete` on a step (a flow action) is not the same as the older free-form `on_complete` field, and neither is the `flow` action, which sequences actions inside a single step (see [Flow actions](/docs/concepts/flow-actions)).

## Driving a flow yourself

`ChainExecutor` is the state machine behind flows, exported from `@ripple-ui/svelte` for hosts that build their own step UI:

```ts
import { ChainExecutor } from '@ripple-ui/svelte';

const flow = new ChainExecutor(rootSpec);

flow.currentSpec;                 // the step to show
flow.advance(selectedItem, formData);   // the next step's spec, or null at the end
flow.back();                      // { spec, state } of the previous step, or null
flow.forward();
flow.canGoBack;                   // also canGoForward, hasNextChain, isTerminal
flow.terminalAction();            // { action, payload } at the last step
```

`advance` refuses to move past a form step with an empty required field. It returns `null` and fills `flow.validationErrors`.

`FlowRunner` is the component `<Ripple>` uses to host a flow, also exported if you want to mount it directly with `spec`, `onComplete`, `onEvent` and `state`.
