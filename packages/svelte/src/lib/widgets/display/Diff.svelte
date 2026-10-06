<!-- src/lib/widgets/display/Diff.svelte
     origin: slev12397/beautiful-ui@ff0f74d components/primitives/CodeBlock.tsx

     A text diff in CodeBlock's frame, so the two read as one component in two
     modes: ring and ripple radius, a 36px header (code glyph, mono `title`, the
     `+N −N` stat), a 20px gutter with a 1px rule, 12.5px mono on 1.65, lines
     that wrap. `diff` is imported lazily; the row model lives in diff-rows.ts.

     Lines mode shows one gutter column (a removed line keeps its old number,
     everything else shows its new one), numbered from `oldStart` / `newStart`
     (1 by default) so an excerpt shows its real file lines. A changed line gets
     a 3px bar down its left (solid for an addition, hatched for a removal), a
     10% row tint, and a word tint on the words a rewrite actually changed.
     `split` pairs a removed run beside the added run that replaced it, one grid
     row per line so the two sides stay level when a line wraps. `words` and
     `chars` modes render inline with the same word tint.

     For legibility:
     - A `+`/`−` sign column, so add and remove never rest on colour alone.
     - Text on a changed line is the foreground colour (muted text on a 10% tint
       measures 4.16:1 on a white card).
     - Gutter numbers, signs and the header stat mix the status colour 50/50
       with the foreground, which darkens them in light themes and lightens them
       in dark ones without a `dark:` variant.
     - No syntax colouring: there is no `language` prop, and CodeBlock's rule is
       that a block nobody labelled as code stays uncoloured.
     - The gutter widens past 20px once line numbers reach four digits.

     No shadow and no max width: a ripple widget sizes to its host's layout. -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';
  import FileIcon from '@lucide/svelte/icons/code-xml';
  import { diffRows, splitRows, type DiffPart, type DiffRow } from './diff-rows.js';

  type Mode = 'lines' | 'words' | 'chars';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** "Before" text. */
    before?: string;
    /** "After" text. */
    after?: string;
    /** Diff granularity. */
    mode?: Mode;
    /** Layout: 'unified' (single column) or 'split' (side-by-side). */
    layout?: 'unified' | 'split';
    /** Show line numbers (lines mode only). */
    showLineNumbers?: boolean;
    title?: string;
    /** File line number of the first `before` line (lines mode). */
    oldStart?: number;
    /** File line number of the first `after` line (lines mode). */
    newStart?: number;
  }

  let {
    id,
    class: className,
    style,
    before = '',
    after = '',
    mode = 'lines',
    layout = 'unified',
    showLineNumbers = true,
    title,
    oldStart = 1,
    newStart = 1
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let parts = $state<DiffPart[]>([]);
  let rows = $state<DiffRow[]>([]);

  async function compute() {
    const mod = await import('diff');
    // `before`/`after` are string-typed but a binding can deliver a number —
    // coerce before handing them to the diff lib (string-only contract).
    const a = asText(before);
    const b = asText(after);
    if (mode === 'words') parts = mod.diffWords(a, b);
    else if (mode === 'chars') parts = mod.diffChars(a, b);
    else rows = diffRows(mod.diffLines(a, b), mod.diffWordsWithSpace, oldStart, newStart);
  }

  $effect(() => {
    void before;
    void after;
    void mode;
    void oldStart;
    void newStart;
    compute();
  });

  const pairs = $derived(layout === 'split' ? splitRows(rows) : []);
  const unified = $derived(layout === 'unified' || mode !== 'lines');
  const added = $derived(rows.filter((r) => r.kind === 'added').length);
  const removed = $derived(rows.filter((r) => r.kind === 'removed').length);

  // 20px holds three digits at 11px mono; past that, ~7px a digit.
  const gutter = $derived.by(() => {
    const last = rows.reduce((n, r) => Math.max(n, r.oldNo ?? 0, r.newNo ?? 0), 0);
    return Math.max(20, String(last).length * 7);
  });
  const columns = $derived(`${showLineNumbers ? `${gutter}px ` : ''}16px minmax(0,1fr)`);
</script>

{#snippet line(row: DiffRow | undefined, no: number | undefined)}
  {@const add = row?.kind === 'added'}
  {@const del = row?.kind === 'removed'}
  <div
    class={cn(
      'relative grid items-start',
      add && 'bg-ripple-success/10 text-ripple-surface-foreground',
      del && 'bg-ripple-error/10 text-ripple-surface-foreground'
    )}
    style:grid-template-columns={columns}
  >
    {#if add}
      <span aria-hidden="true" class="absolute inset-y-0 left-0 w-[3px] bg-ripple-success"></span>
    {:else if del}
      <span aria-hidden="true" class="ripple-diff-hatch absolute inset-y-0 left-0 w-[3px]"></span>
    {/if}
    {#if showLineNumbers}
      <span
        class="select-none text-center text-[11px] tabular-nums"
        class:ripple-diff-add-ink={add}
        class:ripple-diff-del-ink={del}>{no ?? ''}</span
      >
    {/if}
    <span class="select-none text-center" class:ripple-diff-add-ink={add} class:ripple-diff-del-ink={del}
      >{add ? '+' : del ? '−' : ''}</span
    >
    <code class="pr-3 break-words whitespace-pre-wrap"
      >{#each row?.pieces ?? [] as piece}<span
          class={piece.changed
            ? cn(
                'rounded-[3px] -mx-px px-0.5 box-decoration-clone',
                add ? 'bg-ripple-success/18' : 'bg-ripple-error/18'
              )
            : undefined}>{piece.text}</span
        >{/each}</code
    >
  </div>
{/snippet}

<div
  {id}
  class={cn('overflow-hidden rounded-ripple bg-ripple-surface ring-1 ring-ripple-border', className)}
  style={styleString}
>
  {#if title}
    <div class="flex h-9 items-center gap-2 border-b border-ripple-border px-4 text-[12.5px]">
      <span class="inline-flex min-w-0 items-center gap-[7px]">
        <FileIcon size={15} class="shrink-0 text-ripple-muted-foreground" aria-hidden="true" />
        <span class="truncate font-mono leading-none text-ripple-surface-foreground">{title}</span>
      </span>
      {#if mode === 'lines'}
        <span class="ml-auto inline-flex items-center gap-2 font-mono text-[12px] leading-none tabular-nums">
          <span class="ripple-diff-add-ink">+{added}</span>
          <span class="ripple-diff-del-ink">−{removed}</span>
        </span>
      {/if}
    </div>
  {/if}

  {#if mode !== 'lines'}
    <!-- Inline word/char diff: the source's word tint, with a strike on removals. -->
    <div
      class="px-4 py-3 font-mono text-[12.5px] leading-[1.65] whitespace-pre-wrap break-words text-ripple-muted-foreground"
    >
      {#each parts as p, i (i)}
        {#if p.added}
          <span
            class="rounded-[3px] -mx-px px-0.5 box-decoration-clone bg-ripple-success/18 text-ripple-surface-foreground"
            >{p.value}</span
          >
        {:else if p.removed}
          <span
            class="rounded-[3px] -mx-px px-0.5 box-decoration-clone bg-ripple-error/18 text-ripple-surface-foreground line-through"
            >{p.value}</span
          >
        {:else}
          <span>{p.value}</span>
        {/if}
      {/each}
    </div>
  {:else if unified}
    <div class="relative py-3 font-mono text-[12.5px] leading-[1.65] text-ripple-muted-foreground">
      {#if showLineNumbers}
        <span class="pointer-events-none absolute inset-y-0 w-px bg-ripple-border" style:left="{gutter}px"></span>
      {/if}
      {#each rows as row, i (i)}
        {@render line(row, row.kind === 'removed' ? row.oldNo : row.newNo)}
      {/each}
    </div>
  {:else}
    <div class="relative py-3 font-mono text-[12.5px] leading-[1.65] text-ripple-muted-foreground">
      <span class="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-ripple-border"></span>
      {#if showLineNumbers}
        <span class="pointer-events-none absolute inset-y-0 w-px bg-ripple-border" style:left="{gutter}px"></span>
        <span
          class="pointer-events-none absolute inset-y-0 w-px bg-ripple-border"
          style:left="calc(50% + {gutter}px)"
        ></span>
      {/if}
      {#each pairs as pair, i (i)}
        <div class="grid grid-cols-2">
          {@render line(pair.left, pair.left?.oldNo)}
          {@render line(pair.right, pair.right?.newNo)}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ripple-diff-hatch {
    background: repeating-linear-gradient(
      45deg,
      var(--ripple-error) 0,
      var(--ripple-error) 1.5px,
      transparent 1.5px,
      transparent 3px
    );
  }
  .ripple-diff-add-ink {
    color: color-mix(in oklab, var(--ripple-success) 50%, var(--ripple-surface-foreground));
  }
  .ripple-diff-del-ink {
    color: color-mix(in oklab, var(--ripple-error) 50%, var(--ripple-surface-foreground));
  }
</style>
