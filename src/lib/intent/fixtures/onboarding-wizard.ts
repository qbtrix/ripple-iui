/**
 * @file onboarding-wizard.ts
 * @description NON-COMMERCE proof fixture for the Chain Flow primitive (RFC 13 M1).
 * @created 2026-05-31
 *
 * A three-step onboarding wizard — "pick a goal -> enter details -> confirm" —
 * expressed as ONE nested `chain` / `chain_map` `UniversalSpec`. It proves the
 * primitive without any commerce, chat, or network: the whole decision tree is
 * materialized up front, so the `ChainExecutor` walks it entirely client-side
 * with zero round-trips between steps.
 *
 * What it exercises:
 *   - `chain_map`: step 1 branches on the picked goal id (focus vs collaborate).
 *   - context accumulation: each step's `flowId` namespaces its data.
 *   - `{state.x}` cross-step pre-fill: the confirm step reads back the goal and
 *     the workspace name the user entered earlier via
 *     `{state.pick_goal_selection.label}` /
 *     `{state.enter_details_formData.workspace}`.
 *   - `onComplete`: the terminal step declares an `emit` FlowAction carrying the
 *     full accumulated payload back to the host.
 *
 * UINode shape notes (so the fixture renders for real):
 *   - `on_click` is a TOP-LEVEL UINode key (sibling of `type`/`props`/`bind`),
 *     not a prop.
 *   - the button's visible text comes from `props.label`.
 *   - steps talk to the FlowRunner with the standard `emit` action whose
 *     `target` is a flow verb (`flow.next` / `flow.submit`); its `value` carries
 *     `{ selection, formData }`, with `{state.x}` placeholders the dispatcher
 *     resolves before the runner sees them.
 */

import type { UniversalSpec } from '../../schema/universal-spec.js';

/**
 * Build the onboarding-wizard flow spec.
 *
 * Kept as a factory so each test gets a fresh, independent tree.
 */
export function buildOnboardingWizard(): UniversalSpec {
	// --- Step 3 (terminal): confirm, pre-filled from earlier answers ----------
	const confirmStep: UniversalSpec = {
		version: '2.0',
		id: 'onboard-confirm',
		flowId: 'confirm',
		intent: 'confirm',
		title: 'You are all set',
		// Terminal action: hand the whole accumulated payload back to the host.
		onComplete: {
			kind: 'emit',
			event: 'onboarding.complete'
		},
		ui: {
			type: 'container',
			props: { class: 'flow-confirm' },
			children: [
				{ type: 'heading', props: { text: 'Review your setup' } },
				{
					// Pre-fill from step 1's selection (cross-step `{state.x}`).
					type: 'text',
					props: { text: 'Goal: {state.pick_goal_selection.label}' }
				},
				{
					// Pre-fill from step 2's form data.
					type: 'text',
					props: { text: 'Workspace: {state.enter_details_formData.workspace}' }
				},
				{
					type: 'button',
					props: { label: 'Finish' },
					on_click: { action: 'emit', target: 'flow.submit', value: {} }
				}
			]
		}
	};

	// --- Step 2 (focus branch): collect workspace details -> confirm ----------
	const detailsStep: UniversalSpec = {
		version: '2.0',
		id: 'onboard-details',
		flowId: 'enter_details',
		intent: 'form',
		title: 'Set up your workspace',
		chain: confirmStep,
		ui: {
			type: 'container',
			children: [
				{ type: 'heading', props: { text: 'Name your workspace' } },
				{
					type: 'input',
					bind: 'workspace',
					props: { label: 'Workspace name', placeholder: 'Acme HQ' }
				},
				{
					type: 'button',
					props: { label: 'Continue' },
					on_click: {
						action: 'emit',
						target: 'flow.next',
						// formData carries the entered workspace name forward; the
						// `{state.workspace}` placeholder resolves at dispatch time.
						value: { formData: { workspace: '{state.workspace}' } }
					}
				}
			]
		}
	};

	// --- Step 2 (collaborate branch): a DIFFERENT step (proves chain_map) -----
	const inviteStep: UniversalSpec = {
		version: '2.0',
		id: 'onboard-invite',
		flowId: 'enter_details',
		intent: 'form',
		title: 'Invite your team',
		chain: confirmStep,
		ui: {
			type: 'container',
			children: [
				{ type: 'heading', props: { text: 'Name your shared workspace' } },
				{
					type: 'input',
					bind: 'workspace',
					props: { label: 'Workspace name', placeholder: 'Acme Team' }
				},
				{
					type: 'button',
					props: { label: 'Continue' },
					on_click: {
						action: 'emit',
						target: 'flow.next',
						value: { formData: { workspace: '{state.workspace}' } }
					}
				}
			]
		}
	};

	// --- Step 1 (root): pick a goal, branch on the selection ------------------
	const root: UniversalSpec = {
		version: '2.0',
		id: 'onboard-goal',
		flowId: 'pick_goal',
		intent: 'select',
		title: 'What brings you here?',
		selection: 'single',
		// Branch: the picked goal's id decides which step 2 we go to.
		chain_map: {
			focus: detailsStep,
			collaborate: inviteStep
		},
		ui: {
			type: 'container',
			children: [
				{ type: 'heading', props: { text: 'Pick your primary goal' } },
				{
					type: 'button',
					props: { label: 'Focus on my own work' },
					on_click: {
						action: 'emit',
						target: 'flow.next',
						value: { selection: { id: 'focus', label: 'Focus on my own work' } }
					}
				},
				{
					type: 'button',
					props: { label: 'Collaborate with a team' },
					on_click: {
						action: 'emit',
						target: 'flow.next',
						value: { selection: { id: 'collaborate', label: 'Collaborate with a team' } }
					}
				}
			]
		}
	};

	return root;
}
