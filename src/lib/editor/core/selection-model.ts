/**
 * @file editor/core/selection-model.ts
 * @description L1 (PURE TS, zero Svelte/rune imports) selection state for the
 *   Ripple visual editor: which node id is SELECTED and which is HOVERED. This
 *   is the framework-agnostic single source of truth for selection — the Svelte
 *   L2 (`editor-selection.svelte.ts`) mirrors it reactively, and a future
 *   React/Vue L2 would wrap it the same way (Decision 6). Mutators return
 *   whether they changed anything (so a reactive wrapper only re-renders on real
 *   changes) and notify subscribers. No DOM, no runes — fully unit-testable.
 *   SP-1b (inline edit) and SP-1c (drag) attach to this same model.
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */

export interface SelectionState {
  selectedId: string | null;
  hoverId: string | null;
}

export type SelectionListener = (state: SelectionState) => void;

export class SelectionModel {
  #selectedId: string | null;
  #hoverId: string | null;
  #listeners = new Set<SelectionListener>();

  constructor(initial?: Partial<SelectionState>) {
    this.#selectedId = initial?.selectedId ?? null;
    this.#hoverId = initial?.hoverId ?? null;
  }

  get selectedId(): string | null {
    return this.#selectedId;
  }

  get hoverId(): string | null {
    return this.#hoverId;
  }

  getState(): SelectionState {
    return { selectedId: this.#selectedId, hoverId: this.#hoverId };
  }

  isSelected(id: string | null): boolean {
    return id != null && id === this.#selectedId;
  }

  isHovered(id: string | null): boolean {
    return id != null && id === this.#hoverId;
  }

  /** Set the selected node id (null clears). Returns true if it changed. */
  select(id: string | null): boolean {
    if (this.#selectedId === id) return false;
    this.#selectedId = id;
    this.#emit();
    return true;
  }

  /** Set the hovered node id (null clears). Returns true if it changed. */
  hover(id: string | null): boolean {
    if (this.#hoverId === id) return false;
    this.#hoverId = id;
    this.#emit();
    return true;
  }

  /** Select `id`, or clear selection if it is already the selected node. */
  toggle(id: string): boolean {
    return this.select(this.#selectedId === id ? null : id);
  }

  /** Clear both selection and hover. Returns true if anything changed. */
  clear(): boolean {
    if (this.#selectedId === null && this.#hoverId === null) return false;
    this.#selectedId = null;
    this.#hoverId = null;
    this.#emit();
    return true;
  }

  subscribe(fn: SelectionListener): () => void {
    this.#listeners.add(fn);
    return () => {
      this.#listeners.delete(fn);
    };
  }

  #emit(): void {
    const snapshot = this.getState();
    for (const fn of this.#listeners) fn(snapshot);
  }
}

export function createSelectionModel(initial?: Partial<SelectionState>): SelectionModel {
  return new SelectionModel(initial);
}
