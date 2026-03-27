/**
 * reorderable.ts — Svelte action for drag-to-reorder in any layout (grid, masonry, flex).
 * Created: 2026-03-27 — Zero-dep Pointer Events drag action.
 * Updated: 2026-03-27 — Stripped manual FLIP (Svelte animate:flip owns animation).
 *   Added dead zone, improved drop detection for free-flow masonry positioning.
 *
 * Usage:
 *   <div use:reorderable={{ items, onReorder, handle: '[data-grip]' }}>
 *     {#each items as item (item.id)}
 *       <div data-reorder-id={item.id} animate:flip>
 *         <button data-grip>⠿</button>
 *         ...content...
 *       </div>
 *     {/each}
 *   </div>
 */
export interface ReorderableOptions {
    /** Current ordered list of items (need `.id` on each). */
    items: {
        id: string;
    }[];
    /** Called with new ID order after a successful reorder. */
    onReorder: (ids: string[]) => void;
    /** CSS selector for the drag handle inside each item. If omitted, entire item is draggable. */
    handle?: string;
}
export declare function reorderable(container: HTMLElement, opts: ReorderableOptions): {
    update(newOpts: ReorderableOptions): void;
    destroy(): void;
};
