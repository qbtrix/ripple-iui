/**
 * @file ui/index.ts
 * @description The hand-written-caller surface: the subset of ripple that is
 *   safe and intended to be imported as plain Svelte components, outside
 *   `<Ripple spec>`. Ripple is the UI source of truth for its hosts
 *   (paw-enterprise, paw-sites), and this is the door they come through.
 *
 *   Not a copy of anything: every name is re-exported from where it already
 *   lives, so the spec registry and direct callers share one component and a
 *   fix lands once.
 *
 *   WHAT BELONGS HERE. A component that is context-free: it renders correctly
 *   with no renderer `getContext`. A context read is allowed only when typed
 *   `| undefined` and guarded. `widgets/data/Table.svelte` is absent because
 *   it reads `ui-events`/`ui-state`/`ui-data` as required.
 *   `ui-contract.test.ts` mounts every export standalone and checks that rule
 *   statically; a new export needs a PROPS entry there. Type exports go
 *   through a `.ts` module, never `from '….svelte'` (the test counts those).
 *
 *   SHAPE. Grouped atom / molecule / organism. Overlays and parts with
 *   sub-parts are shadcn composable namespaces (`Dialog.Root`, `Slider.Root`),
 *   the shape paw-enterprise's call sites already use. `confirmDialog` is also
 *   exported by name because callers import the store, not the component.
 *
 *   Some exports are ./ui-only (no spec-registry or manifest entry): the AI
 *   surfaces, the shell and call parts, and the craft editor parts (ToolRail,
 *   CanvasViewport, EditorShell, InspectorSection, PropertyRow). The manifest
 *   widget count does not move when one of those is added.
 */

/* ── atoms ─────────────────────────────────────────────────────────────────
   No dependency on another primitive. */
export { default as Button } from '../widgets/input/Button.svelte';
export { default as Input } from '../widgets/input/Input.svelte';
export { default as Textarea } from '../widgets/input/Textarea.svelte';
export { default as Switch } from '../widgets/input/Switch.svelte';
export { default as Checkbox } from '../widgets/input/Checkbox.svelte';
export { default as Chip } from '../widgets/display/Chip.svelte';
export { default as Badge } from '../widgets/display/Badge.svelte';
export { default as StatusDot } from '../widgets/display/StatusDot.svelte';
export { default as Skeleton } from '../widgets/display/Skeleton.svelte';
export { default as ProgressRing } from '../widgets/display/ProgressRing.svelte';
export { default as Shimmer } from '../widgets/premium/Shimmer.svelte';
export { default as Separator } from '../widgets/layout/Separator.svelte';
export { default as Kbd } from '../widgets/display/Kbd.svelte';
export { default as CountBadge } from '../widgets/call/CountBadge.svelte';
export { default as ControlButton } from '../widgets/call/ControlButton.svelte';

/* ── molecules ─────────────────────────────────────────────────────────────
   Compose atoms; still no app state. */
export { default as Card } from '../widgets/layout/Card.svelte';
export { default as EmptyState } from '../widgets/display/EmptyState.svelte';
export { default as Avatar } from '../widgets/display/Avatar.svelte';
export { default as Segmented } from '../widgets/input/Segmented.svelte';
export { default as ColorPicker } from '../widgets/input/ColorPicker.svelte';
export { default as NumberInput } from '../widgets/input/NumberInput.svelte';
export { default as ChoiceGrid } from '../widgets/input/ChoiceGrid.svelte';
export type { ChoiceOption } from '../widgets/input/choice-grid.js';
export { default as Search } from '../widgets/input/Search.svelte';
export { default as Tabs } from '../widgets/layout/Tabs.svelte';
export { default as Collapsible } from '../widgets/layout/Collapsible.svelte';
export { default as CodeBlock } from '../widgets/display/CodeBlock.svelte';
export { default as Diff } from '../widgets/display/Diff.svelte';
export { default as Markdown } from '../widgets/display/Markdown.svelte';
export { default as Toast } from '../widgets/overlay/Toast.svelte';
export { default as ListRow } from '../widgets/layout/ListRow.svelte';
export { default as SectionHeader } from '../widgets/layout/SectionHeader.svelte';
export { default as PanelHeader } from '../widgets/layout/PanelHeader.svelte';
export { default as PageHeader } from '../widgets/layout/PageHeader.svelte';
export { default as InlineAlert } from '../widgets/display/InlineAlert.svelte';
export { default as ControlBar } from '../widgets/call/ControlBar.svelte';
export { default as ParticipantTile } from '../widgets/call/ParticipantTile.svelte';
export { default as IncomingCallCard } from '../widgets/call/IncomingCallCard.svelte';
export { default as ToolRail } from '../widgets/craft/ToolRail.svelte';
export { default as PropertyRow } from '../widgets/craft/PropertyRow.svelte';
export { default as InspectorSection } from '../widgets/craft/InspectorSection.svelte';

/* ── form parts with sub-parts: shadcn composable namespace ────────────── */
export * as Slider from '../components/ui/slider/index.js';

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
export { default as DiffTable } from '../widgets/data/DiffTable.svelte';
export { default as ContextCards } from '../widgets/ai/ContextCards.svelte';
export { default as RecommendationCard } from '../widgets/ai/RecommendationCard.svelte';
export { default as FineTuneCard } from '../widgets/ai/FineTuneCard.svelte';
export { default as SelectionActions } from '../widgets/ai/SelectionActions.svelte';
export { default as FloatingDock } from '../widgets/call/FloatingDock.svelte';
export { default as BottomSheet } from '../widgets/call/BottomSheet.svelte';

/* ── craft editor organisms ────────────────────────────────────────────────
   The shared frame of the craft editors (vector, photo, layout). `Tree` is the
   registered widget; its opt-in layer props make it the layer list. */
export { default as CanvasViewport } from '../widgets/craft/CanvasViewport.svelte';
export { default as EditorShell } from '../widgets/craft/EditorShell.svelte';
export { default as Tree } from '../widgets/data/Tree.svelte';
export type {
  CraftTool,
  CanvasGuide,
  CanvasGuideChange,
  CanvasRect,
  CanvasPointer,
  CanvasMods,
  ViewTransform,
  EditorPanelTab,
  LayerMove,
  LayerNode,
} from '../widgets/craft/types.js';
