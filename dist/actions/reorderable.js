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
const DEAD_ZONE = 5;
const MAX_DROP_DISTANCE = 150;
function log(opts, ...args) {
    if (opts.debug)
        console.log('[reorderable]', ...args);
}
export function reorderable(container, opts) {
    let options = opts;
    let pending = false;
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
    let ptrId = null;
    function snapshotRects() {
        const items = Array.from(container.querySelectorAll('[data-reorder-id]'));
        log(options, 'snapshot', items.length, 'items');
        return items.map((el) => {
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
        log(options, 'ghost created for', sourceId, 'at', Math.round(rect.left), Math.round(rect.top));
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
    function findDropTarget(px, py) {
        let closest = null;
        let closestDist = Infinity;
        for (const r of rects) {
            if (r.id === sourceId)
                continue;
            const dx = Math.max(r.left - px, 0, px - (r.left + r.width));
            const dy = Math.max(r.top - py, 0, py - (r.top + r.height));
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = r.id;
            }
        }
        if (closestDist > MAX_DROP_DISTANCE) {
            log(options, 'drop target too far:', Math.round(closestDist), 'px');
            return null;
        }
        return closest;
    }
    function onPointerDown(e) {
        if (e.button !== 0)
            return;
        const target = e.target;
        if (options.handle) {
            const handleEl = target.closest(options.handle);
            if (!handleEl)
                return;
            log(options, 'handle hit');
        }
        const itemEl = target.closest('[data-reorder-id]');
        if (!itemEl || !container.contains(itemEl)) {
            log(options, 'no [data-reorder-id] found on target');
            return;
        }
        e.preventDefault();
        sourceEl = itemEl;
        sourceId = itemEl.dataset.reorderId;
        startX = e.clientX;
        startY = e.clientY;
        const rect = itemEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        pending = true;
        ptrId = e.pointerId;
        container.setPointerCapture(e.pointerId);
        log(options, 'pointerdown on', sourceId);
    }
    function onPointerMove(e) {
        if (!pending && !dragging)
            return;
        if (pending && !dragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (dx * dx + dy * dy < DEAD_ZONE * DEAD_ZONE)
                return;
            pending = false;
            dragging = true;
            rects = snapshotRects();
            createGhost(sourceEl, sourceEl.getBoundingClientRect());
            log(options, 'drag started —', rects.length, 'targets');
        }
        if (!dragging || !ghost)
            return;
        ghost.style.top = `${e.clientY - offsetY}px`;
        ghost.style.left = `${e.clientX - offsetX}px`;
        const targetId = findDropTarget(e.clientX, e.clientY);
        if (targetId !== currentOverId) {
            clearIndicator();
            if (targetId) {
                const el = rects.find((r) => r.id === targetId)?.el;
                if (el)
                    el.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)';
                currentOverId = targetId;
                log(options, 'hover target:', targetId);
            }
        }
    }
    function onPointerUp(_e) {
        if (!pending && !dragging)
            return;
        const wasDragging = dragging;
        const dropTarget = currentOverId;
        clearIndicator();
        removeGhost();
        pending = false;
        dragging = false;
        ptrId = null;
        if (wasDragging && sourceId && dropTarget && sourceId !== dropTarget) {
            const ids = options.items.map((i) => i.id);
            const fromIdx = ids.indexOf(sourceId);
            const toIdx = ids.indexOf(dropTarget);
            log(options, 'drop:', sourceId, 'from', fromIdx, '→ to', toIdx, `(${dropTarget})`);
            if (fromIdx !== -1 && toIdx !== -1) {
                ids.splice(fromIdx, 1);
                ids.splice(toIdx, 0, sourceId);
                log(options, 'new order:', ids);
                options.onReorder(ids);
            }
        }
        else {
            log(options, 'drop cancelled — wasDragging:', wasDragging, 'source:', sourceId, 'target:', dropTarget);
        }
        sourceEl = null;
        sourceId = null;
        rects = [];
    }
    function onKeyDown(e) {
        if ((pending || dragging) && e.key === 'Escape') {
            log(options, 'cancelled via Escape');
            clearIndicator();
            removeGhost();
            if (ptrId != null) {
                try {
                    container.releasePointerCapture(ptrId);
                }
                catch { }
            }
            pending = false;
            dragging = false;
            sourceEl = null;
            sourceId = null;
            currentOverId = null;
            ptrId = null;
            rects = [];
        }
    }
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    log(options, 'mounted —', options.items.length, 'items, handle:', options.handle ?? 'none');
    return {
        update(newOpts) {
            options = newOpts;
            log(options, 'updated —', options.items.length, 'items');
        },
        destroy() {
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('keydown', onKeyDown);
            if (ghost)
                ghost.remove();
            log(options, 'destroyed');
        },
    };
}
