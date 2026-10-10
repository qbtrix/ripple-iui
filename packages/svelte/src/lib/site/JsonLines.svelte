<!--
  @file lib/site/JsonLines.svelte
  @description A JSON text (complete or still streaming) pretty-printed by
    prettyPrefix and shown one block per line, soft wrapped with a hanging
    indent: a wrapped line continues 2ch right of where it began, so deep
    nesting stays readable in a narrow pane and never runs off its edge. The
    indent is padding, not spaces, so the wrap knows where each line starts.
    Opt-ins: `highlight` wraps tokens in the site's tok-* classes (a finished
    line never changes, so it never re-tokenises; only the last line can, and
    an open string there stays one tok-str); `caret` puts a `.json-caret` span
    at the end of the text for the caller to style.
    Renders only the <code>; the caller owns the <pre> (scrolling, height).
-->
<script lang="ts">
	import { prettyPrefix } from './prettyPrefix.js';
	import { highlightJson, highlightJsonPrefix } from './docs/highlight.js';

	let { text, highlight = false, caret = false }: { text: string; highlight?: boolean; caret?: boolean } = $props();

	type Line = { raw: string; indent: number; body: string; html: string };
	// A streaming text only grows at the end, so most lines are unchanged from
	// the last update: reuse their objects and the each block skips them.
	let prev: Line[] = [];
	const lines = $derived.by(() => {
		const all = prettyPrefix(text).split('\n');
		const out = all.map((raw, i): Line => {
			const last = i === all.length - 1;
			if (prev[i]?.raw === raw && !last) return prev[i];
			const body = raw.trimStart();
			const html = highlight ? (last ? highlightJsonPrefix(body) : highlightJson(body)) : '';
			return { raw, indent: raw.length - body.length, body, html };
		});
		prev = out;
		return out;
	});
</script>

<code class="json-lines">{#each lines as line, i}<span class="ln" style:--i={line.indent}>{#if highlight}{@html line.html}{:else}{line.body}{/if}{#if caret && i === lines.length - 1}<span class="json-caret" aria-hidden="true"></span>{/if}</span>{/each}</code>

<style>
	.ln {
		display: block;
		padding-left: calc((var(--i) + 2) * 1ch);
		text-indent: -2ch;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
