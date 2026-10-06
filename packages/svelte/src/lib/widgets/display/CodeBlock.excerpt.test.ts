// CodeBlock.excerpt.test.ts — the excerpt props: `startLine` numbers rows from a real file line
// (widening the gutter only past two digits) and `highlight` tints an inclusive line range in
// `highlightTone`. Without them the rows must render exactly as before: ToolCall depends on it.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CodeBlock from './CodeBlock.svelte';

const rows = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>('code')).map((c) => c.parentElement!);
const numbers = (root: ParentNode) => rows(root).map((r) => r.querySelector('.select-none')?.textContent);

describe('CodeBlock excerpt props', () => {
  it('leaves the default rows untouched', () => {
    const { container } = render(CodeBlock, { props: { code: 'a\nb\nc' } });
    for (const row of rows(container)) {
      expect(row.className).toContain('grid-cols-[20px_minmax(0,1fr)]');
      expect(row.getAttribute('style')).toBeNull();
      expect(row.hasAttribute('data-highlight')).toBe(false);
    }
    expect(numbers(container)).toEqual(['1', '2', '3']);
  });

  it('numbers from startLine and widens the gutter for three digits', () => {
    const code = Array.from({ length: 13 }, (_, i) => `line ${i}`).join('\n');
    const { container } = render(CodeBlock, { props: { code, startLine: 185 } });
    expect(numbers(container)).toEqual(Array.from({ length: 13 }, (_, i) => String(185 + i)));
    expect(rows(container)[0].getAttribute('style')).toContain('grid-template-columns: 27px minmax(0, 1fr)');
  });

  it('tints exactly the highlighted range in its tone', () => {
    const code = Array.from({ length: 13 }, (_, i) => `line ${i}`).join('\n');
    const { container } = render(CodeBlock, {
      props: { code, startLine: 185, highlight: [192, 197], highlightTone: 'removed' }
    });
    const tinted = rows(container)
      .filter((r) => r.getAttribute('data-highlight') === 'removed')
      .map((r) => r.querySelector('.select-none')?.textContent);
    expect(tinted).toEqual(['192', '193', '194', '195', '196', '197']);
    expect(rows(container)[7].className).toContain('bg-ripple-error/10');
  });
});
