<!--
  routes/showcase/data-kit/+page.svelte — dev preview of the internal data kit
  (widgets/data-kit) for screenshots and visual QA: status pills, the verdict
  line, stat chips, the section pairing rule at three container widths, photo
  tiles and their fallbacks, the stage rail, the row motion, the formatters
  and the kind icon maps. URL-only (not linked from the showcase index), like
  showcase/stat. Fictional data only: the site is public.
-->
<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import {
		PhotoTile,
		SectionCard,
		SectionGrid,
		StageRail,
		StatChip,
		StatusPill,
		VerdictLine,
		STATUSES,
		STOP_ICONS,
		LEG_ICONS,
		MEAL_ICONS,
		AISLE_ICONS,
		MENU_ICONS,
		SERVICE_ICONS,
		EXERCISE_ICONS,
		RECORD_ICONS,
		money,
		plain,
		dateLabel,
		rise
	} from '$lib/widgets/data-kit/index.js';
	import type { Stat } from '$lib/widgets/data-kit/types.js';

	const stats: Stat[] = [
		{ label: 'Blood pressure', value: '138/86', unit: 'mmHg', status: 'warn', trend: { dir: 'down', text: 'improving', good: 'down' } },
		{ label: 'Resting HR', value: 64, unit: 'bpm', status: 'good' },
		{ label: 'LDL', value: 162, unit: 'mg/dL', status: 'bad', trend: { dir: 'up', text: '+12 since May', good: 'down' } },
		{ label: 'Weight', value: Number.NaN, unit: 'kg' }
	];

	type Demo = { kind: 'list' | 'kv' | 'table'; title: string; rows: string[] };
	const sections: Demo[] = [
		{ kind: 'list', title: 'Conditions', rows: ['Type 2 diabetes', 'Hypertension', 'Seasonal allergies'] },
		{ kind: 'kv', title: 'Coverage', rows: ['Plan: Harbor Gold', 'Member since: 2019'] },
		{ kind: 'table', title: 'Recent labs', rows: ['HbA1c 7.9%', 'LDL 162 mg/dL', 'eGFR 88'] },
		{ kind: 'list', title: 'Medications', rows: ['Metformin 500 mg', 'Lisinopril 10 mg'] }
	];
	const half = (s: Demo) => s.kind !== 'table' && s.rows.length > 0 && s.rows.length <= 6;

	const stages = ['Browse', 'Customise', 'Details', 'Review'];
	let stage = $state(1);

	let rows = $state(['Senso-ji at dawn', 'Tsukiji outer market']);
	const more = ['Ueno park', 'Akihabara', 'Shibuya crossing', 'Golden Gai'];

	const maps: Array<[string, Record<string, LucideIcon>]> = [
		['STOP_ICONS', STOP_ICONS],
		['LEG_ICONS', LEG_ICONS],
		['MEAL_ICONS', MEAL_ICONS],
		['AISLE_ICONS', AISLE_ICONS],
		['MENU_ICONS', MENU_ICONS],
		['SERVICE_ICONS', SERVICE_ICONS],
		['EXERCISE_ICONS', EXERCISE_ICONS],
		['RECORD_ICONS', RECORD_ICONS]
	];

	const formats: Array<[string, string]> = [
		["money(13.49, 'USD')", money(13.49, 'USD')],
		["money(8, 'USD', { sign: true })", money(8, 'USD', { sign: true })],
		["money(1299, 'EUR')", money(1299, 'EUR')],
		["money(5, '$')  // junk code", money(5, '$')],
		['money(NaN)', money(Number.NaN)],
		["plain('**HbA1c** above target')", plain('**HbA1c** above target')],
		["dateLabel('Next Tuesday')", dateLabel('Next Tuesday')],
		["dateLabel('2026-10-16')", dateLabel('2026-10-16')],
		["dateLabel('2026-02-31')", dateLabel('2026-02-31')],
		['dateLabel(undefined)', JSON.stringify(dateLabel(undefined))]
	];
</script>

<svelte:head><title>Ripple · Data kit</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Data kit — visual QA</h1>
		<p>The shared parts behind the data widgets. Internal: none of these is a registered widget. Toggle the theme in the top bar to check dark.</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Verdict and status</h2>
		<div class="pane stack">
			<VerdictLine verdict={{ text: 'HbA1c and LDL above target; allergy to penicillin.', status: 'bad' }} />
			<VerdictLine verdict={{ text: 'Nimbus Pro 15 if you edit video; Aero 14 for battery.', status: 'good' }} />
			<div class="row">
				{#each STATUSES as s (s)}<StatusPill status={s} />{/each}
				<StatusPill status="warn" label="elevated" />
				<StatusPill status="bad" label="Full" />
			</div>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Stat chips</h2>
		<div class="pane stats">
			{#each stats as s, i (i)}<StatChip {...s} />{/each}
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Sections and the pairing rule</h2>
		<p class="section-caption">Drag the frame's corner. At 720px+ the two short lists pair; the table and the odd list span. Below that, one column.</p>
		{#each [360, 760] as width (width)}
			<div class="pane frame" style:width="{width}px">
				<SectionGrid {sections} {half}>
					{#snippet section(s: Demo)}
						<SectionCard title={s.title} icon={s.kind === 'table' ? undefined : STOP_ICONS.sight}>
							<ul class="lines">{#each s.rows as r, i (i)}<li>{r}</li>{/each}</ul>
						</SectionCard>
					{/snippet}
				</SectionGrid>
			</div>
		{/each}
		<div class="pane row">
			<SectionCard title="Stops" pending class="min-w-[200px] flex-1" />
			<SectionCard title="Stops" empty="No stops yet. Ask for a day plan." class="min-w-[200px] flex-1" />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Photo tiles</h2>
		<p class="section-caption">4:3 loaded, 1:1 with no src, 16:9 with a URL that fails, 1:1 refused (javascript:). None shows a broken image.</p>
		<div class="pane row">
			<PhotoTile src="/logos/lumen.svg" alt="Lumen logo" ratio="4:3" class="w-24" icon={MENU_ICONS.main} />
			<PhotoTile alt="Classic burger" ratio="1:1" class="w-14" icon={MENU_ICONS.main} />
			<PhotoTile src="/photos/does-not-exist.webp" alt="Harbor view" ratio="16:9" class="w-48" icon={STOP_ICONS.sight} />
			<PhotoTile src="javascript:alert(1)" alt="Refused" ratio="1:1" class="w-12" icon={SERVICE_ICONS.hair} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Stage rail</h2>
		<div class="pane stack">
			<StageRail {stages} current={stage} onselect={(i) => (stage = i)} />
			<div class="frame narrow"><StageRail {stages} current={stage} /></div>
			<div class="row">
				<button type="button" class="btn" onclick={() => (stage = Math.max(stage - 1, 0))}>Back</button>
				<button type="button" class="btn" onclick={() => (stage = Math.min(stage + 1, stages.length - 1))}>Next</button>
			</div>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Row motion</h2>
		<div class="pane stack">
			<ul class="lines">
				{#each rows as r, i (r)}<li in:rise={{ index: i % 2 }}>{r}</li>{/each}
			</ul>
			<div class="row">
				<button type="button" class="btn" disabled={rows.length >= 6} onclick={() => (rows = [...rows, ...more.slice(rows.length - 2, rows.length)])}>Add two stops</button>
			</div>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Formatters</h2>
		<table class="pane fmt">
			<tbody>
				{#each formats as [call, out] (call)}<tr><td><code>{call}</code></td><td>{out}</td></tr>{/each}
			</tbody>
		</table>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Kind icons</h2>
		<div class="pane stack">
			{#each maps as [name, map] (name)}
				<div class="row">
					<code class="map">{name}</code>
					{#each Object.entries(map) as [kind, Icon] (kind)}
						<span class="kind"><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{kind}</span>
					{/each}
				</div>
			{/each}
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
	.showcase-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}
	.showcase-header p,
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
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.5rem;
	}
	.frame {
		max-width: 100%;
		resize: horizontal;
		overflow: auto;
	}
	.narrow {
		width: 300px;
		max-width: 100%;
	}
	.lines {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.8125rem;
		display: grid;
		gap: 0.25rem;
	}
	.btn {
		padding: 0.35rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: var(--background);
		color: var(--foreground);
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.fmt {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}
	.fmt td {
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
	}
	.map {
		min-width: 9rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
	.kind {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.15rem 0.5rem;
		border-radius: 0.375rem;
		background: var(--muted);
		font-size: 0.75rem;
	}
</style>
