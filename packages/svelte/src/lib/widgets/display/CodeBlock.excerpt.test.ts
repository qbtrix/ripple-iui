// CodeBlock.excerpt.test.ts — the excerpt and panel props: `startLine` numbers rows from a real
// file line (the gutter fits the numbers; from line 1 it stays 20px), `highlight` tints a line range
// in `highlightTone`, `title` names the file in the header and `compact` tightens the block.
// Without them the block must render exactly as before: ToolCall depends on it.
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

  it('keeps the 20px gutter from line 1 however long the block is', () => {
    // ToolCall renders long JSON results with default props; they must not shift.
    const code = Array.from({ length: 120 }, (_, i) => `"k${i}": ${i},`).join('\n');
    const { container } = render(CodeBlock, { props: { code, language: 'json' } });
    expect(numbers(container).at(-1)).toBe('120');
    for (const row of rows(container)) {
      expect(row.className).toContain('grid-cols-[20px_minmax(0,1fr)]');
      expect(row.getAttribute('style')).toBeNull();
    }
    const rule = container.querySelector<HTMLElement>('.w-px')!;
    expect(rule.className).toContain('left-5');
    expect(rule.getAttribute('style')).toBeNull();
  });

  it('numbers from startLine and fits the gutter to three digits', () => {
    const code = Array.from({ length: 13 }, (_, i) => `line ${i}`).join('\n');
    const { container } = render(CodeBlock, { props: { code, startLine: 185 } });
    expect(numbers(container)).toEqual(Array.from({ length: 13 }, (_, i) => String(185 + i)));
    expect(rows(container)[0].getAttribute('style')).toContain('grid-template-columns: 21px minmax(0, 1fr)');
    expect(container.querySelector('.w-px')!.getAttribute('style')).toContain('left: 21px');
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

const header = (root: ParentNode) => root.querySelector<HTMLElement>('.border-b');
const body = (root: ParentNode) => rows(root)[0].parentElement!;

describe('CodeBlock title and compact', () => {
  it('keeps the default header and body when neither is set', () => {
    const { container } = render(CodeBlock, { props: { code: 'a', language: 'ts' } });
    expect(header(container)!.className).toBe(
      'flex h-9 items-center gap-2 border-b border-ripple-border px-4 text-[12.5px]'
    );
    expect(body(container).className).toBe(
      'relative py-3 font-mono text-[12.5px] leading-[1.65] text-ripple-muted-foreground'
    );
    expect(header(container)!.querySelectorAll('.font-mono')).toHaveLength(1);
    expect(header(container)!.textContent).toContain('ts');
  });

  it('puts the file name in the header with the language beside it', () => {
    const { container } = render(CodeBlock, {
      props: { code: 'a', language: 'svelte', title: 'PhotoInspector.svelte' }
    });
    const labels = [...header(container)!.querySelectorAll('.font-mono')].map((el) => el.textContent);
    expect(labels).toEqual(['PhotoInspector.svelte', 'svelte']);
  });

  it('shows the title alone under hideLanguage, and keeps a header with no copy button', () => {
    const { container } = render(CodeBlock, {
      props: { code: 'a', language: 'svelte', hideLanguage: true, hideCopy: true, title: 'a.ts' }
    });
    const labels = [...header(container)!.querySelectorAll('.font-mono')].map((el) => el.textContent);
    expect(labels).toEqual(['a.ts']);
    expect(container.querySelector('button')).toBeNull();
  });

  it('tightens the header, padding and leading when compact', () => {
    const { container } = render(CodeBlock, { props: { code: 'a\nb', title: 'a.ts', compact: true } });
    expect(header(container)!.className).toContain('h-8');
    expect(header(container)!.className).toContain('px-3');
    expect(body(container).className).toContain('py-1.5');
    expect(body(container).className).toContain('leading-[1.5]');
    expect(numbers(container)).toEqual(['1', '2']);
  });
});
