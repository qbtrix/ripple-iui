---
{
  "title": "favicon.ts: Source-to-Favicon URL Resolver",
  "summary": "The `favicon.ts` utility exports a single `faviconUrl()` function that maps a source name string to a Google Favicon Service URL. It maintains a hand-curated domain map for well-known publishers (particularly Indian financial and news sources) and falls back to heuristic domain inference for unknown sources.",
  "concepts": [
    "favicon URL",
    "domain map",
    "source name resolution",
    "Google favicon service",
    "heuristic domain inference",
    "null guard",
    "Indian financial media",
    "faviconUrl function",
    "shared utility",
    "source attribution"
  ],
  "categories": [
    "utility",
    "research",
    "favicon",
    "data-resolution"
  ],
  "source_docs": [
    "c37ea19d3898feae"
  ],
  "backlinks": null,
  "word_count": 551,
  "compiled_at": "2026-04-23T18:36:05Z",
  "compiled_with": "agent",
  "version": 1,
  "audience": "human",
  "depth": "deep",
  "target_words": 500
}
---

## Overview

`favicon.ts` is a shared utility used by every research widget that displays source favicons — `Citation`, `NewsCard`, `SourceCard`, `SourcesBar`, and `CompanyHeader`. Rather than requiring callers to know the domain for every possible source name, this function centralizes the name-to-domain translation in one place.

## Why This Exists

AI-generated research responses refer to sources by human-readable name: `"Bloomberg"`, `"NDTV"`, `"NSE India"`. But favicon services (including Google's) work on domain names, not publication names. Without a translation layer, widgets would need to either accept `domain` as a separate prop (adding coupling) or attempt naive heuristic inference for every source — which works for simple names but fails for compound names, abbreviations, and national publications.

## The Domain Map

```typescript
const DOMAIN_MAP: Record<string, string> = {
  reddit: 'reddit.com',
  bloomberg: 'bloomberg.com',
  moneycontrol: 'moneycontrol.com',
  ndtv: 'ndtv.com',
  timesofindia: 'timesofindia.indiatimes.com',
  'hindustan times': 'hindustantimes.com',
  'NSE India': 'nseindia.com',
  BSE: 'bseindia.com',
  // ... ~35 total entries
};
```

The map contains roughly 35 entries with notable coverage of **Indian financial and news media** (Moneycontrol, NDTV, NSE India, BSE, Times of India, Firstpost, etc.). This reflects Ripple's market focus — the widget library is built for financial research in Indian markets alongside global sources.

Entry keys are mixed case — some lowercase (`bloomberg`), some uppercase (`BSE`, `NSE India`), some with spaces (`'hindustan times'`). This is a known fragility: source names from AI outputs must match these keys exactly, including case and spacing.

## Heuristic Fallback

```typescript
export function faviconUrl(source: string | undefined | null): string {
  if (!source) return `https://www.google.com/s2/favicons?sz=32&domain=example.com`;
  const domain = DOMAIN_MAP[source]
    ?? (source?.includes('.') ? source : `${source?.toLowerCase()?.replace(/\s+/g, '')}.com`);
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
}
```

Fallback logic in order:
1. **Null/undefined guard**: returns `example.com` favicon (a globe icon) as a safe placeholder
2. **Map lookup**: exact key match in `DOMAIN_MAP`
3. **Dot-contains check**: if the source string itself looks like a domain (contains `.`), use it as-is
4. **Heuristic**: strip spaces, lowercase, append `.com`

Step 3 handles cases like `'ft.com'` and `'javascript.info'` which are already in the map but also illustrate the principle — sources that arrive from AI as full domains bypass the heuristic entirely.

Step 4 works for `"TechCrunch"` → `"techcrunch.com"` and `"Wired"` → `"wired.com"`, but fails for names that don't follow the `name.com` convention — e.g. `"Al Jazeera"` → `"aljazeera.com"` works by coincidence, but `"The Guardian"` → `"theguardian.com"` would fail (producing `"theguardian.com"` — actually fine in this case, but not reliably).

## Google Favicon Service

All resolved domains are passed to:
```
https://www.google.com/s2/favicons?sz=32&domain={domain}
```

Google's favicon service returns a PNG at the requested size (32px) from its own crawl cache. Benefits: high availability, CDN-cached, no CORS issues. Drawbacks: requires internet access, can be unavailable in offline or private-network contexts, and Google does not guarantee the API's stability (it is undocumented).

## Known Gaps

- Map keys are case-sensitive and inconsistently cased. `"Bloomberg"` (capital B) would miss the `"bloomberg"` entry and fall through to the heuristic.
- The `example.com` fallback for null/undefined returns a recognizable but meaningless icon. A blank/transparent 1px PNG would be a less misleading fallback.
- No mechanism to extend the map at runtime — only a code change can add new entries. A consumer-provided map override prop on individual widgets would be more flexible.
- The Google Favicon API is unofficial and undocumented; using a self-hosted favicon proxy would be more reliable in production.