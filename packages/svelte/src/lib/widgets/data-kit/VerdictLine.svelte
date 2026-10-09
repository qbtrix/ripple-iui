<!--
  widgets/data-kit/VerdictLine.svelte — the answer up front (design doc
  2026-10-09 §2.1), rendered first in every data widget: a status dot and the
  model's one sentence. The widget never invents the sentence; with no text
  this renders nothing and the widget shows its derived headline instead. The
  dot is decoration; the status word is there for screen readers.
-->
<script lang="ts">
	import { plain } from './format.js';
	import { STATUS_CLASS, STATUS_WORDS, toStatus } from './status.js';
	import type { Verdict } from './types.js';

	interface Props {
		verdict?: Verdict | null;
		class?: string;
	}

	let { verdict, class: className }: Props = $props();

	const text = $derived(plain(verdict?.text));
	const s = $derived(toStatus(verdict?.status));
</script>

{#if text}
	<p class={['flex items-start gap-2 text-body-emph text-ripple-surface-foreground', className]} data-status={s}>
		<span class={['mt-[4px] size-2 shrink-0 rounded-full', STATUS_CLASS[s].fill]} aria-hidden="true"></span>
		<span class="min-w-0 text-pretty"><span class="sr-only">{STATUS_WORDS[s]}: </span>{text}</span>
	</p>
{/if}
