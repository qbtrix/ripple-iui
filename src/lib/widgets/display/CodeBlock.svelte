<!-- origin: slev12397/beautiful-ui@ff0f74d components/primitives/CodeBlock.tsx

     2026-09-16 — re-skinned into the source's editor panel. ToolCall renders
     this widget for its Arguments and Result sections, so until now that surface
     was skinned as far as the chip and then stopped.

     What came across: the frame (ring + ripple radius on the surface, matching
     ToolCall's own card), the header row with a glyph and a mono label, the copy
     button's shape and its green Copied state, and the body — a 20px line-number
     gutter with a 1px rule down it, 12.5px mono on 1.65 leading, lines wrapping
     instead of scrolling sideways — plus the source's small regex highlighter.

     The highlighter is the reason the manifest entry stopped lying: the widget
     has advertised "syntax-highlighted" since it was written and did none. It
     renders as spans built in the template, never as raw HTML, so a code string
     cannot inject markup. Two deviations from the source's version. A quoted
     string followed by a colon is coloured as a name rather than a string
     value, because without it every key and value in a JSON block paints the
     same orange, and JSON is what ToolCall passes in. And a block with no
     `language` is left uncoloured: ToolCall passes an empty language for a
     plain-string result, and tokenizing prose paints `for`, `if` and `return`
     as keywords and every number as a literal.

     What did not come across: the whole Diff variant (its rows, gutters, hatch
     fill and word-level add/del tints). It needs `diff`, `variant` and a row
     type — three new props — and ripple already ships display/Diff.svelte. The
     source's `filename` is not a prop here either; the existing `language` fills
     that slot in the header.

     Dropped for glass: `shadow-card`, and the source's `max-w-105` — a ripple
     widget does not cap its own width inside a host's layout.

     The header is 36px, not the source's 44px. The source's holds a filename
     next to a copy button; ripple's holds a language slug, and inside ToolCall
     it already sits under an "Arguments" heading, so 44px double-headed it.

     Note the outer `pre` element is gone: the body is a grid, one row per line,
     which cannot live inside a preformatted element. Line numbers carry
     `select-none` so a copy of the rendered text does not pick them up.

     2026-09-17 (fix/port-gaps) — strings and numbers measured 1.74:1 in
     paw-enterprise light mode, and ToolCall's JSON arguments inherit that.
     They painted `text-ripple-warning`, a status fill at oklch L 0.80: right as
     a badge tint, too pale to be text on a light surface. They now carry
     `ripple-code-literal`, a prefixed global rule that mixes the warning hue half-and-half
     with the surface ink. The ink is dark in light mode and pale in dark mode, so
     one rule darkens the amber where it needs to and lightens it where it needs
     to. No single fixed colour reaches 4.5:1 on both near-white and near-black.
     The `text-ripple-warning` utility stays on the span as the token the hue
     comes from; that rule is unlayered, so it wins over the utility.

     2026-09-17 (fix/port-gaps, second pass) — keywords get the same treatment.
     `text-ripple-accent` is the host's `--primary`, which measured 3.59:1 on
     paw-enterprise's dark ground. `ripple-code-keyword` mixes the accent 70% with
     the surface ink: a smaller pull than the literals get, so keywords stay
     clearly blue.
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';
  import FileIcon from '@lucide/svelte/icons/code-xml';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    code?: string;
    /** Alias for `code`. */
    text?: string;
    language?: string;
    /** Hide the language label even if provided. */
    hideLanguage?: boolean;
    /** Hide the copy button. */
    hideCopy?: boolean;
  }

  let {
    id, class: className, style, code, text,
    language, hideLanguage = false, hideCopy = false
  }: Props = $props();

  const source = $derived(code ?? text ?? '');
  // One trailing newline is an artifact of the fence, not an empty last line.
  // An empty block gets no rows at all rather than a numbered blank one.
  const lines = $derived(source ? source.replace(/\n$/, '').split('\n') : []);

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copy() {
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1500);
    } catch (e) {
      console.warn('[ripple/code-block] clipboard write failed:', e);
    }
  }

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const showLanguage = $derived(!!language && !hideLanguage);
  const showHeader = $derived(showLanguage || !hideCopy);

  /* The source's highlighter, ported. Keywords, function calls, strings and
     numbers — deliberately light; this is colour, not a parser. */
  const KEYWORDS = new Set([
    'import', 'from', 'export', 'default', 'async', 'function', 'const', 'let',
    'var', 'await', 'return', 'if', 'else', 'for', 'while', 'new', 'throw',
    'try', 'catch', 'null', 'true', 'false', 'undefined'
  ]);

  const TOKEN =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b(?:import|from|export|default|async|function|const|let|var|await|return|if|else|for|while|new|throw|try|catch|null|true|false|undefined)\b|[A-Za-z_$][\w$]*(?=\s*\())/g;

  const NAME = 'text-ripple-surface-foreground font-medium';

  function tokenClass(tok: string, rest: string): string {
    const quoted = /^["'`]/.test(tok);
    // A quoted string followed by a colon is a key, not a value. The source only
    // ever renders TypeScript so it never hit this; ToolCall passes JSON, where
    // without it every key and value lands on the same colour.
    if (quoted && /^\s*:/.test(rest)) return NAME;
    if (quoted || /^\d/.test(tok)) return 'text-ripple-warning-text ripple-code-literal';
    if (KEYWORDS.has(tok)) return 'text-ripple-accent ripple-code-keyword';
    return NAME;
  }

  function highlight(line: string): { text: string; cls: string }[] {
    // No language means the caller did not say this is code, and ToolCall passes
    // exactly that for a plain-string result. Tokenizing prose paints `for`,
    // `if`, `return` and every number as syntax, so an unlabelled block stays
    // uncoloured.
    if (!language) return [{ text: line, cls: '' }];
    const out: { text: string; cls: string }[] = [];
    let last = 0;
    for (const m of line.matchAll(TOKEN)) {
      const idx = m.index ?? 0;
      const tok = m[0];
      if (idx > last) out.push({ text: line.slice(last, idx), cls: '' });
      out.push({ text: tok, cls: tokenClass(tok, line.slice(idx + tok.length)) });
      last = idx + tok.length;
    }
    if (last < line.length) out.push({ text: line.slice(last), cls: '' });
    return out;
  }
</script>

<div
  {id}
  class={cn(
    'relative group overflow-hidden rounded-ripple bg-ripple-surface ring-1 ring-ripple-border',
    className
  )}
  style={styleString}
>
  {#if showHeader}
    <div class="flex h-9 items-center gap-2 border-b border-ripple-border px-4 text-[12.5px]">
      {#if showLanguage}
        <span class="inline-flex min-w-0 items-center gap-[7px]">
          <FileIcon size={15} class="shrink-0 text-ripple-muted-foreground" aria-hidden="true" />
          <span class="truncate font-mono leading-none text-ripple-surface-foreground">{language}</span>
        </span>
      {/if}
      {#if !hideCopy}
        <button
          type="button"
          onclick={copy}
          class={cn(
            '-mr-1 ml-auto flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium transition-colors duration-100 ease-ripple-out hover:bg-ripple-accent/10',
            copied
              ? 'text-ripple-success-text'
              : 'text-ripple-muted-foreground hover:text-ripple-surface-foreground'
          )}
          aria-label="Copy code"
        >
          {#if copied}
            <CheckIcon size={11} />
            <span>Copied</span>
          {:else}
            <CopyIcon size={11} />
            <span>Copy</span>
          {/if}
        </button>
      {/if}
    </div>
  {/if}

  <div class="relative py-3 font-mono text-[12.5px] leading-[1.65] text-ripple-muted-foreground">
    <span class="pointer-events-none absolute inset-y-0 left-5 w-px bg-ripple-border"></span>
    {#each lines as line, i (i)}
      <div class="grid grid-cols-[20px_minmax(0,1fr)] items-start">
        <span class="select-none text-center text-[11px] text-ripple-muted-foreground">{i + 1}</span>
        <code class="pr-3 pl-1 break-words whitespace-pre-wrap"
          >{#each highlight(line) as piece}<span class={piece.cls}>{piece.text}</span>{/each}</code
        >
      </div>
    {/each}
  </div>
</div>

<style>
  /* Readable amber: the warning hue pulled halfway toward the surface ink. See
     the header for why. var(--ripple-*), never var(--color-*). Global and
     prefixed rather than scoped: a scoped selector against the dynamic class
     would stamp a hash class onto every token span, including the ones an
     unlabelled block leaves deliberately class-free. */
  :global(.ripple-code-literal) {
    color: color-mix(in oklab, var(--ripple-warning) 50%, var(--ripple-surface-foreground));
  }
  /* Keywords: the accent pulled 30% toward the ink, enough to clear 4.5:1 in dark. */
  :global(.ripple-code-keyword) {
    color: color-mix(in oklab, var(--ripple-accent) 70%, var(--ripple-surface-foreground));
  }
</style>
