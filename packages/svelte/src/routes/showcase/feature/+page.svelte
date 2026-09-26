<!--
  src/routes/showcase/feature/+page.svelte
  NEW 2026-09-26 (feature pages canon, F1). Demo of the feature-page pieces:
  PageHeader (leading, actions, toolbar, both title sizes), Segmented option
  counts, EmptyState (md, sm, error tone, icon snippet, actions), InlineAlert
  (four tones, actions, dismiss) and the Label + Textarea primitives. Imports
  from `$lib/ui/index.js` and `$lib/primitives/index.js` directly, the way a
  hand-written caller does. Dev route only; SvelteKit routes are not packaged.
-->
<script lang="ts">
  import { PageHeader, EmptyState, InlineAlert, Segmented, Search } from '$lib/ui/index.js';
  import { Button, Label, Textarea } from '$lib/primitives/index.js';
  import BotIcon from '@lucide/svelte/icons/bot';
  import PlusIcon from '@lucide/svelte/icons/plus';

  let source = $state('all');
  let dense = $state(false);
  let dismissed = $state<string[]>([]);
  let bio = $state('');
  let log = $state('');
  const tones = ['info', 'success', 'warning', 'error'] as const;
  const copy: Record<(typeof tones)[number], [string, string]> = {
    info: ['Syncing calendars', 'Events from Google appear in a minute or two.'],
    success: ['Agent saved', 'Changes apply to the next run.'],
    warning: ['Token expires soon', 'Reconnect Zoom before Friday to keep recordings.'],
    error: ['Could not load meetings', 'The server did not answer. Your data is safe.'],
  };
</script>

<main class="min-h-screen space-y-10 bg-background p-8 text-foreground">
  <section class="space-y-3">
    <label class="flex items-center gap-2 text-sm text-muted-foreground">
      <input type="checkbox" bind:checked={dense} /> Dense tool page (size="sm")
    </label>
    <PageHeader title="Meetings" subtitle="Recordings, notes and live calls" size={dense ? 'sm' : 'md'}>
      {#snippet leading()}
        <span class="inline-flex size-9 items-center justify-center rounded-ripple bg-ripple-accent/10 text-ripple-accent"><BotIcon size={18} /></span>
      {/snippet}
      {#snippet actions()}
        <Button size="sm" onclick={() => (log = 'new meeting')}><PlusIcon size={14} /> New meeting</Button>
      {/snippet}
      {#snippet toolbar()}
        <div class="w-64"><Search placeholder="Search meetings" /></div>
        <Segmented
          size="sm"
          value={source}
          options={[
            { value: 'all', label: 'All', badge: 24 },
            { value: 'zoom', label: 'Zoom', badge: 9 },
            { value: 'meet', label: 'Meet', badge: 0 },
          ]}
          onchange={(v) => (source = String(v))}
        />
      {/snippet}
    </PageHeader>
  </section>

  <section class="grid gap-4 md:grid-cols-3">
    <EmptyState title="No agents yet" description="Create one, or import a soul file.">
      {#snippet icon()}<BotIcon size={20} />{/snippet}
      {#snippet actions()}
        <Button size="sm" onclick={() => (log = 'create agent')}>Create agent</Button>
        <Button size="sm" variant="outline" onclick={() => (log = 'import soul')}>Import soul</Button>
      {/snippet}
    </EmptyState>
    <EmptyState size="sm" icon="search" title="No matches" description="Try a shorter search." />
    <EmptyState tone="error" title="Could not load agents" description="Check your connection and try again.">
      {#snippet actions()}
        <Button size="sm" variant="outline" onclick={() => (log = 'retry')}>Retry</Button>
      {/snippet}
    </EmptyState>
  </section>

  <section class="max-w-xl space-y-2">
    {#each tones as tone (tone)}
      {#if !dismissed.includes(tone)}
        {#if tone === 'error'}
          <InlineAlert {tone} title={copy[tone][0]} description={copy[tone][1]} ondismiss={() => (dismissed = [...dismissed, tone])}>
            {#snippet actions()}
              <Button size="xs" variant="outline" onclick={() => (log = 'retry meetings')}>Retry</Button>
            {/snippet}
          </InlineAlert>
        {:else}
          <InlineAlert {tone} title={copy[tone][0]} description={copy[tone][1]} ondismiss={() => (dismissed = [...dismissed, tone])} />
        {/if}
      {/if}
    {/each}
    {#if dismissed.length}
      <button type="button" class="text-sm underline" onclick={() => (dismissed = [])}>Show dismissed alerts</button>
    {/if}
  </section>

  <section class="max-w-xl space-y-2">
    <Label for="demo-bio">Agent instructions</Label>
    <Textarea id="demo-bio" placeholder="What should this agent do?" bind:value={bio} />
    <p class="text-[12px] text-muted-foreground">{bio.length} characters</p>
  </section>

  <p class="text-sm text-muted-foreground" aria-live="polite">{log}</p>
</main>
