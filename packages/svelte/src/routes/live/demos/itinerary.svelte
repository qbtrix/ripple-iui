<!--
  routes/live/demos/itinerary.svelte — dev preview of the itinerary data
  widget for screenshots and visual QA: a 5-day Tokyo trip at full width and a
  3-day Lisbon trip in a 360px frame (drag the corner to resize). Both bind
  `days`, so ticks and added stops show in the JSON readout. Opened in place from the /live gallery. Fictional airlines and hotels: the site is
  public.
-->
<script lang="ts">
	import DetailHeader from './DetailHeader.svelte';
	import Itinerary from '$lib/widgets/composite/Itinerary.svelte';
	import type { ItineraryDay, ItineraryLeg, PackingGroup } from '$lib/widgets/composite/Itinerary.svelte';

	let tokyoDays = $state<ItineraryDay[]>([
		{
			id: 'arrive',
			label: 'Day 1',
			when: 'Fri 16 Oct',
			theme: 'Land and settle into Asakusa',
			stay: 'Hotel Kinsei, Asakusa',
			stops: [
				{ time: '15:40', title: 'Land at Haneda', kind: 'flight', place: 'Terminal 3', done: true },
				{ time: '17:00', title: 'Keikyu line to Asakusa', kind: 'transit', minutes: 45, cost: 6, done: true },
				{ time: '19:30', title: 'Yakitori under the tracks', kind: 'food', place: 'Yurakucho', cost: 32, done: true }
			]
		},
		{
			id: 'old-tokyo',
			label: 'Day 2',
			when: 'Sat 17 Oct',
			theme: 'Old Tokyo and the river',
			stay: 'Hotel Kinsei, Asakusa',
			stops: [
				{ time: '07:30', title: 'Senso-ji before the crowds', kind: 'sight', place: 'Asakusa', minutes: 60, cost: 0, must: true, done: true },
				{ time: '09:30', title: 'Melon pan at Kagetsudo', kind: 'food', cost: 4, done: true },
				{ time: '11:00', title: 'Sumida river water bus', kind: 'activity', minutes: 40, cost: 12 },
				{ time: '13:00', title: 'Tsukiji outer market lunch', kind: 'food', place: 'Tsukiji', cost: 28, must: true },
				{ time: '16:00', title: 'Hamarikyu gardens tea house', kind: 'nature', minutes: 75, cost: 9 },
				{ time: '20:00', title: 'Golden Gai bar crawl', kind: 'nightlife', place: 'Shinjuku', cost: 45 }
			]
		},
		{
			id: 'west',
			label: 'Day 3',
			when: 'Sun 18 Oct',
			theme: 'Shibuya, Harajuku, Shimokitazawa',
			stay: 'Hotel Kinsei, Asakusa',
			stops: [
				{ time: '09:00', title: 'Meiji shrine forest walk', kind: 'nature', minutes: 60, cost: 0 },
				{ time: '11:00', title: 'Cat Street vintage shops', kind: 'shop', place: 'Harajuku', cost: 80 },
				{ time: '14:00', title: 'Shibuya Sky at golden hour', kind: 'sight', minutes: 90, cost: 22, must: true },
				{ time: '19:00', title: 'Curry in Shimokitazawa', kind: 'food', cost: 16 }
			]
		},
		{
			id: 'hakone',
			label: 'Day 4',
			when: 'Mon 19 Oct',
			theme: 'Hakone loop and an onsen night',
			stay: 'Ryokan Mizunoto, Gora',
			stops: [
				{ time: '08:10', title: 'Romance express to Hakone-Yumoto', kind: 'transit', minutes: 85 },
				{ time: '11:00', title: 'Owakudani ropeway', kind: 'activity', minutes: 30, cost: 18 },
				{ time: '13:00', title: 'Pirate ship across Lake Ashi', kind: 'activity', minutes: 40, cost: 14 },
				{ time: '15:30', title: 'Open-air sculpture museum', kind: 'sight', minutes: 120, cost: 13 },
				{ time: '18:30', title: 'Kaiseki dinner at the ryokan', kind: 'food' }
			]
		},
		{
			id: 'home',
			label: 'Day 5',
			when: 'Tue 20 Oct',
			theme: 'Back to Tokyo, fly home',
			stops: [
				{ time: '10:00', title: 'Train back to Shinjuku', kind: 'transit', minutes: 85 },
				{ time: '13:00', title: 'Depachika lunch and gifts', kind: 'shop', place: 'Isetan', cost: 60 },
				{ time: '18:20', title: 'Kite Air 13 to San Francisco', kind: 'flight', place: 'Haneda' }
			]
		}
	]);

	const tokyoLegs: ItineraryLeg[] = [
		{ from: 'San Francisco', to: 'Tokyo', kind: 'flight', ref: 'Kite Air 12, nonstop', minutes: 660, cost: 940 },
		{ from: 'Tokyo', to: 'Hakone', kind: 'train', ref: 'Romance express', minutes: 85, cost: 22 },
		{ from: 'Hakone', to: 'Tokyo', kind: 'train', ref: 'Romance express', minutes: 85, cost: 22 },
		{ from: 'Tokyo', to: 'San Francisco', kind: 'flight', ref: 'Kite Air 13, nonstop', minutes: 590 }
	];

	const tokyoPacking: PackingGroup[] = [
		{ group: 'Documents', items: ['Passport', 'IC transit card', 'Ryokan booking'] },
		{ group: 'Clothes', items: ['Layers for 12 to 20°C', 'Slip-on shoes for temples', 'Light rain shell'] },
		{ group: 'Tech', items: ['Type A adapter', 'Pocket wifi', 'Power bank'] }
	];

	let lisbonDays = $state<ItineraryDay[]>([
		{
			label: 'Day 1',
			when: 'Thu 5 Nov',
			theme: 'Alfama and the river',
			stay: 'Casa Azulejo, Alfama',
			stops: [
				{ time: '09:30', title: 'Miradouro da Graça', kind: 'sight', minutes: 45, cost: 0 },
				{ time: '11:00', title: 'Tram 28 to Baixa', kind: 'transit', minutes: 30, cost: 3 },
				{ time: '13:00', title: 'Grilled sardines at Taberna Rio', kind: 'food', cost: 28, must: true },
				{ time: '21:30', title: 'Fado night in a tasca', kind: 'nightlife', cost: 40 }
			]
		},
		{
			label: 'Day 2',
			when: 'Fri 6 Nov',
			theme: 'Sintra palaces',
			stay: 'Casa Azulejo, Alfama',
			stops: [
				{ time: '10:00', title: 'Pena Palace', kind: 'sight', minutes: 120, cost: 20, must: true },
				{ time: '13:30', title: 'Travesseiros at a pastry counter', kind: 'food', cost: 6 },
				{ time: '14:30', title: 'Moorish Castle walls', kind: 'nature', minutes: 90, cost: 12 }
			]
		},
		{
			label: 'Day 3',
			when: 'Sat 7 Nov',
			theme: 'Belém and the coast',
			stops: [
				{ time: '10:00', title: 'Jerónimos cloister', kind: 'sight', minutes: 60, cost: 12 },
				{ time: '11:30', title: 'Custard tarts, still warm', kind: 'food', cost: 5, must: true },
				{ time: '15:00', title: 'Train out to Cascais beach', kind: 'transit', minutes: 40, cost: 3 }
			]
		}
	]);

	const lisbonLegs: ItineraryLeg[] = [
		{ from: 'Lisbon', to: 'Sintra', kind: 'train', ref: 'Rossio line', minutes: 40, cost: 5 },
		{ from: 'Sintra', to: 'Lisbon', kind: 'train', ref: 'Rossio line', minutes: 40, cost: 5 },
		{ from: 'Lisbon', to: 'Cascais', kind: 'train', ref: 'Cascais line', minutes: 40, cost: 3 }
	];

	let tokyoOpen = $state(1);
</script>


<div class="showcase">
	<DetailHeader id="itinerary">Tick a stop with its rail dot, add one under any open day. Both examples bind <code>days</code>; the readout shows the emitted array.</DetailHeader>

	<section class="showcase-section">
		<h2 class="showcase-section-title">5 days in Tokyo, full width</h2>
		<div data-thumb class="pane">
			<Itinerary
				title="5 days in Tokyo"
				subtitle="Fri 16 to Tue 20 Oct · 2 travellers"
				verdict={{ text: 'Planned spend sits inside budget; Day 2 is the busy one.', status: 'good' }}
				currency="USD"
				budget={2400}
				route={['San Francisco', 'Tokyo', 'Hakone', 'Tokyo', 'San Francisco']}
				legs={tokyoLegs}
				packing={tokyoPacking}
				bind:days={tokyoDays}
				bind:open={tokyoOpen}
			/>
		</div>
		<p class="section-caption">Open day: {tokyoOpen} · stops done: {tokyoDays.flatMap((d) => d.stops ?? []).filter((s) => s.done).length}</p>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">3 days in Lisbon, 360px frame</h2>
		<p class="section-caption">Drag the frame's corner. Tight budget, so the spend line warns; no verdict, so the spend line leads.</p>
		<div class="pane frame" style:width="360px">
			<Itinerary
				title="Long weekend in Lisbon"
				subtitle="Thu 5 to Sat 7 Nov"
				currency="USD"
				budget={155}
				legs={lisbonLegs}
				packing={[{ group: 'Bag', items: ['Grippy shoes for the cobbles', 'Light jacket', 'Sunscreen'] }]}
				bind:days={lisbonDays}
			/>
		</div>
		<details class="readout">
			<summary>Bound <code>days</code> (Lisbon)</summary>
			<pre>{JSON.stringify(lisbonDays, null, 2)}</pre>
		</details>
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
	.readout {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.readout pre {
		max-height: 320px;
		overflow: auto;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: var(--muted);
	}
</style>
