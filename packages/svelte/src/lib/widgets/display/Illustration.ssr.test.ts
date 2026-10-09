// widgets/display/Illustration.ssr.test.ts — illustration renders through
// svelte/server (the showcase is prerendered): the frame, the accessible name
// and the placeholder, never the markup itself (DOMParser is client-only).
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Illustration from './Illustration.svelte';

describe('illustration SSR', () => {
	it('renders the named frame and the placeholder, not the svg string', () => {
		const svg = "<svg viewBox='0 0 10 10'><rect id='r' width='10' height='10' onclick='x()'/></svg>";
		const { body } = render(Illustration, { props: { svg, title: 'A box', caption: 'Square', max_height: 120 } });
		expect(body).toContain('role="img"');
		expect(body).toContain('A box');
		expect(body).toContain('Square');
		expect(body).toMatch(/data-slot="placeholder"[^>]*height: 120px|height: 120px[^>]*data-slot="placeholder"/);
		expect(body).not.toContain('<rect');
		expect(body).not.toContain('onclick');
	});
});
