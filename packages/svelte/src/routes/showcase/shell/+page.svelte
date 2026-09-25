<!--
  src/routes/showcase/shell/+page.svelte
  NEW 2026-09-25 (shell new-look slice 1). Demo of the app-shell primitives on
  `./ui`: a sidebar built from SectionHeader + ListRow (active, unread dot and
  count, muted, indent, hover actions, rename mode), a side panel with
  PanelHeader, Kbd hints and Segmented option badges. Imports from
  `$lib/ui/index.js` directly, the way a hand-written caller does. Dev route
  only; SvelteKit routes are not packaged.
-->
<script lang="ts">
  import { ListRow, SectionHeader, PanelHeader, Kbd, Segmented } from '$lib/ui/index.js';
  import HashIcon from '@lucide/svelte/icons/hash';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

  const rooms = [
    { id: 'general', name: 'general', unread: 0 as number | boolean, meta: '2m' },
    { id: 'design', name: 'design-reviews-and-a-very-long-channel-name', unread: 3, meta: '1h' },
    { id: 'eng', name: 'eng', unread: true, meta: 'Tue' },
    { id: 'random', name: 'random', unread: 0, meta: '' },
  ];
  let active = $state('general');
  let roomsOpen = $state(true);
  let renaming = $state<string | null>(null);
  let draft = $state('');
  let panelOpen = $state(true);
  let tab = $state('chat');
  let size = $state<'sm' | 'md' | 'touch'>('md');
  let log = $state('');
</script>

<main class="min-h-screen bg-background p-8 text-foreground">
  <h1 class="mb-1 text-xl font-semibold">Shell primitives</h1>
  <p class="mb-6 text-sm text-muted-foreground">ListRow, SectionHeader, PanelHeader, Kbd and Segmented badges from <code>./ui</code>.</p>

  <div class="mb-6 flex items-center gap-4">
    <Segmented
      size="sm"
      value={size}
      options={[{ value: 'sm', label: 'sm' }, { value: 'md', label: 'md' }, { value: 'touch', label: 'touch' }]}
      onchange={(v) => (size = v as typeof size)}
    />
    <Segmented
      value={tab}
      options={[
        { value: 'chat', label: 'Chat', badge: 3 },
        { value: 'files', label: 'Files' },
        { value: 'agents', label: 'Agents', badge: '9+' },
      ]}
      onchange={(v) => (tab = String(v))}
    />
    <span class="text-sm text-muted-foreground">Search <Kbd keys={['⌘', 'K']} /></span>
  </div>

  <div class="flex gap-6">
    <nav class="w-64 rounded-lg border border-border p-1.5" aria-label="Rooms">
      <SectionHeader label="Rooms" count={rooms.length} bind:open={roomsOpen} controls="demo-rooms">
        {#snippet action()}
          <button type="button" aria-label="New room" class="inline-flex size-6 items-center justify-center rounded-md hover:bg-ripple-accent/10">
            <PlusIcon size={13} />
          </button>
        {/snippet}
      </SectionHeader>
      {#if roomsOpen}
        <div id="demo-rooms" class="flex flex-col gap-px">
          {#each rooms as room (room.id)}
            <ListRow
              {size}
              active={active === room.id}
              unread={room.unread}
              renaming={renaming === room.id}
              onclick={() => (active = room.id)}
              oncontextmenu={(e) => { e.preventDefault(); log = `context menu on ${room.name}`; }}
              data-testid="demo-room-{room.id}"
            >
              {#snippet leading()}<HashIcon size={14} class="opacity-60" />{/snippet}
              {room.name}
              {#snippet meta()}{room.meta}{/snippet}
              {#snippet trailing()}
                <button type="button" aria-label="Rename {room.name}" class="inline-flex size-6 items-center justify-center rounded-md hover:bg-ripple-accent/10"
                  onclick={() => { renaming = room.id; draft = room.name; }}><PencilIcon size={12} /></button>
                <button type="button" aria-label="Delete {room.name}" class="inline-flex size-6 items-center justify-center rounded-md hover:bg-ripple-accent/10"
                  onclick={() => (log = `delete ${room.name}`)}><TrashIcon size={12} /></button>
              {/snippet}
              {#snippet rename()}
                <!-- svelte-ignore a11y_autofocus -->
                <input
                  autofocus
                  aria-label="Rename room"
                  class="h-6 w-full rounded-md border border-border bg-transparent px-1.5 text-[13px] outline-none"
                  bind:value={draft}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') renaming = null; }}
                  onblur={() => (renaming = null)}
                />
              {/snippet}
            </ListRow>
          {/each}
          <ListRow {size} indent={1} muted label="archived-thread" href="#archived" />
        </div>
      {/if}
      <SectionHeader label="Settings" />
      <ListRow {size} href="#profile" label="Profile" />
      <ListRow {size} href="#billing" label="Billing" />
    </nav>

    {#if panelOpen}
      <section class="w-80 rounded-lg border border-border">
        <PanelHeader title="Thread" subtitle="3 replies in #{active}" onclose={() => (panelOpen = false)} closeLabel="Close thread">
          {#snippet leading()}
            <button type="button" aria-label="Back" class="inline-flex size-7 items-center justify-center rounded-md hover:bg-ripple-accent/10"><ArrowLeftIcon size={14} /></button>
          {/snippet}
        </PanelHeader>
        <p class="p-3 text-sm text-muted-foreground">Panel body.</p>
      </section>
    {:else}
      <button type="button" class="h-8 self-start rounded-md border border-border px-3 text-sm" onclick={() => (panelOpen = true)}>Reopen panel</button>
    {/if}
  </div>

  <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{log}</p>
</main>
