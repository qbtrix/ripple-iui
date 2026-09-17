// @file widgets/ai/ToolCall.entry.test.ts
// @description NEW (2026-09-16, skin-gaps). Guards ToolCall's entry motion —
//   the coverage hole the 2026-09-15 port audit found, where three keyframes
//   were assigned to this widget and none was ever written. The keyframes
//   themselves are CSS and not worth asserting; what IS worth asserting is the
//   wiring that silently went missing last time: the animated class reaching
//   the card at all, and ApprovalGate numbering a run of calls so they stagger
//   instead of landing together.
//   Separate file because ai.test.ts was byte-identical to its pre-arc base
//   when this was written, and the arc leaned on that.
// UPDATED 2026-09-17 (comment only): that proof no longer holds. skin-answer
//   (ripple #129) added one test to ai.test.ts, ReasoningTrace's scoped-keyframe
//   check. It changed no existing test.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ToolCall from './ToolCall.svelte';
import ApprovalGate from './ApprovalGate.svelte';

describe('ToolCall — entry motion', () => {
  it('carries the fade-up class on the card', () => {
    const { container } = render(ToolCall, { props: { name: 'read_file', status: 'success' } });
    expect(container.querySelector('.ripple-tool-call.ripple-tool-fade-up')).toBeTruthy();
  });

  it('pops the inline argument chip in, and only when there is one', () => {
    const withChip = render(ToolCall, {
      props: { name: 'read_file', args: { path: 'src/app.ts' } },
    });
    expect(withChip.container.querySelector('.ripple-tool-pop-in')).toBeTruthy();

    const withoutChip = render(ToolCall, { props: { name: 'read_file' } });
    expect(withoutChip.container.querySelector('.ripple-tool-pop-in')).toBeFalsy();
  });

  it('a lone card sets no index, so the delay falls back to zero', () => {
    const { container } = render(ToolCall, { props: { name: 'read_file' } });
    const card = container.querySelector('.ripple-tool-call');
    expect(card?.getAttribute('style')).toBeNull();
  });
});

describe('ApprovalGate — staggers its proposed calls', () => {
  it('numbers each ToolCall so the run enters 80ms apart', () => {
    const { container } = render(ApprovalGate, {
      props: {
        title: 'x',
        toolCalls: [
          { name: 'read_file' },
          { name: 'write_file' },
          { name: 'run_tests' },
        ],
      },
    });
    const cards = [...container.querySelectorAll<HTMLElement>('.ripple-tool-call')];
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.style.getPropertyValue('--i').trim())).toEqual(['0', '1', '2']);
  });
});
