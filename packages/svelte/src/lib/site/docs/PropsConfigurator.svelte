<!--
  @file site/docs/PropsConfigurator.svelte
  @description The props configurator on a /docs/widgets page: the widget's
    example rendered live beside one control per prop the props table can model
    (text, number, switch, a segmented choice or a select for literal unions),
    and below them the resulting spec, copyable. Starts from the example's own
    props; Reset goes back to them. Props whose type the parser cannot model are
    not offered (see props.ts), so an odd type never reaches a control. The
    values are a writable $derived, so they reset when the page moves to another
    widget. Page-sized widgets (`wide`) get the full width, with the controls
    below. Live render and controls are kept out of the search index.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import { highlightJson } from './highlight.js';
	import { applyProps, configurableProps, type ConfigurableProp } from './props.js';

	let {
		spec,
		rows,
		wide = false
	}: {
		spec: Record<string, unknown> & { ui?: unknown };
		rows: { name: string; type: string; description: string }[];
		/** Page-sized widgets: the render takes the full width and the controls flow below it. */
		wide?: boolean;
	} = $props();

	const uid = $props.id();
	const controls = $derived(configurableProps(rows));
	const exampleProps = $derived({ ...(spec.ui as { props?: Record<string, unknown> } | undefined)?.props });

	let values = $derived<Record<string, unknown>>({ ...exampleProps });
	const result = $derived(applyProps(spec, values));
	const json = $derived(JSON.stringify(result, null, 2));
	const changed = $derived(JSON.stringify(values) !== JSON.stringify(exampleProps));

	let copied = $state(false);

	function set(name: string, value: unknown) {
		values = { ...values, [name]: value };
	}

	/** Literal unions short enough to show every option at once get a segmented control. */
	const segmented = (c: ConfigurableProp) =>
		c.control.kind === 'enum' && c.control.options.length <= 4 && c.control.options.every((o) => String(o).length <= 8);

	function pick(c: ConfigurableProp, raw: string) {
		if (c.control.kind !== 'enum') return;
		set(c.name, raw === '' ? undefined : c.control.options.find((o) => String(o) === raw));
	}

	async function copy() {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<figure class="config">
	<div class={['split', wide && 'wide']}>
		<div class="stage" data-pagefind-ignore="all"><Ripple spec={result} /></div>

		<fieldset class="controls" data-pagefind-ignore>
			<legend>Props</legend>
			{#each controls as c (c.name)}
				{@const id = `${uid}-${c.name}`}
				{@const v = values[c.name]}
				<div class="row" title={c.description}>
					{#if c.control.kind === 'boolean'}
						<label class="check">
							<input type="checkbox" role="switch" checked={v === true} onchange={(e) => set(c.name, e.currentTarget.checked)} />
							<code>{c.name}</code>
						</label>
					{:else if segmented(c) && c.control.kind === 'enum'}
						<span class="name" id="{id}-label"><code>{c.name}</code></span>
						<div class="seg" role="radiogroup" aria-labelledby="{id}-label">
							{#each c.control.options as o (o)}
								<label class={{ on: v === o }}>
									<input type="radio" name={id} value={String(o)} checked={v === o} onchange={() => set(c.name, o)} />
									{o}
								</label>
							{/each}
						</div>
					{:else if c.control.kind === 'enum'}
						<label class="name" for={id}><code>{c.name}</code></label>
						<select {id} value={v === undefined ? '' : String(v)} onchange={(e) => pick(c, e.currentTarget.value)}>
							<option value="">Not set</option>
							{#each c.control.options as o (o)}
								<option value={String(o)}>{o}</option>
							{/each}
						</select>
					{:else if c.control.kind === 'number'}
						<label class="name" for={id}><code>{c.name}</code></label>
						<input
							{id}
							type="number"
							value={typeof v === 'number' ? v : ''}
							oninput={(e) => {
								const n = e.currentTarget.valueAsNumber;
								set(c.name, Number.isNaN(n) ? undefined : n);
							}}
						/>
					{:else}
						<label class="name" for={id}><code>{c.name}</code></label>
						<input
							{id}
							type="text"
							value={v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v)}
							oninput={(e) => set(c.name, e.currentTarget.value)}
						/>
					{/if}
				</div>
			{/each}
		</fieldset>
	</div>

	<div class="out">
		<div class="bar">
			<span class="label">Spec</span>
			<span class="btns">
				<button type="button" onclick={() => (values = { ...exampleProps })} disabled={!changed}>Reset</button>
				<button type="button" onclick={copy}>{copied ? 'Copied' : 'Copy spec'}</button>
			</span>
			<span class="sr-only" aria-live="polite">{copied ? 'Spec copied' : ''}</span>
		</div>
		<pre class="spec"><code>{@html highlightJson(json)}</code></pre>
	</div>
</figure>

<style>
	.config {
		margin: 24px 0;
		container-type: inline-size;
	}
	.split {
		display: grid;
		gap: 12px;
	}
	@container (min-width: 560px) {
		.split:not(.wide) {
			grid-template-columns: minmax(0, 1fr) 236px;
		}
		.split:not(.wide) .stage {
			min-height: 300px;
		}
		.split:not(.wide) .controls {
			max-height: 420px;
		}
		.wide .controls {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
			align-items: start;
		}
	}
	.stage {
		display: flex;
		flex-direction: column;
		justify-content: safe center;
		min-height: 220px;
		min-width: 0;
		padding: 24px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
		box-shadow: var(--shadow-card);
		overflow: auto;
	}
	/* Block widgets (forms, charts) take the stage's width; a root that is an inline element (button, badge) is centred. */
	.stage > :global(.ripple-root:has(> :first-child:is(button, span, a, img, code, kbd, svg))) {
		display: flex;
		justify-content: center;
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		margin: 0;
		padding: 12px 14px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow-y: auto;
	}
	legend {
		padding: 0 4px;
		font: 600 13px/1 var(--font-sans);
		color: var(--site-soft);
	}
	.row {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}
	code {
		font: 12.5px/1.3 var(--font-mono);
		font-variant-ligatures: none;
		color: var(--site-ink);
	}
	input[type='text'],
	input[type='number'],
	select {
		width: 100%;
		min-width: 0;
		padding: 6px 8px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: var(--site-ground);
		color: var(--site-ink);
		font: 13px/1.3 var(--font-sans);
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	.check input {
		width: 15px;
		height: 15px;
		margin: 0;
		accent-color: var(--ring);
	}
	.seg {
		display: flex;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.seg label {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		padding: 5px 4px;
		border-radius: calc(var(--radius-control) - 2px);
		color: var(--site-soft);
		font: 500 12.5px/1.2 var(--font-sans);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}
	.seg label:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.seg label.on {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	.seg input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.seg label:has(input:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	:is(input, select, button):focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.out {
		margin-top: 12px;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
	}
	.label {
		font: 600 13px/1 var(--font-sans);
		color: var(--site-soft);
	}
	.btns {
		display: flex;
		gap: 6px;
	}
	.btns button {
		padding: 7px 11px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 500 13px/1 var(--font-sans);
		cursor: pointer;
	}
	.btns button:hover:not(:disabled) {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.btns button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.spec {
		max-height: 320px;
		margin: 0;
		padding: 14px 16px;
		overflow: auto;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-card);
		background: var(--code-bg);
		color: var(--code-ink);
		font: 13px/1.6 var(--font-mono);
		font-variant-ligatures: none;
	}
	.spec code {
		font: inherit;
		color: inherit;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
