<!--
  widgets/data-kit/StageRail.svelte — the stage indicator for multistep data
  widgets (menu-order, booking; design doc 2026-10-09 §3.3, §3.4). It wears
  intent/ChainProgress.svelte's stepper look (muted pills, a numbered circle,
  1px connectors, the current stage filled with the accent) and adds what a
  widget's own stages need: every stage named up front, done stages marked
  with a check, and done stages clickable through `onselect` to go back.
  `disabled` keeps it inert until card.final. Below 360px of container width
  only the current stage keeps its label.
-->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { plain } from './format.js';

	interface Props {
		stages: readonly string[];
		current: number;
		onselect?: (index: number) => void;
		disabled?: boolean;
		class?: string;
	}

	let { stages, current, onselect, disabled = false, class: className }: Props = $props();

	const names = $derived((Array.isArray(stages) ? stages : []).map((s) => plain(s)));
	const at = $derived(Math.min(Math.max(Math.trunc(Number(current) || 0), 0), Math.max(names.length - 1, 0)));
</script>

<nav class={['stage-rail', className]} aria-label="Progress">
	<ol class="stage-rail__list">
		{#each names as name, i}
			{@const step = i < at ? 'done' : i === at ? 'current' : 'todo'}
			<li class="stage-rail__item" data-state={step} aria-current={step === 'current' ? 'step' : undefined}>
				{#if step === 'done' && onselect}
					<button type="button" class="stage-rail__chip" aria-label={name} {disabled} onclick={() => onselect(i)}>
						<span class="stage-rail__num"><Check size={10} strokeWidth={3} aria-hidden="true" /></span>
						<span class="stage-rail__label">{name}</span>
					</button>
				{:else}
					<span class="stage-rail__chip">
						<span class="stage-rail__num">
							{#if step === 'done'}<Check size={10} strokeWidth={3} aria-hidden="true" />{:else}{i + 1}{/if}
						</span>
						<span class="stage-rail__label">{name}</span>
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.stage-rail {
		container-type: inline-size;
	}

	.stage-rail__list {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.stage-rail__list::-webkit-scrollbar {
		display: none;
	}

	.stage-rail__item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	/* ChainProgress's connector, drawn before every stage but the first. */
	.stage-rail__item + .stage-rail__item::before {
		content: '';
		width: 0.5rem;
		height: 1px;
		background: var(--ripple-border);
	}

	.stage-rail__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.55rem;
		border: 0;
		border-radius: 9999px;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 500;
		background: var(--ripple-muted);
		color: var(--ripple-muted-foreground);
		transition: background-color 160ms var(--ripple-ease-out);
	}

	button.stage-rail__chip {
		cursor: pointer;
	}

	button.stage-rail__chip:hover:not(:disabled) {
		background: color-mix(in oklch, var(--ripple-accent) 12%, var(--ripple-muted));
	}

	button.stage-rail__chip:focus-visible {
		outline: 2px solid var(--ripple-ring);
		outline-offset: 2px;
	}

	button.stage-rail__chip:disabled {
		cursor: default;
	}

	[data-state='current'] .stage-rail__chip {
		background: var(--ripple-accent);
		color: var(--ripple-accent-foreground);
	}

	.stage-rail__num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		font-size: 0.62rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		background: color-mix(in oklch, var(--ripple-accent) 12%, transparent);
	}

	[data-state='current'] .stage-rail__num {
		background: color-mix(in oklch, var(--ripple-accent-foreground) 20%, transparent);
	}

	.stage-rail__label {
		max-width: 7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@container (max-width: 359px) {
		.stage-rail__item:not([data-state='current']) .stage-rail__label {
			display: none;
		}
	}
</style>
