// lib/site/specFromUrl.test.ts — The playground's ?spec= / ?s= decoder: good
// links load, bad ones give an error string, oversize ones never get decoded.

import { expect, test } from 'vitest';
import { SPEC_URL_MAX, specFromUrl } from './specFromUrl.js';

const spec = { version: '1.0', ui: { type: 'text', props: { text: 'Héllo, {state.n}' } } };
const b64url = (s: string) =>
	btoa(String.fromCharCode(...new TextEncoder().encode(s)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

test('no param: null, so the playground keeps its example', () => {
	expect(specFromUrl('')).toBeNull();
	expect(specFromUrl('?x=1')).toBeNull();
});

test('?spec= takes url-encoded JSON and pretty-prints it', () => {
	const r = specFromUrl(`?spec=${encodeURIComponent(JSON.stringify(spec))}`);
	expect(r).toEqual({ text: JSON.stringify(spec, null, 2) });
});

test('?s= takes unpadded base64url, UTF-8 included', () => {
	expect(specFromUrl(`?s=${b64url(JSON.stringify(spec))}`)).toEqual({ text: JSON.stringify(spec, null, 2) });
});

test('?spec= wins over ?s=', () => {
	const other = { ui: { type: 'button' } };
	const r = specFromUrl(`?s=${b64url(JSON.stringify(other))}&spec=${encodeURIComponent(JSON.stringify(spec))}`);
	expect(r).toEqual({ text: JSON.stringify(spec, null, 2) });
});

test.each([
	['empty', '?spec=', /empty/],
	['broken JSON', '?spec=%7B%22ui%22', /not valid JSON/],
	['not base64url', '?s=***', /base64url/],
	['bytes that are not UTF-8', `?s=${btoa('\xff\xfe')}`, /base64url/],
	['an array', `?spec=${encodeURIComponent('[1]')}`, /not a Ripple spec/],
	['an object without ui', `?spec=${encodeURIComponent('{"state":{}}')}`, /not a Ripple spec/],
	['a string', `?spec=${encodeURIComponent('"hi"')}`, /not a Ripple spec/]
])('%s gives an error', (_, search, message) => {
	const r = specFromUrl(search);
	expect(r && 'error' in r ? r.error : '').toMatch(message);
});

test('an oversize value is refused before it is decoded', () => {
	const big = 'A'.repeat(SPEC_URL_MAX + 1);
	expect(specFromUrl(`?s=${big}`)).toEqual({ error: expect.stringMatching(/over 64 KB/) });
	expect(specFromUrl(`?spec=${big}`)).toEqual({ error: expect.stringMatching(/over 64 KB/) });
});
