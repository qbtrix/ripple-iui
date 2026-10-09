<!--
  @file lib/site/JsonLines.svelte
  @description A JSON text (complete or still streaming) pretty-printed by
    prettyPrefix and shown one block per line, soft wrapped with a hanging
    indent: a wrapped line continues 2ch right of where it began, so deep
    nesting stays readable in a narrow pane and never runs off its edge. The
    indent is padding, not spaces, so the wrap knows where each line starts.
    Renders only the <code>; the caller owns the <pre> (scrolling, height).
-->
<script lang="ts">
	import { prettyPrefix } from './prettyPrefix.js';

	let { text }: { text: string } = $props();

	type Line = { raw: string; indent: number; body: string };
	// A streaming text only grows at the end, so most lines are unchanged from
	// the last update: reuse their objects and the each block skips them.
	let prev: Line[] = [];
	const lines = $derived.by(() => {
		const out = prettyPrefix(text)
			.split('\n')
			.map((raw, i): Line => {
				if (prev[i]?.raw === raw) return prev[i];
				const body = raw.trimStart();
				return { raw, indent: raw.length - body.length, body };
			});
		prev = out;
		return out;
	});
</script>

<code class="json-lines">{#each lines as line}<span class="ln" style:--i={line.indent}>{line.body}</span>{/each}</code>

<style>
	.ln {
		display: block;
		padding-left: calc((var(--i) + 2) * 1ch);
		text-indent: -2ch;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
