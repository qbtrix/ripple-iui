---
{
  "title": "Terminal Widget — Read-Only and Interactive Log Display",
  "summary": "A styled terminal emulator widget for Ripple that renders sequential log lines with per-type color coding (stdout, stderr, info, command) and optionally exposes a command input field. Auto-scrolls to the bottom when new lines arrive, making it suitable for streaming agent output, build logs, or shell session playback.",
  "concepts": [
    "terminal emulator",
    "log display",
    "streaming output",
    "auto-scroll",
    "TermLine",
    "interactive input",
    "stdout stderr",
    "monospaced font",
    "command echo",
    "Svelte 5 effects"
  ],
  "categories": [
    "widget",
    "composite",
    "display"
  ],
  "source_docs": [
    "a56699ab3ef21d9b"
  ],
  "backlinks": null,
  "word_count": 563,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

AI agents and automated processes produce streams of text output — build logs, tool call results, CLI output, error traces. The Terminal widget provides a purpose-built display container for this content within a Ripple-rendered UI. It is distinct from a generic text block because it carries terminal semantics: typed colors per stream, a macOS-style title bar, monospaced font, and optional interactive input.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lines` | `TermLine[]` | `[]` | Array of log entries to display |
| `interactive` | `boolean` | `false` | Show a command input row at the bottom |
| `maxHeight` | `string` | `'300px'` | CSS max-height before the output area scrolls |
| `title` | `string` | — | Optional title bar text (macOS dots appear when set) |
| `class` | `string` | — | Additional CSS classes |
| `oncommand` | `(cmd: string) => void` | — | Callback when the user submits a command |

Each `TermLine` carries:
- `text` — the display string
- `type` — `'stdout' | 'stderr' | 'info' | 'command'` (defaults to `stdout`)
- `timestamp` — optional string displayed in a dim monospace timestamp column

## Line Type Color Coding

```
stdout   → foreground at 85% opacity   (normal output)
stderr   → destructive color           (errors, red)
info     → muted-foreground            (metadata, gray)
command  → primary color, bold         (echoed commands, accent)
```

This follows standard terminal conventions so users instantly parse signal from noise in dense logs.

## Auto-Scroll Behavior

The `$effect` block watches `lines.length` and fires `scrollEl.scrollTop = scrollEl.scrollHeight` whenever new entries arrive:

```svelte
$effect(() => {
  if (lines.length && scrollEl) {
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }
});
```

This prevents stale viewport state when a parent pushes new lines — a common failure mode for streaming log UIs where users see old content instead of live output. The effect depends on `lines.length` rather than the full array, which is sufficient for append-only streams and avoids unnecessary DOM operations when existing entries are mutated.

## Interactive Mode

When `interactive` is true, a form row with a `$` prompt is appended below the output area. On submit, `submit()` calls `oncommand` with the trimmed value and resets the input. The empty-string guard (`if (!inputValue.trim()) return`) prevents blank commands from being dispatched.

The parent component is responsible for appending a `command`-typed line echoing the user's input and a subsequent `stdout`/`stderr` line with the response — the Terminal does not manage this loop itself.

## Styling Architecture

All styles use scoped `<style>` with CSS custom properties drawn from the shadcn/Ripple theme (`--border`, `--card`, `--foreground`, `--destructive`, `--primary`, `--muted`, `--muted-foreground`). The font stack falls through JetBrains Mono Variable, SF Mono, then `ui-monospace` — ensuring monospaced rendering on any platform without a webfont dependency being hard-wired.

`word-break: break-all` on `.rterm-line` prevents long unbroken strings (URLs, hashes, base64) from overflowing the container.

## Known Gaps

- **No virtualization**: All `lines` are rendered into the DOM. For high-volume streams (thousands of log lines), this will cause performance degradation. There is no max-lines cap or virtual scroll.
- **No ANSI escape code support**: Color codes embedded in `text` strings are rendered as literal characters rather than parsed into color spans.
- **Reactive scroll caveat**: The auto-scroll effect only triggers on `lines.length` changes. If a parent replaces the entire `lines` array reference with the same length, the scroll will not fire.