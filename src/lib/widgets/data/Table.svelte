<!-- src/lib/widgets/data/Table.svelte
     Modified: 2026-06-24 — in-place cell editing (feat/widget-direct-manipulation).
     Table now supports user-initiated DIRECT MANIPULATION that persists, reusing
     the Kanban manipulation→persist pattern exactly: on commit it builds the FULL
     mutated rows array and fires `onchange(next)`; NodeRenderer turns that into
     `stateManager.set(<bind path>, next)`, which surfaces to the host via
     `onStateChange`. Editing is bound-path driven and opt-in: a cell is editable
     only when the table prop `editable` is true (and, in a spec, the node carries a
     `bind` so NodeRenderer supplies `onchange`). A column may set `editable:false`
     to stay read-only. Unbound / non-editable tables render byte-identical
     read-only output, preserving backward compat. A11y per the atoms roadmap:
     editable cells get role="button" + tabindex=0 + Enter/Space to open; the editor
     commits on Enter/blur and cancels on Escape; data-editable / data-editing attrs
     for styling and tests.
     Modified: 2026-09-06 — the href is run through `safeHref` (shared
     url-sanitizer): a /browser result table carries URLs scraped from an
     untrusted page, so a raw `javascript:`/`data:` href would be XSS. A cell
     whose URL fails the scheme check renders as plain text, not a dead/unsafe
     link.
     Modified: 2026-09-06 — column `href`: name a row field that holds a URL and the cell
     text becomes a link to it (new tab, rel=noopener). Read-only cells only; an
     editable cell keeps its editor. Added for /browser results (a story title that
     opens the story) without putting raw URLs in the visible text.
     Modified: 2026-06-27 — forward node id: bind id + data-ripple-node on the root
     div so the visual editor can select this widget directly (SP-0 id-forwarding). -->

<script lang="ts">
    import { getContext } from "svelte";
    import { cn } from "$lib/utils.js";
    import { safeArray } from "$lib/utils/safe-props.js";
    import { safeHref } from "$lib/utils/url-sanitizer.js";
    import { asText } from "$lib/widgets/text-coerce";
    import type { EventHandlerOrArray } from "../../schema/event-handler.js";
    import type { EventDispatcher } from "../../core/event-dispatcher.js";
    import type { StateManager } from "../../core/state-manager.svelte.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";

    interface TableColumn {
        header?: string;
        label?: string;
        accessorKey?: string;
        key?: string;
        sortable?: boolean;
        /** Per-column opt-out: set false to keep this column read-only even when the table is editable. */
        editable?: boolean;
        /** Row field holding a URL. When set and the row has it, the cell text renders as a
         *  link to that URL (new tab). Keeps the URL out of the visible text, so a "Title"
         *  column can be clickable without showing the address. */
        href?: string;
    }

    interface Props {
        id?: string;
        data?: any[];
        rows?: any[];
        /**
         * Bound rows array. This is the bind-contract surface (`prop: "value"`):
         * `bind: "{state.rows}"` flows the live array in here, and on a cell commit
         * the mutated copy flows back out via `onchange`. Equivalent to `data`/`rows`
         * for read-only use; required for the editable two-way binding to round-trip.
         */
        value?: any[];
        columns?: Array<TableColumn | string>;
        /** Visual variant. */
        variant?: "default" | "compact" | "striped" | "minimal";
        /** Column key for a status dot prefix (e.g. "_status"). */
        statusKey?: string;
        /** Enable sortable columns (click headers). Default true when columns are objects with sortable:true, or when this prop is true. */
        sortable?: boolean;
        /** Show a search input that filters rows across all visible columns. */
        searchable?: boolean;
        /** If set, paginate rows; click prev/next to walk pages. */
        pageSize?: number;
        /**
         * Enable in-place cell editing. When true (and the table is `bind`-bound so
         * `onchange` is supplied), clicking a cell opens an inline editor; committing
         * emits the full mutated rows array via `onchange`. Per-column `editable:false`
         * keeps a column read-only. Unset → read-only (backward compatible).
         */
        editable?: boolean;
        /**
         * Bound-value callback. Fires with the FULL mutated rows array on cell commit.
         * NodeRenderer wires this to `stateManager.set(<bind path>, next)` when the
         * node carries a `bind` — the same persistence path Kanban uses.
         */
        onchange?: (rows: any[]) => void;
        onRowClick?: EventHandlerOrArray;
        class?: string;
    }

    let {
        id,
        data,
        rows,
        value,
        columns: rawColumns = [],
        variant = "default",
        statusKey,
        sortable: tableSortable = false,
        searchable = false,
        pageSize,
        editable = false,
        onchange,
        onRowClick,
        class: className,
    }: Props = $props();

    // Coerce all three shapes — `data`, `rows`, and the bound `value` — to arrays.
    // LLM-generated specs may pass an unevaluated expression string. Precedence
    // keeps existing specs byte-identical: explicit `data` wins, then `rows`, then
    // the bound `value` (the bind-contract surface that carries the live array for
    // the editable two-way binding).
    const tableData = $derived.by<Record<string, any>[]>(() => {
        const fromData = safeArray<Record<string, any>>(data, {
            widget: "table",
            key: "data",
        });
        if (fromData.length > 0) return fromData;
        const fromRows = safeArray<Record<string, any>>(rows, {
            widget: "table",
            key: "rows",
        });
        if (fromRows.length > 0) return fromRows;
        return safeArray<Record<string, any>>(value, {
            widget: "table",
            key: "value",
        });
    });

    type NormalizedColumn = {
        accessorKey: string;
        header: string;
        sortable: boolean;
        editable: boolean;
        href?: string;
    };
    const columns: NormalizedColumn[] = $derived.by(() => {
        const colsArr = safeArray<TableColumn | string>(rawColumns, {
            widget: "table",
            key: "columns",
        });
        if (colsArr.length > 0) {
            return colsArr.map((c) => {
                if (typeof c === "string")
                    return {
                        accessorKey: c,
                        header: c,
                        sortable: tableSortable,
                        editable: true,
                    };
                return {
                    accessorKey:
                        c.accessorKey ?? c.key ?? c.header ?? c.label ?? "",
                    header: c.header ?? c.label ?? c.accessorKey ?? c.key ?? "",
                    sortable: c.sortable ?? tableSortable,
                    // Carried through, not defaulted: the normalizer rebuilds the
                    // column object, so any key not listed here is silently dropped.
                    href: c.href,
                    // Per-column opt-out: default editable, explicit false stays read-only.
                    editable: c.editable !== false,
                };
            });
        }
        const first = tableData[0];
        if (first && typeof first === "object" && !Array.isArray(first)) {
            return Object.keys(first).map((k) => ({
                accessorKey: k,
                header: k,
                sortable: tableSortable,
                editable: true,
            }));
        }
        return [];
    });

    let sortKey = $state<string | null>(null);
    let sortDir = $state<"asc" | "desc">("asc");
    let query = $state("");
    let page = $state(0);

    function toggleSort(key: string) {
        if (sortKey === key) {
            if (sortDir === "asc") sortDir = "desc";
            else {
                sortKey = null;
                sortDir = "asc";
            }
        } else {
            sortKey = key;
            sortDir = "asc";
        }
    }

    function compareValues(a: unknown, b: unknown): number {
        if (a === b) return 0;
        if (a === null || a === undefined) return -1;
        if (b === null || b === undefined) return 1;
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b), undefined, { numeric: true });
    }

    const filtered = $derived.by(() => {
        if (!searchable || !query.trim()) return tableData;
        const q = query.toLowerCase();
        return tableData.filter((row) => {
            if (typeof row !== "object" || row === null)
                return String(row).toLowerCase().includes(q);
            return columns.some((c) => {
                const v = (row as Record<string, unknown>)[c.accessorKey ?? ""];
                return (
                    v !== undefined &&
                    v !== null &&
                    String(v).toLowerCase().includes(q)
                );
            });
        });
    });

    const sorted = $derived.by(() => {
        if (!sortKey) return filtered;
        const dir = sortDir === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const av = (a as Record<string, unknown>)?.[sortKey!];
            const bv = (b as Record<string, unknown>)?.[sortKey!];
            return compareValues(av, bv) * dir;
        });
    });

    const totalPages = $derived(
        pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1,
    );
    // Reactively clamp page to valid range when filtered/sorted shrinks.
    $effect(() => {
        if (page >= totalPages) page = Math.max(0, totalPages - 1);
    });

    const visible = $derived.by(() => {
        if (!pageSize) return sorted;
        const start = page * pageSize;
        return sorted.slice(start, start + pageSize);
    });

    const eventDispatcher = getContext<EventDispatcher>("ui-events");
    const stateManager = getContext<StateManager>("ui-state");
    const dataStore = getContext<Record<string, unknown>>("ui-data");

    async function handleRowClick(row: any, index: number) {
        if (!onRowClick) return;
        await eventDispatcher.dispatch(onRowClick, {
            state: stateManager.state,
            data: dataStore ?? {},
            item: row,
            index,
        });
    }

    // ── In-place cell editing ────────────────────────────────────────────────
    // Mirrors the Kanban manipulation→persist contract: on commit we build the
    // FULL mutated rows array and fire `onchange(next)`. NodeRenderer turns that
    // into `stateManager.set(<bind path>, next)`, which the host persists via
    // `onStateChange`. The widget never touches StateManager directly.
    //
    // The edit target is tracked by *source-array index* + column key, NOT object
    // identity: `editingRowIndex` lives in `$state`, so comparing a stored row
    // object against a live `{#each}` row with `===` would trip Svelte's
    // state_proxy_equality_mismatch (the proxy and the raw value differ). The
    // index into `tableData` is stable and proxy-free, so commit writes to the
    // right *source* record regardless of the sorted/filtered/paged view.
    let editingRowIndex = $state<number | null>(null);
    let editingKey = $state<string | null>(null);
    let editingValue = $state("");

    function cellIsEditable(col: { editable?: boolean }): boolean {
        return editable && col.editable !== false;
    }

    function startEdit(rowIndex: number, key: string, current: unknown) {
        editingRowIndex = rowIndex;
        editingKey = key;
        editingValue = current === null || current === undefined ? "" : asText(current);
    }

    function isEditing(rowIndex: number, key: string): boolean {
        return editingRowIndex === rowIndex && editingKey === key;
    }

    function cancelEdit() {
        editingRowIndex = null;
        editingKey = null;
        editingValue = "";
    }

    function commitEdit() {
        if (editingRowIndex === null || editingKey === null) return;
        const targetIndex = editingRowIndex;
        const key = editingKey;
        const value = editingValue;
        // Map over the live source array by index → a new array with a new row
        // object at the edited position (no in-place mutation of the caller's data).
        const next = tableData.map((r, i) =>
            i === targetIndex ? { ...(r as Record<string, unknown>), [key]: value } : r,
        );
        cancelEdit();
        onchange?.(next);
    }

    function onEditorKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
        }
    }

    function onCellKeydown(
        e: KeyboardEvent,
        rowIndex: number,
        key: string,
        current: unknown,
    ) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEdit(rowIndex, key, current);
        }
    }

    /**
     * Source-array index of a visible row. `visible` is a sorted/filtered/paged
     * derivation that preserves the original row object references, so a plain
     * `indexOf` against `tableData` recovers the stable index the edit target
     * tracks. Falls back to -1 (no-op) if the reference can't be found.
     */
    function sourceIndexOf(row: Record<string, any>): number {
        return tableData.indexOf(row);
    }

    // Autofocus + select-all when an editor mounts, so typing replaces the value.
    function focusEditor(node: HTMLInputElement) {
        node.focus();
        node.select();
    }

    const variantClasses = $derived(
        {
            default: "",
            compact:
                "[&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs",
            striped: "[&_tbody_tr:nth-child(even)]:bg-muted/50",
            minimal: "[&_th]:border-b-0 [&_td]:border-b-0",
        }[variant],
    );
</script>

<div {id} data-ripple-node={id} class={cn("flex flex-col gap-2", className)}>
    {#if searchable}
        <div class="flex items-center gap-2">
            <input
                type="search"
                placeholder="Search..."
                bind:value={query}
                class="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <span class="text-xs text-muted-foreground tabular-nums"
                >{sorted.length} {sorted.length === 1 ? "row" : "rows"}</span
            >
        </div>
    {/if}

    <div class={cn("rounded-md", variantClasses)}>
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    {#each columns as col}
                        {#if col.sortable && col.accessorKey}
                            <Table.Head>
                                <button
                                    type="button"
                                    onclick={() => toggleSort(col.accessorKey!)}
                                    class="inline-flex items-center gap-1 -mx-1 px-1 rounded hover:bg-muted/60 transition-colors text-left font-medium"
                                >
                                    <span>{col.header}</span>
                                    {#if sortKey === col.accessorKey}
                                        {#if sortDir === "asc"}
                                            <ChevronUpIcon size={12} />
                                        {:else}
                                            <ChevronDownIcon size={12} />
                                        {/if}
                                    {:else}
                                        <ChevronsUpDownIcon
                                            size={12}
                                            class="opacity-40"
                                        />
                                    {/if}
                                </button>
                            </Table.Head>
                        {:else}
                            <Table.Head>{col.header}</Table.Head>
                        {/if}
                    {/each}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#if visible.length > 0}
                    {#each visible as row, i}
                        <Table.Row
                            class={onRowClick
                                ? "cursor-pointer hover:bg-muted/50"
                                : ""}
                            onclick={() => handleRowClick(row, i)}
                        >
                            {@const srcIndex = sourceIndexOf(row)}
                            {#each columns as col, ci}
                                {@const editKey = col.accessorKey ?? ""}
                                {@const canEdit =
                                    cellIsEditable(col) &&
                                    editKey !== "" &&
                                    srcIndex !== -1}
                                {@const cellValue =
                                    col.accessorKey &&
                                    row[col.accessorKey] !== undefined
                                        ? row[col.accessorKey]
                                        : (Object.values(row)[ci] ?? "")}
                                <Table.Cell>
                                    {#if ci === 0 && statusKey && row[statusKey]}
                                        <span
                                            class="mr-1.5 inline-block size-2 rounded-full align-middle"
                                            style="background:{row[statusKey]}"
                                        ></span>
                                    {/if}
                                    {#if canEdit && isEditing(srcIndex, editKey)}
                                        <input
                                            type="text"
                                            value={editingValue}
                                            oninput={(e) =>
                                                (editingValue = (
                                                    e.currentTarget as HTMLInputElement
                                                ).value)}
                                            onkeydown={onEditorKeydown}
                                            onblur={commitEdit}
                                            use:focusEditor
                                            aria-label={`Edit ${col.header} value`}
                                            data-editing="true"
                                            class="w-full min-w-0 rounded border border-ring bg-background px-1.5 py-0.5 text-sm outline-none ring-2 ring-ring/40"
                                        />
                                    {:else if canEdit}
                                        <span
                                            role="button"
                                            tabindex="0"
                                            data-editable="true"
                                            aria-label={`Edit ${col.header}`}
                                            onclick={() =>
                                                startEdit(
                                                    srcIndex,
                                                    editKey,
                                                    cellValue,
                                                )}
                                            onkeydown={(e) =>
                                                onCellKeydown(
                                                    e,
                                                    srcIndex,
                                                    editKey,
                                                    cellValue,
                                                )}
                                            class="-mx-1 inline-block min-w-[1ch] cursor-text rounded px-1 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            {cellValue}
                                        </span>
                                    {:else if col.href && safeHref(row[col.href])}
                                        <a
                                            href={safeHref(row[col.href])}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-link-cell="true"
                                            class="underline-offset-2 hover:underline focus-visible:underline"
                                        >
                                            {cellValue}
                                        </a>
                                    {:else}
                                        {cellValue}
                                    {/if}
                                </Table.Cell>
                            {/each}
                        </Table.Row>
                    {/each}
                {:else}
                    <Table.Row>
                        <Table.Cell
                            colspan={columns.length}
                            class="h-24 text-center text-muted-foreground"
                        >
                            No results.
                        </Table.Cell>
                    </Table.Row>
                {/if}
            </Table.Body>
        </Table.Root>
    </div>

    {#if pageSize && sorted.length > pageSize}
        <div
            class="flex items-center justify-between text-xs text-muted-foreground"
        >
            <span class="tabular-nums">
                Page {page + 1} of {totalPages}
            </span>
            <div class="flex items-center gap-1">
                <button
                    type="button"
                    onclick={() => (page = Math.max(0, page - 1))}
                    disabled={page === 0}
                    class="h-7 rounded-md border border-border px-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 transition-colors"
                    >Prev</button
                >
                <button
                    type="button"
                    onclick={() => (page = Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    class="h-7 rounded-md border border-border px-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/60 transition-colors"
                    >Next</button
                >
            </div>
        </div>
    {/if}
</div>
