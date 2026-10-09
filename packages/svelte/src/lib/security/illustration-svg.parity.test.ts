// Parity between this check and the Paw Bar server's SVG policy
// (pocketpaw ee/pocketpaw_ee/paw_bar/illustration_svg.py). Both repos carry the
// same fixture; `ok` is the server's verdict. The landing must refuse whatever
// the server refuses and accept whatever it accepts, or a card the server let
// through gets dropped on the page (or the server is the looser layer).
import { describe, expect, it } from 'vitest';
import cases from './__fixtures__/illustration-parity.json';
import { ILLUSTRATION_ELEMENTS } from '@ripple-ui/core/manifest';
import { checkIllustrationSvg, sanitizeIllustrationSvg } from './illustration-svg';

describe('illustration check matches the server verdicts', () => {
	for (const [name, c] of Object.entries(cases as Record<string, { svg: string; ok: boolean }>)) {
		it(name, () => expect(checkIllustrationSvg(c.svg).ok).toBe(c.ok));
	}
});

// A card both checks accept must render whole: the rebuild may not return null
// or drop an id the check let through (that silently breaks url(#id) refs).
describe('every accepted case rebuilds with its ids intact', () => {
	for (const [name, c] of Object.entries(cases as Record<string, { svg: string; ok: boolean }>)) {
		if (!c.ok) continue;
		it(name, () => {
			const out = sanitizeIllustrationSvg(c.svg, document, 'p-');
			expect(out).not.toBeNull();
			// Ids on elements the rebuild keeps (a harmless unknown like <filter> goes, id and all).
			const ids = [...c.svg.matchAll(/<(?:svg:)?(\w+)[^>]*\sid='/g)].filter((m) => ILLUSTRATION_ELEMENTS.has(m[1])).length;
			expect(out!.querySelectorAll('[id]').length).toBe(ids);
		});
	}
});
