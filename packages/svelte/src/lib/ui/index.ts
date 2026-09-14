/**
 * @file ui/index.ts
 * @description NEW (2026-09-14). The hand-written-caller surface: the subset of
 *   ripple that is safe and intended to be imported as plain Svelte components,
 *   outside `<Ripple spec>`.
 *
 *   WHY THIS EXISTS. Ripple has 189 widgets and has only ever been driven by the
 *   spec renderer. paw-enterprise imports `@ripple-ui/svelte` in 32 files and not
 *   one of them imports a widget — every import is the renderer, the editor, or a
 *   registry helper. So "ripple is the source of truth" was true on paper and
 *   never exercised, and the two defects that fell out of first exercising it
 *   (widgets swallowing children, Card wrapping children in a <button>) were both
 *   invisible for exactly that reason.
 *
 *   WHAT THIS IS NOT. Not a new copy of anything. Every name below is re-exported
 *   from where it already lives; there is no fourth atoms directory and no file
 *   moved. The spec registry keeps using the same components, so a fix lands once
 *   and both callers get it.
 *
 *   WHAT BELONGS HERE. A component earns a place when it is context-free — it
 *   must render correctly with no `getContext` from the renderer. `widgets/data/
 *   Table.svelte` is deliberately absent for that reason: it reads `ui-events`,
 *   `ui-state` and `ui-data` unguarded and needs a provider before it can be
 *   listed. `ui-contract.test.ts` next to this file enforces the rule by mounting
 *   every export standalone.
 *
 *   LAYERING. Grouped atom / molecule / organism, which is the taxonomy the
 *   2026-09-12 UI audit settled on. Ripple already had `molecules/` and
 *   `organisms/` and no atoms layer at all; this names the missing base without
 *   relocating the parts.
 */

/* ── atoms ─────────────────────────────────────────────────────────────────
   No dependency on another primitive. */
export { default as Button } from '../widgets/input/Button.svelte';
export { default as Input } from '../widgets/input/Input.svelte';
export { default as Textarea } from '../widgets/input/Textarea.svelte';
export { default as Chip } from '../widgets/display/Chip.svelte';
export { default as Badge } from '../widgets/display/Badge.svelte';
export { default as StatusDot } from '../widgets/display/StatusDot.svelte';
export { default as Skeleton } from '../widgets/display/Skeleton.svelte';
export { default as Separator } from '../widgets/layout/Separator.svelte';

/* ── molecules ─────────────────────────────────────────────────────────────
   Compose atoms; still no app state. */
export { default as Card } from '../widgets/layout/Card.svelte';
export { default as EmptyState } from '../widgets/display/EmptyState.svelte';
export { default as Avatar } from '../widgets/display/Avatar.svelte';
export { default as Segmented } from '../widgets/input/Segmented.svelte';
export { default as Search } from '../widgets/input/Search.svelte';
export { default as Tabs } from '../widgets/layout/Tabs.svelte';
export { default as Collapsible } from '../widgets/layout/Collapsible.svelte';
export { default as CodeBlock } from '../widgets/display/CodeBlock.svelte';
export { default as Markdown } from '../widgets/display/Markdown.svelte';
export { default as Tooltip } from '../widgets/overlay/Tooltip.svelte';
export { default as Popover } from '../widgets/overlay/Popover.svelte';
export { default as DropdownMenu } from '../widgets/overlay/DropdownMenu.svelte';
export { default as Toast } from '../widgets/overlay/Toast.svelte';

/* ── organisms ─────────────────────────────────────────────────────────────
   Own behaviour and state. The AI-native four: the product's core surfaces. */
export { default as ApprovalGate } from '../widgets/ai/ApprovalGate.svelte';
export { default as StreamText } from '../widgets/ai/StreamText.svelte';
export { default as ToolCall } from '../widgets/ai/ToolCall.svelte';
export { default as ReasoningTrace } from '../widgets/ai/ReasoningTrace.svelte';
