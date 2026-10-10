// scripts/capture-thumbs.ts — Captures the gallery thumbnails for /showcase
// and /live. Builds the site (vite build; pass --no-build to reuse the last
// one), serves it with `vite preview` on PORT, then for every item in
// src/routes/showcase/gallery.ts opens its capture path in headless Chromium
// (dark theme, reduced motion so cards render finished, 2x DPR), crops the
// item's element plus PAD px of ground to 4:3 from its top, downscales to
// THUMB_W x THUMB_H and encodes WebP in the browser (no image dependency).
// Writes static/thumbs/<id>.webp and static/thumbs/thumbs.json. A missing
// element fails the run, so the committed set is always complete.
//
// Run: bun run thumbs            (all items)
//      bun run thumbs -- quiz    (only these ids; the manifest is still whole)
// Browser: Playwright's own Chromium (install once with
// `bunx playwright install chromium`); without it, the installed Google Chrome.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';
import { galleryItems, THUMB_H, THUMB_W } from '../src/routes/showcase/gallery.ts';

const PORT = 4317;
const BASE = `http://localhost:${PORT}`;
const QUALITY = 0.7;
const PAD = 12;
/** Wider elements keep their left MAX_W CSS px, so text stays legible at card size. */
const MAX_W = 640;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'static/thumbs');

const args = process.argv.slice(2);
const build = !args.includes('--no-build');
const only = new Set(args.filter((a) => !a.startsWith('--')));

function run(cmd: string, argv: string[]) {
	return new Promise<void>((done, fail) => {
		const p = spawn(cmd, argv, { cwd: root, stdio: 'inherit' });
		p.on('exit', (code) => (code === 0 ? done() : fail(new Error(`${cmd} ${argv.join(' ')} exited ${code}`))));
	});
}

async function waitForServer() {
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(BASE)).ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`vite preview never answered on ${BASE}`);
}

/** PNG bytes in, WebP bytes out at THUMB_W x THUMB_H, encoded by Chromium. */
async function toWebp(encoder: Page, png: Buffer): Promise<Buffer> {
	const b64 = await encoder.evaluate(
		async ({ src, w, h, q }) => {
			const img = new Image();
			img.src = src;
			await img.decode();
			const canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext('2d')!;
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(img, 0, 0, w, h);
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: q });
			const bytes = new Uint8Array(await blob.arrayBuffer());
			let s = '';
			for (const b of bytes) s += String.fromCharCode(b);
			return btoa(s);
		},
		{ src: `data:image/png;base64,${png.toString('base64')}`, w: THUMB_W, h: THUMB_H, q: QUALITY }
	);
	return Buffer.from(b64, 'base64');
}

async function main() {
	if (build) await run('bunx', ['vite', 'build']);
	const server = spawn('bunx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
	const exited = new Promise<never>((_, fail) =>
		server.on('exit', (code) => fail(new Error(`vite preview exited ${code} (is port ${PORT} busy?)`)))
	);
	const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
	try {
		await Promise.race([waitForServer(), exited]);
		const context = await browser.newContext({
			viewport: { width: 1280, height: 1400 },
			deviceScaleFactor: 2,
			colorScheme: 'dark',
			reducedMotion: 'reduce'
		});
		await context.addInitScript(() => localStorage.setItem('ripple-theme', 'dark'));
		const page = await context.newPage();
		page.on('pageerror', (err) => console.error(`  page error: ${err.message}`));
		const encoder = await context.newPage();
		await mkdir(outDir, { recursive: true });

		let total = 0;
		for (const item of galleryItems) {
			if (only.size && !only.has(item.id)) continue;
			await page.goto(BASE + item.capture.path, { waitUntil: 'load' });
			const el = page.locator(item.capture.selector).first();
			// One reload if the card is slow to mount (seen once on a cold /live).
			await el.waitFor({ state: 'visible', timeout: 15_000 }).catch(async () => {
				await page.reload({ waitUntil: 'load' });
				await el.waitFor({ state: 'visible', timeout: 15_000 });
			});
			await page.evaluate(() => document.fonts.ready);
			// Park the element under the sticky top bar, then let late layout settle.
			await el.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - 80));
			await page.waitForTimeout(700);
			const box = await el.boundingBox();
			if (!box || box.width < 50) throw new Error(`${item.id}: ${item.capture.selector} has no box on ${item.capture.path}`);
			// A little of the ground around the card, so its edge never touches the frame.
			const width = Math.min(box.width, MAX_W) + 2 * PAD;
			const clip = { x: Math.max(0, box.x - PAD), y: box.y - PAD, width, height: (width * THUMB_H) / THUMB_W };
			const png = await page.screenshot({ clip });
			const webp = await toWebp(encoder, png);
			await writeFile(join(outDir, `${item.id}.webp`), webp);
			total += webp.length;
			console.log(`${item.id.padEnd(24)} ${(webp.length / 1024).toFixed(0).padStart(4)} KB`);
		}

		const manifest = galleryItems.map(({ id, title, caption, group, tag, href }) => ({ id, title, caption, group, tag, href, w: THUMB_W, h: THUMB_H }));
		await writeFile(join(outDir, 'thumbs.json'), JSON.stringify(manifest, null, '\t') + '\n');
		console.log(`wrote ${only.size || galleryItems.length} thumbs, ${(total / 1024).toFixed(0)} KB`);
	} finally {
		await browser.close();
		server.kill();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
