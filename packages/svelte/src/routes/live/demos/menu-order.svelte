<!--
  routes/live/demos/menu-order.svelte — dev preview of the menu-order
  widget for screenshots and visual QA: a fictional burger restaurant at a
  wide (760px) and a narrow (360px) frame, both orderable, plus a display-only
  card (no `checkout`, as a model-only card renders before hydration). A
  fourth section opens the customise step on load (a client-only click on
  "Choose options", wide and 360px) to show the option tiles, inferred icons,
  the chosen line and the no-photo tile. Photos
  are empty on purpose, so the icon fallback is what you see. The wide frame
  scrolls like a transcript so the total bar sticks. The emitted
  checkout cart and the bound cart print under the wide frame. Opened in place from the /live gallery.; fictional data only, the site is public.
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import { onMount } from 'svelte';
	import MenuOrder from '$lib/widgets/composite/MenuOrder.svelte';
	import type { Cart, CartDraft, MenuItem } from '$lib/widgets/composite/menu-order.js';

	const size = {
		id: 'size',
		name: 'Size',
		choose: 'one' as const,
		required: true,
		options: [
			{ id: 'single', name: 'Single patty', price_delta: 0 },
			{ id: 'double', name: 'Double patty', price_delta: 2.5 }
		]
	};
	const sauce = {
		id: 'sauce',
		name: 'Sauce',
		choose: 'one' as const,
		options: [
			{ id: 'house', name: 'House sauce', price_delta: 0 },
			{ id: 'smoked-aioli', name: 'Smoked aioli', price_delta: 0.5 },
			{ id: 'hot-honey', name: 'Hot honey', price_delta: 0.75 }
		]
	};

	const items: MenuItem[] = [
		{
			id: 'griddle-classic',
			product_id: 'griddle-classic',
			name: 'Griddle Classic',
			description: 'Smashed beef, American cheese, pickles, onions and house sauce on a potato bun.',
			price: 11.5,
			kind: 'main',
			category: 'Burgers',
			tags: ['Most ordered'],
			groups: [
				size,
				{
					id: 'extras',
					name: 'Extras',
					choose: 'many',
					max: 3,
					options: [
						{ id: 'bacon', name: 'Thick-cut bacon', price_delta: 2 },
						{ id: 'egg', name: 'Fried egg', price_delta: 1.25 },
						{ id: 'jalapenos', name: 'Pickled jalapeños', price_delta: 0.75 },
						{ id: 'extra-cheese', name: 'Extra cheese', price_delta: 1 }
					]
				},
				sauce
			]
		},
		{
			id: 'mushroom-melt',
			product_id: 'mushroom-melt',
			name: 'Mushroom Melt',
			description: 'Roasted portobello, Swiss, caramelised onions and thyme mayo.',
			price: 12.25,
			kind: 'main',
			category: 'Burgers',
			tags: ['Vegetarian'],
			groups: [
				size,
				{
					id: 'extras',
					name: 'Extras',
					choose: 'many',
					max: 3,
					options: [
						{ id: 'avocado', name: 'Avocado', price_delta: 1.5 },
						{ id: 'roast-peppers', name: 'Roast peppers', price_delta: 1 },
						{ id: 'vegan-cheese', name: 'Vegan cheese', price_delta: 1 }
					]
				},
				sauce
			]
		},
		{ id: 'crispy-chicken', product_id: 'crispy-chicken', name: 'Crispy Chicken Sandwich', description: 'Buttermilk thigh, slaw and hot honey.', price: 11.75, kind: 'main', category: 'Burgers', tags: ['Spicy'] },
		{ id: 'shoestring-fries', product_id: 'shoestring-fries', name: 'Shoestring Fries', description: 'Sea salt and rosemary.', price: 3.95, kind: 'side', category: 'Sides', tags: ['Vegan'] },
		{ id: 'onion-rings', product_id: 'onion-rings', name: 'Beer-Batter Onion Rings', description: 'With smoked aioli.', price: 4.75, kind: 'side', category: 'Sides' },
		{ id: 'side-salad', product_id: 'side-salad', name: 'Little Gem Salad', description: 'Lemon, parmesan, toasted seeds.', price: 5.5, kind: 'side', category: 'Sides', tags: ['Vegetarian'] },
		{ id: 'malted-shake', product_id: 'malted-shake', name: 'Malted Vanilla Shake', description: 'Thick, with a malt crumb.', price: 5.95, kind: 'dessert', category: 'Shakes & drinks' },
		{ id: 'lemonade', product_id: 'lemonade', name: 'Fresh Lemonade', price: 3.25, kind: 'drink', category: 'Shakes & drinks' },
		{ id: 'cola', product_id: 'cola', name: 'Craft Cola', price: 2.75, kind: 'drink', category: 'Shakes & drinks' }
	];

	let cart = $state<CartDraft>();
	let checkedOut = $state<Cart>();
	let narrowCart = $state<CartDraft>();

	// Visual QA only: open the customise frames on the burger with the most options.
	let custom = $state<HTMLElement>();
	onMount(() => {
		for (const b of custom?.querySelectorAll<HTMLButtonElement>('button[aria-label="Choose options for Griddle Classic"]') ?? []) b.click();
	});
</script>


<div class="showcase">
	<DetailHeader id="menu-order">Copper Griddle is fictional. Photos are empty on purpose: the icon tiles are the fallback a missing or failed photo gets.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Wide card (760px), orderable</h2>
		<p class="section-caption">Pickup or delivery with a fee, the model's best pick, a preset of one fries. Drag the frame's corner to cross 720 and 560.</p>
		<div data-thumb class="pane frame chat" style:width="760px">
			<MenuOrder
				title="Copper Griddle"
				subtitle="Smash burgers on Harbour Street · open until 10 PM"
				currency="USD"
				{items}
				featured={{ id: 'mushroom-melt', reason: 'Vegetarian, and the house favourite under $13.' }}
				preset={[{ id: 'shoestring-fries', qty: 1 }]}
				fulfilment={['pickup', 'delivery']}
				fee={{ delivery: 3.99 }}
				checkout
				bind:cart
				oncheckout={(c) => (checkedOut = c)}
			/>
		</div>
		<div class="pane out">
			<div>
				<h3>Bound cart</h3>
				<pre>{cart ? JSON.stringify(cart, null, 2) : '(untouched: the preset shows until the first edit)'}</pre>
			</div>
			<div>
				<h3>on_checkout payload</h3>
				<pre>{checkedOut ? JSON.stringify(checkedOut, null, 2) : '(continue to payment to see it)'}</pre>
			</div>
		</div>
	</section>

	<section class="showcase-section" bind:this={custom}>
		<h2 class="showcase-section-title">Customise step, opened</h2>
		<p class="section-caption">Griddle Classic opened on load: a segmented size row, extras as a tile grid with a 3-pick cap, sauces as tiles, icons inferred from the option names, and the tinted tile a dish without a photo gets.</p>
		<div class="pane frame" style:width="760px">
			<MenuOrder title="Copper Griddle" currency="USD" {items} fulfilment={['pickup', 'delivery']} fee={{ delivery: 3.99 }} checkout />
		</div>
		<div class="pane frame" style:width="360px">
			<MenuOrder title="Copper Griddle" {items} checkout />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Narrow card (360px), orderable, pickup only</h2>
		<div class="pane frame" style:width="360px">
			<MenuOrder
				title="Copper Griddle"
				verdict={{ text: 'Griddle Classic if you are hungry; Mushroom Melt to skip the meat.', status: 'good' }}
				{items}
				checkout
				bind:cart={narrowCart}
			/>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Display only (no checkout)</h2>
		<p class="section-caption">What a model-only card shows before the store fills it: the menu, no steppers, no stage rail, no total bar.</p>
		<div class="pane frame" style:width="560px">
			<MenuOrder title="Copper Griddle" items={items.slice(0, 6)} featured={{ id: 'griddle-classic', reason: 'The one most people order.' }} />
		</div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		color: var(--foreground);
	}
	.section-caption {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin: 0 0 1rem;
	}
	.showcase-section {
		margin-bottom: 2.5rem;
	}
	.showcase-section-title {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.pane {
		padding: 1rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--muted) 35%, var(--background));
		margin-bottom: 0.75rem;
	}
	.frame {
		max-width: 100%;
		resize: horizontal;
		overflow: auto;
	}
	/* A chat transcript scrolls; so does this frame, so the total bar sticks. */
	.chat {
		max-height: 680px;
	}
	.out {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
	}
	.out h3 {
		font-size: 0.8125rem;
		font-weight: 600;
		margin: 0 0 0.25rem;
	}
	.out pre {
		margin: 0;
		font-size: 0.7rem;
		white-space: pre-wrap;
		color: var(--muted-foreground);
	}
</style>
