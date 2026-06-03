---
{
  "title": "Soul Status Display Widget",
  "summary": "A compact or expanded display widget that surfaces an AI agent's soul state — including name, role, mood, energy level, memory count, and last action. Designed for dashboards that need to show multiple agents at a glance, with an inline energy bar and status dot in compact mode and a full detail panel in expanded mode.",
  "concepts": [
    "soul state",
    "agent display",
    "Soul Protocol",
    "compact mode",
    "energy bar",
    "status indicator",
    "mood badge",
    "initials derivation",
    "energy clamping",
    "multi-agent dashboard"
  ],
  "categories": [
    "widget",
    "display",
    "soul-protocol",
    "agent-ui"
  ],
  "source_docs": [
    "ff2a012d9739face"
  ],
  "backlinks": null,
  "word_count": 563,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`SoulStatus.svelte` renders a Soul Protocol agent's live state in a visually dense format optimized for sidebar panels and multi-agent dashboards. It operates in two modes controlled by the `compact` prop: a one-line row for lists, and a card-style expanded view for detail panels.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `'Agent'` | Display name |
| `role` | `string` | `''` | Agent role or title |
| `initials` | `string` | auto-derived | Override for avatar initials |
| `color` | `string` | `'#6366f1'` | Avatar background color |
| `mood` | `string` | `''` | Current mood label |
| `energy` | `number` | `100` | Energy 0–100 |
| `memories` | `number` | `0` | Memory count |
| `lastAction` | `string` | `''` | Most recent action text |
| `status` | `'online' \| 'offline' \| 'busy'` | `'online'` | Presence status |
| `compact` | `boolean` | `true` | Compact row vs expanded card |
| `class` | `string` | — | Extra classes |

## Initials Derivation

When `initials` is not provided, the component derives them from `name`:

```typescript
const displayInitials = $derived(
  initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
);
```

The `.slice(0, 2)` cap prevents avatar overflow on multi-word names. A name like "Chief Research Officer" would produce "CR" rather than "CRO", keeping the avatar legible at small sizes.

## Energy Clamping

```typescript
const energyClamped = $derived(Math.max(0, Math.min(100, energy)));
```

This defensive clamp prevents negative energy values or values above 100 from rendering a bar that escapes its container. Soul Protocol's energy field is a numeric score that external systems could theoretically set out of range; the clamp ensures the UI never breaks even if the data source is buggy.

## Status Dot

The status dot uses a three-state color mapping:

```typescript
const statusColor = $derived(
  status === 'online' ? 'bg-green-500'
  : status === 'busy' ? 'bg-amber-500'
  : 'bg-gray-400'
);
```

The fallback to gray covers both `'offline'` and any unknown status string, making the component tolerant of future status values without throwing.

## Compact Mode

In compact mode, the component renders: avatar with status dot → name → optional mood badge → inline energy bar. The `ml-auto` on the energy bar pushes it to the right edge, providing a consistent visual rhythm across multiple stacked agent rows.

## Expanded Mode

The expanded card shows all fields including `role`, `memories` (only if `> 0`), and `lastAction` (only if non-empty). These conditional renders prevent empty rows from cluttering the card when optional soul fields are not populated.

## Data Flow

SoulStatus is a pure display component — all data flows in via props from the Ripple spec. The agent runner or parent layout is responsible for polling or subscribing to soul state updates and passing them as updated props. The widget itself holds no fetch logic.

## Known Gaps

- No click handler or expansion toggle — switching between `compact` and expanded must be managed by the parent.
- `memories` renders raw integers without formatting for large counts (e.g., 10,000,000 renders as-is in the compact bar, though the expanded view uses `toLocaleString`).
- No animation when `energy` changes; the bar jumps rather than transitioning smoothly in compact mode (the expanded bar has `transition-all duration-300` but compact mode does too — this appears consistent, actually).