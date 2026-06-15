// FlowRunner.d2-gating.test.ts — Chain Flow v2 §3.3 / D2 proof.
// Created 2026-06-15.
//
// Proves the write-terminal success-view gating added to FlowRunner.fireTerminal:
//   1. A WRITE-kind terminal (call_binding / invoke_tool / create_pocket) stays
//      UN-submitted (no success view, submit button still rendered) until the
//      host's onComplete promise RESOLVES — then the success view appears.
//   2. A REJECTED onComplete leaves the step un-submitted (no success view, the
//      submit button is still there as the retry affordance) — no false success.
//   3. A NON-write terminal (emit) keeps the prior instant behavior: the success
//      view shows immediately even if onComplete is still pending. (Backward-compat.)
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import FlowRunner from '../FlowRunner.svelte';
import type { TerminalResult } from '../chain-executor.svelte.js';
import type { FlowAction, UniversalSpec } from '../../schema/universal-spec.js';

function clickButton(container: HTMLElement, label: string) {
	const clickables = [
		...within(container).queryAllByRole('button'),
		...within(container).queryAllByRole('radio'),
		...within(container).queryAllByRole('checkbox'),
	];
	const btn = clickables.find((b) => b.textContent?.trim() === label);
	if (!btn)
		throw new Error(
			`control "${label}" not found; have: ${clickables.map((b) => b.textContent?.trim()).join(', ')}`,
		);
	return fireEvent.click(btn);
}

// A minimal SINGLE-step terminal flow: no chain/chain_map → the step IS terminal,
// so its `flow.submit` button fires fireTerminal() directly. The terminal action's
// `kind` is parameterized so one fixture exercises both the write and non-write paths.
function buildTerminalFlow(onComplete: FlowAction): UniversalSpec {
	return {
		version: '2.0',
		id: 'terminal-only',
		flowId: 'finish',
		intent: 'confirm',
		title: 'Confirm and create',
		onComplete,
		ui: {
			type: 'container',
			children: [
				{ type: 'heading', props: { text: 'Confirm and create the workspace' } },
				{
					type: 'button',
					props: { label: 'Create' },
					on_click: { action: 'emit', target: 'flow.submit', value: {} },
				},
			],
		},
	};
}

// A deferred promise whose resolve/reject we control from the test.
function deferred<T = void>() {
	let resolve!: (v: T) => void;
	let reject!: (e?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const SUCCESS_TEXT = "You're all set.";

describe('FlowRunner — D2 write-terminal success gating', () => {
	it('a write-kind terminal stays un-submitted until onComplete resolves', async () => {
		const gate = deferred();
		const onComplete = vi.fn<(r: TerminalResult) => Promise<void>>(() => gate.promise);
		const spec = buildTerminalFlow({
			kind: 'call_binding',
			binding: 'create_vendor',
			path: '/vendors',
		});
		const { container } = render(FlowRunner, { props: { spec, onComplete } });

		// Fire the terminal. onComplete is called, but its promise is still pending.
		await clickButton(container, 'Create');
		await tick();

		// onComplete fired, but the success view must NOT be shown yet — the write
		// has not resolved. The terminal step (its submit button) is still rendered,
		// which is the working retry surface.
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.textContent).not.toContain(SUCCESS_TEXT);
		expect(
			within(container)
				.queryAllByRole('button')
				.some((b) => b.textContent?.trim() === 'Create'),
		).toBe(true);

		// Resolve the host write → the success view appears.
		gate.resolve();
		await gate.promise;
		await tick();

		expect(container.textContent).toContain(SUCCESS_TEXT);
	});

	it('a REJECTED onComplete leaves the write-kind terminal un-submitted (retry affordance)', async () => {
		const gate = deferred();
		const onComplete = vi.fn<(r: TerminalResult) => Promise<void>>(() => gate.promise);
		const spec = buildTerminalFlow({
			kind: 'create_pocket',
			name: 'Acme — Client',
		});
		const { container } = render(FlowRunner, { props: { spec, onComplete } });

		await clickButton(container, 'Create');
		await tick();

		// Reject the write (host already surfaced its own error toast).
		gate.reject(new Error('backend 500'));
		// Drain the rejection + the .catch() microtask without an unhandled rejection.
		await gate.promise.catch(() => {});
		await tick();

		// No false success; the submit button is still rendered so the user can retry.
		expect(container.textContent).not.toContain(SUCCESS_TEXT);
		expect(
			within(container)
				.queryAllByRole('button')
				.some((b) => b.textContent?.trim() === 'Create'),
		).toBe(true);
	});

	it('a non-write terminal (emit) shows the success view immediately — unchanged behavior', async () => {
		// onComplete returns a still-pending promise; the emit path must NOT wait on it.
		const gate = deferred();
		const onComplete = vi.fn<(r: TerminalResult) => Promise<void>>(() => gate.promise);
		const spec = buildTerminalFlow({ kind: 'emit', event: 'done' });
		const { container } = render(FlowRunner, { props: { spec, onComplete } });

		await clickButton(container, 'Create');
		await tick();

		// Success view is shown right away even though onComplete never resolved.
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(container.textContent).toContain(SUCCESS_TEXT);
	});
});
