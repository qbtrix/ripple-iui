// discover/discover-layout.ssr.test.ts — the Discover page layout through
// `svelte/server`, the path a prerendered public page takes: each piece renders
// its markup with no hydration, link mode renders anchors and no buttons (so
// it works with JS off), callback mode renders the app's buttons and radios,
// and a section lays its children out by the `view` prop. Runs in the `ssr`
// vitest project. Also pins the cards' type scale to the app's.
import { createRawSnippet } from 'svelte';
import { render as ssr } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DiscoverChips from './DiscoverChips.svelte';
import DiscoverEmpty from './DiscoverEmpty.svelte';
import DiscoverFilters from './DiscoverFilters.svelte';
import DiscoverGrid from './DiscoverGrid.svelte';
import DiscoverHeader from './DiscoverHeader.svelte';
import DiscoverPublish from './DiscoverPublish.svelte';
import DiscoverRow from './DiscoverRow.svelte';
import DiscoverSearch from './DiscoverSearch.svelte';
import DiscoverSection from './DiscoverSection.svelte';
import DiscoverSkeleton from './DiscoverSkeleton.svelte';
import DiscoverTile from './DiscoverTile.svelte';
import type { DiscoverItem } from './types.js';

/** Server render with Svelte's hydration comments stripped, so the markup reads as served. */
const render: typeof ssr = (component, options) => {
  const out = ssr(component, options);
  return { ...out, body: out.body.replace(/<!--.*?-->/g, '') };
};
const snip = (html: string) => createRawSnippet(() => ({ render: () => html }));
const tiles = snip('<article data-testid="child">tile</article>');

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'tool', label: 'Tools' },
  { value: 'site', label: 'Sites' },
];
const linked = (base: string) => KINDS.map((k) => ({ ...k, href: k.value === 'all' ? base : `${base}?kind=${k.value}` }));

const item: DiscoverItem = {
  id: 't1',
  kind: 'tool',
  mediaKind: null,
  title: 'Invoice maker',
  desc: 'Bill a client in a minute.',
  imageUrl: null,
  liveUrl: null,
  remixCount: 0,
  featured: false,
};

describe('DiscoverFilters', () => {
  it('with hrefs renders link pills for kind and view, and no buttons', () => {
    const { body } = render(DiscoverFilters, {
      props: { kinds: linked('/discover'), kind: 'tool', view: 'list', viewHref: (v: string) => `/discover?view=${v}` },
    });
    expect(body).not.toContain('<button');
    expect(body).not.toContain('role="radio');
    expect(body).toContain('href="/discover"');
    expect(body).toContain('href="/discover?kind=tool"');
    expect(body).toContain('href="/discover?view=shelves"');
    expect(body).toMatch(/<a [^>]*href="\/discover\?kind=tool"[^>]*aria-current="true"/);
    expect(body).toMatch(/<a [^>]*href="\/discover\?view=list"[^>]*aria-current="true"/);
    expect(body).not.toMatch(/<a [^>]*href="\/discover\?kind=site"[^>]*aria-current/);
    expect(body).toContain('aria-label="Filter by type"');
    expect(body).toContain('aria-label="View"');
    expect(body).toContain('<svg');
  });

  it('with callbacks renders the Segmented radios the app uses', () => {
    const { body } = render(DiscoverFilters, { props: { kinds: KINDS, kind: 'all', onkind: () => {}, view: 'grid', onview: () => {} } });
    expect(body).toContain('role="radiogroup"');
    expect(body).toMatch(/role="radio"[^>]*aria-checked="true"/);
    expect(body).toContain(' Shelves ');
    expect(body).not.toContain('<a ');
  });

  it('hides the view toggle with neither onview nor viewHref, and takes the host surface class', () => {
    const { body } = render(DiscoverFilters, { props: { kinds: linked('/d'), kind: 'all', class: 'feature-surface' } });
    expect(body).not.toContain('aria-label="View"');
    expect(body).toContain('sticky top-0 z-10');
    expect(body).toContain('feature-surface');
  });
});

describe('DiscoverChips', () => {
  it('with hrefs renders links, the selected one aria-current', () => {
    const options = [
      { value: 'shop', label: 'For my shop', href: '/discover' },
      { value: 'fun', label: 'Just for fun', href: '/discover?audience=fun' },
    ];
    const { body } = render(DiscoverChips, { props: { options, value: 'shop' } });
    expect(body).not.toContain('<button');
    expect(body).toMatch(/<a [^>]*href="\/discover"[^>]*aria-current="true"/);
    expect(body).toContain('href="/discover?audience=fun"');
    expect(body).toContain('aria-label="Who is it for"');
  });

  it('without hrefs renders pressed-state buttons', () => {
    const { body } = render(DiscoverChips, { props: { options: [{ value: 'shop', label: 'For my shop' }], value: 'shop', onchange: () => {} } });
    expect(body).toMatch(/<button[^>]*aria-pressed="true"/);
  });
});

describe('DiscoverSearch', () => {
  it('with action is a GET form that submits q and keeps the other filters', () => {
    const { body } = render(DiscoverSearch, { props: { value: 'menu', action: '/discover', hidden: { kind: 'tool', audience: null } } });
    expect(body).toMatch(/<form [^>]*method="get"/);
    expect(body).toContain('action="/discover"');
    expect(body).toMatch(/<input [^>]*name="q"/);
    expect(body).toContain('value="menu"');
    expect(body).toMatch(/<input type="hidden" name="kind" value="tool"/);
    expect(body).not.toContain('name="audience"');
    expect(body).toContain('placeholder="Search tools, games and sites"');
  });

  it('without action is the bare search box', () => {
    const { body } = render(DiscoverSearch, { props: { value: '' } });
    expect(body).not.toContain('<form');
    expect(body).not.toContain('name="q"');
    expect(body).toContain('aria-label="Search Discover"');
  });
});

describe('DiscoverSection', () => {
  it('lays children out in the grid by default, with the app ids', () => {
    const { body } = render(DiscoverSection, { props: { id: 'picks', title: 'Staff picks', blurb: 'Picked by us.', children: tiles } });
    expect(body).toContain('data-testid="discover-section-picks"');
    expect(body).toContain('aria-labelledby="discover-h-picks"');
    expect(body).toMatch(/<h2 id="discover-h-picks"[^>]*>Staff picks<\/h2>/);
    expect(body).toContain('grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))]');
    expect(body).toContain('data-testid="child"');
    expect(body).not.toContain('role="list"');
  });

  it('renders the list view as a named list', () => {
    const { body } = render(DiscoverSection, { props: { id: 'play', title: 'Play', view: 'list', children: tiles } });
    expect(body).toContain('role="list"');
    expect(body).toContain('aria-label="Play"');
    expect(body).not.toContain('grid-cols-');
  });

  it('renders the shelves view as a snapping sideways scroller that sizes its children', () => {
    const { body } = render(DiscoverSection, { props: { id: 'play', title: 'Play', view: 'shelves', children: tiles } });
    expect(body).toContain('snap-x');
    expect(body).toContain('*:w-64');
    expect(body).toContain('aria-label="Play, scroll sideways for more"');
  });

  it('draws "see all" as a link with moreHref, a button with onmore, nothing with neither', () => {
    const link = render(DiscoverSection, { props: { id: 's', title: 'S', more: 'All sites', moreHref: '/templates', children: tiles } }).body;
    expect(link).toMatch(/<a [^>]*href="\/templates"[^>]*>All sites →<\/a>/);
    expect(link).not.toContain('<button');
    const button = render(DiscoverSection, { props: { id: 's', title: 'S', more: 'All sites', onmore: () => {}, children: tiles } }).body;
    expect(button).toMatch(/<button[^>]*>All sites →<\/button>/);
    const none = render(DiscoverSection, { props: { id: 's', title: 'S', more: 'All sites', children: tiles } }).body;
    expect(none).not.toContain('All sites');
  });
});

describe('DiscoverGrid, DiscoverSkeleton, DiscoverEmpty', () => {
  it('DiscoverGrid without a label names nothing', () => {
    const { body } = render(DiscoverGrid, { props: { view: 'list', children: tiles } });
    expect(body).toContain('role="list"');
    expect(body).not.toContain('aria-label');
  });

  it('DiscoverSkeleton is one labelled status, rows for list and tiles otherwise', () => {
    const grid = render(DiscoverSkeleton, { props: {} }).body;
    expect(grid).toContain('role="status"');
    expect(grid).toContain('aria-label="Loading Discover"');
    expect(grid).toContain('data-testid="discover-loading"');
    expect(grid.match(/aspect-video w-full rounded-2xl/g)).toHaveLength(8);
    const list = render(DiscoverSkeleton, { props: { view: 'list', count: 3 } }).body;
    expect(list.match(/aspect-video w-24/g)).toHaveLength(3);
    expect(list).toContain('divide-y');
  });

  it.each([
    ['empty', 'discover-empty', 'Nothing here yet'],
    ['filtered', 'discover-empty', 'Nothing matches that yet.'],
    ['error', 'discover-error', 'Discover didn&#39;t load.'],
  ] as const)('DiscoverEmpty %s', (state, testid, title) => {
    const { body } = render(DiscoverEmpty, { props: { state, actions: snip('<a href="/new">Act</a>') } });
    expect(body).toContain(`data-testid="${testid}"`);
    expect(body.replace(/'/g, '&#39;')).toContain(title);
    expect(body).toContain('href="/new"');
  });
});

describe('DiscoverHeader and DiscoverPublish', () => {
  it('DiscoverHeader paints the accent and renders children and aside', () => {
    const { body } = render(DiscoverHeader, {
      props: { title: 'Free things you can', accent: 'use right now.', lead: 'Tools.', as: 'h1', children: snip('<div>search</div>'), aside: snip('<aside>qr</aside>') },
    });
    expect(body).toMatch(/<h1 class="text-title-1[^"]*">\s*Free things you can <span class="text-primary">use right now\.<\/span>/);
    expect(body).toContain('text-body text-muted-foreground">Tools.');
    expect(body).toContain('<div>search</div>');
    expect(body).toContain('<aside>qr</aside>');
  });

  it('DiscoverPublish is a link with href and shows no button without an action', () => {
    expect(render(DiscoverPublish, { props: { href: '/signup' } }).body).toMatch(/<a [^>]*href="\/signup"[^>]*>Publish your work<\/a>/);
    const bare = render(DiscoverPublish, { props: {} }).body;
    expect(bare).toContain('Made something with Paw?');
    expect(bare).not.toContain('Publish your work');
  });
});

describe('card type scale', () => {
  it('the tile and row use the app type utilities, not text-sm / text-xs', () => {
    const tile = render(DiscoverTile, { props: { item, href: '/free-tools/t1' } }).body;
    expect(tile).toMatch(/<h3 class="m-0 truncate text-headline text-foreground">/);
    expect(tile).toContain('text-footnote');
    expect(tile).toContain('text-caption-1');
    expect(tile).toContain('rounded-[10px]');
    const row = render(DiscoverRow, { props: { item } }).body;
    expect(row).toContain('text-body font-semibold');
    for (const html of [tile, row]) expect(html).not.toMatch(/\btext-(sm|xs)\b/);
  });
});
