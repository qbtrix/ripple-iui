// Ripple.flow.test.ts — Chain Flow auto-detection guard (RFC 13 every-surface fix).
// Created 2026-05-31.
//
// THE test that would have caught "Pockets don't run flows." The existing M1
// suite (intent/__tests__/FlowRunner.test.ts) drove `FlowRunner` DIRECTLY, so it
// proved the runner but never proved that the base `<Ripple>` — what Pockets,
// dashboards, and every non-chat surface mount — detects a chain spec and hosts
// it. This file passes a chain spec to the base `<Ripple>` and asserts it
// renders AND advances past step 1, in the two shapes a flow actually arrives:
//   1. a bare top-level chain root, and
//   2. the `{version, ui:<chain-root>}` envelope the `start_flow` builder emits
//      (the exact wrapped shape that stalled on the canvas before this fix).
// It also pins the non-regression guarantee: a NON-chain spec renders
// byte-identically through `<Ripple>`, with no FlowRunner in the tree.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import Ripple from './Ripple.svelte';
import { buildOnboardingWizard } from './intent/fixtures/onboarding-wizard.js';
import type { TerminalResult } from './intent/chain-executor.svelte.js';

function clickButton(container: HTMLElement, label: string) {
	// Options render as `<button role="radio">` inside a radiogroup (the
	// single-select a11y pattern), so their accessible role is "radio", not
	// "button". Search both roles to find a labelled control to click.
	const q = within(container);
	const candidates = [...q.queryAllByRole('button'), ...q.queryAllByRole('radio')];
	const btn = candidates.find((b) => b.textContent?.trim() === label);
	if (!btn) {
		throw new Error(
			`control "${label}" not found; have: ${candidates
				.map((b) => b.textContent?.trim())
				.join(', ')}`
		);
	}
	return fireEvent.click(btn);
}

describe('Ripple auto-detects a Chain Flow (bare top-level root)', () => {
	it('renders step 1 by mounting FlowRunner — not a static first step', () => {
		const { container } = render(Ripple, { props: { spec: buildOnboardingWizard() } });

		// Step 1 content is present...
		expect(container.textContent).toContain('Pick your primary goal');
		// ...and it got there via FlowRunner (a `.flow-runner` host exists in the
		// DOM). A plain `<Ripple>` of the first step would NOT have this marker —
		// that absence was the smoke-test symptom on the Pocket canvas.
		expect(container.querySelector('.flow-runner')).not.toBeNull();
		// Later steps are NOT shown yet.
		expect(container.textContent).not.toContain('Review your setup');
	});

	it('advances past step 1 entirely client-side (the would-have-caught-it assertion)', async () => {
		const { container } = render(Ripple, { props: { spec: buildOnboardingWizard() } });

		// Click the real rendered step-1 button. On the broken branch this did
		// nothing — no stepper, no advance. Here it walks the tree.
		await clickButton(container, 'Focus on my own work');
		expect(container.textContent).toContain('Name your workspace');
		expect(container.textContent).not.toContain('Pick your primary goal');
	});

	it('walks all three steps and fires onComplete with the accumulated payload', async () => {
		const onComplete = vi.fn<(r: TerminalResult) => void>();
		const { container } = render(Ripple, {
			props: { spec: buildOnboardingWizard(), onComplete }
		});

		await clickButton(container, 'Focus on my own work');
		const input = container.querySelector('input');
		expect(input).not.toBeNull();
		await fireEvent.input(input!, { target: { value: 'Acme HQ' } });
		await clickButton(container, 'Continue');

		expect(container.textContent).toContain('Review your setup');
		expect(container.textContent).toContain('Goal: Focus on my own work');
		expect(container.textContent).toContain('Workspace: Acme HQ');

		expect(onComplete).not.toHaveBeenCalled();
		await clickButton(container, 'Finish');
		expect(onComplete).toHaveBeenCalledTimes(1);
		const result = onComplete.mock.calls[0][0];
		expect(result.action).toEqual({ kind: 'emit', event: 'onboarding.complete' });
		expect(result.payload['pick_goal_selection']).toEqual({
			id: 'focus',
			label: 'Focus on my own work'
		});
		expect(result.payload['enter_details_formData']).toEqual({ workspace: 'Acme HQ' });
	});

	it('mounts exactly ONE FlowRunner — the step host does not recurse', () => {
		// If the inner per-step `<Ripple>` re-detected the (still chain-bearing)
		// step as a flow root, we'd get nested `.flow-runner` hosts (or a hang).
		// The `flowHosted` guard keeps it to one.
		const { container } = render(Ripple, { props: { spec: buildOnboardingWizard() } });
		expect(container.querySelectorAll('.flow-runner').length).toBe(1);
	});
});

describe('Ripple auto-detects a Chain Flow (start_flow `{version, ui:<root>}` envelope)', () => {
	// The EXACT shape pocketpaw's `start_flow` builder emits and the chat
	// extractor produces: the chain tree is wrapped one level down under `ui`.
	// FlowRunner walks `chain`/`chain_map` off the TOP of its spec, so `<Ripple>`
	// must unwrap to the inner node. This is the shape that rendered step 1 and
	// then froze on the Pocket canvas.
	function wrappedWizard(intentWrap: 'envelope' | 'custom') {
		const root = buildOnboardingWizard();
		return intentWrap === 'custom'
			? ({ version: '2.0', intent: 'custom', ui: root } as Record<string, unknown>)
			: ({ version: '1.0', ui: root } as Record<string, unknown>);
	}

	it('unwraps `{version, ui:<root>}` and advances', async () => {
		const { container } = render(Ripple, { props: { spec: wrappedWizard('envelope') } });
		expect(container.textContent).toContain('Pick your primary goal');
		expect(container.querySelector('.flow-runner')).not.toBeNull();
		await clickButton(container, 'Collaborate with a team');
		// chain_map branch: collaborate -> the invite step (different heading).
		expect(container.textContent).toContain('Name your shared workspace');
	});

	it('unwraps the chat-normalized `{intent:custom, ui:<root>}` and advances', async () => {
		const { container } = render(Ripple, { props: { spec: wrappedWizard('custom') } });
		expect(container.textContent).toContain('Pick your primary goal');
		await clickButton(container, 'Focus on my own work');
		expect(container.textContent).toContain('Name your workspace');
	});
});

describe('Ripple leaves NON-chain specs byte-identical (zero behavior change)', () => {
	// A representative non-flow spec: a card with a heading, a bound input, and a
	// button. None of the flow fields (`chain`/`chain_map`/`flowId`/`onComplete`)
	// are present, so the flow path must never engage.
	const plainSpec = {
		version: '2.0',
		intent: 'custom',
		ui: {
			type: 'container',
			props: { class: 'demo' },
			children: [
				{ type: 'heading', props: { text: 'Just a card' } },
				{ type: 'input', bind: 'name', props: { label: 'Name', placeholder: 'Ada' } },
				{
					type: 'button',
					props: { label: 'Save' },
					on_click: { action: 'emit', target: 'demo.save', value: { ok: true } }
				}
			]
		}
	} as const;

	it('renders a plain spec with no FlowRunner anywhere', () => {
		const { container } = render(Ripple, { props: { spec: structuredClone(plainSpec) } });
		expect(container.textContent).toContain('Just a card');
		// The flow path is NOT engaged for a non-chain spec.
		expect(container.querySelector('.flow-runner')).toBeNull();
		// And the node tree rendered normally (the ripple-root carries intent).
		expect(container.querySelector('[data-ripple-intent="custom"]')).not.toBeNull();
	});

	it('produces identical DOM across remounts — no flow wrappers leak', () => {
		// Two renders of the same non-chain spec must yield identical markup once
		// the per-render auto-incrementing input id (`ripple-input-cN`, a global
		// counter unrelated to flow detection) is normalized. This pins that the
		// auto-detect branch adds NOTHING to the non-flow path — no stray flow
		// wrappers, data attributes, or markers.
		const normalizeIds = (html: string) => html.replace(/ripple-input-c\d+/g, 'ripple-input-cN');

		const a = render(Ripple, { props: { spec: structuredClone(plainSpec) } });
		const htmlA = normalizeIds(a.container.innerHTML);
		a.unmount();

		const b = render(Ripple, { props: { spec: structuredClone(plainSpec) } });
		const htmlB = normalizeIds(b.container.innerHTML);

		expect(htmlB).toBe(htmlA);
		expect(htmlA).not.toContain('flow-runner');
		expect(htmlA).not.toContain('data-flow-step');
	});

	it('a non-chain spec still fires plain events to onEvent (unchanged dispatch)', async () => {
		const onEvent = vi.fn();
		const { container } = render(Ripple, {
			props: { spec: structuredClone(plainSpec), onEvent }
		});
		await clickButton(container, 'Save');
		expect(onEvent).toHaveBeenCalled();
		const event = onEvent.mock.calls.at(-1)![0];
		expect(event.name).toBe('demo.save');
	});
});
