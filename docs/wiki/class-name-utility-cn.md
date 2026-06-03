---
{
  "title": "Class Name Utility (cn)",
  "summary": "A thin wrapper around the `clsx` library that merges conditional CSS class strings into a single space-separated string. Used throughout Ripple components to compose Tailwind and custom class names cleanly.",
  "concepts": [
    "cn",
    "clsx",
    "ClassValue",
    "class merging",
    "utility function",
    "Tailwind",
    "CSS classes",
    "conditional classes",
    "composition"
  ],
  "categories": [
    "utility",
    "styling"
  ],
  "source_docs": [
    "2e253e2be3f7411d"
  ],
  "backlinks": null,
  "word_count": 328,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

The `cn` utility is a single exported function that accepts any number of `ClassValue` inputs and delegates to `clsx` to produce a merged class string. Despite its small size, it serves as a critical foundation for every component in the Ripple widget library.

```typescript
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

## Why It Exists

Without a utility like `cn`, component authors would manually concatenate class strings with template literals, leading to fragile code like:

```typescript
`base-class ${condition ? 'active' : ''} ${extraClass ?? ''}`
```

This pattern produces double spaces when conditions are false, breaks when `extraClass` is undefined, and becomes unreadable with more than two conditions. `clsx` handles all of these edge cases: it filters falsy values, flattens arrays, and joins the rest with single spaces.

## The Wrapper Pattern

Rather than importing `clsx` directly in every file, components import `cn` from a single utils module. This indirection has real benefits:

- **Replaceability**: If the project ever needs to swap `clsx` for `tailwind-merge` (which de-duplicates conflicting Tailwind utilities), only `utils.ts` changes — not every component.
- **Consistency**: All class merging in the codebase goes through one function, making it easy to add global transforms (e.g., dark mode prefixes) in the future.
- **Testability**: A single import point means you can mock `cn` in tests without patching the underlying library.

## Usage Pattern in Ripple

Components throughout Ripple use `cn` to blend incoming `class` props with their own base styles:

```typescript
<div class={cn('base-widget', isActive && 'active', className)}>
```

The spread operator on `inputs` means callers can pass arrays, objects with boolean values, or plain strings — all valid `ClassValue` forms accepted by `clsx`.

## Known Gaps

No known gaps. The implementation is intentionally minimal. If Tailwind class conflicts become a problem (e.g., `p-2` and `p-4` both present), replacing `clsx` with `tailwind-merge` inside `cn` would be the standard fix — but this is not currently needed.