// @file widgets/display/Diff.skin.test.ts
// @description What Diff renders on top of the row model diff-rows.test.ts pins:
//   the header stat, the sign column that carries add/remove without colour, the
//   word tint landing on the changed words only, split rows that stay level, and
//   an excerpt numbered from its real file lines. The widget loads `diff`
//   lazily, so every assertion waits for the rows (5s ceiling, not waitFor's 1s).
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

  it('numbers a unified excerpt from oldStart/newStart and fits the gutter to it', async () => {
    const { container } = render(Diff, { props: { before, after, oldStart: 192, newStart: 192 } });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(5), WAIT);
    const codes = [...container.querySelectorAll('code')];
    const nums = codes.map((c) => c.previousElementSibling?.previousElementSibling?.textContent);
    expect(nums).toEqual(['192', '193', '193', '194', '195']);
    // Three digits fit 21px; the default render keeps 20px.
    expect(codes[0].parentElement!.getAttribute('style')).toContain('grid-template-columns: 21px 16px');
  });

  it('numbers from 1 by default', async () => {
    const { container } = render(Diff, { props: { before, after } });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(5), WAIT);
    const codes = [...container.querySelectorAll('code')];
    expect(codes.map((c) => c.previousElementSibling?.previousElementSibling?.textContent)).toEqual([
      '1', '2', '2', '3', '4',
    ]);
    expect(codes[0].parentElement!.getAttribute('style')).toContain('grid-template-columns: 20px 16px');
  });

  it('numbers each side of a split excerpt from its own start', async () => {
    const { container } = render(Diff, {
      props: { before, after, layout: 'split', oldStart: 192, newStart: 200 }
    });
    await waitFor(() => expect(container.querySelectorAll('code')).toHaveLength(8), WAIT);
    const [left, right] = [...container.querySelectorAll('.grid-cols-2')][1].children;
    expect(left.querySelector('.tabular-nums')?.textContent).toBe('193');
    expect(right.querySelector('.tabular-nums')?.textContent).toBe('201');
  });
});
