<!--
  SelectLayout.svelte — designed selection layout for intent='select' (Wave 3: layouts).

  Two sub-modes unified here:

  RAW-UI OPTION SET (issue-c fix): A flow `select` step whose raw `ui` tree
  contains buttons that each emit a flow.next/flow.submit with a `selection` payload
  is an "option set". extractFlowOptions() finds those buttons and promotes them into
  OptionList choice cards (layout 'cards': icon from the button's CHOICE_ICONS `icon`
  key or guessed from its label, `description` as the hint). `display.layout: 'list'`
  on the step keeps the older one-column rows. Selecting a card re-dispatches the button's EXACT original
  on_click handler through the live EventDispatcher (same effect as pressing the pill
  button) — so the FlowRunner advance / chain_map branch works byte-for-byte
  identically. The rest of the tree (headings, text, images) renders via
  NodeRenderer above the OptionList, from pruneFlowOptions(): a copy of the tree
  with those same option buttons removed at any depth and emptied containers
  dropped, so no choice shows as both a button and a card.

  STREAMING: while the step is still streaming in ('ui-streaming' context), every
  button is held back, since a button whose on_click has not arrived yet may turn
  out to be an option. Non-option buttons appear when the stream is done.

  RAW-UI FALLBACK: When the tree has no extractable options (step has a Continue
  button but not selection buttons), render the (pruned) tree via NodeRenderer so
  the flow never blocks.

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
	import { extractFlowOptions, pruneFlowOptions } from '../flow-options.js';
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

	// The tree minus the promoted option buttons (any depth), rendered above the
	// OptionList; the whole tree minus every button while the step streams in.
	const streamPhase = getContext<(() => 'active' | 'done' | undefined) | undefined>('ui-streaming');
	const restOfTree = $derived(
		input.mode === 'raw-ui'
			? pruneFlowOptions(input.spec.ui, { all: streamPhase?.() === 'active' })
			: undefined
	);

	// Tracks the selected option id for aria-checked reflection in OptionList.
	let selectedOptionId = $state<string | string[]>('');
	const selectionMode = $derived<'single' | 'multiple'>(
		input.spec.selection === 'multiple' ? 'multiple' : 'single'
	);

	function handleOptionSelect(id: string) {
		// Update local reflection (a toggle in multiple mode).
		if (selectionMode === 'multiple') {
			const arr = Array.isArray(selectedOptionId) ? selectedOptionId : [];
			selectedOptionId = arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id];
		} else selectedOptionId = id;

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
		{#if restOfTree}
			<NodeRenderer node={restOfTree} />
		{/if}
		<!-- Promoted option set: polished cards instead of raw pill buttons. -->
		<OptionList
			options={rawOptions.map((o) => ({ id: o.id, text: o.label, description: o.description, icon: o.icon }))}
			selection={selectionMode}
			layout={input.spec.display?.layout === 'list' ? 'list' : 'cards'}
			label={input.spec.title}
			selected={selectedOptionId}
			onSelect={handleOptionSelect}
		/>
	{:else}
		<!-- Fallback: no extractable options. The tree as written once streamed in. -->
		{#if restOfTree}
			<NodeRenderer node={restOfTree} />
		{/if}
	{/if}
{:else if dense}
	<ListLayout {input} {selectedIds} {onSelect} />
{:else}
	<CardGridLayout {input} {selectedIds} {onSelect} />
{/if}
