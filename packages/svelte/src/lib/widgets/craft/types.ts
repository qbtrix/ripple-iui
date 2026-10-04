// widgets/craft/types.ts
// Shared types for the craft editor parts (ToolRail, CanvasViewport,
// EditorShell). They live in a .ts module, not a .svelte module script, so
// `ui/index.ts` can re-export them without adding a `from '…svelte'` line
// (ui-contract.test.ts counts those lines against the component exports).

/** One tool button on a ToolRail. */
export interface CraftTool {
  id: string;
  label: string;
  /** Icon name; the host maps it to a glyph through ToolRail's `icon` snippet. */
  icon?: string;
  /** Single key, shown in the tooltip; selects the tool when `hotkeys` is on. */
  hotkey?: string;
  /** Consecutive tools sharing a group render together, split by a separator. */
  group?: string;
  disabled?: boolean;
}

/** Modifier keys held during a canvas pointer event. */
export interface CanvasMods {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

/** A pointer event from CanvasViewport, in DOCUMENT coordinates. */
export interface CanvasPointer {
  kind: 'down' | 'drag' | 'up' | 'move' | 'doubleclick';
  x: number;
  y: number;
  mods: CanvasMods;
  button: number;
  pointerType: string;
  pressure: number;
}

/** The viewport transform: document point d sits at screen point pan + d * zoom. */
export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

/** A right-panel tab on EditorShell. */
export interface EditorPanelTab {
  id: string;
  label: string;
}

/** True when a key event is aimed at something that takes text input. */
export function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

/** Open layers that own the keyboard. `data-state="open"` keeps an always-rendered
 *  listbox (a layers list) or a closed forceMount dialog from blocking; tooltips
 *  report `delayed-open`/`instant-open`, so they never block. */
const OPEN_OVERLAY =
  'dialog[open], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], ' +
  '[role="menu"][data-state="open"], [role="listbox"][data-state="open"], [data-popover-content][data-state="open"]';

/** True when editor hotkeys must stay quiet: a modal layer (dialog, menu, listbox,
 *  popover) is open anywhere in the document, or `host` sits in an inert subtree. */
export function hotkeysBlocked(host?: Element | null): boolean {
  if (host?.closest('[inert]')) return true;
  return typeof document !== 'undefined' && !!document.querySelector(OPEN_OVERLAY);
}

/** A layer reorder from Tree's drag-and-drop or Alt+Arrow keys. The host
 *  applies it (and rejects a move into the dragged node's own subtree). */
export interface LayerMove {
  id: string | number;
  targetId: string | number;
  position: 'before' | 'after' | 'inside';
}

export type { TreeNode as LayerNode } from '../data/Tree.svelte';

/** A ruler guide in DOCUMENT coordinates: a horizontal guide sits at y = position, a vertical one at x. */
export interface CanvasGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;
}

/** A guide edit raised by CanvasViewport: add (dragged out of a ruler), move, or remove (dropped back on its ruler). */
export interface CanvasGuideChange extends CanvasGuide {
  action: 'add' | 'move' | 'remove';
  /** Index into the `guides` prop, for move and remove. */
  index?: number;
}

/** A rectangle in DOCUMENT coordinates (the selection extent shown on the rulers). */
export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A TransformBox handle: a corner (nw, ne, se, sw) or an edge midpoint (n, e, s, w). */
export type TransformHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** What a TransformBox commit was: a pointer move, a handle resize, or a keyboard nudge / resize burst. */
export type TransformKind = 'move' | 'resize' | 'nudge';

/** A rectangle in SCREEN space: the coordinate frame of the canvas stage, the same one
 *  CanvasViewport's `overlay` snippet and EditorShell's `floating` layer use
 *  (a document point d sits at pan + d * zoom). ContextToolbar anchors to one. */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
