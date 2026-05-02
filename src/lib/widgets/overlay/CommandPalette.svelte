<!-- src/lib/widgets/overlay/CommandPalette.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import { cn } from "$lib/utils.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as icons from "@lucide/svelte";
  import SearchIcon from "@lucide/svelte/icons/search";
  import type { WidgetRegistry } from "$lib/core/widget-registry.js";

  type Command = {
    id: string;
    label: string;
    keywords?: string[];
    icon?: string;
    shortcut?: string;
    group?: string;
    description?: string;
    disabled?: boolean;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Whether the palette is open. Bind via `bind: "<state-path>"`. */
    value?: boolean;
    /** List of available commands. */
    commands?: Command[];
    placeholder?: string;
    emptyText?: string;
    /** Trigger combo, e.g. "mod+k" (mod = Cmd on macOS, Ctrl elsewhere). */
    shortcut?: string;
    onchange?: (open: boolean) => void;
    /** Fired with the chosen command's id. */
    onselect?: (id: string) => void;
  }

  let {
    id,
    class: className,
    style,
    value = false,
    commands = [],
    placeholder = "Type a command or search...",
    emptyText = "No results",
    shortcut = "mod+k",
    onchange,
    onselect,
  }: Props = $props();

  const styleString = $derived(
    style
      ? Object.entries(style)
          .map(([k, v]) => `${k}:${v}`)
          .join(";")
      : undefined,
  );

  let isOpen = $state(value);
  let query = $state("");
  let highlight = $state(0);

  $effect(() => {
    isOpen = value;
  });

  // Register open/close on the widget registry so flows can `invoke`.
  const widgetRegistry = getContext<WidgetRegistry | undefined>(
    "ui-widget-registry",
  );
  $effect(() => {
    if (!id || !widgetRegistry) return;
    const offOpen = widgetRegistry.register(id, "open", () => {
      isOpen = true;
      onchange?.(true);
    });
    const offClose = widgetRegistry.register(id, "close", () => {
      isOpen = false;
      onchange?.(false);
    });
    return () => {
      offOpen();
      offClose();
    };
  });

  // Global shortcut listener.
  $effect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (!matchesShortcut(e, shortcut)) return;
      e.preventDefault();
      isOpen = !isOpen;
      onchange?.(isOpen);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function matchesShortcut(e: KeyboardEvent, combo: string): boolean {
    const parts = combo
      .toLowerCase()
      .split("+")
      .map((p) => p.trim());
    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);
    if (e.key.toLowerCase() !== key) return false;
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    for (const m of mods) {
      if (m === "mod") {
        if (!(isMac ? e.metaKey : e.ctrlKey)) return false;
      } else if (m === "ctrl" && !e.ctrlKey) return false;
      else if (m === "meta" && !e.metaKey) return false;
      else if (m === "shift" && !e.shiftKey) return false;
      else if (m === "alt" && !e.altKey) return false;
    }
    return true;
  }

  function handleOpenChange(open: boolean) {
    isOpen = open;
    onchange?.(open);
    if (!open) query = "";
  }

  // Score a command against a fuzzy query. Higher = better.
  function score(cmd: Command, q: string): number {
    if (!q) return 1;
    const haystack = [
      cmd.label,
      cmd.description ?? "",
      ...(cmd.keywords ?? []),
      cmd.group ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const needle = q.toLowerCase();
    if (haystack.includes(needle)) {
      return cmd.label.toLowerCase().startsWith(needle) ? 100 : 50;
    }
    // Subsequence match
    let i = 0;
    for (const ch of haystack) {
      if (ch === needle[i]) i++;
      if (i === needle.length) return 10;
    }
    return 0;
  }

  const filtered = $derived.by(() => {
    return commands
      .filter((c) => !c.disabled)
      .map((c) => ({ cmd: c, s: score(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.cmd);
  });

  // Group filtered commands by group.
  const grouped = $derived.by(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      const g = c.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return Array.from(map.entries());
  });

  $effect(() => {
    void query;
    highlight = 0;
  });

  function getIcon(name?: string) {
    if (!name) return null;
    const camel = name
      .split("-")
      .map((p) => (p[0]?.toUpperCase() ?? "") + p.slice(1))
      .join("");
    return (icons as unknown as Record<string, unknown>)[camel] ?? null;
  }

  function pick(cmd: Command) {
    if (cmd.disabled) return;
    onselect?.(cmd.id);
    isOpen = false;
    onchange?.(false);
    query = "";
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight = Math.min(highlight + 1, filtered.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight = Math.max(highlight - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[highlight];
      if (cmd) pick(cmd);
    }
  }
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
  <Dialog.Content
    {id}
    class={cn("p-0 overflow-hidden sm:max-w-lg", className)}
    style={styleString}
  >
    <div class="flex items-center gap-2 border-b border-border px-4 py-3">
      <SearchIcon size={16} class="opacity-60 shrink-0" />
      <input
        type="text"
        {placeholder}
        class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        bind:value={query}
        onkeydown={onKeyDown}
        aria-label={placeholder}
      />
    </div>

    <div class="max-h-[360px] overflow-y-auto p-1">
      {#if filtered.length === 0}
        <div class="px-3 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      {:else}
        {@const flatIndexMap = new Map(filtered.map((c, i) => [c.id, i]))}
        {#each grouped as [group, cmds] (group)}
          {#if group}
            <div
              class="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {group}
            </div>
          {/if}
          {#each cmds as cmd (cmd.id)}
            {@const idx = flatIndexMap.get(cmd.id) ?? 0}
            {@const Icon = getIcon(cmd.icon)}
            <button
              type="button"
              onmouseenter={() => (highlight = idx)}
              onclick={() => pick(cmd)}
              class={cn(
                "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                idx === highlight ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              {#if Icon}
                <Icon size={14} class="opacity-70 shrink-0" />
              {/if}
              <span class="flex-1 min-w-0">
                <span class="block truncate">{cmd.label}</span>
                {#if cmd.description}
                  <span class="block truncate text-xs text-muted-foreground"
                    >{cmd.description}</span
                  >
                {/if}
              </span>
              {#if cmd.shortcut}
                <span
                  class="ml-auto text-xs tracking-widest text-muted-foreground"
                  >{cmd.shortcut}</span
                >
              {/if}
            </button>
          {/each}
        {/each}
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
