<!--
  @file routes/showcase/GalleryGrid.svelte
  @description The thumbnail card grid /showcase and /live share. Each card is
    one link (a real href, so it opens in a new tab and works without
    JavaScript), named by its h2 title and described by its caption: a 4:3
    screenshot cropped to the top, a small tag, the title and the caption.
    Thumbs are the dark-theme captures in static/thumbs
    (scripts/capture-thumbs.ts), lazy-loaded at their real size.
    `onopen` lets a page handle a plain click in place (/live replays the run
    there); modified clicks keep the browser's default. Columns fill from a
    240px minimum, and the card body sizes off its own width (container
    query), so the grid holds from 375px to wide screens. Site tokens only.
-->
<script lang="ts">
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
		onopen
	}: { items: Item[]; label: string; onopen?: (item: Item) => void } = $props();

	const W = 800;
	const H = 600;

	function click(e: MouseEvent, item: Item) {
		if (!onopen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		onopen(item);
	}
</script>

<ul class="grid" aria-label={label}>
	{#each items as item (item.id)}
		<li>
			<a
				class="card"
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
				<div class="body">
					<span class="tag">{item.tag}</span>
					<h2 class="title" id="g-{item.id}">{item.title}</h2>
					<span class="caption" id="g-{item.id}-c">{item.caption}</span>
				</div>
			</a>
		</li>
	{/each}
</ul>

<style>
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
		gap: 16px;
	}
	.grid li {
		min-width: 0;
	}
	.card {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-panel, var(--card));
		color: var(--site-ink);
		text-decoration: none;
		overflow: hidden;
		transition:
			border-color 0.15s,
			transform 0.15s var(--ease-out-quart);
	}
	.card:hover {
		border-color: color-mix(in oklch, var(--site-ink) 28%, transparent);
	}
	.card:hover .title {
		color: var(--primary-ink);
	}
	.card:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.card:active {
		transform: translateY(1px);
	}
	.shot {
		display: block;
		aspect-ratio: 4 / 3;
		background: var(--code-bg);
		border-bottom: 1px solid var(--site-line);
	}
	.shot img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}
	.body {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		padding: 12px 14px 14px;
	}
	.tag {
		margin-bottom: 4px;
		padding: 1px 7px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		line-height: 1.6;
		color: var(--site-soft);
	}
	.title {
		margin: 0;
		font-weight: 600;
		font-size: 15px;
		line-height: 1.3;
		transition: color 0.15s;
	}
	.caption {
		font-size: 13.5px;
		line-height: 1.45;
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	@container (min-width: 320px) {
		.body {
			padding: 14px 16px 16px;
		}
		.title {
			font-size: 16px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
