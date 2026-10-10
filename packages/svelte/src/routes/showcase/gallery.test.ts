// routes/showcase/gallery.test.ts — Holds the gallery registry to the files it
// points at: every /showcase item has a route, every /live item a run, every
// id a committed thumb, and static/thumbs/thumbs.json lists the same ids (run
// `bun run thumbs` after adding an item). Files are listed with Vite globs.
import { expect, test } from 'vitest';
import { galleryItems, liveItems, liveRuns, showcaseItems, SHOWCASE_GROUPS } from './gallery.js';
import manifest from '../../../static/thumbs/thumbs.json';

const pages = Object.keys(import.meta.glob('/src/routes/showcase/*/+page.svelte'));
const thumbs = Object.keys(import.meta.glob('/static/thumbs/*.webp', { query: '?url' }));

test('ids are unique across /showcase and /live', () => {
	const ids = galleryItems.map((i) => i.id);
	expect(new Set(ids).size).toBe(ids.length);
});

test('every showcase item has its page and a known group', () => {
	for (const i of showcaseItems) {
		expect(pages, i.id).toContain(`/src/routes/showcase/${i.id}/+page.svelte`);
		expect(SHOWCASE_GROUPS as readonly string[]).toContain(i.group);
	}
});

test('every live item is one run', () => {
	expect(liveItems.map((i) => i.href)).toEqual(liveRuns.map((s) => `/live?s=${s.id}`));
});

test('every item has a committed thumb, and thumbs.json matches the registry', () => {
	for (const i of galleryItems) expect(thumbs, i.id).toContain(`/static/thumbs/${i.id}.webp`);
	expect(manifest.map((m) => m.id)).toEqual(galleryItems.map((i) => i.id));
});
