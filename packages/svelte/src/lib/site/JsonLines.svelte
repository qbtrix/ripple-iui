<!--
  @file lib/site/JsonLines.svelte
  @description A JSON text (complete or still streaming) pretty-printed by
    prettyPrefix and shown one block per line, soft wrapped with a hanging
    indent: a wrapped line continues 2ch right of where it began, so deep
    nesting stays readable in a narrow pane and never runs off its edge. The
    indent is padding, not spaces, so the wrap knows where each line starts.
    Renders only the <code>; the caller owns the <pre> (scrolling, height).
    `tokens` (off by default) wraps each line's pieces in the site's .tok-*
    classes (lineTokens). Lines are tokenised once, when they first appear, so
    a streaming view only ever tokenises its tail.
-->
<script lang="ts">
	import { lineTokens, prettyPrefix, type Tok } from './prettyPrefix.js';

	let { text, tokens = false }: { text: string; tokens?: boolean } = $props();

	type Line = { raw: string; indent: number; body: string; toks?: Tok[] };
	// A streaming text only grows at the end, so most lines are unchanged from
	// the last update: reuse their objects and the each block skips them.
	let prev: Line[] = [];
	const lines = $derived.by(() => {
		const out = prettyPrefix(text)
			.split('\n')
			.map((raw, i): Line => {
				if (prev[i]?.raw === raw && (!tokens || prev[i].toks)) return prev[i];
				const body = raw.trimStart();
				return { raw, indent: raw.length - body.length, body, toks: tokens ? lineTokens(body) : undefined };
			});
		prev = out;
		return out;
	});
</script>

<code class="json-lines">{#each lines as line}<span class="ln" style:--i={line.indent}>{#if line.toks}{#each line.toks as k, j (j)}<span class="tok-{k.t}">{k.v}</span>{/each}{:else}{line.body}{/if}</span>{/each}</code>

<style>
	.ln {
		display: block;
		padding-left: calc((var(--i) + 2) * 1ch);
		text-indent: -2ch;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
