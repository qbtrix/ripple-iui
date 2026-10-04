<!-- docs/discover.md: the ./discover export subpath, a server-renderable card set for a public catalogue. Lists the surface and the purity rule its components keep. -->

# Discover cards

`@ripple-ui/svelte/discover` is a small card set for a public Discover
catalogue: a tile for a grid or shelf, a row for a list, the 16:9 picture
both share, and the media block of a detail view. Everything renders fully
on the server. There is no store, no fetch and no `$effect`; a prerendered
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

## Exports

| Name | Kind | What it is |
|---|---|---|
| `DiscoverTile` | component | One item in a grid or shelf: art, title, one line, usage, actions. Props: `item`, `href?`, `target?`, `rel?`, `onremix?`, `onreport?`, `onopen?`, `busy?`, `class?`. |
| `DiscoverRow` | component | The same item as a list row (`role="listitem"`). Same props as the tile. |
| `ItemArt` | component | The 16:9 picture: the image, a tinted placeholder with the title's initial, a music cover, or a play badge on a video. Props: `imageUrl`, `title`, `mediaKind?`, `tint`, `initial`, `class?`. |
| `DetailMedia` | component | The detail view's media: `<video>` with poster, music cover plus `<audio>`, or the full image. Props: `item`, `class?`. |
| `itemHref(kind, idOrSlug)` | helper | The public route for an item by kind: `/free-tools/`, `/play/`, `/templates/`, else `/discover/`. |
| `primaryFor(item)` | helper | The primary action: `Use` or `Play` with an http(s) `href`, `Claim` or `Use this recipe` needing an account, or `null`. |
| `mediaFor(item)` | helper | The playable media `{ kind, url }` for a studio item, or `null`. |
| `usageLabel(item)`, `remixLabel(n)`, `usedLabel(n)` | helper | The usage line: `No remixes yet`, `1 remix`, `1.2k remixes`; `Not used yet`, `1 used`, `1.2k used`. |
| `isStudioKind(kind)` | helper | True for `image`, `video` and `music`. |
| `tintFor(id)`, `initialFor(title)`, `CARD_PALETTE` | helper | Placeholder art: a stable coloured theme token per id and the title's first letter. |
| `DiscoverItem`, `DiscoverKind`, `DiscoverMediaKind`, `StudioKind`, `DiscoverPrimary` | type | The item shape and its unions. Consumers map their wire format onto `DiscoverItem`. |

The exact runtime list is frozen by `src/lib/discover/discover-contract.test.ts`;
the server markup by `src/lib/discover/discover.ssr.test.ts`.
