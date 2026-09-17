<!--
  @file widgets/ai/PromptBar.svelte
  @description NEW (beautiful-ui re-skin arc, lane C, 2026-09-14). The agent
    composer: an auto-growing prompt input with attachment chips, a `@` menu for
    data sources, a `/` menu for commands, a model picker, a dictation toggle
    and a send button. Typing `@` or `/` opens the matching list; ↑↓ move,
    Enter or Tab picks, Escape dismisses. The composer widens to a two-row
    layout once the draft no longer fits on one line, or immediately when
    `tall`.

    origin: slev12397/beautiful-ui@ff0f74d components/primitives/PromptBar.tsx

    NOT REGISTERED. Like TaskRows: under `widgets/` but with no spec-registry
    entry and no manifest entry, so the manifest still reports 189 widgets. It
    reaches callers through `$lib/ui` only.

    NOT PORTED — `glimm`. The source fires a decorative WebGL rainbow sweep
    across the composer interior when the model changes, via the `glimm`
    package. A WebGL dependency for an accent is not a trade this pilot makes,
    and this lane adds no npm dependency, so the canvas, the shader and the
    `celebrate()` call are all gone. Everything else the source does is here.

    ALSO NOT PORTED, and why:
    - `AUTO_STEPS`, the self-running walkthrough. Same rule as TaskRows' `TICKS`
      timer: scripted state a real caller must own becomes props, and animation
      stays. The autoplay drove draft, highlight, connection and model through a
      fixed script over the source's own ice-cream fixtures; with those fixtures
      gone it has nothing to walk. A demo surface scripts this the way the lab
      already scripts StreamText — an external timer writing `value`.
    - The source's inlined Figma / Slack / Gmail brand marks. Third-party
      trademarks do not belong in this library's source. A source row carries an
      `icon` instead: any lucide slug, rendered through `display/Icon.svelte`.
    - The fakes. Dictation resolved to a hard-coded transcript after 2.2s,
      "Connect" flipped a local boolean, and attaching cycled three invented
      filenames. Those are the caller's job, so they became `listening` +
      `onlisten`, `onconnect`, and `onattach` + an `attachments` prop.

    ONE BEHAVIOUR CHANGED. In the source, "Connect" is a nested `role="button"`
    span with `tabIndex={-1}` sitting inside the row's own button — an
    interactive element inside a `role="option"`, and unreachable from the
    keyboard. Here the row is the only control: picking a `connect` source that
    is not connected yet raises `onconnect` instead of inserting a mention, and
    the word "Connect" is plain text. Same two behaviours, one focusable control.
  @a11y The draft is a `combobox` textarea: `aria-expanded`, `aria-controls` and
    `aria-activedescendant` point at the open list, whose rows are `option`s in
    a `listbox`. This is a typeahead over the text being typed, not a menu, so
    it is deliberately not a `role="menu"` and not a portal. The model picker IS
    a menu and uses the canonical `DropdownMenu` overlay, which brings its own
    focus handling, Escape and outside-click. Every icon-only control carries an
    aria-label; the dictation button carries `aria-pressed`.
  @changed 2026-09-17 (fix/port-gaps) — the `@` / `/` listbox fills with
    `bg-ripple-popover` and blurs its backdrop like every other floating layer.
    It sat on `bg-ripple-surface`, the host's in-flow `--card` tint, which
    paw-enterprise makes fully transparent inside `.ripple-root` — in dark mode
    the page text underneath read straight through the list (captain's
    screenshot). Row names follow onto the popover foreground. The composer
    body is in-flow and stays on the surface token.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import MicIcon from '@lucide/svelte/icons/mic';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import FileIcon from '@lucide/svelte/icons/file';
  import XIcon from '@lucide/svelte/icons/x';
  import CheckIcon from '@lucide/svelte/icons/check';

  interface PromptSource {
    key: string;
    name: string;
    desc?: string;
    /** Lucide slug, e.g. "chart-column". Falls back to a paperclip. */
    icon?: string;
    /** Picking this row raises `onattach` instead of inserting an @mention. */
    attach?: boolean;
    /** Show a Connect / Connected affordance on the row. */
    connect?: boolean;
    connected?: boolean;
  }

  interface PromptCommand {
    key: string;
    /** Written with its leading slash, e.g. "/summarize". */
    name: string;
    desc?: string;
  }

  interface PromptModel {
    key: string;
    name: string;
    /** Small right-aligned qualifier, e.g. "Flagship". */
    tag?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The draft text. */
    value?: string;
    placeholder?: string;
    /** `rounded` — card radius. `pill` — full radius until it grows. */
    variant?: 'rounded' | 'pill';
    /** Hero sizing: a multi-line input with the controls on their own row. */
    tall?: boolean;
    disabled?: boolean;
    /** Rows for the `@` menu. No sources means `@` opens nothing. */
    sources?: PromptSource[];
    /** Rows for the `/` menu. No commands means `/` opens nothing. */
    commands?: PromptCommand[];
    /** Model picker choices. With fewer than two, the picker is hidden. */
    models?: PromptModel[];
    /** Selected model key. Defaults to the first model. */
    model?: string;
    /** Attachment chip labels. The caller owns the real files. */
    attachments?: string[];
    /** Dictation is live — the caller owns the microphone. */
    listening?: boolean;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
    onsend?: (value: string) => void;
    onmodelchange?: (key: string) => void;
    /** An `attach: true` source was picked — open a real file picker. */
    onattach?: () => void;
    onremoveattachment?: (name: string, index: number) => void;
    onconnect?: (source: PromptSource) => void;
    onlisten?: (listening: boolean) => void;
  }

  let {
    id,
    class: className,
    style,
    value = '',
    placeholder,
    variant = 'rounded',
    tall = false,
    disabled = false,
    sources = [],
    commands = [],
    models = [],
    model,
    attachments = [],
    listening = false,
    oninput,
    onchange,
    onsend,
    onmodelchange,
    onattach,
    onremoveattachment,
    onconnect,
    onlisten,
  }: Props = $props();

  /* Controlled-input-with-internal-state, the house pattern (Textarea.svelte):
     the prop seeds local state, an $effect re-syncs it, and every local edit
     raises a callback so the caller can stay the source of truth. */
  // svelte-ignore state_referenced_locally
  let draft = $state(value);
  // svelte-ignore state_referenced_locally
  let files = $state<string[]>([...attachments]);
  // svelte-ignore state_referenced_locally
  let modelKey = $state(model ?? models[0]?.key);
  // svelte-ignore state_referenced_locally
  let listen = $state(listening);

  $effect(() => {
    draft = value ?? '';
  });
  $effect(() => {
    files = [...attachments];
  });
  $effect(() => {
    modelKey = model ?? models[0]?.key;
  });
  $effect(() => {
    listen = listening;
  });

  let dismissed = $state(false);
  let plusOpen = $state(false);
  let modelOpen = $state(false);
  let active = $state(0);
  /** The gliding highlight only appears once the user hovers or arrows. */
  let engaged = $state(false);
  let expanded = $state(false);
  let rowBox = $state<{ top: number; height: number } | null>(null);

  let inputEl = $state<HTMLTextAreaElement | null>(null);
  let controlsEl = $state<HTMLDivElement | null>(null);
  let measureEl = $state<HTMLSpanElement | null>(null);
  let rootEl = $state<HTMLDivElement | null>(null);
  let rowEls: HTMLButtonElement[] = [];

  const pill = $derived(variant === 'pill');
  const wide = $derived(expanded || tall);
  const selectedModel = $derived(models.find((m) => m.key === modelKey) ?? models[0]);

  /** The trailing `@word` / `/word` being typed, if any. */
  function parseToken(text: string) {
    const match = /(^|\s)([@/])([\w-]*)$/.exec(text);
    if (!match) return null;
    return {
      kind: match[2] === '@' ? ('at' as const) : ('slash' as const),
      query: match[3].toLowerCase(),
      start: match.index + match[1].length,
    };
  }

  const token = $derived(dismissed ? null : parseToken(draft));
  const query = $derived(plusOpen ? '' : (token?.query ?? ''));

  const rows = $derived.by(() => {
    const kind = plusOpen ? 'at' : token?.kind;
    if (kind === 'at') return sources.filter((s) => s.name.toLowerCase().includes(query));
    if (kind === 'slash') return commands.filter((c) => c.name.slice(1).toLowerCase().startsWith(query));
    return [];
  });

  /* Only open a list there is something to show in. An empty configured list
     would otherwise put a "No matches" panel over the page the first time
     anyone types an @ in a plain sentence. */
  const menu = $derived.by(() => {
    const kind = plusOpen ? 'at' : (token?.kind ?? null);
    if (kind === 'at' && sources.length === 0) return null;
    if (kind === 'slash' && commands.length === 0) return null;
    return kind;
  });

  // $props.id() is per-instance: the literal fallback gave every PromptBar on a
  // page the same menu and option ids, so aria-activedescendant resolved to the
  // first instance's list. Same defect ToolCall and ReasoningTrace carried.
  const uid = $props.id();
  const base = $derived(id ?? uid);
  const menuId = $derived(`${base}-menu`);
  const optionId = (i: number) => `${base}-option-${i}`;

  $effect(() => {
    void menu;
    void query;
    active = 0;
    engaged = false;
  });

  /* A single highlight glides to the active row rather than each row toggling
     its own background. Runs after the DOM flush, so offsetTop is real. */
  $effect(() => {
    void menu;
    void query;
    void rows.length;
    const target = rowEls[active];
    rowBox = target ? { top: target.offsetTop, height: target.offsetHeight } : null;
  });

  /* Move wrapped text above the controls, then grow to a compact maximum. */
  $effect(() => {
    void draft;
    const input = inputEl;
    const controls = controlsEl;
    const measure = measureEl;
    if (!input) return;

    // clientWidth is 0 while the composer is detached or display:none; the
    // width comparison below would then always say "wrapped".
    if (controls && measure && controls.clientWidth > 0) {
      const inline = controls.clientWidth - 28 * 3 - (selectedModel ? 72 : 0) - 16;
      const needsFullWidth = draft.includes('\n') || measure.offsetWidth + 8 > inline;
      if (needsFullWidth !== expanded) expanded = needsFullWidth;
    }

    const min = tall ? 68 : 28;
    const max = tall ? 160 : 100;
    input.style.height = '0px';
    const content = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(content, min), max)}px`;
    input.style.overflowY = content > max ? 'auto' : 'hidden';
  });

  /* The `+` button forces the source list open with no token to close it, so
     it needs an outside click to dismiss. The token-driven list closes itself. */
  $effect(() => {
    if (!plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootEl?.contains(event.target as Node)) plusOpen = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  });

  function setDraft(next: string) {
    draft = next;
    oninput?.(next);
    onchange?.(next);
  }

  function pick(row: PromptSource | PromptCommand) {
    const source = sources.find((s) => s.key === row.key);
    const head = token ? draft.slice(0, token.start) : draft;
    // Picking a source that is not connected yet connects it, and the list
    // stays open. The source repo hung this on a nested `role="button"` span
    // with `tabIndex={-1}`: an interactive element inside a `role="option"`,
    // which is an ARIA violation and unreachable from the keyboard. One branch
    // here gets the same two behaviours with one focusable control per row.
    if (source?.connect && !source.connected) {
      onconnect?.(source);
      return;
    }
    if (source?.attach) {
      onattach?.();
      if (token) setDraft(head);
    } else if (source) {
      setDraft(`${head}@${source.name} `);
    } else {
      setDraft(`${head}${row.name} `);
    }
    plusOpen = false;
    dismissed = false;
    inputEl?.focus();
  }

  function removeAttachment(name: string, index: number) {
    files = files.filter((_, i) => i !== index);
    onremoveattachment?.(name, index);
  }

  function selectModel(next: PromptModel) {
    modelKey = next.key;
    modelOpen = false;
    onmodelchange?.(next.key);
    inputEl?.focus();
  }

  function toggleListening() {
    listen = !listen;
    onlisten?.(listen);
  }

  const canSend = $derived(!disabled && (draft.trim().length > 0 || files.length > 0));

  function send() {
    if (!canSend) return;
    onsend?.(draft.trim());
    setDraft('');
    plusOpen = false;
    modelOpen = false;
  }

  function onKeyDown(event: KeyboardEvent) {
    if (menu && rows.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        engaged = true;
        active = (active + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
        return;
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        event.preventDefault();
        pick(rows[active]);
        return;
      }
    }
    if (event.key === 'Escape') {
      dismissed = true;
      plusOpen = false;
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send();
    }
  }

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  bind:this={rootEl}
  data-ripple-node={id}
  data-variant={variant}
  class={cn('ripple-prompt-bar w-full', className)}
  style={styleString}
>
  <!-- The composer is the anchor: the source list grows up from its top edge. -->
  <div class="relative">
    {#if menu}
      <div
        id={menuId}
        role="listbox"
        aria-label={menu === 'at' ? 'Data sources and files' : 'Commands'}
        class="ripple-prompt-menu absolute inset-x-0 bottom-full z-10 mb-2 rounded-ripple bg-ripple-popover text-ripple-popover-foreground p-1 ring-1 ring-ripple-border backdrop-blur-md"
      >
        <!-- One highlight glides between rows instead of each row painting its own. -->
        <span
          aria-hidden="true"
          class="ripple-prompt-glide pointer-events-none absolute inset-x-1 rounded-md bg-ripple-accent/10"
          style={`top:${rowBox?.top ?? 0}px;height:${rowBox?.height ?? 0}px;opacity:${
            rowBox && engaged && rows.length > 0 ? 1 : 0
          }`}
        ></span>

        {#each rows as row, i (row.key)}
          {@const source = menu === 'at' ? sources.find((s) => s.key === row.key) : undefined}
          <button
            bind:this={rowEls[i]}
            id={optionId(i)}
            type="button"
            role="option"
            aria-selected={i === active}
            onmousedown={(event) => event.preventDefault()}
            onmouseenter={() => {
              active = i;
              engaged = true;
            }}
            onclick={() => pick(row)}
            class="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left"
          >
            {#if source}
              <span class="flex size-5.5 shrink-0 items-center justify-center text-ripple-muted-foreground">
                <Icon name={source.icon ?? 'paperclip'} size={15} strokeWidth={1.8} />
              </span>
            {/if}
            <span class="shrink-0 text-[12.5px] font-medium text-ripple-popover-foreground">{row.name}</span>
            {#if row.desc}
              <span class="min-w-0 flex-1 truncate text-[12px] text-ripple-muted-foreground">{row.desc}</span>
            {/if}
            {#if source?.connect}
              <span
                class={cn(
                  'ml-auto shrink-0 text-[12px] font-medium',
                  source.connected ? 'text-ripple-success' : 'text-ripple-accent'
                )}
              >
                {source.connected ? 'Connected' : 'Connect'}
              </span>
            {/if}
          </button>
        {/each}

        {#if rows.length === 0}
          <div class="flex h-9 items-center px-2 text-[12px] text-ripple-muted-foreground">
            No matches for “{query}”
          </div>
        {/if}

        <div class="mt-1 border-t border-ripple-border px-2 pt-1.5 pb-1 text-[11px] text-ripple-muted-foreground">
          {menu === 'at' ? 'Type to search sources & files' : 'Type to search commands'}
        </div>
      </div>
    {/if}

    <div
      class={cn(
        'relative isolate flex flex-col overflow-hidden bg-ripple-surface ring-1 ring-ripple-border transition-[border-radius] duration-150 ease-ripple-out focus-within:ring-ripple-ring',
        tall ? 'gap-2.5 p-3.5' : 'gap-1.5 p-1.5',
        pill
          ? files.length > 0 || wide
            ? 'rounded-[24px]'
            : 'rounded-full'
          : tall
            ? 'rounded-[22px]'
            : 'rounded-[14px]'
      )}
    >
      <!-- Off-screen twin of the draft: its width decides whether the text still
           fits beside the controls or the composer has to go two-row. -->
      <span
        bind:this={measureEl}
        aria-hidden="true"
        class="pointer-events-none invisible absolute whitespace-pre text-[13px] leading-[18px]"
      >
        {draft}
      </span>

      {#if files.length > 0}
        <div class={cn('flex flex-wrap gap-1.5 pt-0.5', pill ? 'px-1' : 'px-0.5')}>
          {#each files as file, i (`${file}-${i}`)}
            <span
              class={cn(
                'ripple-prompt-chip flex h-6.5 items-center gap-1.5 bg-ripple-muted py-1 pr-1 pl-1.5 text-[11.5px] text-ripple-muted-foreground',
                pill ? 'rounded-full' : 'rounded-md'
              )}
            >
              <FileIcon size={12} aria-hidden="true" />
              <span class="max-w-36 truncate">{file}</span>
              <button
                type="button"
                aria-label={`Remove ${file}`}
                onclick={() => removeAttachment(file, i)}
                class={cn(
                  '-my-1 flex size-6 items-center justify-center text-ripple-muted-foreground transition-colors duration-100 hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground',
                  pill ? 'rounded-full' : 'rounded-[5px]'
                )}
              >
                <XIcon size={10} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          {/each}
        </div>
      {/if}

      <div
        bind:this={controlsEl}
        class={cn(
          'grid items-end gap-x-1 gap-y-1.5',
          wide ? 'grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]' : 'grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]'
        )}
      >
        <button
          type="button"
          aria-label="Add attachments and sources"
          aria-expanded={plusOpen}
          {disabled}
          onclick={() => {
            plusOpen = !plusOpen;
            inputEl?.focus();
          }}
          class={cn(
            'flex size-7 shrink-0 items-center justify-center justify-self-start text-ripple-muted-foreground transition-[background-color,color,transform] duration-150 ease-ripple-out hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground active:scale-[0.94] disabled:opacity-50',
            pill ? 'rounded-full' : 'rounded-ripple',
            plusOpen && 'bg-ripple-accent/10 text-ripple-surface-foreground',
            wide ? 'col-start-1 row-start-2' : 'col-start-1 row-start-1'
          )}
        >
          <PlusIcon size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        <textarea
          bind:this={inputEl}
          rows="1"
          value={draft}
          {disabled}
          role="combobox"
          aria-label="Prompt"
          aria-autocomplete="list"
          aria-expanded={!!menu}
          aria-controls={menu ? menuId : undefined}
          aria-activedescendant={menu && rows.length > 0 ? optionId(active) : undefined}
          placeholder={listen ? 'Listening…' : (placeholder ?? 'Write a message…')}
          oninput={(event) => {
            setDraft(event.currentTarget.value);
            dismissed = false;
            plusOpen = false;
          }}
          onkeydown={onKeyDown}
          class={cn(
            'w-full min-w-0 resize-none bg-transparent text-ripple-surface-foreground outline-none [overflow-wrap:anywhere] placeholder:text-ripple-muted-foreground',
            tall ? 'min-h-[68px] px-2 py-2 text-[14px] leading-5' : 'min-h-7 px-1 py-[5px] text-[13px] leading-[18px]',
            wide ? 'col-span-full col-start-1 row-start-1' : 'col-start-2 row-start-1'
          )}
        ></textarea>

        {#if selectedModel && models.length > 1}
          <DropdownMenu.Root bind:open={modelOpen}>
            <DropdownMenu.Trigger
              aria-label="Choose model"
              {disabled}
              class={cn(
                'flex h-7 shrink-0 items-center gap-1 px-1.5 text-[12px] font-medium text-ripple-muted-foreground transition-colors duration-150 hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground disabled:opacity-50',
                pill ? 'rounded-full' : 'rounded-ripple',
                wide ? 'col-start-2 row-start-2 justify-self-start' : 'col-start-3 row-start-1'
              )}
            >
              {selectedModel.name}
              <span class="text-ripple-muted-foreground" aria-hidden="true">
                <ChevronDownIcon size={11} strokeWidth={2.4} />
              </span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="top" align="start" sideOffset={8} class="w-44">
              {#each models as m (m.key)}
                <DropdownMenu.Item onSelect={() => selectModel(m)} class="gap-2">
                  <span class="min-w-0 flex-1 truncate text-[12.5px] font-medium">{m.name}</span>
                  {#if m.tag}
                    <span class="shrink-0 text-[11px] text-ripple-muted-foreground">{m.tag}</span>
                  {/if}
                  <CheckIcon
                    size={13}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    class={cn('shrink-0', m.key === modelKey ? 'opacity-100' : 'opacity-0')}
                  />
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}

        <button
          type="button"
          aria-label={listen ? 'Stop dictation' : 'Start dictation'}
          aria-pressed={listen}
          {disabled}
          onclick={toggleListening}
          class={cn(
            'flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 ease-ripple-out active:scale-[0.94] disabled:opacity-50',
            pill ? 'rounded-full' : 'rounded-ripple',
            listen
              ? 'bg-ripple-accent/10 text-ripple-accent'
              : 'text-ripple-muted-foreground hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground',
            wide ? 'col-start-4 row-start-2' : 'col-start-4 row-start-1'
          )}
        >
          {#if listen}
            <span class="ripple-prompt-eq flex h-3.5 items-center gap-[2.5px]" aria-hidden="true">
              <span style="--b:0"></span>
              <span style="--b:1"></span>
              <span style="--b:2"></span>
            </span>
          {:else}
            <MicIcon size={15} strokeWidth={2} aria-hidden="true" />
          {/if}
        </button>

        <button
          type="button"
          aria-label="Send"
          disabled={!canSend}
          onclick={send}
          class={cn(
            'flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 ease-ripple-out enabled:active:scale-[0.94]',
            pill ? 'rounded-full' : 'rounded-ripple',
            canSend
              ? 'bg-ripple-surface-foreground text-ripple-surface'
              : 'bg-ripple-muted text-ripple-muted-foreground',
            wide ? 'col-start-5 row-start-2' : 'col-start-5 row-start-1'
          )}
        >
          <ArrowUpIcon size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .ripple-prompt-menu {
    transform-origin: bottom center;
    animation: ripple-prompt-pop-in 180ms var(--ripple-ease-out) both;
  }

  .ripple-prompt-chip {
    animation: ripple-prompt-pop-in 200ms var(--ripple-ease-out) both;
  }

  .ripple-prompt-glide {
    transition:
      top 220ms var(--ripple-ease-out),
      height 220ms var(--ripple-ease-out),
      opacity 150ms ease;
  }

  .ripple-prompt-eq span {
    width: 2.5px;
    height: 100%;
    border-radius: 9999px;
    background: currentColor;
    animation: ripple-prompt-eq-bounce 900ms ease-in-out calc(var(--b) * 150ms) infinite;
  }

  @keyframes ripple-prompt-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes ripple-prompt-eq-bounce {
    0%,
    100% {
      transform: scaleY(0.35);
    }
    50% {
      transform: scaleY(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple-prompt-menu,
    .ripple-prompt-chip,
    .ripple-prompt-eq span {
      animation: none;
    }
    .ripple-prompt-glide {
      transition: none;
    }
  }
</style>
