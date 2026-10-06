// gutter.ts — the width of the line-number gutter, shared by CodeBlock, Diff and the C4 code
// panel's size estimate (c4/semantic.ts), so the three can never size it differently.
//
// 20px is the skin's gutter. Labels past what it holds take ~7px a character at 11px mono; an
// excerpt sizes to its widest label, which is the first one when it starts below zero.
// CodeBlock counting from line 1 keeps a fixed 20px whatever its length: that is how it has always
// rendered, and ToolCall's long JSON results depend on it.

export const GUTTER_MIN = 20;

/** Gutter width in px for line numbers up to `lastLine`. */
export function gutterWidth(lastLine: number): number {
  return Math.max(GUTTER_MIN, String(lastLine).length * 7);
}

/** CodeBlock's gutter: 20px counting from line 1, else the wider of the first and last numbers. */
export function codeBlockGutter(startLine: number, lineCount: number): number {
  if (startLine === 1) return GUTTER_MIN;
  return Math.max(gutterWidth(startLine), gutterWidth(startLine + Math.max(0, lineCount - 1)));
}
