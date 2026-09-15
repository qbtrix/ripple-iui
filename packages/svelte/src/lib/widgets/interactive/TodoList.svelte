<!--
  @file widgets/interactive/TodoList.svelte
  @description Interactive todo list with add / toggle / delete / filter. Ported
    from the ocean-flow genesis composite widget into Ripple conventions: uses
    the default `value` + `onchange` bind surface, Tailwind shadcn semantic
    tokens, and Svelte 5 runes throughout.
  @created 2026-05-31 — composite consumer widgets migration. Lowest-friction
    port: already matches Ripple's default bind contract (prop `value`, event
    `onchange`), so a spec can two-way-bind it with `bind: "state.tasks"`.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';

  interface TodoItem {
    id: string;
    text: string;
    done: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Heading shown above the list. */
    title?: string;
    /** Placeholder for the add-item input. */
    placeholder?: string;
    /** Items when not bound (static spec). */
    items?: TodoItem[];
    /** Bound value from NodeRenderer (`bind` resolves here). */
    value?: TodoItem[];
    /** Fires with the full new array whenever items change. */
    onchange?: (items: TodoItem[]) => void;
  }

  let {
    id,
    class: className,
    style,
    title = 'Todo List',
    placeholder = 'Add a new task...',
    items: itemsProp = [],
    value,
    onchange
  }: Props = $props();

  // Bound value wins; fall back to the static `items` prop.
  const items = $derived(value ?? itemsProp);

  let newTaskText = $state('');
  let filter = $state<'all' | 'active' | 'completed'>('all');

  const filteredItems = $derived.by(() => {
    if (filter === 'active') return items.filter((item) => !item.done);
    if (filter === 'completed') return items.filter((item) => item.done);
    return items;
  });

  const remainingCount = $derived(items.filter((item) => !item.done).length);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function toggleItem(itemId: string) {
    onchange?.(
      items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    );
  }

  function addItem() {
    const text = newTaskText.trim();
    if (!text) return;
    const newItem: TodoItem = { id: `t-${Date.now()}`, text, done: false };
    onchange?.([...items, newItem]);
    newTaskText = '';
  }

  function deleteItem(itemId: string) {
    onchange?.(items.filter((item) => item.id !== itemId));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') addItem();
  }

  const filters: Array<'all' | 'active' | 'completed'> = ['all', 'active', 'completed'];
</script>

<div {id} class={cn('flex flex-col gap-4 p-4', className)} style={styleString}>
  <h2 class="text-lg font-semibold">{title}</h2>

  <!-- Add new task -->
  <div class="flex gap-2">
    <input
      type="text"
      bind:value={newTaskText}
      onkeydown={handleKeydown}
      {placeholder}
      class="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
    <button
      onclick={addItem}
      class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      Add
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-2">
    {#each filters as f}
      <button
        onclick={() => (filter = f)}
        class={cn(
          'px-3 py-1.5 text-sm rounded-md capitalize transition-colors',
          filter === f
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
      >
        {f}
      </button>
    {/each}
  </div>

  <!-- Task list -->
  <div class="border border-border rounded-lg divide-y divide-border bg-card">
    {#if filteredItems.length === 0}
      <div class="p-4 text-center text-muted-foreground">
        {#if filter === 'all'}
          No tasks yet. Add one above.
        {:else if filter === 'active'}
          No active tasks.
        {:else}
          No completed tasks.
        {/if}
      </div>
    {:else}
      {#each filteredItems as item (item.id)}
        <div class="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={item.done}
              onchange={() => toggleItem(item.id)}
              class="h-4 w-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
            />
            <span class={cn('transition-all', item.done && 'line-through text-muted-foreground')}>
              {item.text}
            </span>
          </label>
          <button
            onclick={() => deleteItem(item.id)}
            class="text-muted-foreground hover:text-destructive transition-colors px-2"
            aria-label="Delete task"
          >
            ×
          </button>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  <p class="text-sm text-muted-foreground text-center">
    {remainingCount} {remainingCount === 1 ? 'task' : 'tasks'} remaining
  </p>
</div>
