---
{
  "title": "Accordion Root Container",
  "summary": "The Accordion root component wraps bits-ui's `Accordion.Root` primitive to provide the stateful container for a set of collapsible sections. It exposes bindable `value` and `ref` props, and lays items out in a vertical flex column.",
  "concepts": [
    "accordion",
    "bits-ui",
    "Accordion.Root",
    "value binding",
    "bindable",
    "compound component",
    "data-slot",
    "ref binding",
    "Svelte 5",
    "cn utility",
    "Tailwind CSS"
  ],
  "categories": [
    "widget",
    "layout",
    "state-management"
  ],
  "source_docs": [
    "bb950cb45d20a612"
  ],
  "backlinks": null,
  "word_count": 458,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`accordion.svelte` is the outermost wrapper of the accordion compound component. It manages which items are expanded and provides the context that `AccordionItem`, `AccordionTrigger`, and `AccordionContent` read to coordinate their behavior.

## State: The `value` Binding

The `value` prop is declared `$bindable()`, allowing two-way binding:

```svelte
<Accordion bind:value={openSection}>
  ...
</Accordion>
```

When `value` is a `string`, the accordion is single-select (only one item open at a time). When `value` is a `string[]`, it becomes multi-select. bits-ui's `Accordion.Root` handles this mode discrimination internally based on the value type. The `value as never` cast in `bind:value={value as never}` silences a TypeScript variance warning: the bindable prop type is `string | string[] | undefined`, but the primitive's type narrows to one mode or the other — `as never` is the pragmatic workaround for this union binding pattern.

## Layout

The root renders with `flex w-full flex-col` classes, stacking `AccordionItem` children vertically. The `cn-accordion` class prefix suggests a custom namespace for theming overrides — this is a convention in Ripple's component library where components add a stable CSS class alongside Tailwind utilities, enabling style overrides without `!important` specificity wars.

## `data-slot` Attribute

`data-slot="accordion"` marks the root element for:
- **CSS targeting** — Parent containers can select `[data-slot=accordion]` to adjust margin, padding, or border without adding wrapper divs.
- **Testing** — Test selectors can find the accordion root by slot name.

## `ref` Binding

`ref = $bindable(null)` exposes the underlying DOM element reference. This is used when callers need to imperatively focus an item, measure the accordion height, or attach third-party observers (e.g., a resize observer for virtualized lists). Passing `null` as the default means callers can safely ignore `ref` without null-check ceremony.

## Composition Pattern

The accordion is a compound component: Root + Item + Trigger + Content work together through bits-ui's internal context. The root must wrap all items; items must contain exactly one trigger and one content. The index barrel (`accordion/index.ts`) re-exports all four pieces as named exports, enabling the shorthand:

```svelte
import * as Accordion from '$lib/components/ui/accordion';
<Accordion.Root>
  <Accordion.Item value="a">
    <Accordion.Trigger>Title</Accordion.Trigger>
    <Accordion.Content>Body</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

## Controlled vs Uncontrolled

When `value` is not bound (uncontrolled mode), bits-ui manages open/close state entirely internally. When it is bound, the parent has full read/write access to the open state. This is useful in Ripple's spec-driven context: a spec action like `set_state` can close a specific accordion item by writing to the bound state key, creating programmatically controllable accordions from JSON specs.

## Known Gaps

The `value as never` cast is a known TypeScript limitation with bindable union types in Svelte 5. A future bits-ui version or a Svelte 5 language update may resolve the need for this cast. Until then, it is a documented, intentional workaround rather than a type-safety hole.