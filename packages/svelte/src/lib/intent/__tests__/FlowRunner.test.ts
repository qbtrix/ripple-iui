// FlowRunner.test.ts — RFC 13 M1 end-to-end proof.
// Created 2026-05-31.
// Updated 2026-06-15 — the onboarding-wizard terminal moved from an `emit`
//   event to a `chat` loop in the production builder (pocketpaw
//   `build_flow('onboarding_wizard')`), so the focus + collaborate branch tests
//   now assert the `{kind:'chat', message:<prompt>}` terminal action instead of
//   the old `{kind:'emit', event:'onboarding.complete'}`. The `emit` terminal
//   kind is still a valid FlowAction, so a dedicated test below drives a small
//   inline two-step flow whose terminal IS an emit and asserts onComplete fires
//   with it — emit coverage moves, it does not disappear.
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
import type { UniversalSpec } from '@ripple-ui/core';

// The exact chat-terminal prompt the onboarding wizard hands back to the agent,
// mirroring pocketpaw `build_onboarding_wizard`. Kept as a constant so the
// fixture and both branch assertions stay in lockstep.
const ONBOARDING_CHAT_MESSAGE =
	"I've finished onboarding — here are my choices, please set up my workspace.";

function clickButton(container: HTMLElement, label: string) {
	// Options now render through OptionList as role="radio"/"checkbox" cards, not
	// plain buttons — so match any clickable control (button or selection option)
	// whose trimmed text equals the label.
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
		// Terminal hands back to the AGENT via the chat loop (mirrors the real
		// build_flow('onboarding_wizard') terminal), not a dead-end emit event.
		expect(result.action).toEqual({ kind: 'chat', message: ONBOARDING_CHAT_MESSAGE });
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
		// Same chat-loop terminal on the collaborate branch — the chain_map split
		// changes step 2, not the terminal hand-off.
		expect(result.action).toEqual({ kind: 'chat', message: ONBOARDING_CHAT_MESSAGE });
		expect(result.payload['pick_goal_selection']).toEqual({
			id: 'collaborate',
			label: 'Collaborate with a team'
		});
		expect(result.payload['enter_details_formData']).toEqual({ workspace: 'Acme Team' });
	});
});

describe('FlowRunner — emit terminal (the other valid FlowAction kind)', () => {
	// `chat` is what the onboarding wizard ships, but `emit` is still a first-class
	// terminal kind in the FlowAction union (schema/universal-spec.ts). This drives
	// a small-but-real two-step chain whose terminal declares `onComplete:{kind:
	// 'emit',...}` and asserts onComplete fires with that emit action — so the emit
	// path stays covered now that the wizard fixture no longer exercises it.
	function buildEmitTerminalFlow(): UniversalSpec {
		// Step 2 (terminal): no chain/chain_map left, declares an emit onComplete.
		const terminal: UniversalSpec = {
			version: '2.0',
			id: 'emit-term',
			flowId: 'review',
			intent: 'confirm',
			title: 'Done',
			onComplete: { kind: 'emit', event: 'inline.flow.complete' },
			ui: {
				type: 'container',
				children: [
					{ type: 'heading', props: { text: 'Confirm and finish' } },
					{
						type: 'button',
						props: { label: 'Submit' },
						on_click: { action: 'emit', target: 'flow.submit', value: {} }
					}
				]
			}
		};
		// Step 1 (root): one button advances into the terminal via flow.next,
		// carrying a selection so the accumulated payload is non-empty and real.
		return {
			version: '2.0',
			id: 'emit-start',
			flowId: 'start',
			intent: 'select',
			title: 'Start',
			chain: terminal,
			ui: {
				type: 'container',
				children: [
					{ type: 'heading', props: { text: 'Begin the flow' } },
					{
						type: 'button',
						props: { label: 'Begin' },
						on_click: {
							action: 'emit',
							target: 'flow.next',
							value: { selection: { id: 'go', label: 'Go' } }
						}
					}
				]
			}
		};
	}

	it('advances through the chain and fires onComplete with the emit action + payload', async () => {
		const onComplete = vi.fn<(r: TerminalResult) => void>();
		const { container } = render(FlowRunner, {
			props: { spec: buildEmitTerminalFlow(), onComplete }
		});

		// Step 1 renders; terminal heading is not shown yet.
		expect(container.textContent).toContain('Begin the flow');
		expect(container.textContent).not.toContain('Confirm and finish');

		// Advance into the terminal step.
		await clickButton(container, 'Begin');
		expect(container.textContent).toContain('Confirm and finish');

		// Submit the terminal step -> onComplete fires with the EMIT action.
		expect(onComplete).not.toHaveBeenCalled();
		await clickButton(container, 'Submit');

		expect(onComplete).toHaveBeenCalledTimes(1);
		const result = onComplete.mock.calls[0][0];
		expect(result.action).toEqual({ kind: 'emit', event: 'inline.flow.complete' });
		// Step 1's selection landed in the namespaced accumulated payload.
		expect(result.payload['start_selection']).toEqual({ id: 'go', label: 'Go' });
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
