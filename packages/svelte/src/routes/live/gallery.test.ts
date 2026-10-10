// routes/live/gallery.test.ts — Holds the gallery registry to the files it
// points at: every widget demo has its component in ./demos, every run is one
// replay, every `?s=` key opens exactly one item, every id has a committed thumb
// and static/thumbs/thumbs.json lists the same ids in grid order (run `bun run
// thumbs` after adding an item), and no thumb is left over. Every old
// /showcase URL redirects to the item it used to show. Files are listed with
// Vite globs.
import { expect, test } from 'vitest';
import { demoItems, galleryItems, GROUPS, itemByKey, liveItems, liveRuns } from './gallery.js';
import { load } from '../showcase/[...path]/+page.js';
import manifest from '../../../static/thumbs/thumbs.json';

const demos = Object.keys(import.meta.glob('/src/routes/live/demos/*.svelte'));
const thumbs = Object.keys(import.meta.glob('/static/thumbs/*.webp', { query: '?url' }));
const redirect = (path: string) => load({ params: { path } }).to;

test('ids and keys are unique, and every item is in the grid once', () => {
	const ids = galleryItems.map((i) => i.id);
	expect(new Set(ids).size).toBe(ids.length);
	expect(new Set(galleryItems.map((i) => i.key)).size).toBe(ids.length);
	expect(galleryItems.length).toBe(demoItems.length + liveItems.length);
	for (const i of galleryItems) expect(GROUPS as readonly string[], i.id).toContain(i.group);
});

test('every demo has its component and opens in place on /live', () => {
	for (const i of demoItems) {
		expect(demos, i.id).toContain(`/src/routes/live/demos/${i.id}.svelte`);
		expect(i.href).toBe(`/live?s=demo-${i.id}`);
		expect(itemByKey(i.key)).toBe(i);
	}
});

test('every live item is one run', () => {
	expect(liveItems.map((i) => i.href)).toEqual(liveRuns.map((s) => `/live?s=${s.id}`));
	for (const i of liveItems) expect(itemByKey(i.key)?.kind).toBe('run');
});

test('every item has a committed thumb, thumbs.json matches the grid, and no thumb is orphaned', () => {
	for (const i of galleryItems) expect(thumbs, i.id).toContain(`/static/thumbs/${i.id}.webp`);
	expect(manifest.map((m) => m.id)).toEqual(galleryItems.map((i) => i.id));
	expect(thumbs.length).toBe(galleryItems.length);
});

test('old /showcase URLs redirect to /live, its items, or /ds', () => {
	expect(redirect('')).toBe('/live');
	for (const i of demoItems) expect(redirect(i.id)).toBe(`/live?s=demo-${i.id}`);
	expect(redirect('motion')).toBe('/ds/motion');
	expect(() => redirect('nope')).toThrow();
});
