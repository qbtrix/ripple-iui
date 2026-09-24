// pattern-detector.test.ts — Unit tests for the pattern detectors.
// Created 2026-06-08 (FIX #2): isQuizPattern / isResultsPattern must require
// EVERY item to fit, so a single matching item no longer flips a mixed array.
import { describe, it, expect } from 'vitest';
import { isQuizPattern, isResultsPattern } from '../pattern-detector.js';

describe('isResultsPattern (FIX #2 — .every not .some)', () => {
  const info = { intent: 'info' };

  it('does NOT match a mixed array with ONE label+value item', () => {
    const items = [
      { label: 'Score', value: '90' }, // matches
      { title: 'Not a result row' }, // does not match
    ];
    expect(isResultsPattern(info, items)).toBe(false);
  });

  it('matches when ALL items have label+value', () => {
    const items = [
      { label: 'Score', value: '90' },
      { label: 'Rank', value: '#1' },
    ];
    expect(isResultsPattern(info, items)).toBe(true);
  });

  it('returns false for an empty array (guard preserved)', () => {
    expect(isResultsPattern(info, [])).toBe(false);
  });

  it('returns false when intent is not info (intent check preserved)', () => {
    const items = [{ label: 'a', value: 'b' }];
    expect(isResultsPattern({ intent: 'browse' }, items)).toBe(false);
  });
});

describe('isQuizPattern (FIX #2 — .every not .some)', () => {
  const select = { intent: 'select' };

  it('does NOT match a mixed array with ONE item carrying `correct`', () => {
    const items = [
      { id: '1', text: 'A', correct: true }, // matches
      { id: '2', text: 'B' }, // does not match
    ];
    expect(isQuizPattern(select, items)).toBe(false);
  });

  it('matches when ALL items carry `correct`', () => {
    const items = [
      { id: '1', text: 'A', correct: true },
      { id: '2', text: 'B', correct: false },
    ];
    expect(isQuizPattern(select, items)).toBe(true);
  });

  it('returns false for an empty array (guard preserved)', () => {
    expect(isQuizPattern(select, [])).toBe(false);
  });

  it('returns false when intent is not select (intent check preserved)', () => {
    const items = [{ id: '1', text: 'A', correct: true }];
    expect(isQuizPattern({ intent: 'info' }, items)).toBe(false);
  });
});
