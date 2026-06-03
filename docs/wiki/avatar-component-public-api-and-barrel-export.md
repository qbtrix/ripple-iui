---
{
  "title": "Avatar Component Public API and Barrel Export",
  "summary": "The avatar index barrel file is the single import point for the entire Avatar component family, exporting all six sub-components under both short primitive names and fully-qualified prefixed aliases. This enables consistent, import-friendly consumption across Ripple's generative UI runtime.",
  "concepts": [
    "barrel export",
    "avatar component family",
    "dual alias",
    "component composition",
    "public API",
    "generative UI",
    "Svelte 5",
    "bits-ui",
    "component resolver",
    "import surface"
  ],
  "categories": [
    "widget",
    "avatar",
    "component-api"
  ],
  "source_docs": [
    "70359d4b5757cabd"
  ],
  "backlinks": null,
  "word_count": 344,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/avatar/index.ts` aggregates six distinct avatar sub-components into a unified public API. Consumers import from this single path rather than hunting through deep file paths.

## Exported Components

| Short Name | Prefixed Alias | Role |
|---|---|---|
| `Root` | `Avatar` | Container, size, load state |
| `Image` | `AvatarImage` | Profile picture |
| `Fallback` | `AvatarFallback` | Image load failure display |
| `Badge` | `AvatarBadge` | Status overlay dot |
| `Group` | `AvatarGroup` | Stacked avatar row |
| `GroupCount` | `AvatarGroupCount` | Overflow count indicator |

## Dual-Alias Pattern

```typescript
export {
  Root,
  Image,
  Fallback,
  Badge,
  Group,
  GroupCount,
  //
  Root as Avatar,
  Image as AvatarImage,
  Fallback as AvatarFallback,
  Badge as AvatarBadge,
  Group as AvatarGroup,
  GroupCount as AvatarGroupCount,
};
```

The comment separator (`//`) is intentional — it visually separates the short names (used internally by the component family itself) from the consumer-facing prefixed names. This is a convention in the ripple codebase distinguishing "library-internal" from "public-facing" exports.

## Why a Six-Component Family

Avatars in Ripple are not a single component but a composition system. Each sub-component has independent responsibilities:

- **Root** owns the container shape and size context
- **Image** handles the actual photo rendering and load tracking
- **Fallback** renders when the image is absent or broken
- **Badge** overlays status information
- **Group** arranges multiple avatars in a stack
- **GroupCount** shows how many avatars are hidden

This decomposition means each piece can be upgraded, swapped, or omitted independently. A context where badges are not needed simply never mounts `AvatarBadge`.

## Ripple Generative UI Implications

In Ripple's generative UI runtime, widget component families are often instantiated by AI-generated widget descriptors. The barrel export allows the runtime's component resolver to map a widget type string (e.g., `"avatar"`) to this index and enumerate available sub-components by name without parsing individual Svelte files.

## Known Gaps

No TODOs or FIXMEs. Note that `AvatarImage` from `bits-ui` is re-exported without the `AvatarPrimitive.ImageProps` type — consumers who need the exact type for advanced prop inspection must import from `bits-ui` directly.