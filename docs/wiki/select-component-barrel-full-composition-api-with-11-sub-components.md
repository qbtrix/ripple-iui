---
{
  "title": "Select Component Barrel — Full Composition API with 11 Sub-Components",
  "summary": "The index module for the select component family exports all 11 sub-components under both structural (`Root`, `Item`, etc.) and semantic (`Select`, `SelectItem`, etc.) names. It defines the complete public API for the most compositionally complex form control in the Ripple library.",
  "concepts": [
    "select dropdown",
    "barrel export",
    "composition API",
    "11 sub-components",
    "SelectGroup",
    "SelectItem",
    "SelectContent",
    "SelectPortal",
    "scroll buttons",
    "named export aliases"
  ],
  "categories": [
    "widget",
    "form",
    "module-organization"
  ],
  "source_docs": [
    "ae5104f0aa7f71c9"
  ],
  "backlinks": null,
  "word_count": 374,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/select/index.ts` is the entry point for Ripple's select dropdown system. Unlike simpler components with one or two exports, select requires 11 sub-components to fully compose a production-grade dropdown — reflecting the genuine complexity of an accessible, animated, scrollable, grouped dropdown control.

## The 11 Components and Their Roles

| Export | Role |
|---|---|
| `Root` / `Select` | State container, context provider, open/close management |
| `Trigger` / `SelectTrigger` | Button that opens the dropdown |
| `Content` / `SelectContent` | Floating panel containing options, portaled to body |
| `Portal` / `SelectPortal` | DOM teleportation layer (prevents clipping) |
| `Group` / `SelectGroup` | Semantic grouping container for related options |
| `GroupHeading` / `SelectGroupHeading` | Label for a group of options |
| `Label` / `SelectLabel` | Standalone label (non-group context) |
| `Item` / `SelectItem` | Individual selectable option |
| `Separator` / `SelectSeparator` | Visual divider between options or groups |
| `ScrollUpButton` / `SelectScrollUpButton` | Button to scroll up when content overflows |
| `ScrollDownButton` / `SelectScrollDownButton` | Button to scroll down when content overflows |

## Why So Many Sub-Components

Each sub-component solves a distinct problem that a monolithic select element cannot:

- **Portal** — prevents clipping by `overflow: hidden` ancestors
- **ScrollUpButton / ScrollDownButton** — custom scroll affordances that work consistently across browsers (native select scrollbars are not styleable)
- **GroupHeading** — provides semantic group labels that screen readers announce separately from selectable options
- **Separator** — visual-only divider that is `aria-hidden` to avoid polluting the option list

Attempting to encode all of this in one component produces an API with dozens of props and internal state that is difficult to test, customize, or extend.

## Module Structure

```typescript
import Root from "./select.svelte";
import Group from "./select-group.svelte";
// ... 9 more imports

export {
  Root, Group, Label, Item, Content,
  Trigger, Separator, ScrollDownButton,
  ScrollUpButton, GroupHeading, Portal,
  //
  Root as Select,
  Group as SelectGroup,
  // ... semantic aliases for all 11
};
```

## Typical Composition

```svelte
<Select.Root bind:value={selected}>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Content>
    <Select.Group>
      <Select.GroupHeading>Fruits</Select.GroupHeading>
      <Select.Item value="apple">Apple</Select.Item>
      <Select.Item value="banana">Banana</Select.Item>
    </Select.Group>
    <Select.Separator />
    <Select.Item value="other">Other</Select.Item>
  </Select.Content>
</Select.Root>
```

## Known Gaps

No known gaps in the barrel itself. Component-level gaps (if any) are documented in their individual articles.