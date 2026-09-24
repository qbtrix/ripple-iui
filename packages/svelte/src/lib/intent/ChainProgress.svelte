<!--
  ChainProgress.svelte — step progress chrome for Chain Flow (RFC 13, every-surface).
  Created 2026-06-07.
  Ported from ocean-flow's ChainProgress.svelte and re-themed onto Ripple's
  --ripple-* design tokens. Two modes:
    - 'dots'    minimal Apple-style circles + "Step N of M" counter (default);
    - 'stepper' compact horizontal chips of completed steps + a "current" pill.
  The genesis quizMode (correct/incorrect colouring) is intentionally dropped for
  this slice — it pulled quiz-specific deps and the flow primitive has no quiz
  concept yet. Steps are PURELY presentational: this reads `completed`/`current`/
  `total` already computed by FlowRunner from the executor's history; it never
  touches the executor or any service.
-->
<script lang="ts">
	interface StepInfo {
		/** Step heading (spec title), used in the hover tooltip. */
		title?: string;
		/** Short display value for the step (e.g. the selection label). */
		value?: string;
	}

	interface Props {
		/** Completed steps to display (everything before the current one). */
		steps?: StepInfo[];
		/** Current step number (1-indexed). */
		current: number;
		/** Total steps if known; when absent, only the live count is shown. */
		total?: number;
		/** 'dots' for minimal, 'stepper' for labelled chips. */
		mode?: 'dots' | 'stepper';
	}

	let { steps = [], current, total, mode = 'dots' }: Props = $props();

	// When total is unknown (dynamic chain_map ahead), fall back to the live count.
	const totalCount = $derived(total ?? Math.max(steps.length + 1, current));
	const completedSteps = $derived(steps.length);
</script>

<div class="chain-progress" data-mode={mode}>
	{#if mode === 'dots'}
		<div class="chain-progress__dots">
			{#each Array(totalCount) as _, i}
				{@const stepNum = i + 1}
				{@const isCompleted = stepNum <= completedSteps}
				{@const isCurrent = stepNum === current}
				{@const stepData = steps[i]}
				<div class="chain-progress__dot-wrap">
					<span
						class="chain-progress__dot"
						class:is-current={isCurrent}
						class:is-completed={isCompleted && !isCurrent}
					></span>
					{#if isCompleted && stepData?.value}
						<span class="chain-progress__tip">{stepData.value}</span>
					{/if}
				</div>
			{/each}
		</div>
		<p class="chain-progress__counter">
			Step {current}{total ? ` of ${total}` : ''}
		</p>
	{:else}
		<div class="chain-progress__stepper">
			{#each steps as step, i (i)}
				<div class="chain-progress__chip">
					<span class="chain-progress__chip-num">{i + 1}</span>
					<span class="chain-progress__chip-label">
						{step.value || step.title || `Step ${i + 1}`}
					</span>
				</div>
				<span class="chain-progress__connector"></span>
			{/each}
			<div class="chain-progress__chip chain-progress__chip--current">
				<span class="chain-progress__chip-num chain-progress__chip-num--current">{current}</span>
				<span class="chain-progress__chip-label">Current</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.chain-progress {
		padding: 0.5rem 0;
	}

	/* ---- Dots mode ---- */
	.chain-progress__dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.chain-progress__dot-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chain-progress__dot {
		display: block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: color-mix(in oklch, var(--ripple-muted-foreground) 25%, transparent);
		transition:
			width 200ms ease-out,
			height 200ms ease-out,
			background-color 200ms ease-out,
			transform 200ms ease-out;
	}

	.chain-progress__dot.is-completed {
		background: color-mix(in oklch, var(--ripple-accent) 45%, transparent);
	}

	.chain-progress__dot.is-current {
		width: 0.625rem;
		height: 0.625rem;
		background: var(--ripple-accent);
		transform: scale(1.1);
	}

	.chain-progress__tip {
		position: absolute;
		bottom: calc(100% + 0.4rem);
		left: 50%;
		transform: translateX(-50%);
		padding: 0.15rem 0.45rem;
		font-size: 0.7rem;
		white-space: nowrap;
		border-radius: var(--ripple-radius);
		background: var(--ripple-surface);
		color: var(--ripple-surface-foreground);
		border: 1px solid var(--ripple-border);
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
		opacity: 0;
		pointer-events: none;
		transition: opacity 200ms ease-out;
		z-index: 20;
	}

	.chain-progress__dot-wrap:hover .chain-progress__tip {
		opacity: 1;
	}

	.chain-progress__counter {
		margin-top: 0.5rem;
		text-align: center;
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--ripple-muted-foreground);
	}

	/* ---- Stepper mode ---- */
	.chain-progress__stepper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.chain-progress__stepper::-webkit-scrollbar {
		display: none;
	}

	.chain-progress__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.55rem;
		border-radius: 9999px;
		font-size: 0.72rem;
		background: var(--ripple-muted);
		color: var(--ripple-muted-foreground);
		flex-shrink: 0;
		transition: background-color 200ms ease-out;
	}

	.chain-progress__chip--current {
		background: var(--ripple-accent);
		color: var(--ripple-accent-foreground);
		font-weight: 500;
	}

	.chain-progress__chip-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		font-size: 0.62rem;
		font-weight: 600;
		background: color-mix(in oklch, var(--ripple-accent) 12%, transparent);
	}

	.chain-progress__chip-num--current {
		background: color-mix(in oklch, var(--ripple-accent-foreground) 20%, transparent);
	}

	.chain-progress__chip-label {
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.chain-progress__connector {
		width: 0.5rem;
		height: 1px;
		background: var(--ripple-border);
		flex-shrink: 0;
	}

	.chain-progress__connector:last-of-type {
		display: none;
	}
</style>
