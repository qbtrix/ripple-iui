/**
 * @file editor/core/memory-persistence-adapter.ts
 * @description L1 (PURE TS, zero Svelte/DOM) in-memory `PersistenceAdapter` —
 *   the standalone-lib reference stub (SP-1c-a). It proves the editor's
 *   host-boundary (`ports.ts`) works with ZERO paw-os: a scope's working spec,
 *   draft snapshots, and a published-revision log all live in a Map. The REAL
 *   Branch-backed adapter implements the same interface host-side and drops in
 *   without touching editor code.
 *
 *   Deep-clones on every read and write, so a stored draft/revision can never
 *   alias the host's live ($state) tree (mutating the live spec must not
 *   silently rewrite history).
 * @created 2026-06-27 (SP-1c-a — branch spike/editor-domid-overlay)
 */
import type { UINode } from '../../schema/ui-spec.js';
import { applyOp } from '../../core/spec-mutator.js';
import type { PersistenceAdapter, ScopeId, DraftRef, Revision } from './ports.js';
import type { EditorOp } from './editor-ops.js';

/**
 * JSON round-trip clone (NOT structuredClone): structuredClone throws
 * DataCloneError on a Svelte `$state` proxy. Callers currently pass
 * `$state.snapshot()`-ed (plain) specs, but JSON keeps this proxy-safe whatever a
 * caller hands in. Specs are plain JSON, so the round-trip is lossless.
 */
function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

interface ScopeStore {
	working: UINode | null;
	drafts: Map<string, UINode>;
	revisions: Revision[];
	revisionSpecs: Map<string, UINode>;
	seq: number;
}

/**
 * In-memory `PersistenceAdapter`. Default host adapter for the playground and
 * tests; the canonical proof that the editor needs no backend to run.
 */
export class MemoryPersistenceAdapter implements PersistenceAdapter {
	private scopes = new Map<ScopeId, ScopeStore>();

	/** Seed a scope's initial working spec (host/test setup convenience). */
	seed(scopeId: ScopeId, spec: UINode): void {
		this.store(scopeId).working = clone(spec);
	}

	private store(scopeId: ScopeId): ScopeStore {
		let s = this.scopes.get(scopeId);
		if (!s) {
			s = { working: null, drafts: new Map(), revisions: [], revisionSpecs: new Map(), seq: 0 };
			this.scopes.set(scopeId, s);
		}
		return s;
	}

	async loadSpec(scopeId: ScopeId): Promise<UINode | null> {
		const s = this.store(scopeId);
		return s.working ? clone(s.working) : null;
	}

	async applyOps(scopeId: ScopeId, ops: EditorOp[]): Promise<UINode> {
		const s = this.store(scopeId);
		if (!s.working) {
			throw new Error(`applyOps: no working spec for scope "${scopeId}" (seed or saveDraft first)`);
		}
		const root = clone(s.working);
		for (const op of ops) applyOp(root, op);
		s.working = root;
		return clone(root);
	}

	async saveDraft(scopeId: ScopeId, spec: UINode): Promise<DraftRef> {
		const s = this.store(scopeId);
		const draftId = `d${++s.seq}`;
		s.drafts.set(draftId, clone(spec));
		s.working = clone(spec);
		return { scopeId, draftId };
	}

	async publish(scopeId: ScopeId, draft: DraftRef): Promise<Revision> {
		const s = this.store(scopeId);
		const draftSpec = s.drafts.get(draft.draftId);
		if (!draftSpec) {
			throw new Error(`publish: unknown draft "${draft.draftId}" for scope "${scopeId}"`);
		}
		const revisionId = `r${++s.seq}`;
		const rev: Revision = { scopeId, revisionId };
		s.revisions.push(rev);
		s.revisionSpecs.set(revisionId, clone(draftSpec));
		s.working = clone(draftSpec);
		return rev;
	}

	async listRevisions(scopeId: ScopeId): Promise<Revision[]> {
		return this.store(scopeId).revisions.map((r) => ({ ...r }));
	}

	async restore(scopeId: ScopeId, revisionId: string): Promise<UINode> {
		const s = this.store(scopeId);
		const spec = s.revisionSpecs.get(revisionId);
		if (!spec) {
			throw new Error(`restore: unknown revision "${revisionId}" for scope "${scopeId}"`);
		}
		s.working = clone(spec);
		return clone(spec);
	}
}
