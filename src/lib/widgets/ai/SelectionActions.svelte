<!--
  @file widgets/ai/SelectionActions.svelte
  @description NEW (beautiful-ui re-skin arc, skin-selection lane, 2026-09-17).
    Wraps a passage of text. When the reader highlights part of it, a floating
    pill toolbar appears under the selection: a "Describe edits" input, Explain
    and Improve, and a `›` toggle that reveals more actions. Every action raises
    `onaction` with the selected text (and the typed instruction, for an edit).
    This component owns no network: what an action does is the caller's call.

    NOT REGISTERED, same placement rule as TaskRows, PromptBar and AnswerBlock:
    under `widgets/ai/`, re-exported from `src/lib/ui/index.ts`, no registry or
    manifest entry, so the manifest still reports 189 widgets.

    COMPOSED, NOT RE-DERIVED. The toolbar is `Popover.Content` from the overlay
    canonical, anchored through `customAnchor` to a virtual element whose rect
    is the live selection Range's rect. That is the explorer ContextMenu's
    cursor-anchor trick with a Range in place of the cursor. floating-ui does
    the placement, flipping and viewport clamping, and bits-ui does Escape and
    outside-click dismissal. The surface is the canonical's own background, so
    when the popover token lands on Popover.Content this toolbar picks it up
    without an edit. Buttons are `Button`, icons are `Icon`.

    HOW THE ANCHOR STAYS RIGHT:
    - Selection is read on `selectionchange`, and on `pointerup` after a drag
      (changes during the drag are ignored, so the bar does not chase the mouse).
    - Both ends of the selection must sit inside this component; a selection
      that spills outside, or a collapsed one, closes the bar.
    - The Range is cloned when captured, and the rect is re-read every frame
      while open (`updatePositionStrategy="always"`), so scrolling and reflow
      move the bar with the text. `hideWhenDetached` hides it once the text
      scrolls out of its nearest clipping ancestor, which is passed as the
      collision boundary (floating-ui checks only the viewport otherwise).
    - Typing an instruction moves the document selection into the input. While
      focus is inside the toolbar, selection changes are ignored, the captured
      text is what actions send, and the captured range is painted with the CSS
      Custom Highlight API so the passage still reads as selected.
    - Escape, outside-click, or running an action closes the bar and remembers
      the range, so the same selection does not immediately reopen it. A new
      pointer gesture in the passage forgets it, so re-selecting the same words
      does. If focus was in the toolbar, the text selection and focus go back
      where they were.

    CHANGED FROM THE SOURCE, and why:
    - The source is a scripted demo: a fixed passage, a timer that shows the bar,
      a fake "thinking → streaming → result" rewrite and Keep / Discard. Here the
      passage is `children`, the bar follows a real selection, and the result
      flow is the caller's (it has the text and the instruction).
    - `›` reveals the extra actions inline, as the source does, instead of a
      second overlay. The hidden group is `inert`, so it leaves the tab order.
    - The source hides the action buttons while you type; here they stay, and a
      send button appears beside the input. Enter also sends.
    - Icons are lucide slugs rather than iconoir components. Every box-shadow is
      dropped (glass); the canonical popover keeps its own.
  @a11y The bar is `role="toolbar"` with a label, and does NOT take focus when it
    opens, because stealing focus would end a keyboard selection mid-extend.
    Alt+F10 (the editor convention for "go to the toolbar"; Fn+Option+F10 on a
    default Mac keyboard) moves focus into it,
    and a polite live region says so when it appears. Tab moves through its
    controls; Escape closes it and returns focus. The instruction input and the
    icon-only controls carry labels; `›` carries aria-pressed. Tabbing out of
    the bar closes it. Motion comes from
    the canonical's own enter animation and from transitions that stop under
    prefers-reduced-motion.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/SelectionActions.tsx
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import Button from '$lib/widgets/input/Button.svelte';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';

  interface SelectionAction {
    id: string;
    label: string;
    /** Lucide slug, e.g. "sparkles". */
    icon?: string;
  }

  interface SelectionActionEvent {
    /** The action id, or "edit" for a typed instruction. */
    action: string;
    /** The selected text, captured when the bar opened. */
    text: string;
    /** The typed instruction, for "edit" only. */
    instruction?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The passage the reader selects from. */
    children?: Snippet;
    /** Always-visible actions. */
    actions?: SelectionAction[];
    /** Actions revealed by the `›` toggle. None hides the toggle. */
    more?: SelectionAction[];
    placeholder?: string;
    disabled?: boolean;
    onaction?: (event: SelectionActionEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    children,
    actions = [
      { id: 'explain', label: 'Explain', icon: 'message-circle-question-mark' },
      { id: 'improve', label: 'Improve', icon: 'sparkles' },
    ],
    more = [
      { id: 'shorten', label: 'Shorten', icon: 'scissors' },
      { id: 'tone', label: 'Change tone', icon: 'smile' },
      { id: 'grammar', label: 'Fix grammar', icon: 'spell-check' },
    ],
    placeholder = 'Describe edits',
    disabled = false,
    onaction,
  }: Props = $props();

  const uid = $props.id();
  const base = $derived(id ?? `ripple-selection-${uid}`);

  let host = $state<HTMLDivElement | null>(null);
  let toolbar = $state<HTMLElement | null>(null);
  let open = $state(false);
  let expanded = $state(false);
  let instruction = $state('');
  /* The passage's nearest clipping ancestor. floating-ui's `hide` only checks
     the viewport unless given a boundary, so without this the bar would float
     over a scroll pane's chrome after its text scrolled out of the pane. */
  let boundary = $state<Element | null>(null);

  /* Plain variables: nothing renders from them directly. */
  let captured: { range: Range; text: string } | null = null;
  let dragging = false;
  let returnFocus: HTMLElement | null = null;

  /* floating-ui reads this on every frame while open. `contextElement` tells
     it which element the virtual rect belongs to, so its scroll listeners
     attach to the passage's scroll ancestors. */
  const anchor = {
    getBoundingClientRect: () => captured?.range.getBoundingClientRect() ?? new DOMRect(),
    get contextElement() {
      return host ?? undefined;
    },
  };

  const HIGHLIGHT = 'ripple-selection-actions';
  function paint(range: Range | null) {
    const registry = globalThis.CSS?.highlights;
    if (!registry || typeof Highlight === 'undefined') return;
    if (range) registry.set(HIGHLIGHT, new Highlight(range));
    else registry.delete(HIGHLIGHT);
  }

  const same = (a: Range, b: Range) =>
    a.compareBoundaryPoints(Range.START_TO_START, b) === 0 &&
    a.compareBoundaryPoints(Range.END_TO_END, b) === 0;

  function clippingParent(el: Element): Element | null {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const { overflow, overflowX, overflowY } = getComputedStyle(p);
      if (/auto|scroll|hidden|clip/.test(overflow + overflowX + overflowY)) return p;
    }
    return null;
  }

  function focusInside() {
    return !!toolbar && toolbar.contains(document.activeElement);
  }

  function readSelection() {
    if (disabled || !host || focusInside()) return;
    const sel = document.getSelection();
    const range = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : null;
    const text = range?.toString().trim() ?? '';
    const inside = !!sel && host.contains(sel.anchorNode) && host.contains(sel.focusNode);
    if (!range || !text || !inside) {
      captured = null;
      setOpen(false);
      return;
    }
    // Same range as last time: either already open, or the reader dismissed it.
    if (captured && same(captured.range, range)) return;
    captured = { range: range.cloneRange(), text };
    boundary = clippingParent(host);
    expanded = false;
    instruction = '';
    setOpen(true);
  }

  function setOpen(next: boolean) {
    // Every instance hears every selectionchange. One that is already closed
    // must not touch the highlight, which is a page-wide registry entry the
    // open instance owns.
    if (!next && !open) return;
    open = next;
    paint(next && captured ? captured.range : null);
  }

  /* Close, and if focus was in the bar, hand the reader back their selection
     and their focus. The restored selection matches `captured`, so it does not
     reopen the bar. */
  function dismiss() {
    const wasInside = focusInside();
    setOpen(false);
    if (!wasInside) return;
    if (captured) {
      const sel = document.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(captured.range.cloneRange());
    }
    returnFocus?.focus?.();
    returnFocus = null;
  }

  function run(action: string, typed?: string) {
    if (!captured) return;
    onaction?.({ action, text: captured.text, ...(typed ? { instruction: typed } : {}) });
    dismiss();
  }

  $effect(() => {
    if (disabled) setOpen(false);
  });

  $effect(() => {
    const onSelectionChange = () => {
      if (!dragging) readSelection();
    };
    const onPointerDown = (e: PointerEvent) => {
      dragging = !!host && host.contains(e.target as Node);
      // A new gesture in the passage starts a new selection, even one over the
      // exact range the reader just dismissed.
      if (dragging) captured = null;
    };
    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      readSelection();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!open || !e.altKey || e.key !== 'F10' || !toolbar) return;
      e.preventDefault();
      returnFocus = document.activeElement as HTMLElement | null;
      toolbar.querySelector<HTMLElement>('input, button:not([disabled])')?.focus();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      paint(null);
    };
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const hasInstruction = $derived(instruction.trim().length > 0);
</script>

<div bind:this={host} id={base} class={cn('ripple-selection-actions', className)} style={styleString}>
  {@render children?.()}
</div>
<span class="sr-only" aria-live="polite">{open ? 'Selection actions available. Press Alt+F10 to reach them.' : ''}</span>

<Popover.Root
  bind:open={() => open, (next) => (next ? setOpen(true) : dismiss())}
>
  <Popover.Content
    customAnchor={anchor}
    side="bottom"
    align="center"
    sideOffset={8}
    updatePositionStrategy="always"
    hideWhenDetached
    collisionBoundary={boundary ?? []}
    trapFocus={false}
    onOpenAutoFocus={(e) => e.preventDefault()}
    onCloseAutoFocus={(e) => e.preventDefault()}
    class="w-auto max-w-[calc(100vw-24px)] rounded-full p-1 text-[12.5px] focus-within:ring-ripple-ring"
  >
    <!-- The toolbar is this inner element, so `toolbar` is exactly the region
         the focus and mousedown handlers guard, whatever wrappers bits-ui puts
         around Popover.Content. -->
    <div
      bind:this={toolbar}
      role="toolbar"
      aria-label="Selection actions"
      tabindex="-1"
      class="flex items-center gap-0.5"
      onfocusout={(e) => {
        // Tabbing out of the bar closes it; the selection stays dismissed.
        const to = e.relatedTarget as Node | null;
        if (to && !toolbar?.contains(to)) setOpen(false);
      }}
      onmousedown={(e) => {
        // Keep the document selection when a button is pressed; only the input
        // should take focus.
        if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
      }}
    >
      <form
        class={cn(
          'ripple-selection-slide flex items-center overflow-hidden',
          expanded ? 'max-w-0 opacity-0' : 'max-w-72 opacity-100'
        )}
        inert={expanded}
        onsubmit={(e) => {
          e.preventDefault();
          if (hasInstruction) run('edit', instruction.trim());
        }}
      >
        <input
          id={`${base}-instruction`}
          bind:value={instruction}
          aria-label={placeholder}
          {placeholder}
          autocomplete="off"
          class="h-7 w-36 min-w-0 bg-transparent pr-2 pl-3 text-ripple-surface-foreground outline-none placeholder:text-ripple-muted-foreground"
        />
        {#if hasInstruction}
          <Button type="submit" size="icon" aria-label="Send edit" class="size-7 shrink-0">
            <ArrowUpIcon size={15} strokeWidth={2.4} aria-hidden="true" />
          </Button>
        {/if}
        <span aria-hidden="true" class="mx-1 h-4 w-px shrink-0 bg-ripple-border"></span>
      </form>

      {#each actions as a (a.id)}
        <Button variant="ghost" size="sm" class="h-7 shrink-0 px-2.5 font-normal" onclick={() => run(a.id)}>
          {#snippet leading()}{#if a.icon}<Icon name={a.icon} size={14} strokeWidth={1.8} />{/if}{/snippet}
          {a.label}
        </Button>
      {/each}

      {#if more.length > 0}
        <div
          class={cn(
            'ripple-selection-slide flex items-center gap-0.5 overflow-hidden',
            expanded ? 'max-w-96 opacity-100' : 'max-w-0 opacity-0'
          )}
          inert={!expanded}
        >
          {#each more as a (a.id)}
            <Button variant="ghost" size="sm" class="h-7 shrink-0 px-2.5 font-normal" onclick={() => run(a.id)}>
              {#snippet leading()}{#if a.icon}<Icon name={a.icon} size={14} strokeWidth={1.8} />{/if}{/snippet}
              {a.label}
            </Button>
          {/each}
        </div>
        <span aria-hidden="true" class="mx-0.5 h-4 w-px shrink-0 bg-ripple-border"></span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More actions"
          pressed={expanded}
          class="size-7 shrink-0"
          onclick={() => (expanded = !expanded)}
        >
          <span class={cn('ripple-selection-chevron flex', expanded && 'rotate-180')}>
            <ChevronRightIcon size={14} aria-hidden="true" />
          </span>
        </Button>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>

<style>
  .ripple-selection-slide {
    transition:
      max-width 400ms var(--ripple-ease-out),
      opacity 250ms var(--ripple-ease-out);
  }
  .ripple-selection-chevron {
    transition: transform 400ms var(--ripple-ease-out);
  }
  /* The captured selection, painted while focus is in the bar's input and the
     browser's own selection has moved there. */
  :global(::highlight(ripple-selection-actions)) {
    background-color: color-mix(in srgb, var(--ripple-accent) 18%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-selection-slide,
    .ripple-selection-chevron {
      transition: none;
    }
  }
</style>
