<!--
  FormLayout.svelte — designed form layout for intent='form' (and confirm steps
  that carry editable fields).
  Created 2026-06-07.
  Updated 2026-06-07 (Wave 3: layouts) — the data-mode branch now COMPOSES the
  FormSection organism (grouped, labelled, validated ripple input widgets) instead
  of hand-rolling raw <input>/<select> markup. One canonical field-rendering path
  shared with the rest of the atomic-design stack.
  Adapted from ocean-flow's FormLayout but rendered with RIPPLE's organisms/widgets.

  DUAL MODE (locked decision C):
    - 'data'   the spec carries genesis-style `form_fields` → FormSection renders
               the designed field set (text / textarea / select / radio / checkbox /
               number / date).
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
	import FormSection from '$lib/organisms/FormSection.svelte';
	import type { LayoutInput } from '../layout-adapter.js';

	type FieldType =
		| 'text'
		| 'email'
		| 'tel'
		| 'url'
		| 'password'
		| 'number'
		| 'date'
		| 'textarea'
		| 'select'
		| 'radio'
		| 'checkbox';

	interface FormFieldLike {
		id: string;
		type?: FieldType;
		label?: string;
		placeholder?: string;
		required?: boolean;
		default?: unknown;
		options?: { value: string | number; label: string }[];
		description?: string;
		helperText?: string;
	}

	interface Props {
		input: LayoutInput;
		/** Fired when a designed field changes (data mode only). */
		onFieldChange?: (id: string, value: unknown) => void;
	}

	let { input, onFieldChange }: Props = $props();

	const rawFields = $derived((input.formFields as FormFieldLike[]) ?? []);

	// Normalize each field descriptor into FormSection's `FormField` shape (label
	// required; option values coerced to strings; helperText → description).
	const fields = $derived(
		rawFields.map((f) => ({
			id: f.id,
			label: f.label ?? f.id,
			type: f.type ?? 'text',
			placeholder: f.placeholder,
			required: f.required,
			description: f.description ?? f.helperText,
			options: f.options?.map((o) => ({ value: String(o.value), label: o.label })),
			default: f.default
		}))
	);

	// Local working copy of field values, seeded from defaults once.
	let values = $state<Record<string, unknown>>({});
	let seeded = $state(false);
	$effect(() => {
		if (seeded || rawFields.length === 0) return;
		const next: Record<string, unknown> = {};
		for (const f of rawFields) {
			if (f.default !== undefined) next[f.id] = f.default;
		}
		values = next;
		seeded = true;
	});

	function update(id: string, value: unknown) {
		values = { ...values, [id]: value };
		onFieldChange?.(id, value);
	}
</script>

{#if input.mode === 'raw-ui' && input.spec.ui}
	<!-- Escape hatch: render the step's own widget tree so its controls keep
	     driving the flow. The card chrome around us makes it look designed. -->
	<NodeRenderer node={input.spec.ui} />
{:else}
	<FormSection {fields} {values} onChange={update} />
{/if}
