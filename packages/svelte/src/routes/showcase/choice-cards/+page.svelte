<!--
  routes/showcase/choice-cards/+page.svelte: dev preview of the flow choice
  cards: a flow `select` step whose option buttons SelectLayout promotes into
  OptionList layout 'cards'. Sections: a laptop step with explicit icon keys and
  hints, the recorded trip step (labels only, icons guessed), a no-icon set,
  three short options (three across), a multi-select set, and the
  `display.layout: 'list'` fallback. Each shows wide (720px) and narrow (360px)
  so the container-query grid is visible. Picks land in the event log.
  Fictional data only, the site is public.
-->
<script lang="ts">
	import Ripple from '$lib/Ripple.svelte';
	import OptionList from '$lib/organisms/OptionList.svelte';

	let log = $state<string[]>([]);
	function push(line: string) {
		log = [...log.slice(-7), line];
	}

	type Opt = [id: string, label: string, icon?: string, description?: string];
	const step = (flowId: string, title: string, options: Opt[], extra: Record<string, unknown> = {}) => ({
		flowId,
		intent: 'select',
		title,
		onComplete: { kind: 'emit', event: `${flowId}.done` },
		...extra,
		ui: {
			type: 'flex',
			props: { direction: 'column', gap: '8px' },
			children: options.map(([id, label, icon, description]) => ({
				type: 'button',
				props: { label, ...(icon ? { icon } : {}), ...(description ? { description } : {}) },
				on_click: { action: 'emit', target: 'flow.submit', value: { selection: { id, label } } }
			}))
		}
	});

	const sections = [
		{
			name: 'Laptop: icon keys and hints',
			spec: step('main_use', 'What will you use it for most?', [
				['work', 'Work and study', 'work', 'Docs, email, video calls'],
				['creative', 'Creative work', 'creative', 'Photo and video editing, design'],
				['gaming', 'Gaming', 'gaming', 'Recent games at good frame rates'],
				['everyday', 'Everyday browsing', 'everyday', 'Web, streaming, a little of everything']
			])
		},
		{
			name: 'Trip: labels only, icons guessed',
			spec: step('trip_style', 'What kind of trip?', [
				['food', 'Food'],
				['culture', 'Culture'],
				['nature', 'Nature'],
				['relaxation', 'Relaxation']
			])
		},
		{
			name: 'Budget: three short options, three across',
			spec: step('budget', 'What is your budget?', [
				['low', 'Under $800', undefined, 'Good value'],
				['mid', '$800 to $1,500', undefined, 'The sweet spot'],
				['high', 'Over $1,500', undefined, 'The most power']
			])
		},
		{
			name: 'No icon matches: label plus hint',
			spec: step('plan', 'Which plan?', [
				['a', 'Option A', undefined, 'Billed monthly, cancel any time'],
				['b', 'Option B', undefined, 'Billed yearly, two months free'],
				['c', 'Option C']
			])
		},
		{
			name: "display.layout 'list': the older rows",
			spec: step('weight', 'Does weight matter?', [
				['yes', 'Yes, I carry it daily', undefined, 'Light and long battery life first'],
				['no', 'Not really', undefined, 'It mostly stays on a desk']
			], { display: { layout: 'list' } })
		}
	];

	const multi = [
		{ id: 'veg', text: 'Vegetarian' },
		{ id: 'fish', text: 'Seafood' },
		{ id: 'sweet', text: 'Desserts' },
		{ id: 'coffee', text: 'Coffee and brunch' }
	];
	let picked = $state<string[]>(['fish']);
</script>

<div class="min-h-screen bg-background p-6">
	<header class="mx-auto max-w-5xl pb-6">
		<h1 class="text-2xl font-semibold">Choice cards</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Flow select steps render their option buttons as cards. Click, or use the arrow keys to move and Enter to pick.
		</p>
	</header>

	<div class="mx-auto max-w-5xl space-y-10">
		{#each sections as s (s.name)}
			<section class="space-y-3">
				<h2 class="text-sm font-medium text-muted-foreground">{s.name}</h2>
				<div class="flex flex-wrap items-start gap-6">
					<div class="w-[720px] max-w-full"><Ripple spec={s.spec} onEvent={(e) => push(`${s.spec.flowId}: ${e.type} ${e.name ?? ''}`)} onComplete={(r) => push(`${s.spec.flowId}: ${JSON.stringify(r.payload)}`)} /></div>
					<div class="w-[360px] max-w-full"><Ripple spec={s.spec} onComplete={(r) => push(`${s.spec.flowId} (narrow): ${JSON.stringify(r.payload)}`)} /></div>
				</div>
			</section>
		{/each}

		<section class="space-y-3">
			<h2 class="text-sm font-medium text-muted-foreground">Multi-select (checkboxes)</h2>
			<div class="w-[720px] max-w-full">
				<OptionList
					options={multi}
					layout="cards"
					selection="multiple"
					label="Food you like"
					selected={picked}
					onSelect={(id) => (picked = picked.includes(id) ? picked.filter((v) => v !== id) : [...picked, id])}
				/>
			</div>
			<p class="text-xs text-muted-foreground">Picked: {picked.join(', ') || 'none'}</p>
		</section>

		<aside class="space-y-2">
			<h2 class="text-sm font-medium text-muted-foreground">Event log</h2>
			<ul class="rounded-md border border-border bg-card p-3 font-mono text-[11px]">
				{#each log as line, i (i)}<li>{line}</li>{:else}<li class="text-muted-foreground">Pick an option.</li>{/each}
			</ul>
		</aside>
	</div>
</div>
