---
{
  "title": "Button Component Public API Export",
  "summary": "The button index barrel exports the Button component and all associated types and variant utilities. It follows the dual-alias pattern and additionally surfaces `Props` as a convenience alias for `ButtonProps`, enabling clean generic wrapper typings.",
  "concepts": [
    "barrel export",
    "ButtonProps",
    "ButtonSize",
    "ButtonVariant",
    "buttonVariants",
    "Props alias",
    "dual alias",
    "tailwind-variants",
    "type surface",
    "generative UI"
  ],
  "categories": [
    "widget",
    "interactive",
    "component-api"
  ],
  "source_docs": [
    "0f6b6f040d92b415"
  ],
  "backlinks": null,
  "word_count": 324,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/button/index.ts` is the public entry point for the Button component system. It imports from `button.svelte` and re-exports everything consumers need through a single stable path.

```typescript
import Root, {
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  buttonVariants,
} from "./button.svelte";

export {
  Root,
  type ButtonProps as Props,
  //
  Root as Button,
  buttonVariants,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
};
```

## The `Props` Alias

Unlike the badge and avatar barrels, the button barrel adds a `Props` alias for `ButtonProps`:

```typescript
type ButtonProps as Props,
```

This pattern enables a concise import idiom used throughout Ripple:

```typescript
import type { Props } from "$lib/components/ui/button";
```

When building higher-order components that wrap Button, `Props` avoids the awkward double-word import `ButtonProps` and signals clearly that these are the component's own props.

## Full Type Surface

Three types are exported:

- `ButtonProps` — full props interface for the component (variant + size + HTML attributes for both `<button>` and `<a>`)
- `ButtonSize` — union of all valid size strings (`"xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"`)
- `ButtonVariant` — union of valid variant strings (`"default" | "outline" | "secondary" | "ghost" | "destructive" | "link"`)

Exporting `ButtonSize` and `ButtonVariant` separately is important for Ripple's generative UI layer — the runtime can enumerate valid values without mounting any component.

## `buttonVariants` Export

The `buttonVariants` function (the `tv()` instance) is exported so consumers can generate button class strings without rendering a Svelte component:

```typescript
const classes = buttonVariants({ variant: "outline", size: "sm" });
```

This is used when programmatically applying button styles to elements the runtime cannot wrap in a Svelte component (e.g., third-party widget shells).

## Known Gaps

No TODOs or FIXMEs. The `Props` export alias is not consistently present across all component barrels in the library — alert and avatar do not export a `Props` alias. This inconsistency may cause confusion for consumers building uniform wrapper patterns across components.