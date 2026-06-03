---
{
  "title": "Input — Unified Text and File Input with Dual Rendering Paths",
  "summary": "The core Ripple input component handles both standard text-like inputs and file inputs through a conditional rendering split. File inputs require separate treatment because Svelte's `bind:files` binding is only valid on `type=\"file\"` elements, and TypeScript's type system enforces this distinction at the prop level.",
  "concepts": [
    "input component",
    "bind:files",
    "file input",
    "type discrimination",
    "FileList",
    "Svelte conditional rendering",
    "aria-invalid",
    "disabled state",
    "data-slot",
    "WithElementRef",
    "cn utility",
    "HTMLInputAttributes",
    "Exclude type"
  ],
  "categories": [
    "input",
    "form",
    "ui-component"
  ],
  "source_docs": [
    "2a77d30ce5123445"
  ],
  "backlinks": null,
  "word_count": 408,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`Input` is one of the more structurally interesting base components in Ripple because it contains a deliberate bifurcation: it renders two different `<input>` elements depending on `type`. This is not a code smell — it reflects a genuine constraint in both Svelte and the browser.

## The File Input Problem

Svelte's `bind:files` directive is only valid on `<input type="file">`. If you add `bind:files` to any other input type, Svelte throws a compile-time error. This means you cannot have a single generic input element that conditionally includes `bind:files`.

The component solves this with a type-discriminated branch:

```svelte
{#if type === "file"}
  <input bind:files bind:value ... type="file" />
{:else}
  <input bind:value ... {type} />
{/if}
```

The file branch binds `files` (the `FileList`) in addition to `value`. The standard branch omits `files` entirely.

## TypeScript-Level Enforcement

The type system mirrors this split at the prop level:

```typescript
type Props = WithElementRef<
  Omit<HTMLInputAttributes, "type"> &
    ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
>;
```

When `type` is `"file"`, `files` becomes optional (FileList). For any other type, `files` is explicitly `undefined`. This prevents callers from accidentally passing `files` to a text input, which would be silently ignored at runtime but represents a logic error.

`InputType` is defined as `Exclude<HTMLInputTypeAttribute, "file">` — it's all valid HTML input types except `"file"`, preventing the caller from using the non-file branch to render a file input and bypassing the binding split.

## Consistent Styling Across Both Branches

Both branches share the same Tailwind class string. This is a deliberate choice to keep the visual appearance identical regardless of type, at the cost of some duplication. Extracting the class string to a variable would also work but would be harder to read inline. The key style decisions:

- **`h-8`** — uniform height across all input types, including file
- **`file:inline-flex file:border-0 file:bg-transparent`** — resets browser-default file button styles
- **`aria-invalid:ring-destructive/20`** — validation state driven by `aria-invalid`, not a prop, which keeps form library integration framework-agnostic
- **`disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50`** — consistent disabled state that works even if the `disabled` attribute is set via `restProps`

## data-slot Customization

Uniquely, `data-slot` is a configurable prop (defaulting to `"input"`) rather than hardcoded:

```svelte
"data-slot": dataSlot = "input",
```

This allows composite components that embed an `Input` to override the slot label for more specific CSS targeting.

## Known Gaps

None identified. The dual-render approach is the correct solution to the `bind:files` constraint.