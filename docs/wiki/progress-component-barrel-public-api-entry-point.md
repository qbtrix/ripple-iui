---
{
  "title": "Progress Component Barrel — Public API Entry Point",
  "summary": "The index module for the progress component exports the `Root` component under two names — `Root` and `Progress` — giving consumers the flexibility to use either a structural import style or a semantic one. It is the single entry point that downstream code should import from rather than reaching into the component directory directly.",
  "concepts": [
    "barrel export",
    "index module",
    "named export",
    "alias export",
    "Progress component",
    "import surface",
    "component API",
    "structural naming",
    "semantic naming",
    "module organization"
  ],
  "categories": [
    "widget",
    "module-organization"
  ],
  "source_docs": [
    "047b1de9082bd67d"
  ],
  "backlinks": null,
  "word_count": 321,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/components/ui/progress/index.ts` is the public API barrel for the Progress component family. Barrel files like this are a standard pattern in component libraries to control what is exported and under what names, preventing consumers from coupling to internal file structure.

## Why a Barrel File

Without a barrel, consumers would write `import Root from "$lib/components/ui/progress/progress.svelte"`. This couples them to the internal filename — if `progress.svelte` were renamed or refactored into sub-components, every import site would break. The barrel file is an indirection layer: internal structure can change freely as long as the barrel's exports remain stable.

It also provides aliasing, which serves two developer experience goals:

1. **Structural style** — `import { Root } from "$lib/components/ui/progress"` matches the bits-ui primitive naming convention and is consistent with how all Ripple components expose their roots.
2. **Semantic style** — `import { Progress } from "$lib/components/ui/progress"` reads naturally in component code and is more discoverable for developers unfamiliar with the library's naming conventions.

Both names point to the same component — there is no runtime cost.

## Module Contents

```typescript
import Root from "./progress.svelte";

export {
  Root,
  //
  Root as Progress,
};
```

The commented separator line (`//`) is a Ripple convention for visually grouping the structural exports above from the semantic aliases below. This pattern appears across all component index files in the library.

## Usage Patterns

### Structural (preferred within the Ripple codebase)

```svelte
<script>
  import { Root as Progress } from "$lib/components/ui/progress";
</script>
```

### Semantic (preferred in application code)

```svelte
<script>
  import { Progress } from "$lib/components/ui/progress";
</script>
```

## Single-Component Family

Unlike more complex components (e.g., Select with 11 exports), Progress exports only one component. This reflects its simpler composition model — there are no sub-components like `Progress.Indicator` or `Progress.Label` exposed at this level. The visual indicator is rendered internally by `progress.svelte` itself.

## Known Gaps

No known gaps. The barrel is complete for the current component scope.