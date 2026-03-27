/**
 * reorderable.ts — Svelte action for drag-to-reorder in any layout (grid, masonry, flex).
 * Created: 2026-03-27 — Replaces Swapy with a zero-dep Pointer Events + FLIP approach.
 *
 * Usage:
 *   <div use:reorderable={{ items, onReorder, handle: '[data-grip]' }}>
 *     {#each items as item (item.id)}
 *       <div data-reorder-id={item.id}>
 *         <button data-grip>⠿</button>
 *         ...content...
 *       </div>
 *     {/each}
 *   </div>
 */
export function reorderable(container, opts) {
    let options = opts;
    let dragging = false;
    let ghost = null;
    let sourceEl = null;
    let sourceId = null;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let rects = [];
    let currentOverId = null;
    function getItemEls() {
        return Array.from(container.querySelectorAll('[data-reorder-id]'));
    }
    function snapshotRects() {
        return getItemEls().map((el) => {
            const r = el.getBoundingClientRect();
            return {
                id: el.dataset.reorderId,
                el,
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                centerY: r.top + r.height / 2,
                centerX: r.left + r.width / 2,
            };
        });
    }
    function onPointerDown(e) {
        const target = e.target;
        // If handle selector is set, only start drag from handle
        if (options.handle) {
            const handleEl = target.closest(options.handle);
            if (!handleEl)
                return;
        }
        // Find the reorder item
        const itemEl = target.closest('[data-reorder-id]');
        if (!itemEl || !container.contains(itemEl))
            return;
        e.preventDefault();
        sourceEl = itemEl;
        sourceId = itemEl.dataset.reorderId;
        const rect = itemEl.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        // Snapshot positions before drag
        rects = snapshotRects();
        // Create ghost
        ghost = itemEl.cloneNode(true);
        ghost.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.85;
      transform: scale(1.03);
      transition: transform 120ms ease, opacity 120ms ease;
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      border-radius: inherit;
    `;
        document.body.appendChild(ghost);
        // Dim the source
        sourceEl.style.opacity = '0.25';
        sourceEl.style.transition = 'opacity 150ms ease';
        dragging = true;
        container.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
        if (!dragging || !ghost)
            return;
        // Move ghost
        ghost.style.top = `${e.clientY - offsetY}px`;
        ghost.style.left = `${e.clientX - offsetX}px`;
        // Find closest item under cursor using center distance
        let closestId = null;
        let closestDist = Infinity;
        for (const r of rects) {
            if (r.id === sourceId)
                continue;
            const dx = e.clientX - r.centerX;
            const dy = e.clientY - r.centerY;
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closestId = r.id;
            }
        }
        // Update drop indicator
        if (closestId !== currentOverId) {
            // Clear old indicator
            if (currentOverId) {
                const oldEl = rects.find((r) => r.id === currentOverId)?.el;
                if (oldEl)
                    oldEl.style.boxShadow = '';
            }
            // Set new indicator
            if (closestId) {
                const newEl = rects.find((r) => r.id === closestId)?.el;
                if (newEl)
                    newEl.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)';
            }
            currentOverId = closestId;
        }
    }
    function onPointerUp(e) {
        if (!dragging)
            return;
        dragging = false;
        // Clear indicator
        if (currentOverId) {
            const overEl = rects.find((r) => r.id === currentOverId)?.el;
            if (overEl)
                overEl.style.boxShadow = '';
        }
        // Remove ghost with fade
        if (ghost) {
            ghost.style.opacity = '0';
            ghost.style.transform = 'scale(0.97)';
            const g = ghost;
            setTimeout(() => g.remove(), 150);
            ghost = null;
        }
        // Restore source
        if (sourceEl) {
            sourceEl.style.opacity = '';
            sourceEl.style.transition = '';
        }
        // Compute new order if we have a valid drop target
        if (sourceId && currentOverId && sourceId !== currentOverId) {
            // Snapshot old positions for FLIP
            const oldRects = snapshotRects();
            // Build new order: remove source, insert at target position
            const ids = options.items.map((i) => i.id);
            const fromIdx = ids.indexOf(sourceId);
            const toIdx = ids.indexOf(currentOverId);
            if (fromIdx !== -1 && toIdx !== -1) {
                ids.splice(fromIdx, 1);
                ids.splice(toIdx, 0, sourceId);
                // Notify parent — this triggers DOM reorder
                options.onReorder(ids);
                // FLIP animation after DOM settles
                requestAnimationFrame(() => {
                    const newRects = snapshotRects();
                    for (const newR of newRects) {
                        const oldR = oldRects.find((o) => o.id === newR.id);
                        if (!oldR)
                            continue;
                        const dx = oldR.left - newR.left;
                        const dy = oldR.top - newR.top;
                        if (Math.abs(dx) < 1 && Math.abs(dy) < 1)
                            continue;
                        newR.el.style.transform = `translate(${dx}px, ${dy}px)`;
                        newR.el.style.transition = 'none';
                        // Force reflow
                        newR.el.offsetHeight;
                        newR.el.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0, 1)';
                        newR.el.style.transform = '';
                    }
                    // Clean up transition after animation
                    setTimeout(() => {
                        for (const r of newRects) {
                            r.el.style.transition = '';
                            r.el.style.transform = '';
                        }
                    }, 280);
                });
            }
        }
        sourceEl = null;
        sourceId = null;
        currentOverId = null;
        rects = [];
    }
    function onKeyDown(e) {
        if (dragging && e.key === 'Escape') {
            // Cancel drag
            dragging = false;
            if (ghost) {
                ghost.remove();
                ghost = null;
            }
            if (sourceEl) {
                sourceEl.style.opacity = '';
                sourceEl.style.transition = '';
            }
            if (currentOverId) {
                const overEl = rects.find((r) => r.id === currentOverId)?.el;
                if (overEl)
                    overEl.style.boxShadow = '';
            }
            sourceEl = null;
            sourceId = null;
            currentOverId = null;
            rects = [];
        }
    }
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    return {
        update(newOpts) {
            options = newOpts;
        },
        destroy() {
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('keydown', onKeyDown);
            if (ghost)
                ghost.remove();
        },
    };
}
