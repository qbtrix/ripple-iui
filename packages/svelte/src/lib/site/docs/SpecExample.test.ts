// SpecExample.test.ts — Every ```ripple example in src/docs renders through
// SpecExample without throwing, and its Preview | Spec toggle works.
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import SpecExample from '../SpecExample.svelte';
import { pages } from './content.js';
import { renderDoc } from './markdown.js';

const specs = pages.flatMap((p) =>
	renderDoc(p.raw, p.file).segments.flatMap((s, i) =>
		s.kind === 'spec' ? [{ name: `${p.slug} #${i}`, spec: s.spec }] : []
	)
);

describe('docs ripple examples', () => {
	it('the seeded docs have at least one', () => {
		expect(specs.length).toBeGreaterThan(0);
	});

	it.each(specs)('$name renders', ({ spec }) => {
		const { container, unmount } = render(SpecExample, { spec });
		expect(container.querySelector('.render')?.textContent?.length).toBeGreaterThan(0);
		unmount();
	});

	it('toggles to the spec JSON and back', async () => {
		render(SpecExample, { spec: specs[0].spec });
		const specBtn = screen.getByRole('button', { name: 'Spec' });
		await fireEvent.click(specBtn);
		expect(specBtn.getAttribute('aria-pressed')).toBe('true');
		expect(document.querySelector('pre.spec')?.textContent).toBe(JSON.stringify(specs[0].spec, null, 2));
		await fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
		expect(document.querySelector('.render')).not.toBeNull();
	});
});
