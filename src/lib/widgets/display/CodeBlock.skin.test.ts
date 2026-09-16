// src/lib/widgets/display/CodeBlock.skin.test.ts
// Created 2026-09-16 with the beautiful-ui re-skin of display/CodeBlock.svelte.
// The re-skin ports the source's regex highlighter, which slices each line into
// tokens and re-emits them — so the one thing that can silently go wrong is a
// line coming back with characters dropped, duplicated or reordered. These
// cases pin that, the line-number gutter, and the one deviation from the
// source's colouring (a quoted string before a colon is a name, not a value),
// which is what stops a JSON block painting one flat colour inside ToolCall.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CodeBlock from './CodeBlock.svelte';

const codeLines = (root: ParentNode) =>
  Array.from(root.querySelectorAll('code')).map((el) => el.textContent);

describe('CodeBlock highlighting', () => {
  it('re-emits every line exactly, tokens and all', () => {
    const code = [
      'export async function churnBatch() {',
      '  const flavor = await getFlavor("pistachio");',
      '  if (!base.approved) return null;',
      '  return base.gallons; // 42 done',
      '}'
    ].join('\n');
    const { container } = render(CodeBlock, { props: { code, language: 'ts' } });
    expect(codeLines(container)).toEqual(code.split('\n'));
  });

  it('numbers each line and ignores a trailing newline', () => {
    const { container } = render(CodeBlock, { props: { code: 'a\nb\n' } });
    expect(codeLines(container)).toEqual(['a', 'b']);
    const gutter = Array.from(container.querySelectorAll('.select-none')).map(
      (el) => el.textContent
    );
    expect(gutter).toEqual(['1', '2']);
  });

  it('colours a JSON key as a name and its value as a string', () => {
    const { container } = render(CodeBlock, {
      props: { code: '{"name": "foo", "count": 3}', language: 'json' }
    });
    const spans = Array.from(container.querySelectorAll('code span'));
    const classOf = (text: string) =>
      spans.find((el) => el.textContent === text)?.getAttribute('class') ?? '';

    expect(classOf('"name"')).toContain('font-medium');
    expect(classOf('"name"')).not.toContain('warning');
    expect(classOf('"foo"')).toContain('text-ripple-warning');
    expect(classOf('3')).toContain('text-ripple-warning');
  });

  it('treats a code string as text, never as markup', () => {
    const evil = 'const a = "<img src=x onerror=alert(1)>";';
    const { container } = render(CodeBlock, { props: { code: evil } });
    expect(container.querySelector('img')).toBeNull();
    expect(codeLines(container)).toEqual([evil]);
  });

  it('drops the header entirely when there is nothing to put in it', () => {
    const { container } = render(CodeBlock, {
      props: { code: 'x', hideCopy: true }
    });
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('Copy');
  });
});
