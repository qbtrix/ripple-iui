// @file widgets/ai/ai.test.ts
// @description NEW (AI-native tier, 2026-06-24). Behavior coverage for the
//   AI-native display widgets — StreamText, ToolCall, ReasoningTrace. Asserts
//   registry wiring (every type key + alias resolves), prop → DOM mapping, the
//   streaming affordances (caret/aria-busy), ToolCall expand/collapse + the
//   error auto-expand, and ReasoningTrace's summary ↔ expanded disclosure, plus
//   the a11y attributes (aria-live/aria-busy/aria-expanded, ordered list).
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { getWidget, hasWidget } from '../index.js';
import StreamText from './StreamText.svelte';
import ToolCall from './ToolCall.svelte';
import ReasoningTrace from './ReasoningTrace.svelte';

describe('AI-native widgets — registry wiring', () => {
  it('every type key resolves to a component (no ghosts)', () => {
    const types = [
      'stream-text', 'streamtext', 'streaming-text',
      'tool-call', 'toolcall', 'tool-invocation',
      'reasoning-trace', 'reasoning', 'thinking-trace',
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
