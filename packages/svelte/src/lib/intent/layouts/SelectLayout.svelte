<!--
  SelectLayout.svelte — designed selection layout for intent='select' (Wave 3: layouts).
  Created 2026-06-07.

  Two sub-modes unified here:

  RAW-UI OPTION SET (issue-c fix): A flow `select` step whose raw `ui` tree
  contains buttons that each emit a flow.next/flow.submit with a `selection` payload
  is an "option set". extractFlowOptions() finds those buttons and promotes them into
  OptionList cards. Selecting a card re-dispatches the button's EXACT original
  on_click handler through the live EventDispatcher (same effect as pressing the pill
  button) — so the FlowRunner advance / chain_map branch works byte-for-byte
  identically. Non-option nodes in the tree (headings, labels) still render via
  NodeRenderer above the OptionList.

  RAW-UI FALLBACK: When the tree has no extractable options (step has a Continue
  button but not selection buttons), fall through to plain NodeRenderer so the flow
  never blocks.

  DATA MODE: When the spec carries structured data (data.items), compose
  CardGridLayout/ListLayout + selection indicators — the classic browse-with-pick
  layout used when the AI sends a proper select spec.

  PURE: UI only. No fetch, no service. Selection state is host-owned or is delegated
  to the EventDispatcher via the existing flow verb contract.
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import NodeRenderer from '../../components/NodeRenderer.svelte';
	import OptionList from '$lib/organisms/OptionList.svelte';
	import CardGridLayout from './CardGridLayout.svelte';
	import ListLayout from './ListLayout.svelte';
	import { extractFlowOptions } from '../flow-options.js';
	import type { LayoutInput } from '../layout-adapter.js';
	import type { EventDispatcher } from '@ripple-ui/core';
	import type { StateManager } from '$lib/core/state-manager.svelte.js';

	interface Props {
		input: LayoutInput;
		/** Currently selected ids (data mode). */
		selectedIds?: string[];
		/** Fired on card selection (data mode). */
		onSelect?: (id: string, item: Record<string, unknown>) => void;
	}

	let { input, selectedIds = [], onSelect }: Props = $props();

	// Contexts set by the parent Ripple for every node rendered inside a flow step.
	const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
	const stateManager = getContext<StateManager | undefined>('ui-state');

	// --- Raw-ui option-set detection -------------------------------------------
	// In raw-ui mode, attempt to extract flow-option buttons. If any are found we
	// promote them to OptionList. Non-option siblings (heading, text, etc.) in the
	// tree still render via NodeRenderer above the list.
	const rawOptions = $derived(
		input.mode === 'raw-ui' ? extractFlowOptions(input.spec.ui) : []
	);
	const hasOptions = $derived(rawOptions.length > 0);

	// Collect non-option children of the root container so we can render them
	// (e.g. the step heading) above the OptionList without duplicating option buttons.
	const nonOptionChildren = $derived.by(() => {
		if (!hasOptions) return null;
		const root = input.spec.ui;
		if (!root || typeof root !== 'object') return null;
		const r = root as Record<string, unknown>;
		if (!Array.isArray(r.children)) return null;
		const optionButtonIds = new Set(rawOptions.map((o) => o.onClick));
		const rest = r.children.filter((child: unknown) => {
			const c = child as Record<string, unknown>;
			return !(c.type === 'button' && optionButtonIds.has(c.on_click));
		});
		return rest.length > 0
			? { ...r, children: rest }
			: null;
	});

	// Tracks the selected option id for aria-checked reflection in OptionList.
	let selectedOptionId = $state<string | string[]>('');
	const selectionMode = $derived<'single' | 'multiple'>(
		input.spec.selection === 'multiple' ? 'multiple' : 'single'
	);

	function handleOptionSelect(id: string) {
		// Update local reflection.
		selectedOptionId = id;

		// Find the matching flow option and re-dispatch its on_click handler through
		// the live EventDispatcher — same as if the user had clicked the pill button.
		const opt = rawOptions.find((o) => o.id === id);
		if (!opt) return;
		if (eventDispatcher) {
			void eventDispatcher.dispatch(
				opt.onClick as Parameters<typeof eventDispatcher.dispatch>[0],
				{ state: stateManager?.state ?? {} }
			);
		}
	}

	// --- Data mode --------------------------------------------------------------
	const dense = $derived(input.meta.columns === 1 || !input.meta.showImages);
</script>

{#if input.mode === 'raw-ui'}
	{#if hasOptions}
		<!-- Render any non-option nodes (heading, description text) above the list. -->
		{#if nonOptionChildren}
			<NodeRenderer node={nonOptionChildren as import('@ripple-ui/core').UINode} />
		{/if}
		<!-- Promoted option set: polished cards instead of raw pill buttons. -->
		<OptionList
			options={rawOptions.map((o) => ({ id: o.id, text: o.label, description: o.description, icon: o.icon }))}
			selection={selectionMode}
			selected={selectedOptionId}
			onSelect={handleOptionSelect}
		/>
	{:else}
		<!-- Fallback: no extractable options — render raw tree unchanged. -->
		{#if input.spec.ui}
			<NodeRenderer node={input.spec.ui} />
		{/if}
	{/if}
{:else if dense}
	<ListLayout {input} {selectedIds} {onSelect} />
{:else}
	<CardGridLayout {input} {selectedIds} {onSelect} />
{/if}
