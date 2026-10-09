<!--
  widgets/data-kit/StatusPill.svelte — a status as icon + word on a 12% tint
  (design doc 2026-10-09 §2.2). Never colour alone: the icon and the word
  always render; `label` is the domain word ("elevated", "Full") and the
  status's default word stands in when there is none. Unknown status is
  neutral. Internal kit part, not a registered widget.
-->
<script lang="ts">
	import { plain } from './format.js';
	import { STATUS_CLASS, STATUS_ICONS, STATUS_WORDS, toStatus } from './status.js';
	import type { Status } from './types.js';

	interface Props {
		status?: Status | (string & {});
		label?: string;
		class?: string;
	}

	let { status, label, class: className }: Props = $props();

	const s = $derived(toStatus(status));
	const Icon = $derived(STATUS_ICONS[s]);
	const text = $derived(plain(label) || STATUS_WORDS[s]);
</script>

<span
	class={[
		'inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-subheadline font-medium whitespace-nowrap',
		STATUS_CLASS[s].tint,
		STATUS_CLASS[s].text,
		className
	]}
	data-status={s}
>
	<Icon size={12} strokeWidth={2} aria-hidden="true" class="shrink-0" />
	<span class="truncate">{text}</span>
</span>
