// e2e/motion.spec.ts
// @file e2e/motion.spec.ts
// @description The durable REAL-BROWSER smoke-test for the RFC-12 motion
//   primitive on /showcase/motion. Reads COMPUTED styles in a real Chromium —
//   the arbiter that catches the "jsdom green but nothing moves" failure class.
//   Three motions, three assertions:
//     1. Staggered cards — scroll the row into view; a card's computed transform
//        + opacity must animate from the hidden from-state (translateY(28px),
//        opacity 0) toward the shown rest state (no translate, opacity 1).
//     2. Parallax — the parallax card's computed transform (translateY) must
//        CHANGE across scroll positions (it must drift, not sit inert).
//     3. Animate — clicking "Fire animate action" must change a visible target
//        element's computed style (the pulse must actually move pixels).
// @created 2026-05-30 — PR #45 motion runtime close-out (real-browser proof).
// @changes
//   - 2026-05-30 (PR #45 motion degrade-to-visible fix): added assertion 4 — the
//     /showcase/marketing HERO must END VISIBLE (computed opacity ~1, title text
//     visible) after hydration. The hero's enter is a spring preset (`snappy`),
//     which compileMotion routed to Tier 1; if loadAnimate() resolved null or
//     animate() threw, the old Tier-1 enter branch `return`ed and left the node
//     stuck at its from-frame (opacity:0, translateY(24px)) FOREVER — an invisible
//     hero. This assertion is the real-browser tripwire for that regression class.
//
// History note: assertions 2 + 3 were written to FAIL against the pre-fix code
// (parallax inert on the unregistered-custom-property CSS path; animate emitted
// an event carrying target:undefined/motion:undefined and no runtime moved
// anything). Assertion 1 already passed after the wrapper-box fix. Assertion 4
// was written to FAIL against the pre-degrade code (hero stuck at opacity 0).
import { test, expect, type Page } from '@playwright/test';

/** Parse the translateY (px) out of a computed `transform` matrix or 'none'. */
function translateYFromTransform(transform: string): number {
	if (!transform || transform === 'none') return 0;
	// matrix(a, b, c, d, tx, ty)
	const m2d = transform.match(/^matrix\(([^)]+)\)$/);
	if (m2d) {
		const parts = m2d[1].split(',').map((s) => parseFloat(s.trim()));
		return parts[5] ?? 0;
	}
	// matrix3d(...) — ty is the 14th value (index 13).
	const m3d = transform.match(/^matrix3d\(([^)]+)\)$/);
	if (m3d) {
		const parts = m3d[1].split(',').map((s) => parseFloat(s.trim()));
		return parts[13] ?? 0;
	}
	return 0;
}

async function gotoMotion(page: Page) {
	await page.goto('/showcase/motion');
	// Wait until Svelte has hydrated and the motion action has attached to the
	// stagger row (the wrapper carries data-ripple-motion). Without hydration the
	// inline from-state styles are not yet present.
	await page.waitForSelector('#stagger [data-ripple-motion]');
}

/** The hero's title text — a stable selector that does not depend on motion. */
const HERO_TITLE = 'Power your home with the sun by next season';

async function gotoMarketing(page: Page) {
	await page.goto('/showcase/marketing');
	// Wait until Svelte has hydrated — the hero is wrapped by withMotion, so the
	// wrapper carries data-ripple-motion once the action attaches.
	await page.waitForSelector('[data-ripple-motion]');
}

test.describe('motion primitive — real Chromium', () => {
	// ── 1. Staggered fade-up on scroll ───────────────────────────────────────
	test('staggered cards animate from hidden (translateY+opacity) to shown on scroll', async ({ page }) => {
		await gotoMotion(page);
		const firstCard = page.locator('#stagger [data-ripple-motion]').first();

		// Before the row enters the viewport, the card sits in its inView FROM
		// frame: translateY(28px) + opacity 0. (The page is tall; the row is
		// below the fold on load only if the viewport is short — assert the
		// armed-then-revealed DELTA rather than the absolute start, which is the
		// robust signal that it animated.)
		await firstCard.scrollIntoViewIfNeeded();

		// After intersect + the CSS transition settles, opacity is 1 and the
		// translateY has returned to ~0 (rest).
		await expect
			.poll(async () => {
				const s = await firstCard.evaluate((el) => {
					const c = getComputedStyle(el);
					return { opacity: parseFloat(c.opacity), ty: c.transform };
				});
				return s.opacity;
			}, { timeout: 4000 })
			.toBeGreaterThan(0.9);

		const ty = await firstCard.evaluate((el) => getComputedStyle(el).transform);
		expect(Math.abs(translateYFromTransform(ty))).toBeLessThan(2); // settled at rest
	});

	// ── 2. Parallax drift ─────────────────────────────────────────────────────
	test('parallax card transform (translateY) CHANGES across scroll positions', async ({ page }) => {
		await gotoMotion(page);
		const parallax = page.locator('#parallax [data-ripple-motion]').first();
		await expect(parallax).toBeVisible();

		const readTranslateY = async () => {
			const transform = await parallax.evaluate((el) => getComputedStyle(el).transform);
			return translateYFromTransform(transform);
		};

		// Sample the transform at several scroll positions as the parallax card
		// travels through the viewport. A working parallax drifts; an inert one
		// reports the same translateY at every position.
		const samples: number[] = [];
		for (const y of [0, 400, 900, 1500, 2200]) {
			await page.evaluate((top) => window.scrollTo(0, top), y);
			// Let a rAF (fallback) or a compositor tick (CSS) settle.
			await page.waitForTimeout(120);
			samples.push(await readTranslateY());
		}

		const spread = Math.max(...samples) - Math.min(...samples);
		// The parallax distance is 50px → from +50 to -50, a 100px span. Even
		// partial travel through the viewport must move it well past inert.
		expect(spread, `parallax translateY samples: ${JSON.stringify(samples)}`).toBeGreaterThan(10);
	});

	// ── 3. Animate action ──────────────────────────────────────────────────────
	test('clicking "Fire animate action" visibly changes the target element style', async ({ page }) => {
		await gotoMotion(page);

		const button = page.getByRole('button', { name: /fire animate action/i });
		await button.scrollIntoViewIfNeeded();
		await expect(button).toBeVisible();

		// The animate target carries a known id (authored in the showcase spec).
		const target = page.locator('#animate-target');
		await expect(target).toBeVisible();

		const before = await target.evaluate((el) => {
			const c = getComputedStyle(el);
			return { transform: c.transform, opacity: c.opacity };
		});

		await button.click();

		// The pulse must move pixels: poll until the computed transform differs
		// from the resting frame at some point during the animation.
		await expect
			.poll(
				async () => {
					const now = await target.evaluate((el) => getComputedStyle(el).transform);
					return now !== before.transform ? 'changed' : 'same';
				},
				{ timeout: 3000, intervals: [50, 50, 50, 100, 100, 200] },
			)
			.toBe('changed');
	});
});

// ── 4. Hero degrades to VISIBLE, never invisible ─────────────────────────────
// The /showcase/marketing hero declares `enter: { opacity: 0, y: 24 }` with the
// `snappy` SPRING preset, so compileMotion routes the enter to Tier 1. SSR paints
// the resting (visible) frame; on hydrate the action arms the from-frame
// (opacity:0, translateY(24px)) then must reveal back to rest. The bug: if the
// Tier-1 engine failed to load / the animate call threw, the old code left the
// node stuck at opacity 0 FOREVER — an invisible hero. The guarantee under test:
// an entered element ALWAYS ends visible regardless of the engine.
test.describe('marketing hero — degrades to visible, never hidden', () => {
	test('hero ends opacity ~1 (visible) and its title is shown after hydration', async ({ page }) => {
		await gotoMarketing(page);

		// The hero is wrapped by withMotion; the wrapper box carries the inline
		// opacity/transform. The title <h1> lives inside it.
		const heroWrapper = page
			.locator('[data-ripple-motion]')
			.filter({ hasText: HERO_TITLE })
			.first();
		await expect(heroWrapper).toBeVisible();

		// After hydration + the entrance settles, the wrapper's computed opacity
		// must be ~1. A stuck hero (engine missing / animate failed) reports 0.
		await expect
			.poll(
				async () => {
					return heroWrapper.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
				},
				{ timeout: 4000, intervals: [50, 100, 100, 200, 300] },
			)
			.toBeGreaterThan(0.9);

		// And it must have animated HOME — translateY back to ~0 (no residual
		// rise). POLL this rather than read it once: the spring-like CSS easing can
		// still be settling (or briefly overshooting) when opacity crosses 0.9, so
		// a single read races the transition. The invariant is the SETTLED value.
		await expect
			.poll(
				async () => {
					const t = await heroWrapper.evaluate((el) => getComputedStyle(el).transform);
					return Math.abs(translateYFromTransform(t));
				},
				{ timeout: 4000, intervals: [50, 100, 100, 200, 300] },
			)
			.toBeLessThan(2);

		// The title text itself must be visible to a user (Playwright's visibility
		// check folds in opacity:0 / zero-size — a redundant, user-facing tripwire).
		await expect(page.getByText(HERO_TITLE)).toBeVisible();
	});
});
