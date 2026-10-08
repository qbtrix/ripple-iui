// NodeRenderer.events.test.ts — every widget event the manifest documents reaches
// the widget. NodeRenderer passes a generic `on_*` key through as a lowercase
// prop with the underscores dropped (on_correct -> oncorrect, on_open_change ->
// onopenchange). A widget that reads another spelling (onCorrect) never sees the
// spec's handler. The static table covers every manifest entry; the behavioural
// table mounts real specs and fires the event for the ones jsdom can drive.

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { manifestEntries } from '$lib/manifest/index.js';
import { getWidget } from '$lib/widgets/index.js';

// Wired explicitly by NodeRenderer (bind contracts, DOM events); not passthrough.
const WIRED = new Set(['on_click', 'on_change', 'on_input', 'on_submit', 'on_focus', 'on_blur']);
const passthroughProp = (key: string) => 'on' + key.slice(3).replace(/_/g, '');

const modules = import.meta.glob<{ default: unknown }>('../widgets/**/*.svelte', { eager: true });
const sources = import.meta.glob<string>('../widgets/**/*.svelte', { eager: true, query: '?raw', import: 'default' });

/** Names destructured from `$props()` in a widget's source. */
function declaredProps(type: string): string[] {
	const component = getWidget(type);
	const file = Object.keys(modules).find((f) => modules[f].default === component);
	if (!file) throw new Error(`no source file for widget "${type}"`);
	const block = sources[file].match(/let\s*\{([\s\S]*?)\}\s*(?::[^=]*)?=\s*\$props\(\)/)?.[1] ?? '';
	return [...block.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

const documented = manifestEntries.flatMap((e) =>
	Object.keys(e.events ?? {})
		.filter((k) => k.startsWith('on_') && !WIRED.has(k))
		.map((k) => [e.type, k] as const)
);

describe('manifest events reach the widget (static)', () => {
	test('the manifest documents passthrough events', () => {
		expect(documented.length).toBeGreaterThan(5);
	});

	test.each(documented)('%s declares the prop for %s', (type, key) => {
		expect(declaredProps(type)).toContain(passthroughProp(key));
	});
});

const button = (c: HTMLElement, label: string) =>
	[...c.querySelectorAll<HTMLElement>('button, [role="button"]')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label);

type Case = {
	type: string;
	event: string;
	props: Record<string, unknown>;
	trigger: (c: HTMLElement) => Promise<void>;
};

const cases: Case[] = [
	{
		type: 'flashcard',
		event: 'on_correct',
		props: { front: 'Hello', back: 'Hola' },
		trigger: async (c) => {
			await fireEvent.click(c.querySelector('.flashcard')!);
			await fireEvent.click(button(c, 'Got It')!);
		}
	},
	{
		type: 'flashcard',
		event: 'on_incorrect',
		props: { front: 'Hello', back: 'Hola' },
		trigger: async (c) => {
			await fireEvent.click(c.querySelector('.flashcard')!);
			await fireEvent.click(button(c, 'Needs Review')!);
		}
	},
	{
		type: 'flashcard',
		event: 'on_flip',
		props: { front: 'Hello', back: 'Hola' },
		trigger: async (c) => {
			await fireEvent.click(c.querySelector('.flashcard')!);
		}
	},
	{
		type: 'timer',
		event: 'on_complete',
		props: { duration: 0 },
		trigger: async (c) => {
			vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
			await fireEvent.click(button(c, 'Start')!);
			vi.advanceTimersByTime(1000);
		}
	},
	{
		type: 'drawing-canvas',
		event: 'on_save',
		props: {},
		trigger: async (c) => {
			vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,');
			vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
			await fireEvent.click(button(c, 'Download')!);
		}
	},
	{
		type: 'otp-input',
		event: 'on_complete',
		props: { length: 4 },
		trigger: async (c) => {
			const first = c.querySelector('input')!;
			await fireEvent.paste(first, { clipboardData: { getData: () => '1234' } });
		}
	},
	{
		type: 'calendar',
		event: 'on_select',
		props: { value: '2026-05-01', events: [{ id: 1, title: 'Launch', start: '2026-05-05' }] },
		trigger: async (c) => {
			await fireEvent.click(button(c, 'Launch')!);
		}
	}
];

describe('manifest events reach the widget (mounted)', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	test.each(cases.map((c) => [c.type, c.event, c] as const))('%s %s runs its handler', async (_t, _e, c) => {
		const spec = {
			state: { fired: 'no' },
			ui: {
				type: 'flex',
				children: [
					{ type: c.type, props: c.props, [c.event]: { action: 'set', target: 'fired', value: 'yes' } },
					{ type: 'text', props: { text: 'Fired {state.fired}' } }
				]
			}
		};
		const { container } = render(Ripple, { props: { spec } });
		await tick();
		await c.trigger(container);
		await vi.waitFor(() => expect(container.textContent).toContain('Fired yes'), { timeout: 500 });
	});
});
