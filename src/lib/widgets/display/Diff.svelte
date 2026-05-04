<!-- src/lib/widgets/display/Diff.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

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
    title
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  type Part = { value: string; added?: boolean; removed?: boolean };
  let parts = $state<Part[]>([]);

  async function compute() {
    const mod = await import('diff');
    let result: Part[];
    if (mode === 'words') result = (mod as any).diffWords(before, after);
    else if (mode === 'chars') result = (mod as any).diffChars(before, after);
    else result = (mod as any).diffLines(before, after);
    parts = result;
  }

  onMount(() => { compute(); });
  $effect(() => {
    void before;
    void after;
    void mode;
    if (typeof window !== 'undefined') compute();
  });

  type Row = { kind: 'context' | 'added' | 'removed'; oldNo?: number; newNo?: number; text: string };

  // For lines mode: build per-line rows for the unified view.
  const lineRows = $derived.by<Row[]>(() => {
    if (mode !== 'lines') return [];
    const rows: Row[] = [];
    let oldNo = 1;
    let newNo = 1;
    for (const p of parts) {
      const lines = p.value.split('\n');
      // Trailing empty entry from a trailing newline isn't a real line.
      const arr = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
      for (const line of arr) {
        if (p.added) rows.push({ kind: 'added', newNo: newNo++, text: line });
        else if (p.removed) rows.push({ kind: 'removed', oldNo: oldNo++, text: line });
        else rows.push({ kind: 'context', oldNo: oldNo++, newNo: newNo++, text: line });
      }
    }
    return rows;
  });

  // Build aligned split rows.
  const splitRows = $derived.by(() => {
    if (mode !== 'lines') return { left: [] as Row[], right: [] as Row[] };
    const left: Row[] = [];
    const right: Row[] = [];
    let oldNo = 1, newNo = 1;
    for (const p of parts) {
      const lines = p.value.split('\n');
      const arr = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
      if (p.added) {
        for (const line of arr) {
          left.push({ kind: 'context', text: '' });
          right.push({ kind: 'added', newNo: newNo++, text: line });
        }
      } else if (p.removed) {
        for (const line of arr) {
          left.push({ kind: 'removed', oldNo: oldNo++, text: line });
          right.push({ kind: 'context', text: '' });
        }
      } else {
        for (const line of arr) {
          left.push({ kind: 'context', oldNo: oldNo++, text: line });
          right.push({ kind: 'context', newNo: newNo++, text: line });
        }
      }
    }
    return { left, right };
  });

  const unified = $derived(layout === 'unified' || mode !== 'lines');

  function rowClass(kind: Row['kind']): string {
    if (kind === 'added') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    if (kind === 'removed') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
    return '';
  }
  function rowSign(kind: Row['kind']): string {
    if (kind === 'added') return '+';
    if (kind === 'removed') return '-';
    return ' ';
  }
</script>

<div
  {id}
  class={cn('rounded-ripple border border-ripple-border overflow-hidden', className)}
  style={styleString}
>
  {#if title}
    <div class="border-b border-ripple-border bg-ripple-muted/30 px-3 py-1.5 text-xs font-mono text-muted-foreground">
      {title}
    </div>
  {/if}

  {#if mode !== 'lines'}
    <!-- Inline word/char diff: render parts in flow with adds/removes highlighted. -->
    <div class="px-3 py-2 font-mono text-xs whitespace-pre-wrap leading-relaxed">
      {#each parts as p, i (i)}
        {#if p.added}
          <span class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-sm px-0.5">{p.value}</span>
        {:else if p.removed}
          <span class="bg-rose-500/15 text-rose-700 dark:text-rose-300 line-through rounded-sm px-0.5">{p.value}</span>
        {:else}
          <span>{p.value}</span>
        {/if}
      {/each}
    </div>
  {:else if unified}
    <table class="w-full text-xs font-mono">
      <tbody>
        {#each lineRows as row, i (i)}
          <tr class={rowClass(row.kind)}>
            {#if showLineNumbers}
              <td class="select-none w-10 pl-2 pr-1 text-right text-muted-foreground tabular-nums">{row.oldNo ?? ''}</td>
              <td class="select-none w-10 pr-2 pl-1 text-right text-muted-foreground tabular-nums">{row.newNo ?? ''}</td>
            {/if}
            <td class="select-none w-4 text-center">{rowSign(row.kind)}</td>
            <td class="px-2 py-0.5 whitespace-pre-wrap break-all">{row.text}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="grid grid-cols-2 divide-x divide-border">
      <table class="text-xs font-mono">
        <tbody>
          {#each splitRows.left as row, i (i)}
            <tr class={rowClass(row.kind)}>
              {#if showLineNumbers}
                <td class="select-none w-10 pl-2 pr-1 text-right text-muted-foreground tabular-nums">{row.oldNo ?? ''}</td>
              {/if}
              <td class="px-2 py-0.5 whitespace-pre-wrap break-all">{row.text}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <table class="text-xs font-mono">
        <tbody>
          {#each splitRows.right as row, i (i)}
            <tr class={rowClass(row.kind)}>
              {#if showLineNumbers}
                <td class="select-none w-10 pl-2 pr-1 text-right text-muted-foreground tabular-nums">{row.newNo ?? ''}</td>
              {/if}
              <td class="px-2 py-0.5 whitespace-pre-wrap break-all">{row.text}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
