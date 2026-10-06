// gutter.ts — the width of the line-number gutter, shared by CodeBlock, Diff and the C4 code
// panel's size estimate (c4/semantic.ts), so the three can never size it differently.
//
// 20px is the skin's gutter. Numbers past what it holds take ~7px a digit at 11px mono.
// CodeBlock counting from line 1 keeps a fixed 20px whatever its length: that is how it has always
// rendered, and ToolCall's long JSON results depend on it.

export const GUTTER_MIN = 20;

/** Gutter width in px for line numbers up to `lastLine`. */
export function gutterWidth(lastLine: number): number {
  return Math.max(GUTTER_MIN, String(lastLine).length * 7);
}

/** CodeBlock's gutter: 20px counting from line 1, sized to the numbers for an excerpt. */
export function codeBlockGutter(startLine: number, lineCount: number): number {
  return startLine === 1 ? GUTTER_MIN : gutterWidth(startLine + Math.max(0, lineCount - 1));
}
