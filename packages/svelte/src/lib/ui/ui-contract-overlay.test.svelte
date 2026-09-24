<!-- ui-contract-overlay.test.svelte — test-only fixture for ui-contract.test.ts
     (added 2026-09-14, overlay canonical). Composes an OPEN Root around a
     Content for the three overlay kinds the a11y block checks, forwarding
     `data-testid` so the test can prove the wrapper keeps `{...restProps}`.
     `*.test.svelte` is the house fixture name: vitest does not collect it and
     svelte-package does not ship it. -->
<script lang="ts">
	import { Dialog, Sheet, DropdownMenu } from './index.js';

	let {
		kind,
		testid,
		contentClass,
	}: { kind: 'dialog' | 'sheet' | 'dropdown'; testid: string; contentClass?: string } = $props();
</script>

{#if kind === 'dialog'}
	<Dialog.Root open={true}>
		<Dialog.Content data-testid={testid} class={contentClass}>
			<Dialog.Title>Title</Dialog.Title>
			<Dialog.Description>Body</Dialog.Description>
		</Dialog.Content>
	</Dialog.Root>
{:else if kind === 'sheet'}
	<Sheet.Root open={true}>
		<Sheet.Content data-testid={testid}>
			<Sheet.Title>Title</Sheet.Title>
			<Sheet.Description>Body</Sheet.Description>
		</Sheet.Content>
	</Sheet.Root>
{:else}
	<DropdownMenu.Root open={true}>
		<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
		<DropdownMenu.Content data-testid={testid}>
			<DropdownMenu.Item>One</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
