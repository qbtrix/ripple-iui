// @file widgets/composite/AskUserQuestions.counter.test.ts
// @description NEW (2026-09-16, skin-gaps). The rolling counter ported from
//   beautiful-ui's ApprovalCard RollingDigits. The roll itself is a CSS
//   keyframe on a keyed span, so what is worth asserting is the mechanism the
//   roll depends on: advancing the question REMOUNTS the counter node rather
//   than mutating its text, because a mutated text node never re-triggers an
//   entry animation and the effect would be silently dead — the same failure
//   mode the 2026-09-15 port audit found on ToolCall.
//   Separate file so AskUserQuestions.test.ts, which covers the recap flow,
//   stays about the recap flow.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AskUserQuestions from './AskUserQuestions.svelte';

const questions = [
  { id: 'a', title: 'First', options: [{ title: 'One' }] },
  { id: 'b', title: 'Second', options: [{ title: 'Two' }] },
  { id: 'c', title: 'Third', options: [{ title: 'Three' }] },
];

const roll = (c: HTMLElement) => c.querySelector<HTMLElement>('.auq-counter .auq-roll');

describe('AskUserQuestions — rolling counter', () => {
  it('reads the position out of the stack', () => {
    const { container } = render(AskUserQuestions, { props: { questions } });
    expect(roll(container)?.textContent).toBe('Question 1 of 3');
  });

  it('remounts the counter when the index moves, so the roll re-fires', async () => {
    const { container, rerender } = render(AskUserQuestions, {
      props: { questions, currentIndex: 0 },
    });
    const first = roll(container);
    expect(first?.textContent).toBe('Question 1 of 3');

    await rerender({ questions, currentIndex: 1 });
    const second = roll(container);
    expect(second?.textContent).toBe('Question 2 of 3');
    // Identity, not text: a text-only update would leave the animation stale.
    expect(second).not.toBe(first);
  });

  it('clamps past the end of the stack rather than counting off it', async () => {
    const { container, rerender } = render(AskUserQuestions, {
      props: { questions, currentIndex: 0 },
    });
    await rerender({ questions, currentIndex: 99 });
    expect(roll(container)?.textContent).toBe('Question 3 of 3');
  });
});
