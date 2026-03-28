/**
 * reorderable.ts — Svelte action for drag-to-reorder in any layout (grid, masonry, flex).
 * Created: 2026-03-27 — Zero-dep Pointer Events drag action.
 * Updated: 2026-03-27 — Added debug logging, dead zone, nearest-edge drop detection.
 *
 * Usage:
 *   <div use:reorderable={{ items, onReorder, handle: '[data-grip]', debug: true }}>
 *     {#each items as item (item.id)}
 *       <div data-reorder-id={item.id} animate:flip>
 *         <button data-grip>⠿</button>
 *       </div>
 *     {/each}
 *   </div>
 */
export interface ReorderableOptions {
    items: {
        id: string;
    }[];
    onReorder: (ids: string[]) => void;
    handle?: string;
    /** Log drag events to console for debugging. */
    debug?: boolean;
}
export declare function reorderable(container: HTMLElement, opts: ReorderableOptions): {
    update(newOpts: ReorderableOptions): void;
    destroy(): void;
};
