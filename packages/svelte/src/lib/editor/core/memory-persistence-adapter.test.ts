/**
 * @file editor/core/memory-persistence-adapter.test.ts
 * @description Unit tests for the in-memory PersistenceAdapter (SP-1c-a): proves
 *   the standalone host-boundary works with no backend — applyOps, draft/publish/
 *   restore round-trips, history growth, and non-aliasing of stored snapshots.
 * @created 2026-06-27 (SP-1c-a — branch spike/editor-domid-overlay)
 */
import { describe, it, expect } from 'vitest';
import type { UINode } from '@ripple-ui/core';
import { nodePropSet } from './editor-ops.js';
import { MemoryPersistenceAdapter } from './memory-persistence-adapter.js';

function sampleSpec(): UINode {
	return {
		type: 'container',
		id: 'n_root0001',
		children: [
			{ type: 'heading', id: 'n_head0001', props: { text: 'Hello' } },
			{ type: 'text', id: 'n_text0001', props: { text: 'World' } }
		]
	} as UINode;
}

describe('MemoryPersistenceAdapter — standalone host-boundary stub', () => {
	it('applyOps applies node_prop_set and returns the updated tree', async () => {
		const a = new MemoryPersistenceAdapter();
		a.seed('s1', sampleSpec());
		const updated = await a.applyOps('s1', [nodePropSet('n_head0001', 'text', 'Changed')]);
		expect(updated.children![0].props!.text).toBe('Changed');
		// persisted working reflects it
		const reloaded = await a.loadSpec('s1');
		expect(reloaded!.children![0].props!.text).toBe('Changed');
	});

	it('saveDraft → publish → restore round-trips a prior spec exactly', async () => {
		const a = new MemoryPersistenceAdapter();
		const draft = await a.saveDraft('s1', sampleSpec());
		const rev = await a.publish('s1', draft);
		// move working away from the published spec
		await a.applyOps('s1', [nodePropSet('n_head0001', 'text', 'Different')]);
		expect((await a.loadSpec('s1'))!.children![0].props!.text).toBe('Different');
		// restore the published revision
		const restored = await a.restore('s1', rev.revisionId);
		expect(restored.children![0].props!.text).toBe('Hello');
		expect((await a.loadSpec('s1'))!.children![0].props!.text).toBe('Hello');
	});

	it('publish grows listRevisions history', async () => {
		const a = new MemoryPersistenceAdapter();
		expect(await a.listRevisions('s1')).toHaveLength(0);
		await a.publish('s1', await a.saveDraft('s1', sampleSpec()));
		await a.publish('s1', await a.saveDraft('s1', sampleSpec()));
		expect(await a.listRevisions('s1')).toHaveLength(2);
	});

	it('stored revisions do not alias the live tree', async () => {
		const a = new MemoryPersistenceAdapter();
		const rev = await a.publish('s1', await a.saveDraft('s1', sampleSpec()));
		// mutate the live working tree after publishing
		await a.applyOps('s1', [nodePropSet('n_text0001', 'text', 'mutated')]);
		const restored = await a.restore('s1', rev.revisionId);
		expect(restored.children![1].props!.text).toBe('World'); // revision untouched
	});

	it('throws clear errors on unknown draft / revision', async () => {
		const a = new MemoryPersistenceAdapter();
		await expect(a.publish('s1', { scopeId: 's1', draftId: 'nope' })).rejects.toThrow(/unknown draft/);
		await expect(a.restore('s1', 'nope')).rejects.toThrow(/unknown revision/);
	});

	it('scopes are isolated', async () => {
		const a = new MemoryPersistenceAdapter();
		a.seed('s1', sampleSpec());
		a.seed('s2', sampleSpec());
		await a.applyOps('s1', [nodePropSet('n_head0001', 'text', 'only-s1')]);
		expect((await a.loadSpec('s1'))!.children![0].props!.text).toBe('only-s1');
		expect((await a.loadSpec('s2'))!.children![0].props!.text).toBe('Hello');
	});
});
