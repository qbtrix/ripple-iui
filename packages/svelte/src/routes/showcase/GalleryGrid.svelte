<!--
  @file routes/showcase/GalleryGrid.svelte
  @description One titled section of the /showcase and /live galleries, laid
    out like Paw OS Discover (lib/discover: GRID_CLASS from layout.ts, the
    DiscoverTile look). A section header (title and a muted blurb, when given),
    then an auto-fill grid of tiles: a 16:9 picture with a 10px radius and a
    hairline, and the title, a one-line caption and tag BELOW it, no card chrome.
    Hover or focus lifts the picture 1px and brightens its border; reduced
    motion keeps it still. Each tile is one link (a real href, so it opens in
    a new tab and works without JavaScript), named by its h3 title and
    described by its caption; /live finds a tile's link by the `g-<id>` title
    id. Thumbs are the 800x600 dark captures in static/thumbs
    (scripts/capture-thumbs.ts), cropped top-anchored into the 16:9 frame and
    lazy-loaded. `onopen` lets a page handle a plain click in place (/live
    replays the run there); modified clicks keep the browser's default.
    DiscoverTile and ItemArt are not used: ItemArt takes only absolute http(s)
    pictures, and the tile carries remix and usage controls a gallery has no
    use for.
-->
<script lang="ts">
	import { GRID_CLASS } from '$lib/discover/layout.js';

	interface Item {
		id: string;
		title: string;
		caption: string;
		tag: string;
		href: string;
	}

	let {
		items,
		label,
		title,
		blurb,
		onopen
	}: { items: Item[]; label: string; title?: string; blurb?: string; onopen?: (item: Item) => void } = $props();

	const W = 800;
	const H = 600;
	const headId = $derived(`gs-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

	function click(e: MouseEvent, item: Item) {
		if (!onopen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		onopen(item);
	}
</script>

<section class="section" aria-labelledby={title ? headId : undefined}>
	{#if title}
		<header class="section-head">
			<h2 id={headId}>{title}</h2>
			{#if blurb}<p>{blurb}</p>{/if}
		</header>
	{/if}
	<ul class="tiles {GRID_CLASS}" aria-label={label}>
		{#each items as item (item.id)}
			<li>
				<a
					class="tile"
					href={item.href}
					aria-labelledby="g-{item.id}"
					aria-describedby="g-{item.id}-c"
					onclick={(e) => click(e, item)}
				>
					<div class="shot">
						<img
							src="/thumbs/{item.id}.webp"
							width={W}
							height={H}
							loading="lazy"
							decoding="async"
							alt="Screenshot of the {item.title} card"
						/>
					</div>
					<h3 class="title" id="g-{item.id}">{item.title}</h3>
					<span class="caption" id="g-{item.id}-c">{item.caption}</span>
					<span class="tag">{item.tag}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.section-head h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		line-height: 1.3;
		letter-spacing: -0.01em;
		color: var(--site-ink);
	}
	.section-head p {
		margin: 2px 0 0;
		font-size: 14px;
		line-height: 1.45;
		color: var(--site-soft);
	}
	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.tiles li {
		min-width: 0;
	}
	.tile {
		display: flex;
		flex-direction: column;
		min-width: 0;
		color: var(--site-ink);
		text-decoration: none;
		border-radius: 10px;
	}
	.tile:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 4px;
	}
	.shot {
		aspect-ratio: 16 / 9;
		margin-bottom: 12px;
		overflow: hidden;
		border: 1px solid var(--site-line);
		border-radius: 10px;
		background: var(--site-inset, var(--code-bg));
		transition:
			transform 150ms ease-out,
			border-color 150ms ease-out;
	}
	.tile:hover .shot,
	.tile:focus-visible .shot {
		transform: translateY(-1px);
		border-color: color-mix(in oklch, var(--site-ink-base) 26%, transparent);
	}
	.shot img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	.title {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 15px;
		font-weight: 600;
		line-height: 1.35;
	}
	.tile:hover .title {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.caption {
		margin-top: 2px;
		font-size: 13px;
		line-height: 1.45;
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.tag {
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.4;
		color: var(--site-soft);
	}
	@media (prefers-reduced-motion: reduce) {
		.shot {
			transition: none;
		}
		.tile:hover .shot,
		.tile:focus-visible .shot {
			transform: none;
		}
	}
</style>
