// widgets.test.ts — The generated widget reference. The gate: every manifest
// entry's example, and every interactive pocket spec, renders through
// SpecExample (the component the /docs/widgets pages use) without throwing,
// without hitting a widget error boundary or the unknown-widget fallback, and
// with at least one element inside Ripple's root. Text is not required: aurora,
// image and canvas widgets render none. Then the pure builders.
import { describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import SpecExample from '../SpecExample.svelte';
import { manifestEntries, type WidgetManifestEntry } from '../../manifest/index.js';
import {
	exampleSpec,
	interactiveSpecs,
	sourceUrl,
	widgetCategories,
	widgetMarkdown,
	widgetPrevNext,
	widgetsLlmsFullTxt,
	widgetsLlmsTxt
} from './widgets.js';

/**
 * Specs that do not render cleanly in jsdom, by "<type>" (the example) or
 * "<type>:<pocket name>". Keep this list as short as possible, and each entry
 * explains why. The weak-example report lists the error each one hits.
 */
const KNOWN_WEAK = new Set<string>([
	// Control flow nodes whose example reads state the liftable node does not carry,
	// so on their own they render nothing.
	'each', // items: {state.users}
	'if', // condition: {state.isAdmin}
	// Overlays whose example is the closed state: nothing renders in place.
	'coachmark',
	'command-palette',
	'confirm-dialog',
	'modal',
	'sheet'
]);

const specs = manifestEntries.flatMap((e) => [
	{ name: e.type, spec: exampleSpec(e) },
	...interactiveSpecs(e).map((s) => ({ name: `${e.type}:${s.name}`, spec: s.spec }))
]);

function renderProblem(spec: Record<string, unknown>): string | null {
	try {
		const { container } = render(SpecExample, { spec });
		const box = container.querySelector('.render');
		if (!box?.querySelector('.ripple-root *')) return 'empty render';
		const err = box.querySelector('[data-ripple-node-error]');
		if (err) return `widget error: ${err.textContent?.trim().slice(0, 200)}`;
		const unknown = box.querySelector('[data-ripple-unknown-widget]');
		if (unknown) return `unknown widget type: ${unknown.getAttribute('data-ripple-unknown-widget')}`;
		return null;
	} catch (e) {
		return `throws: ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		cleanup();
	}
}

describe('widget reference examples', () => {
	it('the check catches an unknown type and an empty render', () => {
		expect(renderProblem({ version: '1.0', ui: { type: 'no-such-widget' } })).toMatch(/^unknown widget type/);
		expect(renderProblem({ version: '1.0', ui: { type: 'if', condition: false, children: [] } })).toBe('empty render');
	});

	it('covers every manifest entry', () => {
		expect(new Set(specs.map((s) => s.name.split(':')[0])).size).toBe(manifestEntries.length);
	});

	it.each(specs.filter((s) => !KNOWN_WEAK.has(s.name)))('$name renders', ({ spec }) => {
		expect(renderProblem(spec)).toBeNull();
	});

	// An allowlisted spec that starts rendering must leave the list.
	it.each([...KNOWN_WEAK])('%s is still weak', (name) => {
		const s = specs.find((x) => x.name === name);
		expect(s, `${name} is not a spec any more`).toBeDefined();
		expect(renderProblem(s!.spec)).not.toBeNull();
	});
});

const fixture = (type: string, category: string, extra: Partial<WidgetManifestEntry> = {}): WidgetManifestEntry => ({
	type,
	category,
	description: `${type} desc`,
	props: { label: { type: 'string | number', required: true, description: 'The label.' } },
	example: { type },
	...extra
});
const list = [fixture('zeta', 'input'), fixture('alpha', 'input'), fixture('box', 'layout'), fixture('odd', 'nope')];

describe('widget reference builders', () => {
	it('orders categories by reading order, unknown last, widgets by type', () => {
		expect(widgetCategories(list).map((c) => [c.id, c.widgets.map((w) => w.type)])).toEqual([
			['layout', ['box']],
			['input', ['alpha', 'zeta']],
			['nope', ['odd']]
		]);
	});

	it('pages prev/next stay inside the category', () => {
		expect(widgetPrevNext('alpha', list)).toEqual({ prev: null, next: 'zeta' });
		expect(widgetPrevNext('zeta', list)).toEqual({ prev: 'alpha', next: null });
		expect(widgetPrevNext('box', list)).toEqual({ prev: null, next: null });
	});

	it('wraps pocket and pockets as runnable specs', () => {
		const ui = { type: 'alpha' };
		expect(interactiveSpecs(fixture('a', 'input', { pocket: { state: { n: 1 }, ui } }))).toEqual([
			{ name: 'Interactive example', description: undefined, spec: { version: '1.0', state: { n: 1 }, ui } }
		]);
		expect(interactiveSpecs(fixture('a', 'input', { pockets: [{ name: 'Two', ui }] }))[0].spec).toEqual({ version: '1.0', ui });
		expect(interactiveSpecs(fixture('a', 'input'))).toEqual([]);
	});

	it('writes markdown with escaped table cells and only the tables that have rows', () => {
		const md = widgetMarkdown(fixture('alpha', 'input', { staticSafe: true }));
		expect(md).toContain('# alpha\n\nalpha desc\n\nCategory: Input. Renders without JavaScript.');
		expect(md).toContain('| `label` | `string \\| number` | yes | The label. |');
		expect(md).not.toContain('## Events');
	});

	it('lists one llms.txt line per widget and a props summary in llms-full', () => {
		expect(widgetsLlmsTxt(list).match(/^- \[/gm)).toHaveLength(list.length);
		expect(widgetsLlmsTxt(list)).toContain('- [alpha](https://ripple.pocketpaw.xyz/docs/widgets/alpha.md): alpha desc');
		expect(widgetsLlmsFullTxt(list)).toContain('## alpha\n\nalpha desc\n\nProps: label: string | number\n');
	});

	it('links a widget to its own source file when one matches, else the folder', () => {
		const files = ['/src/lib/widgets/input/Slider.svelte', '/src/lib/widgets/a/Dup.svelte', '/src/lib/widgets/b/Dup.svelte'];
		expect(sourceUrl('slider', files)).toMatch(/\/widgets\/input\/Slider\.svelte$/);
		expect(sourceUrl('dup', files)).toMatch(/\/widgets$/);
		expect(sourceUrl('todo-list', ['/src/lib/widgets/interactive/TodoList.svelte'])).toMatch(/TodoList\.svelte$/);
	});
});
