// e2e/ai-widgets.smoke.spec.ts
// @file e2e/ai-widgets.smoke.spec.ts
// @description Created 2026-06-28. Real-browser smoke for the AI-native widget
//   tier on /showcase/ai — the live counterpart to the jsdom ai.test.ts unit
//   suite. jsdom has repeatedly stayed green while the rendered page stayed
//   broken (no layout, no real click-driven reactivity through the dispatcher),
//   so this drives a real Chromium against the production build + `vite preview`
//   harness (playwright.config.ts) and asserts on the actual rendered DOM the
//   showcase produces. Four checks, one per widget concern:
//     1. The page loads and all 4 widgets render (root classes + visible labels).
//     2. ToolCall — the error card is auto-expanded (its error text is visible),
//        and a success card's disclosure toggles aria-expanded on click.
//     3. ApprovalGate — clicking Approve flips a pending card to the resolved
//        "Approved" stamp; clicking Deny on another flips it to "Denied".
//     4. StreamText — a streaming instance shows the caret + aria-busy.
//   The showcase specs do NOT set node ids (ensureIds is off), so the widgets do
//   not carry data-ripple-node on this page — selection by the stable widget root
//   classes + visible text is the robust live signal. The data-ripple-node stamp
//   itself is asserted precisely in the jsdom unit suite (ai.test.ts).
import { test, expect } from '@playwright/test';

test.describe('AI-native widgets — real Chromium smoke (/showcase/ai)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/showcase/ai');
		// Wait for hydration: the first widget root is rendered by Ripple/NodeRenderer
		// only after the client module graph mounts.
		await page.waitForSelector('.ripple-stream-text');
	});

	// ── 1. Page loads, all four widget kinds render ──────────────────────────────
	test('the page loads and all four AI widgets render', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'AI-native display tier' })).toBeVisible();

		// Each widget kind surfaces its stable root class. The showcase renders
		// multiple instances per kind, so assert "at least one" via count > 0.
		const roots = {
			'stream-text': '.ripple-stream-text',
			'tool-call': '.ripple-tool-call',
			'reasoning-trace': '.ripple-reasoning-trace',
			'approval-gate': '.ripple-approval-gate',
		} as const;

		for (const [kind, selector] of Object.entries(roots)) {
			const count = await page.locator(selector).count();
			expect(count, `${kind} should render at least one instance`).toBeGreaterThan(0);
		}

		// A representative visible label per kind proves real content, not an empty box.
		await expect(page.getByText('plan_request')).toBeVisible(); // tool-call name
		await expect(page.getByText(/Reasoned for 3 steps/)).toBeVisible(); // reasoning summary
		await expect(page.getByText('Tag 12 leads as "warm"')).toBeVisible(); // approval-gate title
	});

	// ── 2. ToolCall — error auto-expands; success disclosure toggles ────────────
	test('ToolCall: error card auto-expands its error; success card toggles aria-expanded', async ({
		page,
	}) => {
		// The showcase's fourth tool-call is status="error" (write_file → EACCES).
		// Auto-expand means its error message is already in the DOM and visible.
		await expect(page.getByText(/EACCES: permission denied/)).toBeVisible();

		// The error card's disclosure button reports aria-expanded="true".
		const errorCard = page.locator('.ripple-tool-call', { hasText: 'write_file' });
		await expect(errorCard.locator('button[aria-expanded]')).toHaveAttribute(
			'aria-expanded',
			'true',
		);

		// The success card (read_file) is collapsed by default → aria-expanded="false".
		// Clicking its disclosure flips it to "true" and reveals the args block.
		const successCard = page.locator('.ripple-tool-call', { hasText: 'read_file' });
		const successToggle = successCard.locator('button[aria-expanded]');
		await expect(successToggle).toHaveAttribute('aria-expanded', 'false');
		await successToggle.click();
		await expect(successToggle).toHaveAttribute('aria-expanded', 'true');
		await expect(successCard.getByText('Arguments')).toBeVisible();
	});

	// ── 3. ApprovalGate — Approve → "Approved", Deny → "Denied" ─────────────────
	test('ApprovalGate: Approve flips to the Approved stamp; Deny flips another to Denied', async ({
		page,
	}) => {
		// First risk-level gate is pending ("Tag 12 leads as warm"). Approve it.
		const approveGate = page.locator('.ripple-approval-gate', { hasText: 'Tag 12 leads as "warm"' });
		await expect(approveGate).toHaveAttribute('data-decision', 'pending');
		await approveGate.getByRole('button', { name: 'Approve' }).click();
		await expect(approveGate).toHaveAttribute('data-decision', 'approved');
		// `exact: true` targets the visible stamp ("Approved"), not the sr-only
		// aria-live region ("You approved this action.").
		await expect(approveGate.getByText('Approved', { exact: true })).toBeVisible();
		// Controls are replaced by the stamp — no Approve button left on this card.
		await expect(approveGate.getByRole('button', { name: 'Approve' })).toHaveCount(0);

		// A different pending gate (the high-risk delete). Deny it.
		const denyGate = page.locator('.ripple-approval-gate', {
			hasText: 'Delete 3 inactive workspaces',
		});
		await expect(denyGate).toHaveAttribute('data-decision', 'pending');
		await denyGate.getByRole('button', { name: 'Deny' }).click();
		await expect(denyGate).toHaveAttribute('data-decision', 'denied');
		// `exact: true` targets the visible stamp, not the sr-only aria-live region.
		await expect(denyGate.getByText('Denied', { exact: true })).toBeVisible();
	});

	// ── 4. StreamText — a streaming instance shows the caret + aria-busy ─────────
	test('StreamText: a streaming instance shows the caret and aria-busy', async ({ page }) => {
		// The first stream-text is streaming (no `done`), so it must carry the caret
		// and report aria-busy="true".
		const streaming = page
			.locator('.ripple-stream-text', { hasText: 'the caret keeps blinking' })
			.first();
		await expect(streaming).toBeVisible();
		await expect(streaming).toHaveAttribute('aria-busy', 'true');
		await expect(streaming.locator('.ripple-stream-caret')).toBeVisible();

		// The second instance finished (streaming + done) → no caret, aria-busy false.
		const done = page.locator('.ripple-stream-text', { hasText: 'This message finished streaming' });
		await expect(done).toHaveAttribute('aria-busy', 'false');
		await expect(done.locator('.ripple-stream-caret')).toHaveCount(0);
	});
});
