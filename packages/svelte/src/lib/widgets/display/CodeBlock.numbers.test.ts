// CodeBlock.numbers.test.ts — the highlighter's number rule. A number is coloured only when it
// stands alone: digits joined to a word by `-` or `.` (a user name like prakash-1, a version tail,
// a date in a shell command) are part of that word and stay uncoloured. Free-standing numbers,
// negatives (`-1` in JSON) and dotted versions (`1.2.3`) still colour as one literal.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CodeBlock from './CodeBlock.svelte';

const literals = (code: string, language = 'bash') => {
  const { container } = render(CodeBlock, { props: { code, language } });
  return Array.from(container.querySelectorAll('.ripple-code-literal')).map((s) => s.textContent);
};

describe('CodeBlock number tokens', () => {
  it('does not colour digits inside a hyphen- or dot-joined word', () => {
    expect(literals('cd /Users/prakash-1/Documents/paw-worktrees/wave1')).toEqual([]);
    expect(literals('git checkout release-2026-10-07')).toEqual([]);
    expect(literals('echo v0.4.18 build.2')).toEqual([]);
    expect(literals('ls 1-click 3.x')).toEqual([]);
  });

  it('still colours a number that stands alone', () => {
    expect(literals('sleep 10 && head -n 3 file 2>&1')).toEqual(['10', '3', '2', '1']);
    expect(literals('pip install x==1.2.3')).toEqual(['1.2.3']);
  });

  it('keeps JSON numbers, negatives and decimals', () => {
    expect(literals('{ "a": -1, "b": [2, 3.5] }', 'json')).toEqual(['1', '2', '3.5']);
  });
});
