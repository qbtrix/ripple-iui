<!--
  @file widgets/ai/AnswerBlock.svelte
  @description NEW (beautiful-ui re-skin arc, skin-answer lane, 2026-09-16). The
    whole answer surface a search-grounded agent renders: a streamed body with
    inline cited-source chips, an action row (copy / retry / thumbs), an avatar
    cluster that toggles a sources list open, and a follow-up prompt list.

    WHY IT IS NEW. The arc mapped ripple's `StreamText` to
    `components/primitives/StreamingText.tsx` on function and re-skinned only the
    text, which is roughly a fifth of that file. The 2026-09-15 coverage audit
    named the gap; this is it closed. StreamText stays what it is — a text run —
    and its props are untouched; everything the source wraps around that run
    lives here instead. Widening StreamText would have been a manifest shape
    change, and the arc's proof is that no shape moved.

    NOT REGISTERED, same placement rule as TaskRows and PromptBar: under
    `widgets/ai/`, re-exported from `src/lib/ui/index.ts`, no spec-registry entry
    and no manifest entry, so the manifest still reports 189 widgets. Making it
    spec-drivable is a deliberate follow-up that bumps the count on purpose.

    COMPOSES StreamText for every text run. The body is a list of segments; each
    text segment is one `<StreamText class="inline">` in its LIVE-STREAM mode
    (the `text` prop grows, no `speed`), so the caret and the blur tail ride the
    active run for free rather than being re-derived here. This block owns only
    the word clock — `WORD_MS = 55`, the source's rate — because it has to know
    where the cite chips fall and when the body is finished.

    DROPPED FROM THE SOURCE: `loop` (it restarts the stream after a 3.4s hold —
    scripted demo state, the same rule lane C applied to TaskRows' `TICKS` and
    PromptBar's autoplay), `fill` (a gallery measure; a caller sizes this with
    `class`), and the hard-coded "10 sources" label, which is derived from
    `sources.length` and overridable through `labels`.

    LEFT TO THE CALLER, deliberately: this block owns no network and no
    clipboard. `onaction` fires with the action's kind and the caller copies,
    retries or records the vote; `onfollowup` fires with the chosen prompt and
    the caller sends it. There is no token-by-token input either — the reveal
    autoplays from `body` on mount, because that is the demo/answer surface the
    source is. A caller streaming real agent tokens uses `StreamText` directly,
    which is what its live-stream mode is for.
  @a11y The body is one `aria-live="polite"` region per text segment (StreamText
    carries its own), so an assistive reader is told about each run as it
    resolves. The sources disclosure is a real button with aria-expanded and
    aria-controls, and its panel is `inert` while collapsed so the links leave
    the accessibility tree. Action buttons carry real labels rather than the
    source's four identical "Action" ones. Every animation freezes under
    prefers-reduced-motion, which also paints the whole body at once.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/StreamingText.tsx
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import StreamText from './StreamText.svelte';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import ThumbsUpIcon from '@lucide/svelte/icons/thumbs-up';
  import ThumbsDownIcon from '@lucide/svelte/icons/thumbs-down';
  import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left';

  type ActionKind = 'copy' | 'retry' | 'up' | 'down';

  interface AnswerSource {
    name: string;
    /** Shown in the inline chip and right-aligned in the list. */
    domain: string;
    /** Absent makes the chip and the row plain text rather than links. */
    href?: string;
    /** Square avatar. Absent falls back to the first letter of `name`. */
    image?: string;
  }

  /** One run of the answer. `cite` indexes `sources` and renders a chip instead. */
  interface AnswerSegment {
    text?: string;
    cite?: number;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The answer, in order. A segment with `cite` is an inline source chip. */
    body?: AnswerSegment[];
    /** Cited sources — the chips, the avatar cluster and the expanded list. */
    sources?: AnswerSource[];
    /** Suggested next prompts, revealed once the body finishes. */
    followUps?: string[];
    /** Prominent copy. `sources` defaults to "N sources". */
    labels?: { sources?: string; followUps?: string };
    /** Seed the sources list expanded. The user's own toggle wins after that. */
    sourcesOpen?: boolean;
    /** An action icon was pressed. This widget copies and retries nothing. */
    onaction?: (kind: ActionKind) => void;
    /** A follow-up prompt was chosen. */
    onfollowup?: (text: string, index: number) => void;
    /** The sources list was opened or closed. */
    ontogglesources?: (open: boolean) => void;
  }

  let {
    id,
    class: className,
    style,
    body = [],
    sources = [],
    followUps = [],
    labels,
    sourcesOpen = false,
    onaction,
    onfollowup,
    ontogglesources,
  }: Props = $props();

  /** The source's word cadence. */
  const WORD_MS = 55;

  const ACTIONS: { kind: ActionKind; label: string; icon: typeof CopyIcon }[] = [
    { kind: 'copy', label: 'Copy answer', icon: CopyIcon },
    { kind: 'retry', label: 'Regenerate answer', icon: RotateCwIcon },
    { kind: 'up', label: 'Good answer', icon: ThumbsUpIcon },
    { kind: 'down', label: 'Bad answer', icon: ThumbsDownIcon },
  ];

  let reduceMotion = $state(false);
  onMount(() => {
    reduceMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });

  // The reveal is one step per word, plus one step per cite chip. Each step
  // records the segment it belongs to and how many of that segment's characters
  // are visible once it lands, so the per-segment slice is a lookup, not a
  // second parse.
  const steps = $derived.by(() => {
    const out: { seg: number; upto: number }[] = [];
    body.forEach((segment, seg) => {
      if (segment.cite !== undefined) {
        out.push({ seg, upto: 0 });
        return;
      }
      // A word plus whatever whitespace trails it, so slicing never strips the
      // space between two words or the newline between two paragraphs.
      const words = segment.text?.match(/\S+\s*/g) ?? [];
      let upto = 0;
      for (const word of words) {
        upto += word.length;
        out.push({ seg, upto });
      }
    });
    return out;
  });

  const total = $derived(steps.length);
  /** How many steps have landed. */
  let revealed = $state(0);
  const finished = $derived(revealed >= total);

  // Drive the reveal. Reads `total` and `reduceMotion` only — never `revealed`,
  // which is write-only here; reading it would re-trigger this effect on every
  // tick and thrash the timer (the trap StreamText documents).
  $effect(() => {
    const n = total;
    if (reduceMotion) {
      revealed = n;
      return;
    }
    revealed = 0;
    if (n === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      revealed = i;
      if (i >= n) clearInterval(interval);
    }, WORD_MS);
    return () => clearInterval(interval);
  });

  /** Characters of segment `seg` visible now. */
  function shown(seg: number) {
    let upto = 0;
    for (let k = 0; k < revealed && k < total; k++) {
      if (steps[k].seg === seg) upto = steps[k].upto;
    }
    return body[seg]?.text?.slice(0, upto) ?? '';
  }

  /** Has the chip for segment `seg` landed yet? A cite is one step of its own. */
  function citeShown(seg: number) {
    const at = steps.findIndex((s) => s.seg === seg);
    return at !== -1 && revealed > at;
  }

  /** The run the caret rides: the one the last landed step belongs to. */
  const activeSeg = $derived(
    finished || total === 0 ? -1 : (steps[Math.max(0, revealed - 1)]?.seg ?? -1)
  );

  const sourceLabel = $derived(
    labels?.sources ?? `${sources.length} source${sources.length === 1 ? '' : 's'}`
  );
  const followUpLabel = $derived(labels?.followUps ?? 'Follow-ups');

  // svelte-ignore state_referenced_locally — one-time seed from `sourcesOpen`.
  let openState = $state(sourcesOpen);
  const listOpen = $derived(finished && openState);

  function toggleSources() {
    openState = !openState;
    ontogglesources?.(openState);
  }

  // Per-instance, never a literal fallback: two unidentified blocks on one page
  // would otherwise share a panel id and aim both aria-controls at the first.
  const uid = $props.id();
  const panelId = $derived(`${id ?? uid}-sources`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

{#snippet avatar(source: AnswerSource, sizeClass: string, radius: string)}
  {#if source.image}
    <img src={source.image} alt="" class={cn('shrink-0 object-cover', sizeClass, radius)} />
  {:else}
    <span
      aria-hidden="true"
      class={cn(
        'flex shrink-0 items-center justify-center bg-ripple-muted text-[8px] font-medium text-ripple-muted-foreground uppercase',
        sizeClass,
        radius
      )}
    >
      {source.name.slice(0, 1)}
    </span>
  {/if}
{/snippet}

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-state={finished ? 'done' : 'streaming'}
  class={cn('ripple-answer-block w-full', className)}
  style={styleString}
>
  <div class="ripple-answer-body">
    {#each body as segment, i (i)}
      {#if segment.cite !== undefined}
        {@const source = sources[segment.cite]}
        {#if source && citeShown(i)}
          <svelte:element
            this={source.href ? 'a' : 'span'}
            href={source.href}
            target={source.href ? '_blank' : undefined}
            rel={source.href ? 'noreferrer' : undefined}
            class="ripple-answer-chip mr-1 inline-flex h-[18px] -translate-y-px items-center gap-1 rounded-md bg-ripple-muted px-[3px] align-middle font-mono text-[10.5px] text-ripple-muted-foreground transition-colors duration-150 hover:bg-ripple-accent/10 hover:text-ripple-accent"
          >
            {@render avatar(source, 'size-3', 'rounded-[3px]')}
            <span>{source.domain}</span>
          </svelte:element>
        {/if}
      {:else}
        <StreamText class="inline" text={shown(i)} streaming={activeSeg === i} />
      {/if}
    {/each}
  </div>

  <!-- Actions. Mounted throughout so the body does not reflow when they land. -->
  <div
    class={cn(
      'mt-2 flex items-center gap-0.5 transition-opacity duration-300 ease-ripple-out',
      finished ? 'ripple-answer-fade-in opacity-100' : 'pointer-events-none opacity-0'
    )}
    inert={!finished}
  >
    {#each ACTIONS as action (action.kind)}
      <button
        type="button"
        aria-label={action.label}
        onclick={() => onaction?.(action.kind)}
        class="flex size-6 items-center justify-center rounded-md text-ripple-muted-foreground transition-colors duration-100 hover:bg-ripple-accent/10 hover:text-ripple-accent"
      >
        <action.icon size={15} aria-hidden="true" />
      </button>
    {/each}

    {#if sources.length > 0}
      <button
        type="button"
        aria-expanded={listOpen}
        aria-controls={panelId}
        onclick={toggleSources}
        class="ml-1.5 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors duration-150 hover:bg-ripple-accent/10"
      >
        <span class="flex -space-x-1" aria-hidden="true">
          {#each sources as source (source.domain)}
            {@render avatar(source, 'size-3.5', 'rounded-full ring-2 ring-ripple-surface')}
          {/each}
        </span>
        <span class="text-[12px] text-ripple-muted-foreground">{sourceLabel}</span>
      </button>
    {/if}
  </div>

  <!-- The same height animation ReasoningTrace uses: the panel stays mounted
       and its grid row goes 0fr → 1fr. -->
  <div
    id={panelId}
    inert={!listOpen}
    class="ripple-answer-panel grid transition-[grid-template-rows,opacity] duration-300 ease-ripple-out"
    style:grid-template-rows={listOpen ? '1fr' : '0fr'}
    style:opacity={listOpen ? 1 : 0}
  >
    <div class="overflow-hidden">
      <div class="mt-1.5 flex flex-col rounded-ripple bg-ripple-muted p-1 ring-1 ring-ripple-border">
        {#each sources as source (source.domain)}
          <svelte:element
            this={source.href ? 'a' : 'span'}
            href={source.href}
            target={source.href ? '_blank' : undefined}
            rel={source.href ? 'noreferrer' : undefined}
            class="flex items-center gap-2 rounded-md px-1.5 py-1 text-[12px] text-ripple-muted-foreground transition-colors duration-150 hover:bg-ripple-accent/10 hover:text-ripple-accent"
          >
            {@render avatar(source, 'size-4', 'rounded-[4px]')}
            <span>{source.name}</span>
            <span class="ml-auto font-mono text-[10.5px] text-ripple-muted-foreground">
              {source.domain}
            </span>
          </svelte:element>
        {/each}
      </div>
    </div>
  </div>

  {#if followUps.length > 0}
    <div class={cn('mt-2.5', !finished && 'pointer-events-none opacity-0')} inert={!finished}>
      <p class="text-[12px] font-medium text-ripple-muted-foreground">{followUpLabel}</p>
      <div class="mt-0.5 flex flex-col">
        {#each followUps as text, i (text)}
          <button
            type="button"
            onclick={() => onfollowup?.(text, i)}
            class={cn(
              '-mx-1.5 flex items-center gap-2 rounded-md border-b border-ripple-border px-1.5 py-1.5 text-left text-[12.5px] transition-colors duration-100 hover:bg-ripple-accent/10',
              finished && 'ripple-answer-fade-up'
            )}
            style:animation-delay={`${i * 90}ms`}
          >
            <CornerDownLeftIcon
              size={11}
              class="shrink-0 text-ripple-muted-foreground"
              aria-hidden="true"
            />
            {text}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .ripple-answer-chip {
    animation: ripple-answer-pop-in 250ms var(--ripple-ease-out) both;
  }
  .ripple-answer-fade-in {
    animation: ripple-answer-fade-in 150ms var(--ripple-ease-out) both;
  }
  .ripple-answer-fade-up {
    animation: ripple-answer-fade-up 350ms var(--ripple-ease-out) both;
  }
  @keyframes ripple-answer-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-1px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(-1px);
    }
  }
  @keyframes ripple-answer-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes ripple-answer-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-answer-chip,
    .ripple-answer-fade-in,
    .ripple-answer-fade-up {
      animation: none;
    }
    .ripple-answer-panel {
      transition: none;
    }
  }
</style>
