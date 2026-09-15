// @file widgets/ai/ai.test.ts
// @description NEW (AI-native tier, 2026-06-24). Behavior coverage for the
//   AI-native widgets — StreamText, ToolCall, ReasoningTrace, ApprovalGate.
//   Asserts registry wiring (every type key + alias resolves), prop → DOM
//   mapping, the streaming affordances (caret/aria-busy), ToolCall
//   expand/collapse + the error auto-expand, ReasoningTrace's summary ↔
//   expanded disclosure, and ApprovalGate's approve/deny → local resolve +
//   callback fire, its diff/tool-call composition, and the bound-decision
//   persist round-trip through Ripple. Plus the a11y attributes
//   (aria-live/aria-busy/aria-expanded, ordered list, risk/decision-by-text).
import { describe, it, expect, vi, test } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { getWidget, hasWidget } from '../index.js';
import StreamText from './StreamText.svelte';
import ToolCall from './ToolCall.svelte';
import ReasoningTrace from './ReasoningTrace.svelte';
import ApprovalGate from './ApprovalGate.svelte';
import Ripple from '$lib/Ripple.svelte';

describe('AI-native widgets — registry wiring', () => {
  it('every type key resolves to a component (no ghosts)', () => {
    const types = [
      'stream-text', 'streamtext', 'streaming-text',
      'tool-call', 'toolcall', 'tool-invocation',
      'reasoning-trace', 'reasoning', 'thinking-trace',
      'approval-gate', 'approval', 'approve-card', 'human-gate',
    ];
    for (const t of types) {
      expect(hasWidget(t), `type "${t}" is not registered`).toBe(true);
      expect(getWidget(t), `type "${t}" resolves to undefined`).toBeTruthy();
    }
  });

  it('aliases resolve to the same component as the canonical type', () => {
    expect(getWidget('streamtext')).toBe(getWidget('stream-text'));
    expect(getWidget('streaming-text')).toBe(getWidget('stream-text'));
    expect(getWidget('toolcall')).toBe(getWidget('tool-call'));
    expect(getWidget('tool-invocation')).toBe(getWidget('tool-call'));
    expect(getWidget('reasoning')).toBe(getWidget('reasoning-trace'));
    expect(getWidget('thinking-trace')).toBe(getWidget('reasoning-trace'));
    expect(getWidget('approval')).toBe(getWidget('approval-gate'));
    expect(getWidget('approve-card')).toBe(getWidget('approval-gate'));
    expect(getWidget('human-gate')).toBe(getWidget('approval-gate'));
  });
});

describe('StreamText', () => {
  it('renders text from props', () => {
    const { getByText } = render(StreamText, { props: { text: 'Hello agent' } });
    expect(getByText('Hello agent')).toBeTruthy();
  });

  it('exposes aria-live="polite" for streamed announcements', () => {
    const { container } = render(StreamText, { props: { text: 'partial' } });
    const region = container.querySelector('.ripple-stream-text');
    expect(region?.getAttribute('aria-live')).toBe('polite');
  });

  it('sets aria-busy and shows a caret while streaming', () => {
    const { container } = render(StreamText, { props: { text: 'typing', streaming: true } });
    const region = container.querySelector('.ripple-stream-text');
    expect(region?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.ripple-stream-caret')).toBeTruthy();
  });

  it('clears busy + caret when done, even if streaming is still true', () => {
    const { container } = render(StreamText, {
      props: { text: 'finished', streaming: true, done: true },
    });
    const region = container.querySelector('.ripple-stream-text');
    expect(region?.getAttribute('aria-busy')).toBe('false');
    expect(container.querySelector('.ripple-stream-caret')).toBeFalsy();
  });

  it('reflects size via data-size', () => {
    const { container } = render(StreamText, { props: { text: 'x', size: 'lg' } });
    expect(container.querySelector('[data-size="lg"]')).toBeTruthy();
  });

  it('reveals a static string progressively in typewriter mode', async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(StreamText, { props: { text: 'abcd', speed: 100 } });
      const body = container.querySelector('.ripple-stream-text__body') as HTMLElement;
      // Starts empty, busy + caret present while typing.
      expect(body.textContent).toBe('');
      const region = container.querySelector('.ripple-stream-text');
      expect(region?.getAttribute('aria-busy')).toBe('true');
      // 100 chars/sec → 10ms/char. Two ticks → "ab".
      await vi.advanceTimersByTimeAsync(20);
      expect(body.textContent).toBe('ab');
      // Run out the rest → full string, no longer busy.
      await vi.advanceTimersByTimeAsync(40);
      expect(body.textContent).toBe('abcd');
      expect(region?.getAttribute('aria-busy')).toBe('false');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ToolCall', () => {
  it('renders the tool name and a textual status label', () => {
    const { getByText } = render(ToolCall, { props: { name: 'search_web', status: 'success' } });
    expect(getByText('search_web')).toBeTruthy();
    // status by TEXT, not color alone
    expect(getByText('Success')).toBeTruthy();
  });

  it('is collapsed on success by default (body hidden)', () => {
    const { container } = render(ToolCall, {
      props: { name: 't', status: 'success', args: { q: 1 } },
    });
    const trigger = container.querySelector('button[aria-expanded]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('auto-expands on error and shows the error message', () => {
    const { container, getByText } = render(ToolCall, {
      props: { name: 't', status: 'error', error: 'boom' },
    });
    const trigger = container.querySelector('button[aria-expanded]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(getByText('boom')).toBeTruthy();
  });

  it('toggles open/closed when the disclosure button is clicked', async () => {
    const { container } = render(ToolCall, {
      props: { name: 't', status: 'success', args: { q: 1 } },
    });
    const trigger = container.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // args JSON now visible
    expect(container.textContent).toContain('Arguments');
  });

  it('formats durationMs into a compact label', () => {
    const { container } = render(ToolCall, {
      props: { name: 't', status: 'success', durationMs: 1500 },
    });
    expect(container.textContent).toContain('1.5s');
  });
});

describe('ReasoningTrace', () => {
  const steps = [
    { title: 'Parse request', status: 'done' as const },
    { title: 'Search catalog', detail: 'looking for streaming primitive', status: 'thinking' as const },
  ];

  it('collapsed by default and shows a step-count summary', () => {
    const { container, getByText } = render(ReasoningTrace, { props: { steps } });
    const trigger = container.querySelector('button[aria-expanded]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(getByText('Reasoned for 2 steps')).toBeTruthy();
  });

  it('reads "Reasoning…" while streaming', () => {
    const { getByText } = render(ReasoningTrace, { props: { steps, streaming: true } });
    expect(getByText('Reasoning…')).toBeTruthy();
  });

  it('expands to an ordered list of steps when toggled', async () => {
    const { container, getByText } = render(ReasoningTrace, { props: { steps } });
    const trigger = container.querySelector('button[aria-expanded]') as HTMLButtonElement;
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('ol.ripple-reasoning-steps')).toBeTruthy();
    expect(getByText('Parse request')).toBeTruthy();
    expect(getByText('Search catalog')).toBeTruthy();
  });

  it('honors collapsed={false} to start expanded', () => {
    const { container } = render(ReasoningTrace, { props: { steps, collapsed: false } });
    const trigger = container.querySelector('button[aria-expanded]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('ApprovalGate (widget level)', () => {
  it('renders the title, summary, and the risk level by TEXT (not color alone)', () => {
    const { getByText } = render(ApprovalGate, {
      props: { title: 'Update 3 customer records', summary: 'A reversible change.', risk: 'high' },
    });
    expect(getByText('Update 3 customer records')).toBeTruthy();
    expect(getByText('A reversible change.')).toBeTruthy();
    // Risk conveyed by text.
    expect(getByText('High risk')).toBeTruthy();
  });

  it('shows Approve / Deny controls while pending; Edit only when onedit is supplied', () => {
    const { getByText, queryByText, rerender } = render(ApprovalGate, {
      props: { title: 'x', risk: 'low' },
    });
    expect(getByText('Approve')).toBeTruthy();
    expect(getByText('Deny')).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();

    // Edit appears once an onedit callback is wired.
    rerender({ title: 'x', risk: 'low', onedit: vi.fn() });
    expect(getByText('Edit')).toBeTruthy();
  });

  it('Approve fires onapprove with the actionId and resolves the card to approved', async () => {
    const onapprove = vi.fn();
    const ondeny = vi.fn();
    const { getByText, container } = render(ApprovalGate, {
      props: { title: 'x', risk: 'low', actionId: 'act_1', onapprove, ondeny },
    });
    await fireEvent.click(getByText('Approve'));

    expect(onapprove).toHaveBeenCalledTimes(1);
    expect(onapprove).toHaveBeenCalledWith({ actionId: 'act_1' });
    expect(ondeny).not.toHaveBeenCalled();

    const root = container.querySelector('.ripple-approval-gate')!;
    expect(root.getAttribute('data-decision')).toBe('approved');
    expect(root.getAttribute('data-resolved')).toBe('true');
    // Controls are replaced by the resolved stamp.
    expect(container.querySelector('button')).toBeNull();
  });

  it('Deny fires ondeny with the actionId and resolves the card to denied', async () => {
    const onapprove = vi.fn();
    const ondeny = vi.fn();
    const { getByText, container } = render(ApprovalGate, {
      props: { title: 'x', risk: 'high', actionId: 'act_2', onapprove, ondeny },
    });
    await fireEvent.click(getByText('Deny'));

    expect(ondeny).toHaveBeenCalledTimes(1);
    expect(ondeny).toHaveBeenCalledWith({ actionId: 'act_2' });
    expect(onapprove).not.toHaveBeenCalled();
    expect(container.querySelector('.ripple-approval-gate')!.getAttribute('data-decision')).toBe('denied');
  });

  it('Edit fires onedit with the actionId and does NOT resolve the card', async () => {
    const onedit = vi.fn();
    const { getByText, container } = render(ApprovalGate, {
      props: { title: 'x', risk: 'low', actionId: 'act_3', onedit },
    });
    await fireEvent.click(getByText('Edit'));
    expect(onedit).toHaveBeenCalledWith({ actionId: 'act_3' });
    // Still pending — edit is not a terminal decision.
    expect(container.querySelector('.ripple-approval-gate')!.getAttribute('data-decision')).toBe('pending');
  });

  it('renders resolved (controls disabled) when a decided state is passed in', () => {
    const onapprove = vi.fn();
    const { getByText, container } = render(ApprovalGate, {
      props: { title: 'x', risk: 'medium', decision: 'approved', decidedBy: 'Ada', onapprove },
    });
    const root = container.querySelector('.ripple-approval-gate')!;
    expect(root.getAttribute('data-decision')).toBe('approved');
    expect(root.getAttribute('data-resolved')).toBe('true');
    // No Approve/Deny buttons — the stamp shows instead.
    expect(container.querySelector('button')).toBeNull();
    expect(getByText('Approved')).toBeTruthy();
    // decidedBy appears in the visible stamp (and the sr-only live region).
    expect(container.textContent).toContain('by Ada');
  });

  it('does not fire callbacks when disabled', async () => {
    const onapprove = vi.fn();
    const { getByText } = render(ApprovalGate, {
      props: { title: 'x', risk: 'low', disabled: true, onapprove },
    });
    const approve = getByText('Approve').closest('button') as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    await fireEvent.click(approve);
    expect(onapprove).not.toHaveBeenCalled();
  });

  it('announces the resolved outcome via an aria-live region', async () => {
    const { getByText, container } = render(ApprovalGate, {
      props: { title: 'x', risk: 'low', actionId: 'a' },
    });
    const live = container.querySelector('[aria-live="polite"]')!;
    // Empty while pending.
    expect(live.textContent?.trim()).toBe('');
    await fireEvent.click(getByText('Approve'));
    expect(live.textContent).toContain('approved');
  });

  it('reuses the Diff widget when a diff payload is supplied', () => {
    const { container } = render(ApprovalGate, {
      props: {
        title: 'x',
        risk: 'high',
        diff: { before: 'tier: free', after: 'tier: pro', title: 'accounts.yaml' },
      },
    });
    // Diff renders its title bar with the supplied filename.
    expect(container.textContent).toContain('accounts.yaml');
  });

  it('reuses the ToolCall widget when toolCalls are supplied', () => {
    const { container } = render(ApprovalGate, {
      props: {
        title: 'x',
        risk: 'high',
        toolCalls: [{ name: 'update_accounts', status: 'pending', args: { tier: 'pro' } }],
      },
    });
    // ToolCall renders the tool name + a status label.
    expect(container.querySelector('.ripple-tool-call')).toBeTruthy();
    expect(container.textContent).toContain('update_accounts');
  });
});

describe('AI-native widgets — node-id forwarding (visual-editor selection)', () => {
  // The visual editor discovers selectable nodes by querying `[data-ripple-node]`
  // (see src/lib/editor/core/bounds-index.ts — `nodeIdOf` reads the stamp and it
  // always wins). NodeRenderer pushes `id: node.id` into every widget's props, but
  // the node only becomes addressable when the widget binds `data-ripple-node={id}`
  // on its ROOT. Render each AI widget as the spec root through Ripple (the real
  // discovery path) and assert the stamp surfaces on the root carrying that id.
  const CASES: Array<{ type: string; id: string; props: Record<string, unknown> }> = [
    { type: 'stream-text', id: 'n-stream-text', props: { text: 'hi' } },
    { type: 'tool-call', id: 'n-tool-call', props: { name: 'search_web', status: 'success' } },
    { type: 'reasoning-trace', id: 'n-reasoning-trace', props: { steps: [{ title: 'step' }] } },
    { type: 'approval-gate', id: 'n-approval-gate', props: { title: 'Proposed', risk: 'low' } },
  ];

  test.each(CASES)(
    'widget "$type" forwards data-ripple-node={id} on its root',
    ({ type, id, props }) => {
      const { container } = render(Ripple, {
        props: { spec: { state: {}, ui: { type, id, props } } },
      });
      const stamped = container.querySelector(`[data-ripple-node="${id}"]`);
      expect(stamped, `${type} should bind data-ripple-node={id} on its root`).not.toBeNull();
      expect(stamped?.getAttribute('data-ripple-node')).toBe(id);
    },
  );
});

describe('ApprovalGate decision → state persistence (integration through Ripple)', () => {
  test('a bound gate writes the decision to state and fires onStateChange', async () => {
    const onStateChange = vi.fn();
    const { container, getByText } = render(Ripple, {
      props: {
        spec: {
          state: { gate: 'pending' },
          ui: {
            type: 'approval-gate',
            bind: '{state.gate}',
            props: { title: 'Publish the page', risk: 'medium', actionId: 'act_pub' },
          },
        },
        onStateChange,
      },
    });

    await fireEvent.click(getByText('Approve'));

    expect(onStateChange).toHaveBeenCalled();
    const lastCall = onStateChange.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('gate');
    expect(lastCall[1]).toBe('approved');
    // The card resolved locally too.
    expect(container.querySelector('.ripple-approval-gate')!.getAttribute('data-decision')).toBe('approved');
  });

  test('a bound gate seeded with a decided state renders resolved (refresh remembers)', () => {
    const { container } = render(Ripple, {
      props: {
        spec: {
          state: { gate: 'denied' },
          ui: {
            type: 'approval-gate',
            bind: '{state.gate}',
            props: { title: 'x', risk: 'high' },
          },
        },
      },
    });
    const root = container.querySelector('.ripple-approval-gate')!;
    expect(root.getAttribute('data-decision')).toBe('denied');
    expect(container.querySelector('button')).toBeNull();
  });
});
