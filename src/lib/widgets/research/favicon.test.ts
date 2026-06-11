// favicon.test.ts — non-string-prop coverage for faviconUrl.
// Created for the non-string-prop sweep: a source name can arrive as a number
// from a binding; faviconUrl must coerce (asText) instead of crashing on
// .includes/.toLowerCase/.replace.
import { describe, it, expect } from 'vitest';
import { faviconUrl } from './favicon';

describe('faviconUrl non-string sources', () => {
  it('coerces a number instead of crashing', () => {
    expect(() => faviconUrl(2024 as unknown as string)).not.toThrow();
    expect(faviconUrl(2024 as unknown as string)).toContain('2024.com');
  });

  it('falls back to example.com for null/undefined', () => {
    expect(faviconUrl(null)).toContain('domain=example.com');
    expect(faviconUrl(undefined)).toContain('domain=example.com');
  });

  it('still maps a known source name', () => {
    expect(faviconUrl('reddit')).toContain('reddit.com');
  });
});
