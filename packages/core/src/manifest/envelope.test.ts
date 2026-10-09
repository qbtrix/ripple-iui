// envelope.test.ts — the spec envelope teaches `ui` before `state`.
// Models copy the envelope example's key order, and a streamed spec cannot
// paint until `ui` arrives, so an example that leads with `state` makes every
// streamed spec wait out the whole state block before its first frame. Both
// manifests (full and slim) hand out this same `specEnvelope` object, so
// pinning it here covers manifest.json and manifest.slim.json.

import { describe, expect, it } from 'vitest';
import { specEnvelope } from './envelope.js';
import { buildSlimManifest } from './slim.js';
import { SLIM_WIDGETS } from './slim-widgets.js';

describe('spec envelope key order', () => {
	it('the example lists `ui` before `state`', () => {
		const keys = Object.keys(specEnvelope.example);
		expect(keys).toContain('ui');
		expect(keys).toContain('state');
		expect(keys.indexOf('ui')).toBeLessThan(keys.indexOf('state'));
	});

	it('the serialized slim manifest example has `ui` before `state`', () => {
		const json = JSON.stringify(buildSlimManifest({ widgets: SLIM_WIDGETS }).spec.example);
		expect(json.indexOf('"ui"')).toBeGreaterThan(-1);
		expect(json.indexOf('"ui"')).toBeLessThan(json.indexOf('"state"'));
	});

	// Deliberately loose: any sentence telling the model to put `ui` first
	// (or before `state`) passes. Pins that the guidance exists, not its wording.
	it('the description tells the model to emit `ui` first', () => {
		expect(specEnvelope.description).toMatch(/`ui`[^.]*\b(first|before)\b/i);
	});
});

// Same looseness: these pin that the spec-size guidance exists and names the
// real mechanisms (`each`, `sources`, `api`), not its exact wording.
describe('spec envelope size guidance', () => {
	const d = specEnvelope.description;

	it('tells the model to omit props that equal their default', () => {
		expect(d).toMatch(/\bprops?\b[^.]*\bdefault\b/i);
	});

	it('tells the model to render repeated rows with one `each` over state', () => {
		expect(d).toMatch(/`each`/);
		expect(d).toMatch(/\{state\.\w+\}/);
	});

	it('tells the model to fetch bulk data through the host, naming `sources` and `api`', () => {
		expect(d).toMatch(/bulk data[^.]*`sources`[^.]*`api`/i);
	});

	it('the slim manifest carries the same guidance', () => {
		expect(buildSlimManifest({ widgets: SLIM_WIDGETS }).spec.description).toBe(d);
	});
});
