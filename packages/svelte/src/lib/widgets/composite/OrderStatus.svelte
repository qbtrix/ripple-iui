<!--
  @file OrderStatus.svelte
  @description Multi-step shipment / order / fulfillment status with optional
  embedded live map and event timeline. Composes the existing `map` widget
  for the courier position + route, and renders a horizontal stepper inline.

  Use cases: package delivery, courier tracking, RMA, ticket lifecycle,
  manufacturing job status, build pipeline, repair status.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Map from '$lib/widgets/data/Map.svelte';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type LatLng = [number, number];

  type DefaultStatus =
    | 'placed'
    | 'confirmed'
    | 'preparing'
    | 'in-transit'
    | 'out-for-delivery'
    | 'delivered'
    | 'failed'
    | 'cancelled';

  type TilePreset = 'osm' | 'carto-voyager' | 'carto-light' | 'carto-dark' | 'osm-hot' | 'custom';

  interface Step {
    id: string;
    label: string;
    description?: string;
    completedAt?: string;
    current?: boolean;
    failed?: boolean;
  }

  interface Tracking {
    carrier: string;
    number: string;
    url?: string;
  }

  interface Place {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
  }

  interface Tracker {
    lat: number;
    lng: number;
    heading?: number;
    label?: string;
    color?: string;
  }

  interface OrderEvent {
    time: string;
    label: string;
    location?: string;
    icon?: string;
  }

  interface Action {
    id?: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'outline' | 'ghost';
    actions?: EventHandlerOrArray;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    orderId: string;
    status?: DefaultStatus;
    steps?: Step[];
    /** ID of the active step (when using custom `steps`). */
    currentStep?: string;
    eta?: string;
    tracking?: Tracking;
    origin?: Place;
    destination?: Place;
    tracker?: Tracker;
    route?: LatLng[];
    showMap?: boolean;
    mapHeight?: string | number;
    mapTiles?: TilePreset;
    /** Auto-pan the map to follow the tracker. Default false. */
    followTracker?: boolean;
    events?: OrderEvent[];
    actions?: Action[];
    onaction?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    orderId,
    status,
    steps: rawSteps,
    currentStep,
    eta,
    tracking,
    origin,
    destination,
    tracker,
    route,
    showMap,
    mapHeight = '320px',
    mapTiles = 'carto-voyager',
    followTracker = false,
    events: rawEvents = [],
    actions: rawActions = [],
    onaction
  }: Props = $props();

  const steps = $derived(
    rawSteps === undefined
      ? undefined
      : safeArray<Step>(rawSteps, { widget: 'order-status', key: 'steps' })
  );
  const events = $derived(safeArray<OrderEvent>(rawEvents, { widget: 'order-status', key: 'events' }));
  const actions = $derived(safeArray<Action>(rawActions, { widget: 'order-status', key: 'actions' }));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  // Default 5-step pipeline.
  const DEFAULT_STEPS: { id: DefaultStatus; label: string }[] = [
    { id: 'placed', label: 'Placed' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'in-transit', label: 'In transit' },
    { id: 'out-for-delivery', label: 'Out for delivery' },
    { id: 'delivered', label: 'Delivered' }
  ];

  const effectiveSteps = $derived.by<Step[]>(() => {
    if (steps && steps.length > 0) return steps;
    return DEFAULT_STEPS.map((s) => ({ id: s.id, label: s.label }));
  });

  const activeIdx = $derived.by(() => {
    if (currentStep) {
      const idx = effectiveSteps.findIndex((s) => s.id === currentStep);
      if (idx >= 0) return idx;
    }
    if (status === 'failed' || status === 'cancelled') return -1;
    if (status) {
      const idx = effectiveSteps.findIndex((s) => s.id === status);
      if (idx >= 0) return idx;
    }
    const explicit = effectiveSteps.findIndex((s) => s.current);
    if (explicit >= 0) return explicit;
    // First not-yet-completed step.
    const firstPending = effectiveSteps.findIndex((s) => !s.completedAt);
    return firstPending >= 0 ? firstPending : effectiveSteps.length - 1;
  });

  const isFailed = $derived(status === 'failed' || status === 'cancelled' || effectiveSteps.some((s) => s.failed));
  const isComplete = $derived(status === 'delivered' || activeIdx === effectiveSteps.length - 1 && effectiveSteps[activeIdx]?.completedAt);

  const computedShowMap = $derived(
    showMap !== undefined
      ? showMap
      : Boolean(tracker || (origin?.lat && origin?.lng) || (destination?.lat && destination?.lng) || (route && route.length > 0))
  );

  const mapMarkers = $derived.by(() => {
    const m: { id: string; lat: number; lng: number; label: string; color: string }[] = [];
    if (origin?.lat !== undefined && origin?.lng !== undefined) {
      m.push({ id: 'origin', lat: origin.lat, lng: origin.lng, label: origin.name ?? 'Origin', color: 'oklch(0.65 0.16 150)' });
    }
    if (destination?.lat !== undefined && destination?.lng !== undefined) {
      m.push({ id: 'destination', lat: destination.lat, lng: destination.lng, label: destination.name ?? 'Destination', color: 'oklch(0.55 0.18 250)' });
    }
    return m;
  });

  const mapPaths = $derived.by(() => {
    if (route && route.length > 1) {
      return [{ id: 'route', points: route, color: 'oklch(0.55 0.18 250)', weight: 4, dashed: true, animate: true }];
    }
    if (origin?.lat !== undefined && origin?.lng !== undefined && destination?.lat !== undefined && destination?.lng !== undefined) {
      return [{ id: 'route', points: [[origin.lat, origin.lng], [destination.lat, destination.lng]] as LatLng[], color: 'oklch(0.55 0.18 250)', weight: 3, dashed: true, animate: true }];
    }
    return [];
  });

  const mapTrackers = $derived.by(() => {
    if (!tracker) return [];
    const trail: LatLng[] = [];
    if (origin?.lat !== undefined && origin?.lng !== undefined) trail.push([origin.lat, origin.lng]);
    trail.push([tracker.lat, tracker.lng]);
    return [
      {
        id: 'courier',
        lat: tracker.lat,
        lng: tracker.lng,
        heading: tracker.heading,
        label: tracker.label ?? 'Courier',
        color: tracker.color ?? 'oklch(0.65 0.22 25)',
        trail,
        follow: followTracker
      }
    ];
  });

  const mapCenter = $derived.by<LatLng>(() => {
    if (tracker) return [tracker.lat, tracker.lng];
    if (destination?.lat !== undefined && destination?.lng !== undefined) return [destination.lat, destination.lng];
    if (origin?.lat !== undefined && origin?.lng !== undefined) return [origin.lat, origin.lng];
    return [0, 0];
  });

  const VARIANT_CLASS: Record<NonNullable<Action['variant']>, string> = {
    default: 'rorder-btn-primary',
    outline: 'rorder-btn-outline',
    ghost: 'rorder-btn-ghost'
  };

  function fireAction(a: Action) {
    if (a.actions && eventDispatcher) {
      const handlers = Array.isArray(a.actions) ? a.actions : [a.actions];
      void eventDispatcher.dispatch(handlers as EventHandler[], { state: stateManager?.state ?? {} }, a.id);
      return;
    }
    if (a.id) onaction?.(a.id);
  }
</script>

<div {id} class={cn('rorder', className)} style={styleString}>
  <header class="rorder-header">
    <div class="rorder-header-main">
      <div class="rorder-eyebrow">Order #{orderId}</div>
      <h2 class="rorder-title">{title ?? (isFailed ? 'Order paused' : isComplete ? 'Delivered' : 'Tracking your order')}</h2>
      {#if eta}
        <p class="rorder-eta">
          <Icon name="clock" size={13} />
          {isComplete ? 'Delivered' : 'ETA'}: <span class="rorder-eta-value">{eta}</span>
        </p>
      {/if}
    </div>
    {#if tracking}
      <div class="rorder-tracking">
        <span class="rorder-tracking-label">Tracking</span>
        {#if tracking.url}
          <a href={tracking.url} target="_blank" rel="noopener" class="rorder-tracking-num">
            {tracking.carrier} · {tracking.number}
            <Icon name="external-link" size={12} />
          </a>
        {:else}
          <span class="rorder-tracking-num">{tracking.carrier} · {tracking.number}</span>
        {/if}
      </div>
    {/if}
  </header>

  <!-- Stepper -->
  <ol class={cn('rorder-steps', isFailed && 'rorder-steps-failed')}>
    {#each effectiveSteps as s, i}
      {@const state = i < activeIdx ? 'done' : i === activeIdx ? (isFailed ? 'failed' : 'active') : 'pending'}
      <li class={cn('rorder-step', `rorder-step-${state}`)}>
        <span class="rorder-step-pip">
          {#if state === 'done'}
            <Icon name="check" size={12} color="white" />
          {:else if state === 'failed'}
            <Icon name="x" size={12} color="white" />
          {:else if state === 'active'}
            <span class="rorder-step-pulse"></span>
          {/if}
        </span>
        <span class="rorder-step-text">
          <span class="rorder-step-label">{s.label}</span>
          {#if s.completedAt}<span class="rorder-step-time">{s.completedAt}</span>{/if}
        </span>
        {#if i < effectiveSteps.length - 1}
          <span class="rorder-step-line"></span>
        {/if}
      </li>
    {/each}
  </ol>

  <!-- Map + Address row -->
  <div class={cn('rorder-mid', computedShowMap ? 'rorder-mid-with-map' : '')}>
    {#if computedShowMap}
      <div class="rorder-map">
        <Map
          tiles={mapTiles}
          center={mapCenter}
          zoom={12}
          height={mapHeight}
          markers={mapMarkers}
          paths={mapPaths}
          trackers={mapTrackers}
          showAttribution={true}
          showControls={true}
          interactive={true}
        />
      </div>
    {/if}

    {#if origin || destination}
      <div class="rorder-places">
        {#if origin}
          <div class="rorder-place">
            <div class="rorder-place-icon" style="background:oklch(0.65 0.16 150);">
              <Icon name="package" size={14} color="white" />
            </div>
            <div>
              <div class="rorder-place-label">From</div>
              <div class="rorder-place-name">{origin.name ?? 'Origin'}</div>
              {#if origin.address}<div class="rorder-place-addr">{origin.address}</div>{/if}
            </div>
          </div>
        {/if}
        {#if destination}
          <div class="rorder-place">
            <div class="rorder-place-icon" style="background:oklch(0.55 0.18 250);">
              <Icon name="map-pin" size={14} color="white" />
            </div>
            <div>
              <div class="rorder-place-label">To</div>
              <div class="rorder-place-name">{destination.name ?? 'Destination'}</div>
              {#if destination.address}<div class="rorder-place-addr">{destination.address}</div>{/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Activity timeline -->
  {#if events.length > 0}
    <div class="rorder-activity">
      <h3 class="rorder-activity-title">Activity</h3>
      <ol class="rorder-events">
        {#each events as ev}
          <li class="rorder-event">
            <span class="rorder-event-dot"></span>
            <div class="rorder-event-body">
              <div class="rorder-event-row">
                <span class="rorder-event-label">
                  {#if ev.icon}<Icon name={ev.icon} size={12} />{/if}
                  {ev.label}
                </span>
                <span class="rorder-event-time">{ev.time}</span>
              </div>
              {#if ev.location}<div class="rorder-event-loc">{ev.location}</div>{/if}
            </div>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  {#if actions.length > 0}
    <div class="rorder-actions">
      {#each actions as a}
        <button type="button" class={cn('rorder-btn', VARIANT_CLASS[a.variant ?? 'default'])} onclick={() => fireAction(a)}>
          {#if a.icon}<Icon name={a.icon} size={14} />{/if}
          <span>{a.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rorder {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
  }

  .rorder-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .rorder-header-main {
    flex: 1;
    min-width: 0;
  }
  .rorder-eyebrow {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    margin-bottom: 2px;
  }
  .rorder-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
  }
  .rorder-eta {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 6px 0 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .rorder-eta-value {
    color: var(--foreground);
    font-weight: 500;
  }
  .rorder-tracking {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .rorder-tracking-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
  .rorder-tracking-num {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  a.rorder-tracking-num:hover {
    color: oklch(0.55 0.18 250);
  }

  .rorder-steps {
    list-style: none;
    margin: 0;
    padding: 8px 4px;
    display: flex;
    align-items: flex-start;
    gap: 0;
    overflow-x: auto;
  }
  .rorder-step {
    display: flex;
    flex: 1 1 0;
    min-width: 90px;
    align-items: flex-start;
    gap: 6px;
    position: relative;
  }
  .rorder-step-pip {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--muted);
    border: 2px solid var(--border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.18s ease;
  }
  .rorder-step-done .rorder-step-pip {
    background: oklch(0.55 0.18 150);
    border-color: oklch(0.55 0.18 150);
  }
  .rorder-step-active .rorder-step-pip {
    background: oklch(0.55 0.18 250);
    border-color: oklch(0.55 0.18 250);
  }
  .rorder-step-failed .rorder-step-pip {
    background: oklch(0.55 0.22 25);
    border-color: oklch(0.55 0.22 25);
  }
  .rorder-step-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 0 0 white;
    animation: rorder-pulse 1.6s ease-out infinite;
  }
  @keyframes rorder-pulse {
    0% { box-shadow: 0 0 0 0 color-mix(in oklab, white 70%, transparent); }
    100% { box-shadow: 0 0 0 10px transparent; }
  }
  .rorder-step-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-top: 2px;
    min-width: 0;
  }
  .rorder-step-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted-foreground);
  }
  .rorder-step-active .rorder-step-label,
  .rorder-step-done .rorder-step-label {
    color: var(--foreground);
  }
  .rorder-step-time {
    font-size: 10.5px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rorder-step-line {
    flex: 1;
    height: 2px;
    margin-top: 12px;
    background: var(--border);
  }
  .rorder-step-done + .rorder-step .rorder-step-line,
  .rorder-step-done .rorder-step-line {
    background: oklch(0.55 0.18 150);
  }

  .rorder-mid {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  @media (min-width: 720px) {
    .rorder-mid-with-map {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
  }

  .rorder-places {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .rorder-place {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .rorder-place-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rorder-place-label {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
  .rorder-place-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }
  .rorder-place-addr {
    font-size: 12px;
    color: var(--muted-foreground);
    line-height: 1.45;
  }

  .rorder-activity-title {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
  .rorder-events {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
  }
  .rorder-event {
    display: flex;
    gap: 10px;
    position: relative;
    padding-left: 4px;
  }
  .rorder-event-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.55 0.18 250);
    margin-top: 6px;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px color-mix(in oklab, oklch(0.55 0.18 250) 18%, transparent);
  }
  .rorder-event-body {
    flex: 1;
    min-width: 0;
  }
  .rorder-event-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .rorder-event-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .rorder-event-time {
    font-size: 11.5px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rorder-event-loc {
    font-size: 11.5px;
    color: var(--muted-foreground);
    margin-top: 1px;
  }

  .rorder-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .rorder-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .rorder-btn-primary {
    background: oklch(0.55 0.18 250);
    color: white;
  }
  .rorder-btn-primary:hover { background: oklch(0.5 0.18 250); }
  .rorder-btn-outline {
    background: transparent;
    color: var(--foreground);
    border: 1px solid var(--border);
  }
  .rorder-btn-outline:hover { background: var(--muted); }
  .rorder-btn-ghost {
    background: transparent;
    color: var(--foreground);
  }
  .rorder-btn-ghost:hover { background: var(--muted); }
</style>
