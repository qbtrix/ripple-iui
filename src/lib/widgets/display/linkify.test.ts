// linkify.test.ts — specs for the Text widget's URL segmentation.

import { describe, it, expect } from 'vitest';
import { linkifySegments } from './linkify.js';

describe('linkifySegments', () => {
  it('returns a single plain segment for text with no URLs', () => {
    expect(linkifySegments('just some words')).toEqual([{ text: 'just some words' }]);
  });

  it('returns an empty plain segment for an empty string', () => {
    expect(linkifySegments('')).toEqual([{ text: '' }]);
  });

  it('treats a bare URL as one clickable segment', () => {
    expect(linkifySegments('https://example.com/meeting/abc-123')).toEqual([
      { text: 'https://example.com/meeting/abc-123', url: 'https://example.com/meeting/abc-123' },
    ]);
  });

  it('keeps surrounding text as plain segments', () => {
    expect(linkifySegments('Join at https://example.com/x now')).toEqual([
      { text: 'Join at ' },
      { text: 'https://example.com/x', url: 'https://example.com/x' },
      { text: ' now' },
    ]);
  });

  it('does not swallow trailing sentence punctuation into the URL', () => {
    expect(linkifySegments('See https://example.com/docs.')).toEqual([
      { text: 'See ' },
      { text: 'https://example.com/docs', url: 'https://example.com/docs' },
      { text: '.' },
    ]);
  });

  it('linkifies multiple URLs in one string', () => {
    const segments = linkifySegments('a https://one.example b https://two.example c');
    expect(segments).toEqual([
      { text: 'a ' },
      { text: 'https://one.example', url: 'https://one.example' },
      { text: ' b ' },
      { text: 'https://two.example', url: 'https://two.example' },
      { text: ' c' },
    ]);
  });

  it('ignores non-http(s) schemes', () => {
    expect(linkifySegments('mail me at mailto:team@example.com')).toEqual([
      { text: 'mail me at mailto:team@example.com' },
    ]);
  });
});
