// @file widgets/display/InlineAlert.test.ts
// Updated 2026-09-27 (canon gaps 2): a caller `role` overrides the tone's role.
// @description NEW 2026-09-26 (feature pages canon, F1 / G3). Behaviour tests for
//   InlineAlert, the inline banner/callout on `./ui`: four tones and their live
//   region roles, title/description/children, the actions snippet, the
//   optional dismiss button, and attribute forwarding. Written red first.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import InlineAlert from './InlineAlert.svelte';

afterEach(cleanup);

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('InlineAlert', () => {
  it('defaults to the info tone as a polite status region', () => {
    const { container } = render(InlineAlert, { title: 'Heads up' });
    const root = container.querySelector('[data-inline-alert]')!;
    expect(root.getAttribute('data-tone')).toBe('info');
    expect(root.getAttribute('role')).toBe('status');
  });

  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['error', 'alert'],
  ] as const)('tone %s uses role=%s and its own -text token', (tone, role) => {
    const { container } = render(InlineAlert, { tone, title: 't' });
    const root = container.querySelector('[data-inline-alert]')!;
    expect(root.getAttribute('data-tone')).toBe(tone);
    expect(root.getAttribute('role')).toBe(role);
    expect(root.innerHTML).toContain(`text-ripple-${tone}-text`);
    expect(root.querySelector('svg')).not.toBeNull();
  });

  it('renders title and description; children replace the description', async () => {
    const { getByText, queryByText, rerender } = render(InlineAlert, { title: 'Sync failed', description: 'Retry in a moment.' });
    expect(getByText('Sync failed')).toBeTruthy();
    expect(getByText('Retry in a moment.')).toBeTruthy();
    await rerender({ title: 'Sync failed', description: 'Retry in a moment.', children: html('<span>custom body</span>') });
    expect(getByText('custom body')).toBeTruthy();
    expect(queryByText('Retry in a moment.')).toBeNull();
  });

  it('renders the actions snippet', () => {
    const { container } = render(InlineAlert, { tone: 'error', title: 'x', actions: html('<button type="button">Retry</button>') });
    expect(container.querySelector('[data-inline-alert-actions] button')!.textContent).toBe('Retry');
  });

  it('shows a dismiss button only when ondismiss is set, and calls it', async () => {
    const { container, rerender } = render(InlineAlert, { title: 'x' });
    expect(container.querySelector('button[aria-label="Dismiss"]')).toBeNull();
    const ondismiss = vi.fn();
    await rerender({ title: 'x', ondismiss });
    const btn = container.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement;
    expect(btn.getAttribute('type')).toBe('button');
    await fireEvent.click(btn);
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('takes a custom dismiss label', () => {
    const { container } = render(InlineAlert, { title: 'x', ondismiss: () => {}, dismissLabel: 'Hide notice' });
    expect(container.querySelector('button[aria-label="Hide notice"]')).not.toBeNull();
  });

  it('forwards data-* and class to the root', () => {
    const { container } = render(InlineAlert, { title: 'x', 'data-testid': 'err-banner', class: 'mb-2' });
    const root = container.querySelector('[data-testid="err-banner"]')!;
    expect(root.hasAttribute('data-inline-alert')).toBe(true);
    expect(root.className).toContain('mb-2');
  });
});

describe('InlineAlert role override (canon gaps 2)', () => {
  it.each([
    ['warning', 'status'],
    ['error', 'status'],
    ['info', 'alert'],
  ] as const)('tone %s with role=%s keeps the caller role', (tone, role) => {
    const { container } = render(InlineAlert, { tone, role, title: 't' });
    expect(container.querySelector('[data-inline-alert]')!.getAttribute('role')).toBe(role);
  });
});
