---
{
  "title": "Input Widgets Barrel Export",
  "summary": "The barrel export for Ripple's input widget family, re-exporting all six interactive input primitives from a single entry point. Consumers import from this index instead of individual file paths, keeping import sites stable as the internal file structure evolves.",
  "concepts": [
    "barrel export",
    "re-export",
    "input widgets",
    "widget registry",
    "tree-shaking",
    "Button",
    "Input",
    "Select",
    "Checkbox",
    "Switch",
    "Textarea",
    "module index"
  ],
  "categories": [
    "input",
    "module",
    "widget"
  ],
  "source_docs": [
    "e0cdd33bd88be76b"
  ],
  "backlinks": null,
  "word_count": 332,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

This `index.ts` file is the public surface of the `lib/widgets/input/` directory. It re-exports six input widgets under clean, tree-shakeable named exports:

```typescript
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Select } from './Select.svelte';
export { default as Checkbox } from './Checkbox.svelte';
export { default as Switch } from './Switch.svelte';
export { default as Textarea } from './Textarea.svelte';
```

## Why a Barrel File?

Without a barrel, every consumer would import from file-specific paths like `$lib/widgets/input/Button.svelte`. When a file is renamed or restructured, all import sites break. The barrel decouples the public API from the filesystem layout — refactoring internals only requires updating this one file.

This pattern also lets the Ripple widget registry and `NodeRenderer` load all input widgets with a single import:

```typescript
import * as InputWidgets from '$lib/widgets/input';
```

Instead of listing every path individually, the registry can spread or iterate over the exported map.

## The Six Input Widgets

| Export | Purpose |
|--------|---------|
| `Button` | Clickable action trigger |
| `Input` | Single-line text field |
| `Select` | Dropdown option picker |
| `Checkbox` | Boolean toggle with visible check |
| `Switch` | Boolean toggle with sliding indicator |
| `Textarea` | Multi-line free-text input |

All six share the same event callback signature `(value?: unknown) => void`, allowing the flow engine to wire `onchange` handlers uniformly regardless of which widget type is used.

## Tree-Shaking

Named re-exports are fully tree-shakeable by Vite/Rollup. A page that only uses `Button` and `Input` will not bundle `Select`, `Checkbox`, `Switch`, or `Textarea`. The barrel therefore adds no bundle cost vs. direct imports.

## Known Gaps

- No `Slider`, `DatePicker`, or `FileUpload` widget is present. These are common input needs that would naturally belong here.
- There is no type-only re-export file for the shared `Props` interface patterns, so consumers who want to extend widget props must import from individual component files directly.