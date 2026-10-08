<!-- origin: slev12397/beautiful-ui@ff0f74d components/primitives/CodeBlock.tsx

     A code panel: a ringed frame on the surface, a 36px header (code glyph, an
     optional file `title`, the `language` label, a copy button), and a body
     that is a grid with one row per line: a line-number gutter with a 1px rule
     down it, 12.5px mono on 1.65 leading, lines wrapping instead of scrolling.
     ToolCall renders it for its Arguments and Result sections; display/Diff.svelte
     is the same frame in diff mode.

     The highlighter is a small regex pass (keywords, calls, strings, numbers)
     rendered as spans from the template, never raw HTML, so a code string cannot
     inject markup. A number colours only when it stands alone: digits joined to a
     word by `-` or `.` (a path's user-1, a version tail) stay part of that word.
     A quoted string followed by a colon is coloured as a name, so
     JSON keys and values differ. A block with no `language` stays uncoloured:
     ToolCall passes an empty language for a plain-string result, and prose is
     not code. Strings, numbers and keywords use prefixed global rules that mix
     the status hue with the surface ink, so they clear 4.5:1 in light and dark.

     Optional props, all off by default (the default render must not change,
     ToolCall depends on it): `startLine` numbers rows from a real file line (the
     gutter then fits the numbers, display/gutter.ts), `highlight` tints an inclusive
     [first, last] range in `highlightTone`, `title` puts a file name in the
     header with the language beside it, and `compact` tightens the header and
     body for an inspector or side panel.

     Line numbers carry `select-none` so copying the rendered text skips them.
     No shadow and no max width: a ripple widget sizes to its host's layout.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';
  import FileIcon from '@lucide/svelte/icons/code-xml';
  import { codeBlockGutter, GUTTER_MIN } from './gutter.js';

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
    /** Number of the first line, for an excerpt of a longer file. */
    startLine?: number;
    /** Inclusive [first, last] line numbers to tint. */
    highlight?: [number, number];
    highlightTone?: 'accent' | 'added' | 'removed';
    /** File name shown in the header, with the language label beside it. */
    title?: string;
    /** Tighter header, padding and leading, for an inspector or side panel. */
    compact?: boolean;
  }

  let {
    id, class: className, style, code, text,
    language, hideLanguage = false, hideCopy = false,
    startLine = 1, highlight: highlightRange, highlightTone = 'accent',
    title, compact = false
  }: Props = $props();

  const source = $derived(code ?? text ?? '');
  // One trailing newline is an artifact of the fence, not an empty last line.
  // An empty block gets no rows at all rather than a numbered blank one.
  const lines = $derived(source ? source.replace(/\n$/, '').split('\n') : []);

  const gutter = $derived(codeBlockGutter(startLine, lines.length));
  const toneClass = $derived(
    highlightTone === 'added' ? 'bg-ripple-success/10'
    : highlightTone === 'removed' ? 'bg-ripple-error/10'
    : 'bg-ripple-accent/10'
  );
  const marked = (n: number) => !!highlightRange && n >= highlightRange[0] && n <= highlightRange[1];

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
  const showHeader = $derived(showLanguage || !!title || !hideCopy);

  /* The source's highlighter, ported. Keywords, function calls, strings and
     numbers — deliberately light; this is colour, not a parser. */
  const KEYWORDS = new Set([
    'import', 'from', 'export', 'default', 'async', 'function', 'const', 'let',
    'var', 'await', 'return', 'if', 'else', 'for', 'while', 'new', 'throw',
    'try', 'catch', 'null', 'true', 'false', 'undefined'
  ]);

  // A number stands alone: not touching a word char, nor joined to one by `-` or `.`
  // (prakash-1, v0.4.18, 2026-10-07 are words). ponytail: unspaced subtraction (`i-1`)
  // reads as a word too; a per-language rule is the upgrade if that matters.
  const TOKEN =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|(?<![\w$]|[\w$][-.])\d+(?:\.\d+)*(?![\w$]|[-.][\w$])|\b(?:import|from|export|default|async|function|const|let|var|await|return|if|else|for|while|new|throw|try|catch|null|true|false|undefined)\b|[A-Za-z_$][\w$]*(?=\s*\())/g;

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
    <div
      class={compact
        ? 'flex h-8 items-center gap-2 border-b border-ripple-border px-3 text-[12px]'
        : 'flex h-9 items-center gap-2 border-b border-ripple-border px-4 text-[12.5px]'}
    >
      {#if title || showLanguage}
        <span class="inline-flex min-w-0 items-center gap-[7px]">
          <FileIcon size={15} class="shrink-0 text-ripple-muted-foreground" aria-hidden="true" />
          <span class="truncate font-mono leading-none text-ripple-surface-foreground">{title || language}</span>
          {#if title && showLanguage}
            <span class="shrink-0 font-mono text-[11px] leading-none text-ripple-muted-foreground">{language}</span>
          {/if}
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

  <div
    class={compact
      ? 'relative py-1.5 font-mono text-[12px] leading-[1.5] text-ripple-muted-foreground'
      : 'relative py-3 font-mono text-[12.5px] leading-[1.65] text-ripple-muted-foreground'}
  >
    <span
      class="pointer-events-none absolute inset-y-0 left-5 w-px bg-ripple-border"
      style={gutter === GUTTER_MIN ? undefined : `left: ${gutter}px`}
    ></span>
    {#each lines as line, i (i)}
      <div
        class={cn('grid grid-cols-[20px_minmax(0,1fr)] items-start', marked(startLine + i) && toneClass)}
        style={gutter === GUTTER_MIN ? undefined : `grid-template-columns: ${gutter}px minmax(0, 1fr)`}
        data-highlight={marked(startLine + i) ? highlightTone : undefined}
      >
        <span class="select-none text-center text-[11px] text-ripple-muted-foreground">{startLine + i}</span>
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
