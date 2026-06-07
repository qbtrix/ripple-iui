<!--
  FormLayout.svelte — designed form layout for intent='form' (and confirm steps
  that carry editable fields). Created 2026-06-07.
  Adapted from ocean-flow's FormLayout but rendered with RIPPLE's widgets/elements
  and tokens (no genesis shadcn imports — those paths don't exist here).

  DUAL MODE (locked decision C):
    - 'data'   the spec carries genesis-style `form_fields` → render the designed
               field set (text / textarea / select / radio / checkbox / number).
    - 'raw-ui' the spec carries only a raw `ui` widget tree (our current
               start_flow steps) → render that tree via NodeRenderer, untouched,
               so its own input/button still drive the flow (flow.next etc.).
  Either way the fields sit inside the polished card chrome that IntentRenderer
  wraps around this layout — the user sees a clean form, never a bare tree.

  PURE: reads only `input` produced by the adapter; never fetches or calls a
  service. Field edits are surfaced via `onFieldChange` (the host owns state).
-->
<script lang="ts">
	import NodeRenderer from '../../components/NodeRenderer.svelte';
	import type { LayoutInput } from '../layout-adapter.js';

	interface FormFieldLike {
		id: string;
		type?: string;
		label?: string;
		placeholder?: string;
		required?: boolean;
		default?: unknown;
		options?: { value: string | number; label: string }[];
		helperText?: string;
	}

	interface Props {
		input: LayoutInput;
		/** Fired when a designed field changes (data mode only). */
		onFieldChange?: (id: string, value: unknown) => void;
	}

	let { input, onFieldChange }: Props = $props();

	const fields = $derived((input.formFields as FormFieldLike[]) ?? []);

	// Local working copy of field values, seeded from defaults once.
	let values = $state<Record<string, unknown>>({});
	let seeded = $state(false);
	$effect(() => {
		if (seeded || fields.length === 0) return;
		const next: Record<string, unknown> = {};
		for (const f of fields) {
			if (f.default !== undefined) next[f.id] = f.default;
		}
		values = next;
		seeded = true;
	});

	function update(id: string, value: unknown) {
		values[id] = value;
		onFieldChange?.(id, value);
	}

	function inputType(t?: string): string {
		switch (t) {
			case 'email':
			case 'password':
			case 'tel':
			case 'number':
			case 'url':
			case 'time':
			case 'date':
				return t;
			default:
				return 'text';
		}
	}
</script>

{#if input.mode === 'raw-ui' && input.spec.ui}
	<!-- Escape hatch: render the step's own widget tree so its controls keep
	     driving the flow. The card chrome around us makes it look designed. -->
	<NodeRenderer node={input.spec.ui} />
{:else}
	<div class="form-layout">
		{#each fields as field (field.id)}
			<div class="form-layout__field">
				{#if field.type !== 'checkbox'}
					<label class="form-layout__label" for={field.id}>
						{field.label ?? field.id}
						{#if field.required}<span class="form-layout__req">*</span>{/if}
					</label>
				{/if}

				{#if field.type === 'textarea'}
					<textarea
						id={field.id}
						class="form-layout__control"
						placeholder={field.placeholder}
						rows="4"
						value={String(values[field.id] ?? '')}
						oninput={(e) => update(field.id, e.currentTarget.value)}
					></textarea>
				{:else if field.type === 'select' && field.options}
					<select
						id={field.id}
						class="form-layout__control"
						value={String(values[field.id] ?? '')}
						onchange={(e) => update(field.id, e.currentTarget.value)}
					>
						<option value="" disabled>{field.placeholder ?? 'Select…'}</option>
						{#each field.options as opt}
							<option value={String(opt.value)}>{opt.label}</option>
						{/each}
					</select>
				{:else if field.type === 'radio' && field.options}
					<div class="form-layout__radio-group" role="radiogroup" aria-label={field.label}>
						{#each field.options as opt}
							{@const checked = String(values[field.id] ?? '') === String(opt.value)}
							<button
								type="button"
								class="form-layout__pill"
								class:is-selected={checked}
								onclick={() => update(field.id, opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				{:else if field.type === 'checkbox'}
					<label class="form-layout__checkbox">
						<input
							id={field.id}
							type="checkbox"
							checked={values[field.id] === true || values[field.id] === 'true'}
							onchange={(e) => update(field.id, e.currentTarget.checked)}
						/>
						<span>{field.label ?? field.id}{#if field.required}<span class="form-layout__req">*</span>{/if}</span>
					</label>
				{:else}
					<input
						id={field.id}
						type={inputType(field.type)}
						class="form-layout__control"
						placeholder={field.placeholder}
						value={String(values[field.id] ?? '')}
						oninput={(e) => update(field.id, e.currentTarget.value)}
					/>
				{/if}

				{#if field.helperText}
					<p class="form-layout__helper">{field.helperText}</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.form-layout {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.form-layout__field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-layout__label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--ripple-surface-foreground);
	}

	.form-layout__req {
		color: var(--ripple-error);
		margin-left: 0.15rem;
	}

	.form-layout__control {
		width: 100%;
		padding: 0.55rem 0.7rem;
		font-size: 0.9rem;
		border-radius: var(--ripple-radius);
		border: 1px solid var(--ripple-border);
		background: var(--ripple-input);
		color: var(--ripple-input-foreground);
		transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
	}

	.form-layout__control:focus {
		outline: none;
		border-color: var(--ripple-accent);
		box-shadow: 0 0 0 2px color-mix(in oklch, var(--ripple-accent) 25%, transparent);
	}

	.form-layout__radio-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.form-layout__pill {
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 500;
		border-radius: 9999px;
		border: 1px solid var(--ripple-border);
		background: var(--ripple-muted);
		color: var(--ripple-muted-foreground);
		cursor: pointer;
		transition: all 150ms ease-out;
	}

	.form-layout__pill.is-selected {
		background: var(--ripple-accent);
		color: var(--ripple-accent-foreground);
		border-color: var(--ripple-accent);
		transform: scale(1.03);
	}

	.form-layout__checkbox {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.9rem;
		color: var(--ripple-surface-foreground);
		cursor: pointer;
	}

	.form-layout__helper {
		font-size: 0.75rem;
		color: var(--ripple-muted-foreground);
	}
</style>
