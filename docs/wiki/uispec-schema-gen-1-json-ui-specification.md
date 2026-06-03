---
{
  "title": "UISpec Schema — Gen 1 JSON UI Specification",
  "summary": "UISpec is Ripple's original (Gen 1) schema for a complete JSON-described UI. It defines the recursive UINode tree, optional data fetchers and state, theme overrides, and the parse/safeParse entry points that validate LLM-generated output before it reaches the renderer.",
  "concepts": [
    "UISpec",
    "UINode",
    "DataFetcher",
    "ThemeOverrides",
    "parseUISpec",
    "safeParseUISpec",
    "z.lazy",
    "recursive schema",
    "slot",
    "else_children",
    "depends_on",
    "transform",
    "Gen 1 spec",
    "component tree"
  ],
  "categories": [
    "schema",
    "rendering",
    "state-management",
    "widget"
  ],
  "source_docs": [
    "bd6bddc7b0ba04c7"
  ],
  "backlinks": null,
  "word_count": 526,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`lib/schema/ui-spec.ts` defines the Gen 1 contract between LLMs and Ripple's rendering engine. A `UISpec` is the complete document an AI model produces: initial state values, remote data fetcher configs, the full component tree, and optional theming. The module uses Zod to both describe and validate the structure, ensuring that malformed AI output is caught before it reaches the Svelte render layer.

## UINode — Recursive Component Tree

```typescript
export type UINode = z.infer<typeof UINodeBase> & {
  children?: UINode[];
  else_children?: UINode[];
};
```

`UINodeBase` captures all flat fields: `type`, `id`, `props`, `bind`, `show`, `class`, `style`, `slot`, event handlers, and control-flow helpers (`items`, `item_as`, `condition`). The recursive `children` and `else_children` fields are added via `z.lazy` to break the self-referential cycle — Zod does not allow direct type recursion without `lazy`.

`else_children` supports the `'if'` widget: when the `condition` expression is falsy, this alternate tree renders. Splitting the false branch into a named field rather than a boolean toggle makes it explicit in the spec and avoids ambiguity for the AI model.

The `type` field accepts `z.string()` (not a constrained enum) to support cross-project custom widgets without requiring a schema update. Strict widget-type checking happens at runtime via the widget registry (`getWidget`), not at spec parse time.

The `slot` field routes a child into a named snippet slot on its parent component (e.g., `'header'` on a `Card`). Parents that don't implement the slot silently ignore it — the field is advisory.

## DataFetcher

```typescript
export const DataFetcher = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST']).default('GET'),
  depends_on: z.array(z.string()).optional(),
  refresh_interval: z.number().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.record(z.string(), z.any()).optional(),
  transform: z.string().optional()
});
```

`depends_on` holds state paths that trigger a refetch when they change — enabling reactive data loading without custom wiring. `transform` names a registered transform function to post-process the response; this keeps raw API shapes decoupled from the component's expected data shape.

## ThemeOverrides

The theme section maps directly onto CSS custom property names used by the design system (shadcn/ui conventions). All color values accept either hex or OKLCH strings. The `mode` field (`'light'`, `'dark'`, `'system'`) lets individual specs opt into dark mode without a global setting change.

## UISpec Root

```typescript
export const UISpec = z.object({
  version: z.literal('1.0').default('1.0'),
  state: z.record(z.string(), z.any()).optional(),
  data: z.record(z.string(), DataFetcher).optional(),
  ui: UINode,   // required
  theme: ThemeOverrides.optional(),
  meta: z.object({ title, description }).optional()
});
```

The `ui` field is required — a UISpec with no component tree is not renderable. All other fields are optional, enabling minimal specs (`{ version, ui: { type: 'text' } }`) to validate cleanly.

## Parse Helpers

```typescript
export function parseUISpec(input: unknown): UISpec  // throws ZodError
export function safeParseUISpec(input: unknown)      // returns { success, data, error }
```

Two distinct entry points exist because the callers have different error-handling needs: the streaming parser uses `safeParse` to handle partial/invalid JSON gracefully; host-side validation that expects a complete spec can use the throwing `parse` form and let the error propagate.

## Known Gaps

- The `transform` field on `DataFetcher` accepts a function name string but there is no registry or resolution mechanism described in this file — how the name maps to a real function is an integration concern not enforced by the schema.