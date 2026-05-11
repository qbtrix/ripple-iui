<!-- src/lib/widgets/data/Kanban.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import NodeRenderer from '$lib/components/NodeRenderer.svelte';

  type Column = {
    id: string;
    title: string;
    color?: string;
    accentClass?: string;
  };

  type Card = Record<string, unknown> & {
    id: string | number;
    title?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    columns?: Column[];
    /** Card list. Bind via `bind: "<state-path>"` to receive the reordered list. */
    value?: Card[];
    /** Field on card identifying which column it belongs to. */
    columnKey?: string;
    /** Card field used as the displayed title. */
    titleKey?: string;
    /** Optional secondary field shown below title. */
    descriptionKey?: string;
    /** Optional badge field shown in card. */
    badgeKey?: string;
    /** Optional spec to render inside each card; receives `card` in loop context. */
    cardTemplate?: any;
    onchange?: (next: Card[]) => void;
    onmove?: (info: { id: string | number; from: string; to: string }) => void;
  }

  let {
    id,
    class: className,
    style,
    columns: rawColumns = [],
    value = [],
    columnKey = 'status',
    titleKey = 'title',
    descriptionKey = 'description',
    badgeKey,
    cardTemplate,
    onchange,
    onmove
  }: Props = $props();

  const columns = $derived(safeArray<Column>(rawColumns, { widget: 'kanban', key: 'columns' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const cards = $derived(Array.isArray(value) ? value : []);

  const cardsByColumn = $derived.by(() => {
    const map = new Map<string, Card[]>();
    for (const c of columns) map.set(c.id, []);
    for (const card of cards) {
      const col = String(card[columnKey] ?? '');
      if (!map.has(col)) map.set(col, []);
      map.get(col)!.push(card);
    }
    return map;
  });

  let draggingId = $state<string | number | null>(null);
  let hoverColumn = $state<string | null>(null);

  function isSpec(v: unknown): boolean {
    return v != null && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).type === 'string';
  }

  function onDragStart(e: DragEvent, cardId: string | number) {
    draggingId = cardId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(cardId));
    }
  }

  function onDragEnd() {
    draggingId = null;
    hoverColumn = null;
  }

  function onDragOverColumn(e: DragEvent, columnId: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    hoverColumn = columnId;
  }

  function onDragLeaveColumn(columnId: string) {
    if (hoverColumn === columnId) hoverColumn = null;
  }

  function onDropColumn(e: DragEvent, columnId: string) {
    e.preventDefault();
    const id = draggingId ?? (e.dataTransfer?.getData('text/plain') ?? null);
    if (id == null) return;
    const dragged = cards.find((c) => String(c.id) === String(id));
    draggingId = null;
    hoverColumn = null;
    if (!dragged) return;
    const fromCol = String(dragged[columnKey] ?? '');
    if (fromCol === columnId) return;
    const next = cards.map((c) =>
      String(c.id) === String(id) ? { ...c, [columnKey]: columnId } : c
    );
    onchange?.(next);
    onmove?.({ id: dragged.id, from: fromCol, to: columnId });
  }
</script>

<div
  {id}
  class={cn('flex gap-3 overflow-x-auto pb-2', className)}
  style={styleString}
>
  {#each columns as col (col.id)}
    {@const colCards = cardsByColumn.get(col.id) ?? []}
    <div
      class={cn(
        'flex flex-col w-72 shrink-0 rounded-lg border bg-card/30 p-2 gap-2 transition-colors',
        hoverColumn === col.id ? 'border-primary bg-primary/5' : 'border-border'
      )}
      ondragover={(e) => onDragOverColumn(e, col.id)}
      ondragleave={() => onDragLeaveColumn(col.id)}
      ondrop={(e) => onDropColumn(e, col.id)}
    >
      <div class="flex items-center justify-between px-1.5 py-1">
        <div class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class={cn('h-2 w-2 rounded-full', col.accentClass ?? 'bg-muted-foreground/40')}
            style={col.color ? `background:${col.color}` : undefined}
          ></span>
          <span class="text-sm font-semibold">{col.title}</span>
        </div>
        <span class="text-xs text-muted-foreground tabular-nums">{colCards.length}</span>
      </div>

      <div class="flex flex-col gap-2 min-h-[24px]">
        {#each colCards as card (card.id)}
          <div
            draggable="true"
            ondragstart={(e) => onDragStart(e, card.id)}
            ondragend={onDragEnd}
            class={cn(
              'rounded-md border border-border bg-background p-2.5 shadow-xs cursor-grab active:cursor-grabbing select-none',
              draggingId === card.id && 'opacity-60'
            )}
          >
            {#if isSpec(cardTemplate)}
              <NodeRenderer node={cardTemplate} loopContext={{ card, item: card }} />
            {:else}
              <div class="flex items-start justify-between gap-2">
                <div class="text-sm font-medium leading-tight">
                  {card[titleKey] ?? ''}
                </div>
                {#if badgeKey && card[badgeKey]}
                  <span class="shrink-0 text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground">
                    {card[badgeKey]}
                  </span>
                {/if}
              </div>
              {#if card[descriptionKey]}
                <div class="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {card[descriptionKey]}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
