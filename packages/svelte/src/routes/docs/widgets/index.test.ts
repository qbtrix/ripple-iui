// index.test.ts — The /docs/widgets card grid is lazy: nothing live renders and
// nothing is fetched until a card nears the viewport; then only the cards near
// it render, from one examples.json fetch, and a card that leaves drops its
// render. Every type and description is in the markup from the start, and the
// Grid | List choice is remembered.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { manifestEntries } from '$lib/manifest/index.js';
import { exampleSpec, widgetCategories } from '$lib/site/docs/widgets.js';
import Page from './+page.svelte';

const observed = new Map<Element, (visible: boolean) => void>();
const specs = Object.fromEntries(manifestEntries.map((e) => [e.type, exampleSpec(e)]));
let fetchMock: ReturnType<typeof vi.fn>;

// Warm the widget bundle the page imports lazily, so the first card's import is not timed by the test.
beforeAll(() => import('$lib/site/docs/MiniRender.svelte'), 60000);

beforeEach(() => {
	observed.clear();
	localStorage.clear();
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
			observe(el: Element) {
				observed.set(el, (v) => this.cb([{ isIntersecting: v }]));
			}
			disconnect() {}
		}
	);
	fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(specs))));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const data = () => ({ categories: widgetCategories() }) as never;
const stageOf = (type: string) =>
	[...document.querySelectorAll('.card')].find((c) => c.querySelector('code')?.textContent === type)!.querySelector('.stage')!;
const live = () => document.querySelectorAll('.card .ripple-root').length;

describe('/docs/widgets index', () => {
	it('lists every widget with its description and renders nothing live up front', () => {
		render(Page, { data: data() });
		expect(document.querySelectorAll('.card')).toHaveLength(manifestEntries.length);
		expect(document.body.textContent).toContain(manifestEntries[0].description);
		expect(observed.size).toBe(manifestEntries.length);
		expect(live()).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('renders only the cards in view, from one fetch, and drops a render that leaves', async () => {
		render(Page, { data: data() });
		observed.get(stageOf('button'))!(true);
		await vi.waitFor(() => expect(live()).toBe(1));
		expect(stageOf('button').querySelector('.ripple-root button')).not.toBeNull();

		observed.get(stageOf('badge'))!(true);
		await vi.waitFor(() => expect(live()).toBe(2));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('/docs/widgets/examples.json');

		observed.get(stageOf('button'))!(false);
		await vi.waitFor(() => expect(live()).toBe(1));
		expect(stageOf('button').querySelector('.ripple-root')).toBeNull();
	});

	it('keeps live renders out of the tab order and the search index', () => {
		render(Page, { data: data() });
		const stage = stageOf('button');
		expect(stage.hasAttribute('inert')).toBe(true);
		expect(stage.getAttribute('aria-hidden')).toBe('true');
		expect(stage.getAttribute('data-pagefind-ignore')).toBe('all');
	});

	it('switches to the text list and remembers it', async () => {
		render(Page, { data: data() });
		await fireEvent.click(screen.getByRole('button', { name: 'List' }));
		expect(document.querySelectorAll('.card')).toHaveLength(0);
		expect(document.querySelectorAll('.list li')).toHaveLength(manifestEntries.length);
		expect(localStorage.getItem('ripple-docs-widgets-view')).toBe('list');
		cleanup();

		render(Page, { data: data() });
		await vi.waitFor(() => expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe('true'));
		expect(document.querySelectorAll('.card')).toHaveLength(0);
	});
});
