/**
 * @file editor/core/lane-adapter.ts
 * @description L1 (PURE TS, zero Svelte/DOM) the lane-agnostic editor PORT (EP-1).
 *   The visual-editor chrome (inspector today; overlay / inline / drag in later
 *   slices) talks to a substrate ONLY through this interface, so the SAME chrome
 *   can later drive other substrates (svelte source, html/css) by swapping the
 *   adapter behind the port. The ripple substrate is the first implementation
 *   (`RippleLaneAdapter`, over the spec-mutator path); nothing else may reach past
 *   the port into spec-mutator / EditorOps / inferFields directly.
 *
 *   ADDRESSING. A `TargetRef` is the lane-scoped handle for one editable thing —
 *   `{ uid, lane }`. `uid` is opaque to the chrome (a ripple node id today; a
 *   source range or selector for a future lane). `lane` tags which adapter owns
 *   it, so a multi-lane host never feeds a ref to the wrong adapter.
 *
 *   SYNC vs ASYNC. Every method returns SYNCHRONOUSLY. The ripple lane mutates an
 *   in-memory `$state` tree through `spec-mutator` — there is no I/O, so a sync
 *   contract keeps the chrome trivial (the inspector's `$derived(getFields(ref))`
 *   needs no await / loading state, exactly as today's `$derived(inferFields)`).
 *   Lanes that DO perform I/O (compile svelte source, round-trip remote html/css)
 *   wrap this contract later — either an `AsyncLaneAdapter` variant or by widening
 *   these returns to `T | Promise<T>` when the first async lane lands. Deferring
 *   that until a real async lane exists avoids speculative Promise plumbing now.
 * @created 2026-06-30 (EP-1 — LaneAdapter port + Ripple adapter)
 */
import type { InspectorField } from './inspector-fields.js';

/** Lane-scoped handle for one editable target. `uid` is opaque to the chrome. */
export interface TargetRef {
  /** Substrate-local id (a ripple node id today; opaque to the chrome). */
  uid: string;
  /** The adapter that owns this ref (e.g. `'ripple'`). */
  lane: string;
}

/** A normalized, lane-agnostic view of one editable node. */
export interface EditableNode {
  /** Same value as the originating `TargetRef.uid`. */
  uid: string;
  /** Widget / element type (drives the field manifest). */
  type: string;
  /** Editable props (a shallow copy — mutate via `applyEdit`, never in place). */
  props: Record<string, unknown>;
  /** Current primary text / rich-HTML content, when the node has one. */
  text?: string;
  /** Child target uids in document order. */
  childUids: string[];
}

/** A lane-agnostic edit intent. The adapter maps each to its substrate's ops. */
export type EditOp =
  /** Set prop `name` to `value`. `value` may be a RAW control value — the adapter
   *  coerces it to the prop's model type (the chrome carries no coercion logic). */
  | { kind: 'setProp'; name: string; value: unknown }
  /** Replace the node's primary text / rich-HTML content with `html`. */
  | { kind: 'setText'; html: string }
  /** Insert a new child of `childType` at `index` among the node's children. */
  | { kind: 'insertChild'; childType: string; index: number }
  /** Move an existing child (`childUid`) to `toIndex` among the node's children. */
  | { kind: 'moveChild'; childUid: string; toIndex: number }
  /** Remove an existing child (`childUid`). */
  | { kind: 'removeChild'; childUid: string };

/**
 * The editor port. The chrome resolves a clicked element to a `TargetRef`, reads
 * the node + its manifest fields, and applies `EditOp`s — all without knowing the
 * substrate. Returns are synchronous for the ripple lane (see the file header).
 */
export interface LaneAdapter {
  /** Stable lane id, stamped onto every `TargetRef` this adapter emits. */
  readonly id: string;
  /** Clicked / hovered element -> its target, or null when none resolves. */
  resolveElement(el: Element): TargetRef | null;
  /** Normalized view of the target node, or null when it no longer exists. */
  readNode(ref: TargetRef): EditableNode | null;
  /** The target's children as refs, in document order. */
  listChildren(ref: TargetRef): TargetRef[];
  /** Manifest fields (with current values) for the target — drives the inspector. */
  getFields(ref: TargetRef): InspectorField[];
  /** Apply one edit; returns whether it was recognized and applied. */
  applyEdit(ref: TargetRef, op: EditOp): boolean;
  /** Which inline-editing affordance the chrome should mount for this lane. */
  inlineEditor?: 'tiptap' | 'squire' | 'overlay';
}
