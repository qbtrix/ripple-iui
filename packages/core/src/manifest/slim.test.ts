/**
 * @file manifest/slim.test.ts
 * @description Holds the slim manifest and the slim runtime together.
 *
 * The slim manifest is only honest while every action it documents actually
 * runs in `SlimHeadless`, and every action it leaves out is actually skipped.
 * So this dispatches each documented example through the slim runtime and
 * checks for the skip warning, both ways. Add an action to `BaseDispatcher`
 * without `BASE_ACTIONS`, or the reverse, and one of these fails.
 *
 * @changes
 *   - 2026-09-27: created with the slim manifest.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventHandler } from '../schema/event-handler.js';
import type { UINode } from '../schema/ui-spec.js';
import { createSlimHeadlessRuntime } from '../headless/slim.js';
import { BASE_ACTIONS } from '../core/base-dispatcher.js';
import { manifestActions } from './actions.js';
import { buildSlimManifest, slimActions, type SlimWidgetEntry } from './slim.js';
import { specEnvelope } from './envelope.js';

afterEach(() => {
	vi.restoreAllMocks();
});

const SKIPPED = /is not available in this runtime/;

/** Run one handler through the slim runtime; report whether it was skipped. */
async function runsInSlim(handler: Record<string, unknown>): Promise<boolean> {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const rt = createSlimHeadlessRuntime({
		spec: { type: 'button', id: 'b', on_click: handler } as unknown as UINode,
		state: { list: [1, 2], flag: false, name: '' },
		onEvent: () => {}
	});
	await rt.dispatch(rt.findById('b')!, 'onclick');
	const skipped = warn.mock.calls.some((args) => SKIPPED.test(String(args[0])));
	warn.mockRestore();
	return !skipped;
}

const button: SlimWidgetEntry = {
	type: 'button',
	description: 'A button.',
	props: { label: { type: 'string', required: true, description: 'Text.' } },
	events: { on_click: { type: 'EventAction', required: false, description: 'On click.' } },
	example: { type: 'button', props: { label: 'Go' } }
};

describe('slim manifest', () => {
	it('documents exactly BASE_ACTIONS, in that order', () => {
		expect(Object.keys(buildSlimManifest({ widgets: [] }).actions)).toEqual([...BASE_ACTIONS]);
	});

	it.each(BASE_ACTIONS.map((a) => [a]))('%s: its example parses and runs in the slim runtime', async (name) => {
		const example = manifestActions[name].example;
		expect(EventHandler.safeParse(example).success).toBe(true);
		expect(await runsInSlim(example)).toBe(true);
	});

	const fullOnly = Object.keys(manifestActions).filter((a) => !(BASE_ACTIONS as readonly string[]).includes(a));

	it('leaves out 11 actions', () => {
		expect(fullOnly.sort()).toEqual(
			['animate', 'api', 'branch', 'call_binding', 'confirm', 'delay', 'flow', 'invoke', 'invoke_tool', 'run_source', 'validate'].sort()
		);
	});

	it.each(fullOnly.map((a) => [a]))('%s: left out, and the slim runtime does skip it', async (name) => {
		expect(await runsInSlim(manifestActions[name].example)).toBe(false);
	});

	it('shares the spec envelope with the full manifest and carries the host widgets', () => {
		const m = buildSlimManifest({ widgets: [button] });
		expect(m.schema).toBe('ripple.manifest.slim/v1');
		expect(m.spec).toBe(specEnvelope);
		expect(m.widgets).toEqual([button]);
	});

	it('narrows actions when asked, and refuses an action the runtime skips', () => {
		expect(Object.keys(slimActions(['set', 'emit']))).toEqual(['set', 'emit']);
		expect(() => buildSlimManifest({ widgets: [], actions: ['set', 'api'] })).toThrow(/"api" is not run/);
	});

	it('refuses a widget listed twice', () => {
		expect(() => buildSlimManifest({ widgets: [button, button] })).toThrow(/listed twice/);
	});

	it('is plain JSON', () => {
		const m = buildSlimManifest({ widgets: [button] });
		expect(JSON.parse(JSON.stringify(m))).toEqual(m);
	});
});
