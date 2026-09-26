// @file widgets/display/EmptyState.test.ts
// @description NEW 2026-09-26 (feature pages canon, F1 / G2). Behaviour tests for
//   the EmptyState additions: `icon` as a snippet (the string enum keeps
//   working), `size` sm|md, `tone` default|error, and the `actions` snippet.
//   Written red first.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import EmptyState from './EmptyState.svelte';

afterEach(cleanup);

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('EmptyState', () => {
  it('still takes a string icon and renders its glyph', () => {
    const { container } = render(EmptyState, { title: 'No results', icon: 'search' });
    expect(container.querySelector('[data-empty-icon] svg')).not.toBeNull();
  });

  it('renders an icon snippet instead of the built-in glyph', () => {
    const { container } = render(EmptyState, { title: 'No agents', icon: html('<span data-testid="bot">B</span>') });
    const slot = container.querySelector('[data-empty-icon]')!;
    expect(slot.querySelector('[data-testid="bot"]')).not.toBeNull();
    expect(slot.querySelector('svg')).toBeNull();
  });

  it('defaults to md size and default tone, with no alert role', () => {
    const { container } = render(EmptyState, { title: 'Nothing here' });
    const root = container.querySelector('[data-empty-state]')!;
    expect(root.getAttribute('data-size')).toBe('md');
    expect(root.getAttribute('data-tone')).toBe('default');
    expect(root.hasAttribute('role')).toBe(false);
  });

  it('size="sm" is the compact inline variant', () => {
    const { container } = render(EmptyState, { title: 'Nothing here', size: 'sm' });
    const root = container.querySelector('[data-empty-state]')!;
    expect(root.getAttribute('data-size')).toBe('sm');
    expect(root.className).toContain('p-4');
    expect(root.className).not.toContain('p-8');
  });

  it('tone="error" announces itself and paints the icon with the error text token', () => {
    const { container } = render(EmptyState, { title: 'Could not load agents', tone: 'error' });
    const root = container.querySelector('[data-empty-state]')!;
    expect(root.getAttribute('data-tone')).toBe('error');
    expect(root.getAttribute('role')).toBe('alert');
    const icon = container.querySelector('[data-empty-icon]')!;
    expect(icon.className).toContain('text-ripple-error-text');
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  it('renders the actions snippet, and children still render', () => {
    const { container, getByText } = render(EmptyState, {
      title: 'No agents',
      actions: html('<button type="button">Create agent</button>'),
      children: html('<span>legacy cta</span>'),
    });
    expect(container.querySelector('[data-empty-actions] button')!.textContent).toBe('Create agent');
    expect(getByText('legacy cta')).toBeTruthy();
  });

  it('renders no actions wrapper when there are none', () => {
    const { container } = render(EmptyState, { title: 'x' });
    expect(container.querySelector('[data-empty-actions]')).toBeNull();
  });
});
