<!--
  @file lib/site/landing/SpecEditor.svelte
  @description The landing's "one spec, edited live" figure: a small spec in an
    editable pane beside its real <Ripple> render. Typing re-renders after a
    short pause. Text that isn't JSON, or a spec with schema or catalog
    problems (specIssues), keeps the last good render and shows one quiet line
    saying what is wrong. State the visitor changed by clicking survives an
    edit: Ripple syncs spec.state key by key, so only keys the edit touched
    reset.
    The pane is a transparent <textarea> laid over a token-coloured <pre> of
    the same text, both in one grid cell with identical metrics, so the pre
    sizes the pane and the caret lines up with the colours. With JavaScript off
    it shows the spec and its prerendered render; it just doesn't re-render.
-->
<script lang="ts">
	import Ripple from '$lib/Ripple.svelte';
	import { specIssues } from '$lib/widgets/validate-catalog-bound.js';
	import { highlightJson } from '../docs/highlight.js';

	const SPEC = `{
  "version": "1.0",
  "state": { "cups": 2, "goal": 4 },
  "ui": {
    "type": "card",
    "props": { "title": "Coffee today" },
    "children": [
      {
        "type": "metric",
        "props": { "label": "Cups", "value": "{state.cups} of {state.goal}" }
      },
      {
        "type": "progress",
        "props": { "value": "{state.cups}", "max": "{state.goal}" }
      },
      {
        "type": "button",
        "props": { "label": "One more" },
        "on_click": {
          "action": "set",
          "target": "cups",
          "value": "{state.cups + 1}"
        }
      }
    ]
  }
}`;

	let text = $state(SPEC);
	let spec = $state.raw(JSON.parse(SPEC));
	let problem = $state<string | null>(null);
	// The trailing newline keeps the pre one line taller than a textarea that ends in "\n".
	const html = $derived(highlightJson(text) + '\n');

	let timer: ReturnType<typeof setTimeout> | undefined;
	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(apply, 250);
	}

	function apply() {
		let next: unknown;
		try {
			next = JSON.parse(text);
		} catch (e) {
			problem = `Not valid JSON: ${(e as Error).message}`;
			return;
		}
		const issues = specIssues(next);
		if (issues.length) {
			const more = issues.length > 1 ? ` (and ${issues.length - 1} more)` : '';
			problem = `${issues[0].path}: ${issues[0].message}${more}`;
			return;
		}
		problem = null;
		spec = next;
	}

	function reset() {
		clearTimeout(timer);
		text = SPEC;
		apply();
	}
</script>

<div class="editor">
	<div class="panes">
		<div class="code">
			<div class="bar">
				<span>spec.json</span>
				{#if text !== SPEC}<button type="button" onclick={reset}>Reset</button>{/if}
			</div>
			<div class="field">
				<pre aria-hidden="true">{@html html}</pre>
				<textarea bind:value={text} {oninput} spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Spec JSON, editable" aria-describedby="spec-problem"></textarea>
			</div>
			<p id="spec-problem" class="problem" role="status">{problem ?? ''}</p>
		</div>
		<div class="render" data-pagefind-ignore="all">
			<Ripple {spec} />
		</div>
	</div>
</div>

<style>
	.editor {
		container-type: inline-size;
	}
	.panes {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow: hidden;
		background: var(--card);
	}
	.code {
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: var(--code-bg);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		padding: 0 8px 0 16px;
		border-bottom: 1px solid var(--site-line);
		font: 12px/1 var(--font-mono);
		color: var(--site-soft);
	}
	.bar button {
		min-height: 32px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 13px/1 var(--font-sans);
		cursor: pointer;
	}
	.bar button:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.bar button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}

	/* The pre and the textarea share one cell and every metric that moves a
	   glyph, so the caret sits on the coloured text. */
	.field {
		display: grid;
		flex: 1;
	}
	.field > * {
		grid-area: 1 / 1;
		box-sizing: border-box;
		margin: 0;
		padding: 16px;
		border: 0;
		font: 13px/1.6 var(--font-mono);
		letter-spacing: 0;
		tab-size: 2;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	pre {
		pointer-events: none;
		color: var(--code-ink);
	}
	textarea {
		resize: none;
		overflow: hidden;
		background: transparent;
		color: transparent;
		caret-color: var(--site-ink);
		outline: none;
	}
	textarea::selection {
		background: color-mix(in oklch, var(--primary) 22%, transparent);
	}
	.field:focus-within {
		box-shadow: inset 0 0 0 2px var(--ring);
	}
	/* One quiet line, reserved so the pane doesn't jump when it appears. */
	.problem {
		min-height: 1.5em;
		margin: 0;
		padding: 8px 16px 12px;
		font: 12px/1.5 var(--font-mono);
		color: var(--site-soft);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.render {
		min-width: 0;
		padding: 24px;
		border-top: 1px solid var(--site-line);
		background: var(--background);
	}

	@container (min-width: 720px) {
		.panes {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
		.render {
			display: grid;
			align-content: center;
			padding: 32px;
			border-top: 0;
			border-left: 1px solid var(--site-line);
		}
	}
</style>
