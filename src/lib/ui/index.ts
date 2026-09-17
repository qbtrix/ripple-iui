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
 *
 *   OVERLAYS (2026-09-14). The overlay kinds are exported as shadcn composable
 *   NAMESPACES (`Dialog.Root`, `Dialog.Content`, …) from `components/ui/`, not
 *   as spec-shaped widgets: paw-enterprise's ~130 call sites use exactly that
 *   shape, so they migrate by import path alone. The three widget exports that
 *   shared these names (`Tooltip`, `Popover`, `DropdownMenu` from
 *   `widgets/overlay/`) came off this surface for that reason; they are still on
 *   `./widgets`. `confirmDialog` is exported by name as well as inside its
 *   namespace because 33 call sites import the store, not the component.
 *
 *   Updated 2026-09-17 (beautiful-ui re-skin, skin-context): `ContextCards`
 *   and `RecommendationCard` join on the same terms: the retrieved chunks an
 *   agent cites, and the suggestion it asks you to accept. Neither is registered, so the count still reads 189. The source
 *   chip they share with AnswerBlock (`widgets/ai/SourceChip.svelte`) is a part,
 *   not an export.
 *
 *   Updated 2026-09-16 (beautiful-ui re-skin, skin-answer): `AnswerBlock` and
 *   `PixelLoader` join them on the same terms — the whole answer surface
 *   StreamingText.tsx really is, which the arc had only ported the text run of,
 *   and the pixel-grid loader that was never in the arc's scope. Same placement
 *   rule: no registry entry, no manifest entry, so the count still reads 189.
 *   PixelLoader does NOT replace `Loading` — that stays the library's generic
 *   spinner, registered and spec-drivable; this is the agent-work status line.
 *
 *   Updated 2026-09-14 (beautiful-ui re-skin, lane C): two organisms added,
 *   `TaskRows` and `PromptBar`. They are the first exports here that exist ONLY
 *   on this surface — no spec-registry entry and no manifest entry, so the
 *   manifest still reports 189 widgets and the arc's proof holds. Everything
 *   else listed here is also a registered widget. Registering either of the two
 *   is a deliberate follow-up that moves the count on purpose.
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
export { default as Shimmer } from '../widgets/premium/Shimmer.svelte';
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
export { default as Toast } from '../widgets/overlay/Toast.svelte';

/* ── overlays ──────────────────────────────────────────────────────────────
   The canonical overlay set, one namespace per kind (anchored / modal /
   palette; Toast above is the transient kind). shadcn composable shape. */
export * as Tooltip from '../components/ui/tooltip/index.js';
export * as Popover from '../components/ui/popover/index.js';
export * as HoverCard from '../components/ui/hover-card/index.js';
export * as DropdownMenu from '../components/ui/dropdown-menu/index.js';
export * as ContextMenu from '../components/ui/context-menu/index.js';
export * as Dialog from '../components/ui/dialog/index.js';
export * as Sheet from '../components/ui/sheet/index.js';
export * as ConfirmDialog from '../components/ui/confirm-dialog/index.js';
export * as Command from '../components/ui/command/index.js';
export { confirmDialog, type ConfirmDialogOptions } from '../components/ui/confirm-dialog/index.js';

/* ── organisms ─────────────────────────────────────────────────────────────
   Own behaviour and state. The AI-native tier: the product's core surfaces.
   TaskRows and PromptBar joined it in the beautiful-ui re-skin (2026-09-14) and
   are deliberately absent from the spec registry and the manifest — they reach
   callers through this surface only, which is why the manifest still reports
   189 widgets. */
export { default as ApprovalGate } from '../widgets/ai/ApprovalGate.svelte';
export { default as StreamText } from '../widgets/ai/StreamText.svelte';
export { default as ToolCall } from '../widgets/ai/ToolCall.svelte';
export { default as ReasoningTrace } from '../widgets/ai/ReasoningTrace.svelte';
export { default as TaskRows } from '../widgets/ai/TaskRows.svelte';
export { default as PromptBar } from '../widgets/ai/PromptBar.svelte';
export { default as AnswerBlock } from '../widgets/ai/AnswerBlock.svelte';
export { default as PixelLoader } from '../widgets/ai/PixelLoader.svelte';
export { default as ContextCards } from '../widgets/ai/ContextCards.svelte';
export { default as RecommendationCard } from '../widgets/ai/RecommendationCard.svelte';
