// FlowRunner.test.ts — RFC 13 M1 end-to-end proof.
// Created 2026-05-31.
//
// Renders the NON-COMMERCE onboarding-wizard fixture in a FlowRunner (which
// hosts the flow over the standard <Ripple> renderer — the "renders in a Pocket"
// deliverable) and drives it by clicking the REAL rendered buttons. Proves the
// primitive advances client-side with zero round-trips, branches via chain_map,
// pre-fills the confirm step from earlier answers via {state.x}, and fires
// onComplete with the full accumulated payload.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import FlowRunner from '../FlowRunner.svelte';
import { buildOnboardingWizard } from '../fixtures/onboarding-wizard.js';
import type { TerminalResult } from '../chain-executor.svelte.js';
import type { UniversalSpec } from '../../schema/universal-spec.js';

function clickButton(container: HTMLElement, label: string) {
	const btn = within(container)
		.getAllByRole('button')
		.find((b) => b.textContent?.trim() === label);
	if (!btn) throw new Error(`button "${label}" not found; have: ${within(container).getAllByRole('button').map((b) => b.textContent?.trim()).join(', ')}`);
	return fireEvent.click(btn);
}

describe('FlowRunner — onboarding wizard (focus branch)', () => {
	it('renders step 1 (pick a goal) first', () => {
		const { container } = render(FlowRunner, { props: { spec: buildOnboardingWizard() } });
		expect(container.textContent).toContain('Pick your primary goal');
		expect(container.textContent).toContain('Focus on my own work');
		// It must NOT show later steps yet.
		expect(container.textContent).not.toContain('Name your workspace');
		expect(container.textContent).not.toContain('Review your setup');
	});

	it('advances client-side through all three steps and fires onComplete with the accumulated payload', async () => {
		const onComplete = vi.fn<(r: TerminalResult) => void>();
		const { container } = render(FlowRunner, {
			props: { spec: buildOnboardingWizard(), onComplete }
		});

		// Step 1 -> pick "focus" (chain_map routes to the focus details step).
		// Assert on rendered headings (a spec `title` is metadata, not rendered).
		await clickButton(container, 'Focus on my own work');
		expect(container.textContent).toContain('Name your workspace');
		expect(container.textContent).not.toContain('Name your shared workspace');

		// Step 2 -> type a workspace name, then Continue.
		const input = container.querySelector('input');
		expect(input).not.toBeNull();
		await fireEvent.input(input!, { target: { value: 'Acme HQ' } });
		await clickButton(container, 'Continue');

		// Step 3 -> confirm step, pre-filled from earlier answers via {state.x}.
		expect(container.textContent).toContain('Review your setup');
		expect(container.textContent).toContain('Goal: Focus on my own work');
		expect(container.textContent).toContain('Workspace: Acme HQ');

		// Finish -> terminal onComplete fires with the FlowAction + payload.
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
});

describe('FlowRunner — onboarding wizard (collaborate branch)', () => {
	it('chain_map routes the collaborate goal to a different step 2', async () => {
		const onComplete = vi.fn<(r: TerminalResult) => void>();
		const { container } = render(FlowRunner, {
			props: { spec: buildOnboardingWizard(), onComplete }
		});

		// Pick "collaborate" -> the invite step (heading "Name your shared
		// workspace"), NOT the focus details step ("Name your workspace").
		await clickButton(container, 'Collaborate with a team');
		expect(container.textContent).toContain('Name your shared workspace');

		const input = container.querySelector('input');
		await fireEvent.input(input!, { target: { value: 'Acme Team' } });
		await clickButton(container, 'Continue');

		expect(container.textContent).toContain('Goal: Collaborate with a team');
		expect(container.textContent).toContain('Workspace: Acme Team');

		await clickButton(container, 'Finish');
		const result = onComplete.mock.calls[0][0];
		expect(result.payload['pick_goal_selection']).toEqual({
			id: 'collaborate',
			label: 'Collaborate with a team'
		});
		expect(result.payload['enter_details_formData']).toEqual({ workspace: 'Acme Team' });
	});
});

describe('FlowRunner — non-flow events pass through to the host', () => {
	it('forwards a plain emit (non flow.* target) to onEvent', async () => {
		const onEvent = vi.fn();
		const spec: UniversalSpec = {
			version: '2.0',
			intent: 'info',
			flowId: 'only',
			ui: {
				type: 'container',
				children: [
					{
						type: 'button',
						props: { label: 'Ping' },
						on_click: { action: 'emit', target: 'analytics.ping', value: { ok: true } }
					}
				]
			}
		};
		const { container } = render(FlowRunner, { props: { spec, onEvent } });
		await clickButton(container, 'Ping');
		expect(onEvent).toHaveBeenCalledTimes(1);
		const event = onEvent.mock.calls[0][0];
		expect(event.name).toBe('analytics.ping');
		expect(event.payload).toEqual({ ok: true });
	});
});
