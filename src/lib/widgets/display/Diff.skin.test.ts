// @file widgets/display/Diff.skin.test.ts
// @description NEW (2026-09-17, beautiful-ui re-skin, skin-diff). What the
//   re-skinned Diff renders on top of the row model diff-rows.test.ts pins: the
//   header stat, the sign column that carries add/remove without colour, the
//   word tint landing on the changed words only, and split rows that stay level.
//   The widget loads `diff` lazily, so every assertion waits for the rows.
// UPDATED 2026-09-17: waits get a 5s ceiling instead of waitFor's 1s default.
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import Diff from './Diff.svelte';

// The widget imports `diff` lazily; CI runs slower than a laptop.
const WAIT = { timeout: 5000 };

const before = 'const a = 1;\nconst temp = "-14C";\nlog(a);\n';
const after = 'const a = 1;\nconst temp = "-16C";\nlog(a);\nreturn a;\n';

describe('Diff — re-skin', () => {
  it('shows the +N −N stat in the header', async () => {
    const { container } = render(Diff, { props: { before, after, title: 'churn.ts' } });
    await waitFor(() => expect(container.textContent).toContain('+2'), WAIT);
    expect(container.textContent).toContain('−1');
    expect(container.textContent).toContain('churn.ts');
  });

  it('signs every changed line, so add and remove never rest on colour alone', async () => {
    const { container } = render(Diff, { props: { before, after, showLineNumbers: false } });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(5), WAIT);
    const signs = [...container.querySelectorAll('code')].map((c) => c.previousElementSibling?.textContent);
    expect(signs).toEqual(['', '−', '+', '', '+']);
  });

  it('tints only the words a rewritten line changed', async () => {
    const { container } = render(Diff, { props: { before, after } });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(5), WAIT);
    const tinted = [...container.querySelectorAll('code span[class*="/18"]')].map((s) => s.textContent);
    expect(tinted).toEqual(['14C', '16C']);
  });

  it('keeps split sides on one grid row per line', async () => {
    const { container } = render(Diff, { props: { before, after, layout: 'split' } });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(8), WAIT);
    // context, rewrite pair, context, lone addition → four rows of two halves.
    expect(container.querySelectorAll('.grid-cols-2')).toHaveLength(4);
  });
});
