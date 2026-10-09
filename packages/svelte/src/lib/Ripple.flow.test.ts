// Ripple.flow.test.ts — Chain Flow auto-detection guard (RFC 13 every-surface fix).
// Created 2026-05-31.
// Updated 2026-06-15 — the onboarding-wizard terminal moved from `emit` to a
//   `chat` loop in the production builder, so the full-walk test now asserts the
//   `{kind:'chat', message:<prompt>}` terminal action (matching the shared
//   fixture). This file otherwise guards auto-detection, not the terminal kind.
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

// A choice card is a native radio named by its label span (aria-labelledby);
// every other control is named by its text.
const nameOf = (el: HTMLElement) => {
	const by = el.getAttribute('aria-labelledby');
	return (by ? el.ownerDocument.getElementById(by) : el)?.textContent?.trim();
};

function clickButton(container: HTMLElement, label: string) {
	// Options render as choice cards: native radios inside a radiogroup, so
	// their role is "radio", not "button". Search both roles.
	const q = within(container);
	const candidates = [...q.queryAllByRole('button'), ...q.queryAllByRole('radio')];
	const btn = candidates.find((b) => nameOf(b) === label);
	if (!btn) {
		throw new Error(
			`control "${label}" not found; have: ${candidates
				.map(nameOf)
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
		// Terminal hands back to the agent via the chat loop, mirroring the real
		// build_flow('onboarding_wizard') terminal (see fixtures/onboarding-wizard).
		expect(result.action).toEqual({
			kind: 'chat',
			message: "I've finished onboarding — here are my choices, please set up my workspace."
		});
		expect(result.payload['pick_goal_selection']).toEqual({
			id: 'focus',
			label: 'Focus on my own work'
		});
		expect(result.payload['enter_details_formData']).toEqual({ workspace: 'Acme HQ' });
		// `workspace` is bound AND sent as formData, so it is not repeated under `state`.
		expect(result.payload.state).toBeUndefined();
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

// The chat-card shape for the flow-state tests below.
function tripCard() {
	return {
		ui: {
			flowId: 'trip_days',
			ui: {
				type: 'container',
				children: [
					{ type: 'input', bind: 'days', props: { label: 'Days' } },
					{
						type: 'button',
						props: { label: 'Next' },
						on_click: { action: 'emit', target: 'flow.next', value: {} }
					}
				]
			},
			chain: {
				flowId: 'trip_summary',
				ui: {
					type: 'container',
					children: [
						{ type: 'text', props: { text: 'Staying {state.days} days' } },
						{
							type: 'button',
							props: { label: 'Book' },
							on_click: { action: 'emit', target: 'flow.submit', value: {} }
						}
					]
				},
				onComplete: { kind: 'chat', message: 'Book it' }
			}
		},
		state: { days: 3 }
	};
}

describe("a flow card seeds its steps from the card's own `state`", () => {
	// The chat-card shape: the chain root is wrapped under `ui`, and the card's
	// `state` sits beside it at the top. Step 1 binds an input to `days`; step 2
	// reads `{state.days}`. Before the fix the runner got the host's state (none
	// here), so the input rendered empty and step 2 never saw the value.
	it('renders the step-1 input with the seeded value', () => {
		const { container } = render(Ripple, { props: { spec: tripCard() } });
		expect(container.querySelector('.flow-runner')).not.toBeNull();
		expect(container.querySelector('input')?.value).toBe('3');
	});

	it('step 2 reads the seeded value after flow.next', async () => {
		const { container } = render(Ripple, { props: { spec: tripCard() } });
		await clickButton(container, 'Next');
		expect(container.textContent).toContain('Staying 3 days');
	});

	it('carries a value the visitor typed in step 1 into step 2', async () => {
		const { container } = render(Ripple, { props: { spec: tripCard() } });
		await fireEvent.input(container.querySelector('input')!, { target: { value: '5' } });
		await clickButton(container, 'Next');
		expect(container.textContent).toContain('Staying 5 days');
	});

	it("a step's own state is a default: Back keeps the typed value", async () => {
		const card = tripCard();
		(card.ui as Record<string, unknown>).state = { days: 1 };
		const { container } = render(Ripple, { props: { spec: card } });
		// The card's top-level state (3) wins over the step's default (1).
		expect(container.querySelector('input')?.value).toBe('3');
		await fireEvent.input(container.querySelector('input')!, { target: { value: '5' } });
		await clickButton(container, 'Next');
		await fireEvent.click(container.querySelector('.flow-runner__back')!);
		expect(container.querySelector('input')?.value).toBe('5');
	});

	it('hands the bound values to onComplete under payload.state', async () => {
		const onComplete = vi.fn<(r: TerminalResult) => void>();
		const { container } = render(Ripple, { props: { spec: tripCard(), onComplete } });
		await fireEvent.input(container.querySelector('input')!, { target: { value: '5' } });
		await clickButton(container, 'Next');
		await clickButton(container, 'Book');
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete.mock.calls[0][0].payload.state).toEqual({ days: '5' });
	});
});

describe('choice cards stream', () => {
	it('a streamed flow select step renders the same cards as the whole spec', async () => {
		const { expectStreamParity } = await import('./streaming/__fixtures__/stream-parity.js');
		const opt = (id: string, label: string, description?: string) => ({
			type: 'button',
			props: { label, ...(description ? { description } : {}) },
			on_click: { action: 'emit', target: 'flow.submit', value: { selection: { id, label } } }
		});
		const { whole } = await expectStreamParity({
			ui: {
				flowId: 'main_use',
				intent: 'select',
				title: 'What will you use it for most?',
				onComplete: { kind: 'chat', message: 'Recommend a laptop.' },
				ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [opt('work', 'Work and study', 'Docs, email, video calls'), opt('gaming', 'Gaming'), opt('everyday', 'Everyday browsing')] }
			}
		});
		expect(whole.querySelectorAll('[data-option-card]')).toHaveLength(3);
		expect(whole.querySelector('[data-option-card="gaming"] [data-choice-icon]')?.getAttribute('data-choice-icon')).toBe('gaming');
	});
});

describe('choice cards: option buttons render once', () => {
	// The step a model wrote for a story card: the option buttons sit one level
	// down, in a row flex under the step's column flex, next to the story text.
	const opt = (id: string, label: string, description: string) => ({
		type: 'button',
		props: { label, description },
		on_click: { action: 'emit', target: 'flow.next', value: { selection: { id, label } } }
	});
	const STORY = 'RB-7 wakes in a rain-soaked junkyard.';
	const nestedCard = () => ({
		ui: {
			flowId: 'robot_start',
			intent: 'select',
			title: 'Where does RB-7 go?',
			ui: {
				type: 'flex',
				props: { direction: 'column', gap: 12 },
				children: [
					{ type: 'text', props: { text: STORY } },
					{
						type: 'flex',
						props: { direction: 'row', gap: 8, wrap: true },
						children: [opt('light', 'Follow the light', 'Toward the old tower'), opt('hum', 'Follow the hum', 'Toward the factory')]
					}
				]
			},
			chain_map: {
				light: { flowId: 'robot_tower', intent: 'info', title: 'The old tower', onComplete: { kind: 'chat', message: 'tower' }, ui: { type: 'text', props: { text: 'Tower.' } } },
				hum: { flowId: 'robot_factory', intent: 'info', title: 'The factory', onComplete: { kind: 'chat', message: 'factory' }, ui: { type: 'text', props: { text: 'Factory.' } } }
			}
		}
	});
	const LABELS = ['Follow the light', 'Follow the hum'];
	const controlsNamed = (container: HTMLElement, label: string) => {
		const q = within(container);
		return [...q.queryAllByRole('button'), ...q.queryAllByRole('radio')].filter((b) => nameOf(b) === label);
	};

	it('a nested option button shows as one choice card, not a card and a button', () => {
		const { container } = render(Ripple, { props: { spec: nestedCard() } });
		for (const label of LABELS) {
			expect(controlsNamed(container, label)).toHaveLength(1);
			expect(controlsNamed(container, label)[0].getAttribute('type')).toBe('radio');
		}
		expect(container.textContent).toContain(STORY);
		// The row flex held only option buttons, so nothing of it is left to render.
		expect(container.querySelectorAll('[data-option-card]')).toHaveLength(2);
	});

	it('a button that is not an option stays a plain button', () => {
		const spec = nestedCard();
		const row = spec.ui.ui.children[1] as { children: unknown[] };
		row.children.push({ type: 'button', props: { label: 'Learn more' }, on_click: { action: 'emit', target: 'story.help' } });
		const { container } = render(Ripple, { props: { spec } });
		expect(controlsNamed(container, 'Learn more')).toHaveLength(1);
		expect(controlsNamed(container, 'Learn more')[0].tagName).toBe('BUTTON');
		for (const label of LABELS) expect(controlsNamed(container, label)).toHaveLength(1);
	});

	it('top-level option buttons still render once, next to a heading', () => {
		const spec = nestedCard();
		const row = spec.ui.ui.children[1] as { children: unknown[] };
		(spec.ui.ui as { children: unknown[] }).children = [{ type: 'text', props: { text: STORY } }, ...row.children];
		const { container } = render(Ripple, { props: { spec } });
		for (const label of LABELS) expect(controlsNamed(container, label)).toHaveLength(1);
		expect(container.textContent).toContain(STORY);
	});

	it('does not mutate the spec it was given', () => {
		const spec = nestedCard();
		const before = JSON.stringify(spec);
		render(Ripple, { props: { spec } });
		expect(JSON.stringify(spec)).toBe(before);
	});

	it('a streamed step never shows an option as a plain button', async () => {
		const { mountStreamed } = await import('./streaming/__fixtures__/mount-streamed.js');
		const flashed = new Set<string>();
		const seen = new MutationObserver(() => {
			for (const b of document.querySelectorAll('button')) {
				const text = b.textContent?.trim() ?? '';
				if (LABELS.some((l) => l.startsWith(text) && text.length > 0) && !b.closest('[data-option-card]')) flashed.add(text);
			}
		});
		seen.observe(document.body, { subtree: true, childList: true, characterData: true });
		const { container } = await mountStreamed(nestedCard(), { chunkSize: 8 });
		seen.disconnect();
		expect([...flashed]).toEqual([]);
		for (const label of LABELS) expect(controlsNamed(container, label)).toHaveLength(1);
	});
});
