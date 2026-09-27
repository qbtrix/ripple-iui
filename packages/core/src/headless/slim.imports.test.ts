/**
 * @file slim.imports.test.ts
 * @description Keeps `@ripple-ui/core/headless/slim` slim by construction.
 *
 * The entry is worth having only while it leaves the full dispatcher and the
 * zod schema out of a host's bundle. One convenience import (a constant from
 * `event-dispatcher.ts`, a runtime value from `schema/`) would bring them back
 * and every behaviour test would stay green. So this walks the real import
 * graph from `slim.ts`, counting only imports that survive compilation
 * (`import type` / `export type` are erased), and asserts neither is reached.
 *
 * @changes
 *   - 2026-09-27: created with the slim entry.
 *   - 2026-09-27: also walks `@ripple-ui/core/manifest`, which a slim host
 *     loads to build its manifest and must be just as free of both.
 */

import { describe, it, expect } from 'vitest';

const SOURCES = import.meta.glob('../**/*.ts', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const ENTRY = './slim.ts';

// Runtime imports only: `import type` / `export type` are dropped by the
// compiler, so they cannot pull a module into a bundle. `[^;]*?` keeps
// multi-line import lists visible.
const IMPORT_RE =
	/(?:^|\n)\s*(import|export)(\s+type)?\b([^;]*?)from\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;

function runtimeSpecifiers(source: string): string[] {
	const out: string[] = [];
	IMPORT_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = IMPORT_RE.exec(source)) !== null) {
		if (m[5]) {
			out.push(m[5]);
			continue;
		}
		if (m[2]) continue; // `import type` / `export type`
		// `import { type A, type B } from` is erased too when every name is a type.
		const names = (m[3] ?? '').replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
		if (names.length > 0 && names.every((n) => n.startsWith('type '))) continue;
		out.push(m[4]);
	}
	return out;
}

function normalize(path: string): string {
	const parts: string[] = [];
	for (const part of path.split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') parts.pop();
		else parts.push(part);
	}
	return parts.join('/');
}

function resolveLocal(fromKey: string, spec: string): string | null {
	const dir = fromKey.slice(0, fromKey.lastIndexOf('/'));
	const joined = normalize(`${dir}/${spec}`).replace(/\.js$/, '.ts');
	// Keys are relative to this directory (`./x.ts`) or its parent (`../core/x.ts`).
	for (const key of [`./${joined}`, `../${joined.replace(/^headless\//, '')}`]) {
		if (key in SOURCES) return key;
	}
	for (const key of Object.keys(SOURCES)) {
		if (normalize(key.replace(/^\.\.\//, 'x/../')) === joined) return key;
	}
	return null;
}

function crawl(entry: string = ENTRY): Set<string> {
	const seen = new Set<string>();
	const queue = [entry];
	while (queue.length > 0) {
		const key = queue.pop()!;
		if (seen.has(key)) continue;
		const source = SOURCES[key];
		if (source === undefined) continue;
		seen.add(key);
		for (const spec of runtimeSpecifiers(source)) {
			if (!spec.startsWith('.')) continue;
			const local = resolveLocal(key, spec);
			if (local) queue.push(local);
		}
	}
	return seen;
}

describe('@ripple-ui/core/headless/slim imports', () => {
	const reached = crawl();

	it('actually walks the slim runtime, so the checks below mean something', () => {
		expect([...reached]).toEqual(
			expect.arrayContaining(['./slim.ts', './runtime-base.ts', './resolve-tree.ts', '../core/base-dispatcher.ts'])
		);
	});

	it('never reaches the full event dispatcher', () => {
		expect([...reached].filter((k) => k.endsWith('/event-dispatcher.ts'))).toEqual([]);
	});

	it('never reaches the schema modules, which run zod at import time', () => {
		expect([...reached].filter((k) => k.includes('/schema/'))).toEqual([]);
	});

	it('keeps the manifest entry free of the full dispatcher and the schema too', () => {
		const manifest = [...crawl('../manifest/index.ts')];
		expect(manifest).toEqual(expect.arrayContaining(['../manifest/index.ts', '../manifest/slim.ts', '../manifest/actions.ts']));
		expect(manifest.filter((k) => k.endsWith('/event-dispatcher.ts') || k.includes('/schema/'))).toEqual([]);
	});

	it('does count a value import, so an erased type import is the only exemption', () => {
		expect(runtimeSpecifiers("import { EventDispatcher } from '../core/event-dispatcher.js';")).toEqual([
			'../core/event-dispatcher.js'
		]);
		expect(runtimeSpecifiers("import type { UINode } from '../schema/ui-spec.js';")).toEqual([]);
		expect(runtimeSpecifiers("import { type A, type B } from './x.js';")).toEqual([]);
	});
});
