<!-- src/lib/widgets/input/ColorPicker.svelte
     A pro colour picker: a swatch trigger opens a popover with a
     saturation/value square, a hue strip, an optional opacity strip, Hex / RGB /
     CMYK fields, document swatches, recent colours, an eyedropper and "none".
     - Commit model: `onchange(hex)` fires on a commit (pointer up on the square
       or a strip, Enter/blur in a field, a swatch click), never per drag frame,
       so each pick is one undo step in an editor. `oninput(hex)` is the live
       per-frame preview.
     - Print: pass the exact stored `cmyk` and `oncmyk`. CMYK field edits then go
       out as {c,m,y,k} with no hex round trip (rich black stays 60/40/40/100),
       and the CMYK tab opens first. Without `oncmyk`, CMYK edits convert to hex.
     - `swatches` (document swatches, `spot` ones carry a corner dot) and
       `recent` are owned by the host; `onswatch` gets the whole swatch (apply a
       global/spot by name), falling back to oncmyk/onchange. `onaddswatch` adds
       the current colour. `oneyedropper` lets the host run its own eyedropper
       tool; without it the browser EyeDropper API is used where it exists.
       `onnone` shows a None tile; a null/empty `value` shows the trigger as none.
       `mixed` (a selection whose colours differ) shows the trigger as "Mixed" instead.
     - `side` places the popover ('left' beside a right-hand inspector). Beside a
       PropertyRow (side left/right) it anchors to the whole row, so it clears the
       row's label column instead of covering the labels next to the trigger.
     - `compact` trigger: fills its row and is a size container; the swatch and hex
       never shrink, and the C/M/Y/K readout only shows when the row is 10rem or
       wider, so a narrow inspector never ellipsises the colour itself.
     - Accessible name of the trigger: "<field>: <hex or None>", the field being
       `aria-label`, else `label`, else the enclosing PropertyRow's label
       (input/field-name.ts), else "Colour". Never the bare hex or CMYK readout.
     - Back-compatible: value/presets/showInput/label/disabled/onchange behave as
       before; `presets` shows as the palette when no `swatches` are passed.
     The square and strips need literal gradient stops (white, black, hsl());
     those are the only colour keywords here, everything else is tokens. -->
<script lang="ts">
  import { safeStyle } from '@ripple-ui/core';
  import { Popover as P } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import Pipette from '@lucide/svelte/icons/pipette';
  import Plus from '@lucide/svelte/icons/plus';
  import NumberInput from './NumberInput.svelte';
  import Segmented from './Segmented.svelte';
  import { useFieldName } from './field-name.js';
  import {
    cmykToRgb,
    hexToRgb,
    hsvToRgb,
    normalizeHex,
    rgbToCmyk,
    rgbToHex,
    rgbToHsv,
    type Cmyk,
    type Hsv,
    type Rgb,
  } from './color-math.js';

  type Mode = 'hex' | 'rgb' | 'cmyk';
  interface Swatch {
    name: string;
    color: string;
    cmyk?: Cmyk | null;
    spot?: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Hex colour ("#ff0000"). null or '' means none. */
    value?: string | null;
    /** Palette shown when no document `swatches` are passed. */
    presets?: string[];
    /** Show the hex text on the trigger. */
    showInput?: boolean;
    disabled?: boolean;
    /** Committed hex. */
    onchange?: (value: string) => void;
    /** Live hex while dragging. */
    oninput?: (value: string) => void;
    /** Exact stored CMYK (0-100), shown as-is in the CMYK tab. */
    cmyk?: Cmyk | null;
    /** CMYK-native output for print hosts. */
    oncmyk?: (value: Cmyk) => void;
    mode?: Mode;
    modes?: Mode[];
    /** 0-100. The strip shows only with `onopacity`. */
    opacity?: number;
    onopacity?: (value: number) => void;
    swatches?: Swatch[];
    onswatch?: (swatch: Swatch) => void;
    recent?: string[];
    onaddswatch?: (color: { hex: string; cmyk: Cmyk | null }) => void;
    oneyedropper?: () => void;
    onnone?: () => void;
    /** The selection's colours differ: the trigger reads "Mixed" (a pick still applies to all). */
    mixed?: boolean;
    /** Inspector-height trigger that fills its row. */
    compact?: boolean;
    open?: boolean;
    /** Popover side; an inspector at the right edge passes 'left'. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** The field's name for the trigger ("Fill"), when there is no visible `label`. */
    'aria-label'?: string;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '#3b82f6',
    presets = [
      '#000000', '#ffffff', '#94a3b8', '#64748b',
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ],
    showInput = true,
    disabled = false,
    onchange,
    oninput,
    cmyk = null,
    oncmyk,
    mode = $bindable(),
    modes = ['hex', 'rgb', 'cmyk'],
    opacity = 100,
    onopacity,
    swatches,
    onswatch,
    recent = [],
    onaddswatch,
    oneyedropper,
    onnone,
    compact = false,
    open = $bindable(false),
    side = 'bottom',
    'aria-label': ariaLabel,
    mixed = false,
  }: Props = $props();
  const rowName = useFieldName();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const isNone = $derived(!mixed && !normalizeHex(value));
  const triggerName = $derived(`${ariaLabel ?? label ?? rowName() ?? 'Colour'}: ${mixed ? 'Mixed' : isNone ? 'None' : value}`);
  let triggerEl = $state<HTMLElement | null>(null);
  /** Beside an inspector, anchor to the whole PropertyRow so the popover clears its label column. */
  const rowAnchor = $derived(
    side === 'left' || side === 'right' ? (triggerEl?.closest<HTMLElement>('[data-slot="property-row"]') ?? null) : null
  );
  const hex = $derived(normalizeHex(value) ?? '#000000');

  // Local working colour while the popover is open (keeps the hue when s or v hits 0).
  let hsv = $state<Hsv>({ h: 0, s: 0, v: 0 });
  let alpha = $state(100);
  let localCmyk = $state<Cmyk | null>(null);
  const rgb = $derived(hsvToRgb(hsv));
  const current = $derived(rgbToHex(rgb));
  const shownCmyk = $derived(localCmyk ?? rgbToCmyk(rgb));
  const activeMode = $derived<Mode>(mode ?? (oncmyk && modes.includes('cmyk') ? 'cmyk' : modes[0] ?? 'hex'));

  const hasDropper = $derived(!!oneyedropper || (typeof window !== 'undefined' && 'EyeDropper' in window));

  function sync() {
    hsv = rgbToHsv(hexToRgb(hex)!);
    alpha = opacity;
    localCmyk = cmyk ?? null;
  }
  sync();

  function setOpen(o: boolean) {
    if (o) sync();
    open = o;
  }

  function setRgb(next: Rgb, keepHue = true) {
    const n = rgbToHsv(next);
    hsv = keepHue && (n.s === 0 || n.v === 0) ? { ...n, h: hsv.h } : n;
  }

  function commitHex(h = current) {
    localCmyk = null;
    onchange?.(h);
  }

  function commitCmyk(c: Cmyk) {
    localCmyk = c;
    setRgb(cmykToRgb(c));
    if (oncmyk) oncmyk(c);
    else onchange?.(rgbToHex(cmykToRgb(c)));
  }

  // ---- pointer drags on the square and strips: live oninput, commit on up ----
  function drag(node: HTMLElement, apply: (fx: number, fy: number) => void, done: () => void) {
    const at = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      apply(
        Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width))),
        Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(1, r.height)))
      );
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      node.setPointerCapture?.(e.pointerId);
      node.focus();
      at(e);
      node.addEventListener('pointermove', at);
      node.addEventListener('pointerup', up, { once: true });
    };
    const up = (e: PointerEvent) => {
      node.removeEventListener('pointermove', at);
      node.releasePointerCapture?.(e.pointerId);
      done();
    };
    node.addEventListener('pointerdown', down);
    return () => node.removeEventListener('pointerdown', down);
  }

  const squareDrag = (node: HTMLElement) =>
    drag(node, (fx, fy) => {
      hsv = { ...hsv, s: fx, v: 1 - fy };
      localCmyk = null;
      oninput?.(current);
    }, () => commitHex());
  const hueDrag = (node: HTMLElement) =>
    drag(node, (fx) => {
      hsv = { ...hsv, h: fx * 360 };
      localCmyk = null;
      oninput?.(current);
    }, () => commitHex());
  const alphaDrag = (node: HTMLElement) =>
    drag(node, (fx) => (alpha = Math.round(fx * 100)), () => onopacity?.(alpha));

  function keyStep(e: KeyboardEvent, apply: (dx: number, dy: number) => void, done: () => void) {
    const k = e.shiftKey ? 10 : 1;
    const d: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, k], ArrowDown: [0, -k] };
    if (!(e.key in d)) return;
    e.preventDefault();
    apply(...d[e.key]);
    done();
  }
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  async function eyedrop() {
    if (oneyedropper) {
      open = false;
      oneyedropper();
      return;
    }
    try {
      const Dropper = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const res = await new Dropper().open();
      const h = normalizeHex(res.sRGBHex);
      if (h) {
        setRgb(hexToRgb(h)!, false);
        commitHex(h);
      }
    } catch {
      /* cancelled */
    }
  }

  function pickSwatch(s: Swatch) {
    const h = normalizeHex(s.color);
    if (h) setRgb(hexToRgb(h)!, false);
    localCmyk = s.cmyk ?? null;
    if (onswatch) onswatch(s);
    else if (s.cmyk && oncmyk) oncmyk(s.cmyk);
    else if (h) onchange?.(h);
  }

  const palette = $derived<Swatch[]>(swatches ?? presets.map((c) => ({ name: c, color: c })));
  const tile = 'relative size-[18px] shrink-0 rounded-[4px] ring-1 ring-inset ring-ripple-surface-foreground/15 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ripple-ring';
</script>

{#snippet noneSlash(cls: string)}
  <svg viewBox="0 0 10 10" class={cls} aria-hidden="true" preserveAspectRatio="none">
    <line x1="0.5" y1="9.5" x2="9.5" y2="0.5" class="stroke-ripple-error" stroke-width="1.2" vector-effect="non-scaling-stroke" />
  </svg>
{/snippet}

<div class={cn('flex flex-col gap-1.5', compact && 'w-full min-w-0', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}

  <P.Root open={open} onOpenChange={setOpen}>
    <P.Trigger
      bind:ref={triggerEl}
      {id}
      {disabled}
      data-slot="color-picker-trigger"
      aria-label={triggerName}
      data-mixed={mixed ? '' : undefined}
      class={cn(
        'inline-flex items-center gap-2 rounded-md border border-input bg-background text-sm shadow-xs outline-none',
        'transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        compact ? '@container h-7 w-full min-w-0 px-1 text-xs' : 'h-9 px-2 py-1',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        aria-hidden="true"
        class={cn('relative shrink-0 overflow-hidden rounded-[4px] ring-1 ring-inset ring-ripple-surface-foreground/15', compact ? 'size-5' : 'h-5 w-5')}
        style={isNone || mixed ? undefined : `background:${value}`}
      >
        {#if isNone}{@render noneSlash('absolute inset-0 size-full bg-ripple-surface')}{/if}
        {#if mixed}<span class="absolute inset-0 bg-ripple-surface-foreground/15"></span>{/if}
      </span>
      {#if showInput}
        <span class={cn('tabular-nums', compact ? 'shrink-0' : 'truncate')}>{mixed ? 'Mixed' : isNone ? 'None' : value}</span>
        {#if cmyk && compact && !mixed}
          <span data-slot="color-picker-cmyk" class="ml-auto hidden whitespace-nowrap pr-1 text-[10.5px] tabular-nums text-muted-foreground @min-[10rem]:inline">{cmyk.c}/{cmyk.m}/{cmyk.y}/{cmyk.k}</span>
        {/if}
      {/if}
    </P.Trigger>

    <P.Portal>
      <P.Content
        sideOffset={side === 'left' || side === 'right' ? 12 : 6}
        customAnchor={rowAnchor}
        {side}
        align="start"
        collisionPadding={8}
        data-slot="color-picker-content"
        class="z-50 flex w-[248px] flex-col gap-3 rounded-xl bg-ripple-popover p-3 text-ripple-popover-foreground shadow-lg ring-1 ring-ripple-border backdrop-blur-xl"
      >
        <!-- saturation / value -->
        <div
          {@attach squareDrag}
          role="slider"
          tabindex="0"
          aria-label="Saturation and brightness"
          aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
          aria-valuenow={Math.round(hsv.s * 100)}
          onkeydown={(e) => keyStep(e, (dx, dy) => (hsv = { ...hsv, s: clamp01(hsv.s + dx / 100), v: clamp01(hsv.v + dy / 100) }), () => commitHex())}
          class="relative h-36 w-full cursor-crosshair touch-none rounded-lg outline-none ring-1 ring-inset ring-ripple-surface-foreground/10 focus-visible:ring-2 focus-visible:ring-ripple-ring"
          style={safeStyle(`background: linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent), hsl(${hsv.h} 100% 50%);`)}
        >
          <span
            class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ring-2 ring-white"
            style={safeStyle(`left:${hsv.s * 100}%; top:${(1 - hsv.v) * 100}%; background:${current};`)}
          ></span>
        </div>

        <div class="flex items-center gap-2">
          {#if hasDropper}
            <button
              type="button"
              title="Pick a colour from the canvas"
              aria-label="Eyedropper"
              onclick={eyedrop}
              class="flex size-7 shrink-0 items-center justify-center rounded-md text-ripple-muted-foreground outline-none transition-colors hover:bg-ripple-muted hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring"
            >
              <Pipette size={14} />
            </button>
          {/if}
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div
              {@attach hueDrag}
              role="slider"
              tabindex="0"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              onkeydown={(e) => keyStep(e, (dx) => (hsv = { ...hsv, h: Math.min(360, Math.max(0, hsv.h + dx)) }), () => commitHex())}
              class="relative h-2.5 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ripple-ring"
              style="background: linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%));"
            >
              <span class="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ring-2 ring-white" style={safeStyle(`left:${(hsv.h / 360) * 100}%; background:hsl(${hsv.h} 100% 50%);`)}></span>
            </div>
            {#if onopacity}
              <div
                {@attach alphaDrag}
                role="slider"
                tabindex="0"
                aria-label="Opacity"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={alpha}
                onkeydown={(e) => keyStep(e, (dx) => (alpha = Math.min(100, Math.max(0, alpha + dx))), () => onopacity?.(alpha))}
                class="craft-checker relative h-2.5 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ripple-ring"
              >
                <span class="absolute inset-0 rounded-full" style={safeStyle(`background: linear-gradient(to right, transparent, ${current});`)}></span>
                <span class="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ripple-popover shadow-md ring-2 ring-white" style={`left:${alpha}%;`}></span>
              </div>
            {/if}
          </div>
          <span
            class="craft-checker relative size-7 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-ripple-surface-foreground/15"
            aria-hidden="true"
          ><span class="absolute inset-0" style={safeStyle(`background:${current}; opacity:${alpha / 100};`)}></span></span>
        </div>

        {#if modes.length > 1}
          <Segmented
            size="sm"
            class="[&>div]:w-full"
            options={modes.map((m) => ({ value: m, label: m === 'hex' ? 'Hex' : m.toUpperCase() }))}
            value={activeMode}
            onchange={(v) => (mode = v as Mode)}
          />
        {/if}

        <div data-slot="color-picker-fields">
          {#if activeMode === 'hex'}
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={current}
                aria-label="Hex colour"
                spellcheck="false"
                onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                onchange={(e) => {
                  const h = normalizeHex((e.currentTarget as HTMLInputElement).value);
                  if (h) {
                    setRgb(hexToRgb(h)!, false);
                    commitHex(h);
                  } else (e.currentTarget as HTMLInputElement).value = current;
                }}
                class="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs uppercase tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {#if onopacity}
                <div class="w-16"><NumberInput compact label="%" value={alpha} min={0} max={100} onchange={(v) => { alpha = v; onopacity?.(v); }} /></div>
              {/if}
            </div>
          {:else if activeMode === 'rgb'}
            <div class="grid grid-cols-3 gap-1">
              {#each ['r', 'g', 'b'] as const as ch (ch)}
                <NumberInput compact label={ch.toUpperCase()} value={rgb[ch]} min={0} max={255}
                  onchange={(v) => {
                    setRgb({ ...rgb, [ch]: Math.max(0, Math.min(255, v)) });
                    commitHex();
                  }} />
              {/each}
            </div>
          {:else}
            <div class="grid grid-cols-4 gap-1">
              {#each ['c', 'm', 'y', 'k'] as const as ch (ch)}
                <NumberInput compact label={ch.toUpperCase()} value={shownCmyk[ch]} min={0} max={100}
                  onchange={(v) => commitCmyk({ ...shownCmyk, [ch]: Math.max(0, Math.min(100, v)) })} />
              {/each}
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5 border-t border-ripple-border/70 pt-2.5">
          <div class="flex h-5 items-center justify-between">
            <span class="text-[11px] font-medium text-ripple-muted-foreground">{swatches ? 'Document swatches' : 'Palette'}</span>
            {#if onaddswatch}
              <button
                type="button"
                title="Add the current colour to the swatches"
                aria-label="Add to swatches"
                onclick={() => onaddswatch?.({ hex: current, cmyk: localCmyk ?? (activeMode === 'cmyk' ? shownCmyk : null) })}
                class="flex size-5 items-center justify-center rounded text-ripple-muted-foreground outline-none hover:bg-ripple-muted hover:text-ripple-surface-foreground focus-visible:ring-2 focus-visible:ring-ripple-ring"
              ><Plus size={13} /></button>
            {/if}
          </div>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label={swatches ? 'Document swatches' : 'Palette'}>
            {#if onnone}
              <button type="button" title="None" aria-label="None" aria-pressed={isNone} onclick={() => { open = false; onnone?.(); }} class={cn(tile, 'overflow-hidden bg-ripple-surface', isNone && 'ring-2 ring-ripple-accent')}>
                {@render noneSlash('absolute inset-0 size-full')}
              </button>
            {/if}
            {#each palette as s (s.name)}
              {@const on = !isNone && normalizeHex(s.color) === hex}
              <button
                type="button"
                title={s.spot ? `${s.name} (spot colour)` : s.name}
                aria-label={s.spot ? `${s.name}, spot colour` : s.name}
                aria-pressed={on}
                data-spot={s.spot || undefined}
                onclick={() => pickSwatch(s)}
                class={cn(tile, on && 'ring-2 ring-ripple-accent')}
                style={safeStyle(`background:${s.color}`)}
              >
                {#if s.spot}
                  <span class="absolute -bottom-px -right-px size-[7px] rounded-tl-[3px] bg-ripple-popover" aria-hidden="true">
                    <span class="absolute bottom-px right-px size-[3px] rounded-full bg-ripple-surface-foreground"></span>
                  </span>
                {/if}
              </button>
            {/each}
          </div>
          {#if recent.length}
            <span class="mt-1 text-[11px] font-medium text-ripple-muted-foreground">Recent</span>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Recent colours">
              {#each recent as c (c)}
                <button type="button" title={c} aria-label={`Recent ${c}`} onclick={() => pickSwatch({ name: c, color: c })} class={tile} style={safeStyle(`background:${c}`)}></button>
              {/each}
            </div>
          {/if}
        </div>
      </P.Content>
    </P.Portal>
  </P.Root>
</div>

<style>
  .craft-checker {
    background: repeating-conic-gradient(
        color-mix(in oklab, var(--ripple-surface-foreground) 14%, transparent) 0 25%,
        transparent 0 50%
      )
      0 0 / 8px 8px;
  }
</style>
