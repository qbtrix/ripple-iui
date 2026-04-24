---
{
  "title": "Radio Group Barrel — Dual-Export Entry Point for Root and Item",
  "summary": "The index module for the radio group component exports both the `Root` container and `Item` option under structural and semantic names, enabling consumers to import as `{ RadioGroup, RadioGroupItem }` or `{ Root, Item }`. It establishes the two-component composition model that every radio group must follow.",
  "concepts": [
    "radio group",
    "barrel export",
    "Root component",
    "Item component",
    "named export",
    "selection context",
    "ARIA radiogroup",
    "composition pattern",
    "semantic naming",
    "bits-ui"
  ],
  "categories": [
    "widget",
    "form",
    "module-organization"
  ],
  "source_docs": [
    "650cb4c85b75995e"
  ],
  "backlinks": null,
  "word_count": 309,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/radio-group/index.ts` is the public entry point for the radio group family. Radio groups require at least two components — a container that manages selection state and individual option items — so this barrel exports both and aliases them semantically.

## Why Two Components

A radio group is not a single element. It requires:

1. **Root** — sets up the shared selection context, tracks which value is selected, handles keyboard navigation between options, and manages ARIA `role="radiogroup"` semantics.
2. **Item** — represents a single selectable option, reads from the shared context to know if it is selected, renders the visual indicator accordingly.

Splitting them gives consumers compositional control: they can insert dividers, labels, or groupings between items without fighting against a monolithic component's internal layout.

## Module Contents

```typescript
import Root from "./radio-group.svelte";
import Item from "./radio-group-item.svelte";

export {
  Root,
  Item,
  //
  Root as RadioGroup,
  Item as RadioGroupItem,
};
```

## Naming Conventions

The dual-naming pattern (`Root` / `RadioGroup`, `Item` / `RadioGroupItem`) serves different audiences:

- **`Root` / `Item`** — matches bits-ui's primitive naming. Developers migrating from or familiar with bits-ui work naturally with these names.
- **`RadioGroup` / `RadioGroupItem`** — self-documenting names preferred in application-level code and generated UI, where code readability matters more than convention consistency.

## Usage Pattern

```svelte
<script>
  import { RadioGroup, RadioGroupItem } from "$lib/components/ui/radio-group";
</script>

<RadioGroup bind:value={selected}>
  <RadioGroupItem value="a" />
  <RadioGroupItem value="b" />
  <RadioGroupItem value="c" />
</RadioGroup>
```

## Ripple Generative UI Considerations

In Ripple's generative UI runtime, the AI may emit radio group widgets when the user needs to select among a fixed set of options. The clean `{ RadioGroup, RadioGroupItem }` import names make it straightforward for the generator to emit idiomatic component code without needing to understand the internal file structure.

## Known Gaps

No known gaps. The barrel covers the full public API for the radio group component.