// configurator.test.ts — The widget page's interactive parts: the props
// configurator writes the spec it renders (controls → props → live render and
// copyable JSON), never offers a prop it cannot model, and resets; the variant
// row stays empty until it nears the viewport; the Copy page split button
// copies what each item says.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { manifestEntries } from '../../manifest/index.js';
import CopyPage from './CopyPage.svelte';
import { forYourModel } from './model.js';
import PropsConfigurator from './PropsConfigurator.svelte';
import VariantRow from './VariantRow.svelte';
import { configurableProps, findNode, nodeAt } from './props.js';
import { exampleSpec, pageSpecs, rows } from './widgets.js';

const entry = (type: string) => manifestEntries.find((e) => e.type === type)!;
const specText = () => JSON.parse(document.querySelector('pre.spec')?.textContent ?? 'null') as { ui: { props?: Record<string, unknown> } };

afterEach(() => cleanup());

describe('PropsConfigurator', () => {
	const button = entry('button');

	it('starts from the example props and offers one control per modelled prop', () => {
		render(PropsConfigurator, { spec: exampleSpec(button), rows: rows(button.props) });
		expect(specText()).toEqual(exampleSpec(button));
		expect(screen.getByLabelText<HTMLInputElement>('label').value).toBe(button.example.props?.label);
		expect(screen.getByRole('button', { name: 'Reset' })).toHaveProperty('disabled', true);
		// The render, the controls and the spec JSON stay out of the Pagefind index.
		for (const sel of ['.stage', '.controls', '.out']) expect(document.querySelector(sel)?.hasAttribute('data-pagefind-ignore')).toBe(true);
	});

	it('applies a control to the spec and the live render, and Reset undoes it', async () => {
		render(PropsConfigurator, { spec: exampleSpec(button), rows: rows(button.props) });
		await fireEvent.change(screen.getByLabelText('variant'), { target: { value: 'ghost' } });
		await fireEvent.input(screen.getByLabelText('label'), { target: { value: 'Ship it' } });
		await fireEvent.click(screen.getByRole('switch', { name: 'disabled' }));

		expect(specText().ui.props).toMatchObject({ variant: 'ghost', label: 'Ship it', disabled: true });
		const rendered = document.querySelector<HTMLButtonElement>('.stage .ripple-root button');
		expect(rendered?.textContent).toContain('Ship it');
		expect(rendered?.disabled).toBe(true);

		await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		expect(specText()).toEqual(exampleSpec(button));
	});

	it('clearing a field removes the prop rather than writing an empty value', async () => {
		render(PropsConfigurator, { spec: exampleSpec(button), rows: rows(button.props) });
		await fireEvent.input(screen.getByLabelText('label'), { target: { value: '' } });
		expect(specText().ui.props).not.toHaveProperty('label');
	});

	it('never offers a prop it cannot model, and renders with only odd types', () => {
		const odd = [
			{ name: 'items', type: 'Array<{ id: string', description: '' },
			{ name: 'node', type: 'UISpec', description: '' },
			{ name: 'anything', type: 'any', description: '' }
		];
		render(PropsConfigurator, { spec: { version: '1.0', ui: { type: 'text', props: { text: 'Hi' } } }, rows: odd });
		expect(document.querySelectorAll('.controls .row')).toHaveLength(0);
		expect(document.querySelector('.stage')?.textContent).toContain('Hi');
	});

	it('configures the widget inside a pocket when the page previews one', async () => {
		const modal = entry('modal');
		const spec = pageSpecs(modal).example;
		const path = findNode(spec, 'modal')!;
		expect(path.length).toBeGreaterThan(0);
		render(PropsConfigurator, { spec, rows: rows(modal.props), path });
		await fireEvent.input(screen.getByLabelText('title'), { target: { value: 'Renamed' } });
		const out = JSON.parse(document.querySelector('pre.spec')?.textContent ?? 'null') as typeof spec;
		expect(nodeAt(out, path)?.props).toMatchObject({ title: 'Renamed' });
		expect(nodeAt(out, [])?.type).toBe((spec.ui as { type: string }).type);
	});

	it('every manifest prop table yields controls without throwing', () => {
		for (const e of manifestEntries) expect(() => configurableProps(rows(e.props))).not.toThrow();
	});
});

describe('VariantRow', () => {
	let fire: (visible: boolean) => void = () => {};

	beforeEach(() => {
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
					fire = (v) => cb([{ isIntersecting: v }]);
				}
				observe() {}
				disconnect() {}
			}
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('labels every option and mounts the previews only once in view', async () => {
		const badge = entry('badge');
		const axis = { name: 'variant', options: ['default', 'outline'] };
		render(VariantRow, { spec: exampleSpec(badge), axis });
		expect([...document.querySelectorAll('li code')].map((c) => c.textContent)).toEqual([
			'variant: "default"',
			'variant: "outline"'
		]);
		expect(document.querySelectorAll('.ripple-root')).toHaveLength(0);

		fire(false);
		await vi.waitFor(() => expect(document.querySelectorAll('.ripple-root')).toHaveLength(0));
		fire(true);
		await vi.waitFor(() => expect(document.querySelectorAll('.ripple-root')).toHaveLength(2));
	});
});

describe('CopyPage', () => {
	let clip: string[];
	beforeEach(() => {
		clip = [];
		vi.stubGlobal('navigator', { clipboard: { writeText: (t: string) => (clip.push(t), Promise.resolve()) } });
	});
	afterEach(() => vi.unstubAllGlobals());

	it('copies the page from the main half and each menu item does what it says', async () => {
		render(CopyPage, { markdown: '# Title\n', href: '/docs/x.md' });
		await fireEvent.click(screen.getByRole('button', { name: 'Copy page' }));
		expect(clip).toEqual(['# Title\n']);

		const more = screen.getByRole('button', { name: 'More copy options' });
		expect(more.getAttribute('aria-expanded')).toBe('false');
		await fireEvent.click(more);
		expect(more.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByRole('link', { name: /View as Markdown/ }).getAttribute('href')).toBe('/docs/x.md');

		await fireEvent.click(screen.getByRole('button', { name: /Copy for your model/ }));
		expect(clip.at(-1)).toBe(forYourModel('# Title\n'));
		expect(more.getAttribute('aria-expanded')).toBe('false');

		await fireEvent.click(more);
		await fireEvent.click(screen.getByRole('button', { name: /Copy as Markdown/ }));
		expect(clip.at(-1)).toBe('# Title\n');
	});

	it('Escape closes the menu and returns focus to the chevron', async () => {
		render(CopyPage, { markdown: 'x', href: '/x.md' });
		const more = screen.getByRole('button', { name: 'More copy options' });
		await fireEvent.click(more);
		await fireEvent.keyDown(screen.getByRole('link', { name: /View as Markdown/ }), { key: 'Escape' });
		expect(more.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(more);
	});
});
