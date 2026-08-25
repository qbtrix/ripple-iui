<script lang="ts">
	import { Progress as ProgressPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	const props: WithoutChildrenOrChild<ProgressPrimitive.RootProps> & { ref?: any; class?: string } = $props();

	let ref = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (props.ref !== undefined) (props as any).ref = ref;
	});

	const fillPercent = $derived.by(() => {
		const v = Number(props.value);
		const m = Number(props.max ?? 100);
		if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) return 0;
		return Math.max(0, Math.min(100, (v / m) * 100));
	});

	const indicatorStyle = $derived(`transform: translateX(-${100 - fillPercent}%)`);
</script>

<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn("bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden", props.class)}
	value={props.value}
	max={props.max ?? 100}
>
	<div
		data-slot="progress-indicator"
		class="bg-primary size-full flex-1 transition-all"
		style={indicatorStyle}
	></div>
</ProgressPrimitive.Root>
