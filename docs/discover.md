<!-- docs/discover.md: the ./discover export subpath, a server-renderable Discover page (cards plus the layout around them) for a public catalogue. Lists the surface, the purity rule, link mode and the type scale. -->

# Discover

`@ripple-ui/svelte/discover` is the Discover page as components: the cards
(a tile for a grid or shelf, a row for a list, the 16:9 picture both share,
the media block of a detail view) and the page layout around them (header,
search, audience chips, the sticky type bar, titled sections, the loading
skeleton, the empty states and the publish band). paw-enterprise's /discover
and the public site render from these, so the two look the same. Everything
renders fully on the server. There is no store, no fetch and no `$effect`; a prerendered
page gets complete HTML, and a hydrated page gets the callbacks.

```svelte
<script>
  import { DiscoverTile, itemHref } from '@ripple-ui/svelte/discover';
  let { items } = $props();
</script>

{#each items as item (item.id)}
  <DiscoverTile {item} href={itemHref(item.kind, item.slug ?? item.id)} onremix={remix} />
{/each}
```

## The purity rule

Props in, markup out. A component derives everything it shows from the
`DiscoverItem` it is given, through the pure helpers below. It never reads
`window` or `document`, never fetches, and never keeps state a server cannot
produce (the one exception is `ItemArt`'s load-failure flag, which only
changes the picture after hydration; the server frame is the same either way).
Only `http(s)` urls reach an `href` or a `src`: `imageUrl`, `mediaUrl` and
`liveUrl` all pass through `httpUrl`, so a `javascript:`, `data:` or
protocol-relative value renders the placeholder, no media, or no action.

Buttons render only when their callback is passed, so a static page shows
just the links. The `href` prop is the consumer's own route and is not
guarded; relative routes work there. Consumers whose item pages are
off-site pass `target="_blank" rel="noopener"` to the tile and row.

## Callbacks or links

Every control takes either a callback (the app) or an `href` (a prerendered
page with JS off). `DiscoverFilters` renders link pills when any kind option
has an `href` or `viewHref` is given, and ripple's `Segmented` radios
otherwise. `Segmented` itself takes no `href`: it is a spec widget whose
options can be model-authored, so it stays free of an unguarded URL sink.
`DiscoverChips` renders links with `aria-current` or buttons with
`aria-pressed`. `DiscoverSearch` with `action` is a plain GET form that
submits `q` and keeps the other filters as hidden inputs.

```svelte
<script>
  import { DiscoverFilters, DiscoverSection, DiscoverTile, itemHref } from '@ripple-ui/svelte/discover';
  let { kinds, kind, sections } = $props(); // kinds: { value, label, href }[]
</script>

<DiscoverFilters {kinds} {kind} />
{#each sections as s (s.key)}
  <DiscoverSection id={s.key} title={s.title} blurb={s.blurb} more={s.more} moreHref={s.moreHref}>
    {#each s.items as item (item.id)}
      <DiscoverTile {item} href={itemHref(item.kind, item.slug ?? item.id)} />
    {/each}
  </DiscoverSection>
{/each}
```

`DiscoverFilters` paints `bg-background`; a host with its own surface passes
it through `class` (the app passes its `feature-surface` glass). The shelves
view bleeds into a `px-6` page gutter (`-mx-6 px-6`), so put sections in a
`px-6` column, as the app does.

## Type scale

The components use paw-enterprise's Apple-style type utilities
(`text-title-1`, `text-title-2`, `text-title-3`, `text-headline`,
`text-body`, `text-body-emph`, `text-callout`, `text-subheadline`,
`text-footnote`, `text-caption-1`, `text-caption-2`), not `text-sm` and
`text-xs`. `theme.css` defines them as `@utility` blocks over `--text-*`,
`--lh-*` and `--weight-*` custom properties, a verbatim copy of the app's
`global.css`. The properties sit on `:where(:root)`, so a host's own `:root`
values win; they are kept out of `@theme`, where a `--text-*` token would
mint a second, functional `text-*` utility. A host that defines the same
utilities (paw-enterprise does, after importing `theme.css`) emits both rules
with identical declarations, so nothing changes. Hosts must scan ripple's
`dist` with `@source` for the classes to generate.

## Exports

| Name | Kind | What it is |
|---|---|---|
| `DiscoverTile` | component | One item in a grid or shelf: art, title, one line, usage, actions. Props: `item`, `href?`, `target?`, `rel?`, `onremix?`, `onreport?`, `onopen?`, `busy?`, `class?`. |
| `DiscoverRow` | component | The same item as a list row (`role="listitem"`). Same props as the tile. |
| `ItemArt` | component | The 16:9 picture: the image, a tinted placeholder with the title's initial, a music cover, or a play badge on a video. Props: `imageUrl`, `title`, `mediaKind?`, `tint`, `initial`, `class?`. |
| `DetailMedia` | component | The detail view's media: `<video>` with poster, music cover plus `<audio>`, or the full image. Props: `item`, `class?`. |
| `DiscoverHeader` | component | The pitch: a title with an optional primary-coloured `accent`, a lead, children (search, chips) and an `aside` beside it on wide screens. Props: `title`, `accent?`, `lead?`, `as?` (`'h2'` default, `'h1'` on a page without its own header), `children?`, `aside?`, `class?`. |
| `DiscoverSearch` | component | Search in filter mode. Props: `value?`, `oninput?`, `action?` (GET form target), `name?` (`q`), `hidden?` (kept params), `placeholder?`, `class?`. |
| `DiscoverChips` | component | Audience toggle chips. Props: `options` (`{ value, label, href? }[]`), `value?`, `onchange?`, `label?`, `class?`. |
| `DiscoverFilters` | component | The sticky type bar: kind tabs and the Grid / Shelves / List toggle. Props: `kinds`, `kind`, `onkind?`, `view?`, `onview?`, `viewHref?`, `class?`. The toggle shows only with `onview` or `viewHref`. |
| `DiscoverSection` | component | A titled shelf: heading (`discover-h-{id}`), blurb, a "see all" link or button, then its children in a `DiscoverGrid`. Props: `id`, `title`, `blurb?`, `more?`, `moreHref?`, `onmore?`, `view?`, `children`, `class?`. |
| `DiscoverGrid` | component | The items container by view: auto-fill grid, snapping shelf, or a bordered `role="list"`. Props: `view?`, `label?`, `children`, `class?`. |
| `DiscoverSkeleton` | component | The loading state, one `role="status"`: tile skeletons, or row skeletons for the list view. Props: `view?`, `count?` (8), `label?`, `class?`. |
| `DiscoverEmpty` | component | `Nothing here yet`, `Nothing matches that yet.` or the load error. Props: `state?` (`'empty'`, `'filtered'`, `'error'`), `actions?`, `class?`. |
| `DiscoverPublish` | component | The publish band. Props: `href?` or `onpublish?`, `class?`. |
| `DISCOVER_VIEWS` | constant | `['grid', 'shelves', 'list']`, the toggle order. |
| `itemHref(kind, idOrSlug)` | helper | The public route for an item by kind: `/free-tools/`, `/play/`, `/templates/`, else `/discover/`. |
| `primaryFor(item)` | helper | The primary action: `Use` or `Play` with an http(s) `href`, `Claim` or `Use this recipe` needing an account, or `null`. |
| `mediaFor(item)` | helper | The playable media `{ kind, url }` for a studio item, or `null`. |
| `usageLabel(item)`, `remixLabel(n)`, `usedLabel(n)` | helper | The usage line: `No remixes yet`, `1 remix`, `1.2k remixes`; `Not used yet`, `1 used`, `1.2k used`. |
| `isStudioKind(kind)` | helper | True for `image`, `video` and `music`. |
| `tintFor(id)`, `initialFor(title)`, `CARD_PALETTE` | helper | Placeholder art: a stable coloured theme token per id and the title's first letter. |
| `DiscoverItem`, `DiscoverKind`, `DiscoverMediaKind`, `StudioKind`, `DiscoverPrimary` | type | The item shape and its unions. Consumers map their wire format onto `DiscoverItem`. |
| `DiscoverView`, `DiscoverOption` | type | A view mode; a filter choice `{ value, label, href? }`. |

The exact runtime list is frozen by `src/lib/discover/discover-contract.test.ts`;
the server markup by `src/lib/discover/discover.ssr.test.ts` (cards) and
`src/lib/discover/discover-layout.ssr.test.ts` (layout).
