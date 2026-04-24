---
{
  "title": "Badge Widget — Status and Category Label with Variant Extension",
  "summary": "A display widget that renders inline badges for status labels, categories, and tags, extending shadcn's Badge with two semantic variants (`success` and `warning`) that shadcn doesn't natively support. The extension is implemented through CSS class injection rather than shadcn variant registration, keeping the component self-contained.",
  "concepts": [
    "badge",
    "variant system",
    "shadcn extension",
    "status label",
    "success variant",
    "warning variant",
    "cn utility",
    "Tailwind CSS",
    "Svelte 5 derived"
  ],
  "categories": [
    "widget",
    "display"
  ],
  "source_docs": [
    "1adcb45c7e39e6b9"
  ],
  "backlinks": null,
  "word_count": 371,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Badges communicate categorical or status information inline — a service status ("running", "stopped"), a priority level ("high", "critical"), or a tag on a data record. The Badge widget provides a uniform rendering surface for these with pre-defined color semantics that align to conventional meaning.

## Variant System

Shadcn's Badge component natively supports four variants: `default`, `secondary`, `destructive`, and `outline`. Ripple adds two semantic variants that shadcn lacks:

| Variant | Color Scheme | Semantic Meaning |
|---------|-------------|------------------|
| `success` | Green tint, green text, green border | Healthy, passing, completed |
| `warning` | Yellow tint, yellow text, yellow border | Degraded, pending, attention needed |
| `default` | Primary color | Neutral highlight |
| `secondary` | Muted | Low-emphasis label |
| `destructive` | Red | Error, critical, stopped |
| `outline` | Bordered, no fill | Low-emphasis, outline style |

## Extension Strategy

Rather than patching shadcn or registering custom variants in its cva config, the Badge widget handles `success` and `warning` by:

1. Mapping them to `'outline'` for the shadcn `variant` prop (providing the correct base border style)
2. Injecting additional Tailwind classes via `cn(extraClass, className)`

```typescript
const variantMap: Record<string, string> = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};
```

The `10%` background opacity and `20%` border opacity produce a soft tint effect that reads as semantic status without overwhelming the surrounding content.

This approach is pragmatic: it avoids modifying the shared shadcn component (which could affect other consumers) while still producing visually correct results.

## Derived Variant Logic

```typescript
const shadcnVariant = $derived(
  ['default', 'secondary', 'destructive', 'outline'].includes(variant)
    ? variant as 'default' | 'secondary' | 'destructive' | 'outline'
    : 'outline'
);
```

The fallback to `'outline'` for unrecognized variants ensures type safety and visual coherence. If a spec passes a new variant name that isn't in the map yet, it gets outline styling rather than crashing or rendering unstyled.

## Known Gaps

- **No icon support**: Badges cannot include a leading icon or dot indicator. Status dots must be provided by a parent layout or via `Table`'s `statusKey` feature.
- **Text-only**: The component renders the `text` prop as a string. Rich content (links, formatted numbers) requires a custom slot not currently exposed.