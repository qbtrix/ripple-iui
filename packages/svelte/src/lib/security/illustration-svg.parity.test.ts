// Parity between this check and the Paw Bar server's SVG policy
// (pocketpaw ee/pocketpaw_ee/paw_bar/illustration_svg.py). Both repos carry the
// same fixture; `ok` is the server's verdict. The landing must refuse whatever
// the server refuses and accept whatever it accepts, or a card the server let
// through gets dropped on the page (or the server is the looser layer).
import { describe, expect, it } from 'vitest';
import cases from './__fixtures__/illustration-parity.json';
import { checkIllustrationSvg } from './illustration-svg';

describe('illustration check matches the server verdicts', () => {
	for (const [name, c] of Object.entries(cases as Record<string, { svg: string; ok: boolean }>)) {
		it(name, () => expect(checkIllustrationSvg(c.svg).ok).toBe(c.ok));
	}
});
