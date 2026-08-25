/**
 * @file editor/core/ports.ts
 * @description L1 (PURE TS, zero Svelte/DOM) host-boundary PORTS for the Ripple
 *   visual editor (SP-1c-a). The editor talks to the outside world ONLY through
 *   these interfaces — never a paw-os endpoint — which is exactly what keeps
 *   `@ripple-ui/svelte` a standalone, framework-agnostic library: a host
 *   (paw-os, or anyone) implements the ports against its own stack
 *   (Branch / Fabric / S3 / agent, or their own), and the editor is unchanged.
 *
 *   Only `PersistenceAdapter` has an impl today (`MemoryPersistenceAdapter`,
 *   the in-memory reference stub). The REAL Branch-backed adapter is a
 *   host-side slice that drops in here unchanged. The sibling ports are
 *   declared (types only) so the boundary contract is complete.
 * @created 2026-06-27 (SP-1c-a — branch spike/editor-domid-overlay)
 */
import type { UINode } from '@ripple-ui/core';
import type { EditorOp } from './editor-ops.js';

/** Identifies the artifact being edited (pocket id, site id, …). */
export type ScopeId = string;

/** Handle to a saved (unpublished) draft snapshot. */
export interface DraftRef {
	scopeId: ScopeId;
	draftId: string;
}

/** A published point in a scope's history. */
export interface Revision {
	scopeId: ScopeId;
	revisionId: string;
	label?: string;
}

/**
 * How the editor loads, mutates, drafts, publishes, and restores a spec. The
 * host owns the actual store; paw-os implements this over the Branch primitive
 * (draft → review → publish + revert + history). The editor depends on this
 * INTERFACE only — never a concrete host — per the standalone-lib boundary.
 */
export interface PersistenceAdapter {
	/** Current (published) spec for a scope, or null if none yet. */
	loadSpec(scopeId: ScopeId): Promise<UINode | null>;
	/** Apply ops to the scope's working spec; returns the updated root. */
	applyOps(scopeId: ScopeId, ops: EditorOp[]): Promise<UINode>;
	/** Snapshot a spec as a draft (the editor's `onApplied` hook debounces this). */
	saveDraft(scopeId: ScopeId, spec: UINode): Promise<DraftRef>;
	/** Promote a draft to a published revision. */
	publish(scopeId: ScopeId, draft: DraftRef): Promise<Revision>;
	/** History for a scope, oldest first. */
	listRevisions(scopeId: ScopeId): Promise<Revision[]>;
	/** Restore a prior revision as the working spec; returns it. */
	restore(scopeId: ScopeId, revisionId: string): Promise<UINode>;
}

/**
 * Resolves live-data bindings for bound nodes (paw-os: Fabric / D1; anyone:
 * their REST/GraphQL). Type-only for now — the editor's bound-node handling
 * (a later slice) consumes this.
 */
export interface DataSourceAdapter {
	resolveBinding(binding: unknown): Promise<unknown>;
}

/**
 * Where exported artifacts (PDF / PPTX / MP4) land (paw-os: S3 / the per-tenant
 * artifacts blob; anyone: their bucket). Type-only for now — Pillar 3 export
 * consumes this.
 */
export interface ExportStorageAdapter {
	put(file: Blob, meta: Record<string, unknown>): Promise<{ url: string }>;
}

/**
 * Optional agent that emits the SAME ops the editor emits (paw-os: Claude /
 * pocket_specialist; anyone: their agent, or none). Type-only for now —
 * agent-assisted authoring is a later slice. This is why the editor is
 * agent-agnostic: authoring is just an op stream.
 */
export interface AuthoringAgentAdapter {
	proposeOps(prompt: string, context?: unknown): AsyncIterable<EditorOp[]>;
}
