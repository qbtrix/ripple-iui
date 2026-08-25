<!--
  FormLayout.svelte — designed form layout for intent='form' (and confirm steps
  that carry editable fields).
  Created 2026-06-07.
  Updated 2026-06-07 (Wave 3: layouts) — the data-mode branch now COMPOSES the
  FormSection organism (grouped, labelled, validated ripple input widgets) instead
  of hand-rolling raw <input>/<select> markup. One canonical field-rendering path
  shared with the rest of the atomic-design stack.
  Updated 2026-06-08 (genesis V3 Layer 2: smart auto-fill) — the data-mode seed
  now applies the PURE defaults-resolver. A DefaultsContext, INJECTED by the host
  via the 'ui-defaults-context' Svelte context (a value or a getter, like
  'ui-flow-context'), pre-fills EMPTY fields by the genesis priority chain. A
  field's explicit `default` still wins; with no context injected it is a graceful
  no-op (fields start empty). User edits are never overridden (seed runs once).
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
	import { getContext } from 'svelte';
	import NodeRenderer from '../../components/NodeRenderer.svelte';
	import FormSection from '$lib/organisms/FormSection.svelte';
	import type { LayoutInput } from '../layout-adapter.js';
	import {
		resolveDefaults,
		type DefaultsContext,
		type DefaultsField
	} from '../defaults-resolver.js';

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

	// Host-injected DefaultsContext (genesis V3 Layer 2). Mirrors the
	// 'ui-flow-context' convention: the value may be the context itself OR a
	// getter returning it. Absent → undefined → resolver is a graceful no-op.
	// PURE: this layout never builds a profile; the host supplies the context.
	const injectedDefaults = getContext<
		DefaultsContext | (() => DefaultsContext | undefined) | undefined
	>('ui-defaults-context');
	function readDefaultsContext(): DefaultsContext | undefined {
		return typeof injectedDefaults === 'function' ? injectedDefaults() : injectedDefaults;
	}

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
		// Smart auto-fill: resolve empties from the injected DefaultsContext FIRST,
		// then let each field's explicit `default` win on top. Empties-only — the
		// resolver skips fields that carry their own default. No context → {}.
		const next: Record<string, unknown> = resolveDefaults(
			rawFields as DefaultsField[],
			readDefaultsContext()
		);
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

{#if input.spec.ui}
	<!-- When the step carries its own widget tree, render IT — its input binds +
	     Continue/submit button drive the flow (flow.next/flow.submit) and write
	     the state the confirm step's {state.x} pre-fill reads. The card chrome
	     makes it look designed. (A flow step always has a ui, so this is the live
	     path.) Rendering FormSection from `form_fields` INSTEAD would drop the
	     advance button + the state writes — that designed-form path is only safe
	     for a pure-data form spec with no ui, handled below. Wiring FormSection to
	     emit flow.next + write flow state is a tracked follow-up. -->
	<NodeRenderer node={input.spec.ui} />
{:else}
	<!-- Pure-data form spec (no raw ui): render the designed FormSection. -->
	<FormSection {fields} {values} onChange={update} />
{/if}
