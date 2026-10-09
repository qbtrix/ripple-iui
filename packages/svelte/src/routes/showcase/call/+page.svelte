<!--
  @file routes/showcase/call/+page.svelte
  @description Call parts from ./ui in all three layouts: ControlButton and ControlBar with
    a CountBadge, ParticipantTile with a Slider menu, FloatingDock,
    IncomingCallCard and BottomSheet. Mock state only, imported the way a
    hand-written caller would.
    Framed by ShowcasePage, which supplies the h1, the line and the search opt-in.
-->

<script lang="ts">
  import ShowcasePage from '../ShowcasePage.svelte';
  import {
    ControlButton,
    ControlBar,
    ParticipantTile,
    FloatingDock,
    IncomingCallCard,
    BottomSheet,
    Popover,
    Slider,
    Segmented,
  } from '$lib/ui/index.js';
  import { Button } from '$lib/primitives/index.js';
  import Mic from '@lucide/svelte/icons/mic';
  import MicOff from '@lucide/svelte/icons/mic-off';
  import Video from '@lucide/svelte/icons/video';
  import MessageSquare from '@lucide/svelte/icons/message-square';
  import PhoneOff from '@lucide/svelte/icons/phone-off';
  import Phone from '@lucide/svelte/icons/phone';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';

  type Layout = 'glass' | 'focus' | 'classic';
  let layout = $state<Layout>('glass');
  const ctl = $derived(layout === 'glass' ? 'pill' : layout === 'focus' ? 'bar' : 'classic');
  let muted = $state(false);
  let camera = $state(true);
  let chatOpen = $state(false);
  let unread = $state(3);
  let speaker = $state('maya');
  let volume = $state(1);
  let stop = $state<'peek' | 'half' | 'full'>('peek');
  let log = $state('');
  const people = [
    { id: 'maya', name: 'Maya Chen' },
    { id: 'ada', name: 'Ada Lovelace', muted: true },
    { id: 'paw', name: 'Paw', agent: true },
  ];
</script>

<ShowcasePage slug="call">
<div class="text-foreground">
  <p class="mb-6 text-sm text-muted-foreground">
    ControlButton, ControlBar, ParticipantTile, FloatingDock, IncomingCallCard, BottomSheet and Slider from <code>./ui</code>.
  </p>

  <div class="mb-6 flex items-center gap-4">
    <Button variant="outline" size="sm" onclick={() => (speaker = people[(people.findIndex((p) => p.id === speaker) + 1) % people.length].id)}>Next speaker</Button>
    <Segmented
      size="sm"
      options={[
        { value: 'glass', label: 'Glass' },
        { value: 'focus', label: 'Focus' },
        { value: 'classic', label: 'Classic' },
      ]}
      value={layout}
      onchange={(v) => (layout = v as Layout)}
    />
  </div>

  <!-- The stage: dark in both themes, like the app's call stage. -->
  <section class="dark relative h-[520px] overflow-hidden rounded-2xl bg-background text-foreground">
    <div class="grid h-[calc(100%-5rem)] grid-cols-3 gap-3 p-4">
      {#each people as p (p.id)}
          <ParticipantTile name={p.name} skin={layout} speaking={speaker === p.id} muted={p.muted} data-testid="tile">
            {#snippet badge()}
              {#if p.agent}<span class="rounded bg-ripple-accent/20 px-1 text-[10px] uppercase">Agent</span>{/if}
            {/snippet}
            {#snippet menu()}
              <Popover.Root>
                <Popover.Trigger class="grid size-7 place-items-center rounded-full bg-ripple-surface/60" aria-label={`Volume for ${p.name}`}>
                  <Ellipsis class="size-4" />
                </Popover.Trigger>
                <Popover.Content class="w-56 p-3" align="end">
                  <p class="mb-2 text-sm">Volume {Math.round(volume * 100)}%</p>
                  <Slider.Root type="single" bind:value={volume} min={0} max={2} step={0.05} aria-label={`Volume for ${p.name}`} />
                </Popover.Content>
              </Popover.Root>
            {/snippet}
          </ParticipantTile>
      {/each}
    </div>

    <div class="absolute inset-x-0 bottom-3 flex justify-center" class:bottom-0={layout === 'focus'}>
      <ControlBar label="Call controls" variant={ctl}>
        <ControlButton variant={ctl} label={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'} pressed={muted} tone={muted ? 'danger' : 'default'} onclick={() => (muted = !muted)}>
          {#snippet icon()}{#if muted}<MicOff />{:else}<Mic />{/if}{/snippet}
        </ControlButton>
        <ControlButton variant={ctl} label="Camera" aria-label={camera ? 'Turn camera off' : 'Turn camera on'} pressed={camera} tone={camera ? 'accent' : 'default'} onclick={() => (camera = !camera)}>
          {#snippet icon()}<Video />{/snippet}
        </ControlButton>
        <ControlButton
          variant={ctl}
          label="Chat"
          aria-label={chatOpen ? 'Close chat' : `Open chat, ${unread} unread`}
          pressed={chatOpen}
          tone={chatOpen ? 'accent' : 'default'}
          count={chatOpen ? 0 : unread}
          badgeTestId="call-chat-badge"
          onclick={() => ((chatOpen = !chatOpen), (unread = 0))}
        >
          {#snippet icon()}<MessageSquare />{/snippet}
        </ControlButton>
        <ControlButton variant={ctl} label="Leave" aria-label="Leave call" tone="danger" wide onclick={() => (log = 'Leave call')}>
          {#snippet icon()}<PhoneOff />{/snippet}
        </ControlButton>
      </ControlBar>
    </div>

    <FloatingDock label="Call dock" bounds="parent" corner="top-right" onPositionChange={(p) => (log = `dock at ${p.x},${p.y}`)}>
      <div class="flex items-center gap-2 p-2">
        <div class="size-11"><ParticipantTile name="Maya Chen" size="orb" skin="glass" speaking /></div>
        <span class="text-sm font-medium">Design sync</span>
        <ControlBar label="Dock controls" size="compact">
          <ControlButton size="compact" aria-label="Mute" pressed={muted} onclick={() => (muted = !muted)}>
            {#snippet icon()}<Mic />{/snippet}
          </ControlButton>
          <ControlButton size="compact" tone="danger" aria-label="Leave call">
            {#snippet icon()}<PhoneOff />{/snippet}
          </ControlButton>
        </ControlBar>
      </div>
    </FloatingDock>
  </section>

  <div class="mt-8 grid gap-8 md:grid-cols-2">
    <div class="dark flex flex-col gap-3 rounded-2xl bg-background p-4 text-foreground">
      <IncomingCallCard title="Maya Chen" subtitle="Incoming call · Design sync">
        {#snippet secondary()}
          <Button variant="destructive" size="icon" aria-label="Decline call"><PhoneOff /></Button>
        {/snippet}
        {#snippet primary()}
          <Button variant="success" size="icon" aria-label="Accept call"><Phone /></Button>
        {/snippet}
      </IncomingCallCard>
      <IncomingCallCard title="Call in progress" subtitle="Paw standup · 3 in call" role="status" halo={false}>
        {#snippet primary()}
          <Button variant="success" size="sm" aria-label="Join call"><Phone />Join</Button>
        {/snippet}
      </IncomingCallCard>
    </div>

    <div class="dark relative h-80 overflow-hidden rounded-2xl bg-background text-foreground">
      <p class="p-4 text-sm text-muted-foreground">Sheet stop: {stop}</p>
      <BottomSheet bind:stop label="Call chat" handleLabel={(s) => (s === 'peek' ? 'Open chat' : s === 'half' ? 'Expand chat' : 'Shrink chat')}>
        <p class="px-4 text-sm">Maya: the deck is in the channel.</p>
      </BottomSheet>
    </div>
  </div>

  <p class="mt-4 text-sm text-muted-foreground" aria-live="polite">{log}</p>
</div>
</ShowcasePage>
