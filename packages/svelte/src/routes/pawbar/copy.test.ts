// routes/pawbar/copy.test.ts — The landing's visible copy has no em/en dashes and never claims a live model.
// Greps the landing route and the chat's components and strings with comments
// stripped (headers here legitimately use dashes; visitors never see them).
// A test file is skipped. Scenario titles feed the chips, so scenarios.ts is in.

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

const routes = resolve(__dirname, '..');
const files = [
	join(routes, '+page.svelte'),
	join(routes, 'live/scenarios.ts'),
	...readdirSync(__dirname)
		.filter((f) => /\.(svelte|ts)$/.test(f) && !f.includes('.test.'))
		.map((f) => join(__dirname, f))
];

const visible = (src: string) =>
	src
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|\s)\/\/.*$/gm, '$1');

test.each(files)('%s has no dashes or "live model" in its strings', (file) => {
	const text = visible(readFileSync(file, 'utf8'));
	expect(text.match(/.*[\u2013\u2014].*/g) ?? []).toEqual([]);
	expect(text.match(/.*live model.*/gi) ?? []).toEqual([]);
});
