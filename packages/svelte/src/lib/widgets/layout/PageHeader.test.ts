// @file widgets/layout/PageHeader.test.ts
// @description NEW 2026-09-26 (feature pages canon, F1 / G1). Behaviour tests for
//   PageHeader as a hand-written caller uses it from `./ui`: title, subtitle,
//   eyebrow, the new `leading` and `toolbar` snippets, `actions`, children, and
//   the two title sizes. Written red first.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import PageHeader from './PageHeader.svelte';

afterEach(cleanup);

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('PageHeader', () => {
  it('renders the title as the page h1, with subtitle and eyebrow', () => {
    const { container, getByText } = render(PageHeader, { title: 'Agents', subtitle: '12 agents', eyebrow: 'Workspace' });
    expect(container.querySelector('h1')!.textContent).toBe('Agents');
    expect(getByText('12 agents')).toBeTruthy();
    expect(getByText('Workspace')).toBeTruthy();
  });

  it('renders leading, actions and toolbar snippets in their own slots', () => {
    const { container } = render(PageHeader, {
      title: 'Agents',
      leading: html('<span data-testid="lead">A</span>'),
      actions: html('<button type="button">New</button>'),
      toolbar: html('<input aria-label="Search agents" />'),
    });
    expect(container.querySelector('[data-page-header-leading] [data-testid="lead"]')).not.toBeNull();
    expect(container.querySelector('[data-page-header-toolbar] input[aria-label="Search agents"]')).not.toBeNull();
    expect(container.querySelector('button')!.textContent).toBe('New');
  });

  it('renders no leading or toolbar wrapper when those snippets are absent', () => {
    const { container } = render(PageHeader, { title: 'Agents' });
    expect(container.querySelector('[data-page-header-leading]')).toBeNull();
    expect(container.querySelector('[data-page-header-toolbar]')).toBeNull();
  });

  it('renders children without hasChildren (hand-written caller)', () => {
    const { getByText } = render(PageHeader, { title: 'Agents', children: html('<nav>crumbs</nav>') });
    expect(getByText('crumbs')).toBeTruthy();
  });

  it('size="sm" gives the dense-page title; the default is the list-page title', async () => {
    const { container, rerender } = render(PageHeader, { title: 'Agents' });
    expect(container.querySelector('[data-page-header]')!.getAttribute('data-size')).toBe('md');
    expect(container.querySelector('h1')!.className).toContain('text-xl');
    await rerender({ title: 'Agents', size: 'sm' });
    expect(container.querySelector('[data-page-header]')!.getAttribute('data-size')).toBe('sm');
    expect(container.querySelector('h1')!.className).toContain('text-[17px]');
  });

  it('paints with ripple tokens, not host tokens', () => {
    const { container } = render(PageHeader, { title: 'Agents', subtitle: 's' });
    const header = container.querySelector('header')!;
    expect(header.className).toContain('border-ripple-border');
    expect(container.querySelector('p')!.className).toContain('text-ripple-muted-foreground');
  });
});
