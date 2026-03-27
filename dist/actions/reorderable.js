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
const DEAD_ZONE = 5; // px before drag activates
export function reorderable(container, opts) {
    let options = opts;
    let pending = false; // pointer is down but hasn't moved past dead zone
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
    let pointerId = null;
    function snapshotRects() {
        return Array.from(container.querySelectorAll('[data-reorder-id]')).map((el) => {
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
    function createGhost(itemEl, rect) {
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
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      border-radius: inherit;
      will-change: top, left;
    `;
        document.body.appendChild(ghost);
        sourceEl.style.opacity = '0.2';
    }
    function removeGhost() {
        if (ghost) {
            ghost.style.opacity = '0';
            ghost.style.transform = 'scale(0.97)';
            ghost.style.transition = 'opacity 120ms ease, transform 120ms ease';
            const g = ghost;
            setTimeout(() => g.remove(), 130);
            ghost = null;
        }
        if (sourceEl) {
            sourceEl.style.opacity = '';
        }
    }
    function clearIndicator() {
        if (currentOverId) {
            const el = rects.find((r) => r.id === currentOverId)?.el;
            if (el)
                el.style.boxShadow = '';
            currentOverId = null;
        }
    }
    /** Find the closest widget to the pointer, considering position in the flow. */
    function findDropTarget(px, py) {
        let closest = null;
        let closestDist = Infinity;
        for (const r of rects) {
            if (r.id === sourceId)
                continue;
            // Use distance to nearest edge, not center — feels more natural for free drag
            const dx = Math.max(r.left - px, 0, px - (r.left + r.width));
            const dy = Math.max(r.top - py, 0, py - (r.top + r.height));
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
                closestDist = dist;
                closest = r.id;
            }
        }
        // If pointer is very far from any widget, don't snap
        if (closestDist > 150 * 150)
            return null;
        return closest;
    }
    function onPointerDown(e) {
        if (e.button !== 0)
            return; // left click only
        const target = e.target;
        if (options.handle) {
            if (!target.closest(options.handle))
                return;
        }
        const itemEl = target.closest('[data-reorder-id]');
        if (!itemEl || !container.contains(itemEl))
            return;
        e.preventDefault();
        sourceEl = itemEl;
        sourceId = itemEl.dataset.reorderId;
        startX = e.clientX;
        startY = e.clientY;
        const rect = itemEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        pending = true;
        pointerId = e.pointerId;
        container.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
        if (!pending && !dragging)
            return;
        // Dead zone — don't activate drag until pointer moves enough
        if (pending && !dragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (dx * dx + dy * dy < DEAD_ZONE * DEAD_ZONE)
                return;
            // Activate drag
            pending = false;
            dragging = true;
            rects = snapshotRects();
            createGhost(sourceEl, sourceEl.getBoundingClientRect());
        }
        if (!dragging || !ghost)
            return;
        // Move ghost
        ghost.style.top = `${e.clientY - offsetY}px`;
        ghost.style.left = `${e.clientX - offsetX}px`;
        // Find drop target
        const targetId = findDropTarget(e.clientX, e.clientY);
        if (targetId !== currentOverId) {
            clearIndicator();
            if (targetId) {
                const el = rects.find((r) => r.id === targetId)?.el;
                if (el)
                    el.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)';
                currentOverId = targetId;
            }
        }
    }
    function onPointerUp(_e) {
        if (!pending && !dragging)
            return;
        const wasDragging = dragging;
        const dropTarget = currentOverId;
        // Clean up
        clearIndicator();
        removeGhost();
        pending = false;
        dragging = false;
        pointerId = null;
        // Reorder if we had a valid drop
        if (wasDragging && sourceId && dropTarget && sourceId !== dropTarget) {
            const ids = options.items.map((i) => i.id);
            const fromIdx = ids.indexOf(sourceId);
            const toIdx = ids.indexOf(dropTarget);
            if (fromIdx !== -1 && toIdx !== -1) {
                ids.splice(fromIdx, 1);
                ids.splice(toIdx, 0, sourceId);
                options.onReorder(ids);
            }
        }
        sourceEl = null;
        sourceId = null;
        rects = [];
    }
    function onKeyDown(e) {
        if ((pending || dragging) && e.key === 'Escape') {
            clearIndicator();
            removeGhost();
            if (pointerId != null) {
                try {
                    container.releasePointerCapture(pointerId);
                }
                catch { }
            }
            pending = false;
            dragging = false;
            sourceEl = null;
            sourceId = null;
            currentOverId = null;
            pointerId = null;
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
