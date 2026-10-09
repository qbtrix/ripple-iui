// @file widgets/composite/side-column.test.ts
// @description Composites with a fixed side column (entity-detail's 260px meta
//   rail, form-layout's 220px section nav) put it beside the content only when
//   their OWN box is wide enough, via a container query on the widget root. A
//   viewport query put a 260px rail next to the content of a 480px card on a
//   wide screen, and the content's child cards overflowed into it.
//   jsdom does no layout and does not evaluate container queries, so this pins
//   the structure instead: the stylesheet queries the container (not the
//   viewport), and the DOM order stacks the rail under the content (the nav
//   above the fields) when the grid does not apply.
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import EntityDetail from './EntityDetail.svelte';
import FormLayout from './FormLayout.svelte';

afterEach(cleanup);

const styleOf = async (file: string) => {
	// @ts-ignore ripple's tsconfig has no node types.
	const { readFileSync } = await import('node:fs');
	const src: string = readFileSync(`src/lib/widgets/composite/${file}`, 'utf8');
	return src.slice(src.indexOf('<style>'));
};

/** The rule bodies inside `@container (min-width: 640px) { ... }`. */
const containerBlock = (css: string) => {
	const at = css.indexOf('@container (min-width: 640px)');
	expect(at, 'no @container (min-width: 640px) block').toBeGreaterThan(-1);
	return css.slice(at, css.indexOf('\n  }\n', at));
};

const body = createRawSnippet(() => ({ render: () => '<div class="child-card">Orders</div>' }));

describe('entity-detail meta rail', () => {
	it('queries its own width, not the viewport', async () => {
		const css = await styleOf('EntityDetail.svelte');
		expect(css).toMatch(/\.rentity \{[^}]*container-type: inline-size;/);
		expect(containerBlock(css)).toContain('.rentity-body-with-rail');
		expect(css).not.toMatch(/@media \(min-width: 900px\)/);
	});

	it('renders the rail after the content, so it stacks underneath', () => {
		const { container } = render(EntityDetail, {
			props: { title: 'Acme Corp', meta: [{ label: 'Owner', value: 'Ana' }], children: body }
		});
		const bodyEl = container.querySelector('.rentity-body');
		expect(bodyEl?.classList.contains('rentity-body-with-rail')).toBe(true);
		const kids = [...bodyEl!.children].map((n) => n.className.split(' ')[0]);
		expect(kids).toEqual(['rentity-content', 'rentity-rail']);
		expect(container.querySelector('.rentity-content .child-card')).not.toBeNull();
	});
});

describe('form-layout section nav', () => {
	it('queries its own width, not the viewport', async () => {
		const css = await styleOf('FormLayout.svelte');
		expect(css).toMatch(/\.rform \{[^}]*container-type: inline-size;/);
		expect(containerBlock(css)).toContain('.rform-body');
		expect(css).not.toMatch(/@media \(min-width: 900px\)/);
	});

	it('renders the nav before the fields, so it stacks above them', () => {
		const { container } = render(FormLayout, {
			props: { sections: [{ id: 'profile', title: 'Profile' }], children: body }
		});
		const first = container.querySelector('.rform-body')?.firstElementChild;
		expect(first?.classList.contains('rform-nav')).toBe(true);
	});
});
