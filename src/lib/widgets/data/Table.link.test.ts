// src/lib/widgets/data/Table.link.test.ts
// Created 2026-09-06 — column `href`: a column that names a row field holding a URL
// renders its cell text as a link to that URL. Added for /browser results so a
// story title opens the story. Guards: link target + rel, URL stays out of the
// visible text, a column without href stays plain, and a row missing the URL
// field falls back to plain text rather than a dead link.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Table from './Table.svelte';

const columns = [
  { header: 'Title', accessorKey: 'title', href: 'url' },
  { header: 'Points', accessorKey: 'points' }
];
const rows = [
  { title: 'Cloud in a Bottle', url: 'https://cloudinabottle.org', points: 473 },
  { title: 'No link here', points: 1 }
];

describe('Table column href', () => {
  it('renders the cell text as a new-tab link to the row URL field', () => {
    const { container } = render(Table, { props: { columns, rows } });
    const links = container.querySelectorAll('a[data-link-cell="true"]');
    expect(links.length).toBe(1);
    const a = links[0] as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://cloudinabottle.org');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.textContent?.trim()).toBe('Cloud in a Bottle');
    // The URL is the target, never the visible text.
    expect(container.textContent).not.toContain('https://cloudinabottle.org');
  });

  it('falls back to plain text when the row has no URL, and leaves other columns alone', () => {
    const { container } = render(Table, { props: { columns, rows } });
    expect(container.textContent).toContain('No link here');
    // Only the one row with a url produced a link; Points never does.
    expect(container.querySelectorAll('a').length).toBe(1);
  });
});
