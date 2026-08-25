/**
 * @file editor/editor-selection.svelte.ts
 * @description L2 (Svelte) reactive adapter over the L1 `SelectionModel`. Holds
 *   a `$state` version counter bumped on every real selection/hover change, and
 *   reads it inside each getter so Svelte tracks them as reactive dependencies —
 *   the L1 model stays the single source of truth (and stays pure/unit-tested),
 *   while the overlay re-renders when selection changes. A host can share ONE
 *   instance across the overlay and the future inline-editor (SP-1b) so they
 *   agree on the selected node. Mirrors the repo's pure-core + reactive-wrapper
 *   idiom (state-mutator.ts <- StateManager).
 * @created 2026-06-27 (SP-1a — branch spike/editor-domid-overlay)
 */
import { SelectionModel, type SelectionState } from './core/index.js';

export class EditorSelection {
  #model: SelectionModel;
  // Bumped on every change the model reports; `void`-read inside getters so the
  // Svelte compiler registers them as reactive reads.
  #version = $state(0);

  constructor(initial?: Partial<SelectionState>) {
    this.#model = new SelectionModel(initial);
  }

  get selectedId(): string | null {
    void this.#version;
    return this.#model.selectedId;
  }

  get hoverId(): string | null {
    void this.#version;
    return this.#model.hoverId;
  }

  isSelected(id: string | null): boolean {
    void this.#version;
    return this.#model.isSelected(id);
  }

  isHovered(id: string | null): boolean {
    void this.#version;
    return this.#model.isHovered(id);
  }

  select(id: string | null): void {
    if (this.#model.select(id)) this.#version++;
  }

  hover(id: string | null): void {
    if (this.#model.hover(id)) this.#version++;
  }

  toggle(id: string): void {
    if (this.#model.toggle(id)) this.#version++;
  }

  clear(): void {
    if (this.#model.clear()) this.#version++;
  }

  /** Escape hatch to the underlying pure model (read-only / advanced use). */
  get model(): SelectionModel {
    return this.#model;
  }
}

export function createEditorSelection(initial?: Partial<SelectionState>): EditorSelection {
  return new EditorSelection(initial);
}
