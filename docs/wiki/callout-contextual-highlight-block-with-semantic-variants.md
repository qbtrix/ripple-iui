---
{
  "title": "Callout: Contextual Highlight Block with Semantic Variants",
  "summary": "Callout renders a left-bordered highlight block with an icon badge, supporting four semantic variants — info, success, warning, and insight — each with distinct color theming. It exists to draw reader attention to important conclusions, caveats, or findings within AI-generated research content.",
  "concepts": [
    "callout block",
    "semantic variants",
    "info warning insight success",
    "left border highlight",
    "AI-generated research",
    "variant config",
    "icon badge",
    "CSS currentColor",
    "Svelte 5 runes"
  ],
  "categories": [
    "widget",
    "research",
    "content",
    "layout"
  ],
  "source_docs": [
    "53a4cd99e9e9c2f9"
  ],
  "backlinks": null,
  "word_count": 472,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

In AI-generated research responses, plain prose buries key takeaways. The `Callout` widget provides a visually distinct block that AI models can emit to surface a warning, a key insight, or a conclusion that warrants special attention. The component's design is deliberately journalistic — it resembles the callout blocks used in financial reports and long-form journalism.

## Props

```svelte
interface Props {
  title?: string;                                  // Optional bold header line
  text: string;                                    // Body copy (required)
  variant?: 'info' | 'success' | 'warning' | 'insight';
  class?: string;
}
```

Only `text` is required. The `variant` defaults to `'info'` if omitted, which provides a neutral blue styling appropriate for general informational notes.

## Variant Configuration

The component maps each variant to a specific color triple (border, background tint, icon character):

```svelte
const config = {
  info:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)', icon: 'i' },
  success: { border: '#22c55e', bg: 'rgba(34,197,94,0.06)',  icon: '\u2713' },  // ✓
  warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)', icon: '!' },
  insight: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', icon: '\u2726' },  // ✦
};
```

The `insight` variant (purple star icon) is specific to Ripple's research context — it signals an AI-synthesized observation rather than a factual statement, which is a distinct category from generic `info`. This semantic distinction matters when users scan a research widget for AI-generated conclusions versus source-backed facts.

The fallback `config[variant] ?? config.info` protects against unknown variant values being passed dynamically (e.g. from AI-generated widget specs):

```svelte
const c = $derived(config[variant] ?? config.info);
```

If a future AI model emits `variant="critical"` that doesn't exist in the map, the widget silently falls back to info styling rather than breaking.

## Layout and Visual Design

The left border is applied via inline style rather than a CSS class so that the exact color value is driven by the variant config without requiring four separate CSS modifier classes. The background tint uses 6% opacity — subtle enough to not compete with card backgrounds, strong enough to visually distinguish the block.

The icon badge is a circular element with a border using `currentColor` (the border color), creating a self-consistent icon ring that changes color automatically with the variant.

```css
.rcall-icon {
  border: 1.5px solid currentColor;
  background: hsl(var(--background));
}
```

Using `hsl(var(--background))` for the icon background ensures the badge appears correctly on both light and dark themes without hardcoding a color.

## Usage Example

```svelte
<Callout
  variant="warning"
  title="Risk Factor"
  text="Regulatory headwinds in Q3 may affect margins."
/>

<Callout
  variant="insight"
  text="Based on the data pattern, management appears to be front-loading revenue."
/>
```

## Known Gaps

- The `text` prop only accepts a plain string — no markdown or HTML rendering inside the callout body. Long-form text with inline formatting (bold, links) cannot be expressed.
- There is no `onclose` / dismissible variant. In some dashboard contexts a callout should be dismissable after reading.