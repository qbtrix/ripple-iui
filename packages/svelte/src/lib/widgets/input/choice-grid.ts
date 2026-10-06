// widgets/input/choice-grid.ts — the option shape ChoiceGrid renders (a .ts so ./ui can re-export the type).
export interface ChoiceOption {
  value: string;
  label: string;
  /** Secondary line: the exact size, a short note. */
  detail?: string;
  /** Draws a small page with these proportions. */
  thumb?: { width: number; height: number };
  disabled?: boolean;
}
