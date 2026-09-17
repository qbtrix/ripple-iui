// @file widgets/display/diff-rows.test.ts
// @description NEW (2026-09-17, beautiful-ui re-skin, skin-diff). Pins the line
//   classification behind Diff.svelte's re-skin against the real `diff` library,
//   imported statically here because the widget loads it lazily. The gutter
//   numbering, the trailing-newline rule and when word-level pieces appear are
//   all things a reader cannot check by looking at a rendered diff.
import { describe, it, expect } from 'vitest';
import { diffLines, diffWordsWithSpace } from 'diff';
import { diffRows, splitRows, type DiffRow } from './diff-rows.js';

const rows = (a: string, b: string) => diffRows(diffLines(a, b), diffWordsWithSpace);
const text = (r: DiffRow) => r.pieces.map((p) => p.text).join('');
const gutter = (r: DiffRow) => (r.kind === 'removed' ? r.oldNo : r.newNo);

describe('diffRows — classification', () => {
  it('classifies context, removed and added lines and numbers one gutter', () => {
    const out = rows('a\nb\nc\n', 'a\nB\nc\nd\n');
    expect(out.map((r) => [r.kind, gutter(r), text(r)])).toEqual([
      ['context', 1, 'a'],
      ['removed', 2, 'b'],
      ['added', 2, 'B'],
      ['context', 3, 'c'],
      ['added', 4, 'd'],
    ]);
  });

  it('keeps old and new numbers apart once the files drift', () => {
    const out = rows('one\ntwo\nthree\n', 'one\nthree\nfour\n');
    const three = out.find((r) => r.kind === 'context' && text(r) === 'three')!;
    expect([three.oldNo, three.newNo]).toEqual([3, 2]);
  });

  it('does not invent an empty last line from a trailing newline', () => {
    expect(rows('x\n', 'x\n')).toHaveLength(1);
    expect(rows('x', 'x')).toHaveLength(1);
  });

  it('returns nothing for two empty strings', () => {
    expect(rows('', '')).toEqual([]);
  });
});

describe('diffRows — word-level pieces', () => {
  it('marks only the changed words on a one-line rewrite', () => {
    const [del, add] = rows('temp: "-14C"\n', 'temp: "-16C"\n');
    expect(del.pieces.filter((p) => p.changed).map((p) => p.text)).toEqual(['14C']);
    expect(add.pieces.filter((p) => p.changed).map((p) => p.text)).toEqual(['16C']);
    // Pieces rebuild each side byte for byte.
    expect(text(del)).toBe('temp: "-14C"');
    expect(text(add)).toBe('temp: "-16C"');
  });

  it('leaves unequal runs whole — line i is not the rewrite of line i', () => {
    const out = rows('a = 1\n', 'a = 2\nb = 3\n');
    expect(out.every((r) => r.pieces.length === 1 && !r.pieces[0].changed)).toBe(true);
  });

  it('leaves a line with nothing in common whole', () => {
    const [del, add] = rows('alpha\n', 'omega\n');
    expect(del.pieces).toEqual([{ text: 'alpha' }]);
    expect(add.pieces).toEqual([{ text: 'omega' }]);
  });

  it('skips pieces entirely when no word diff is supplied', () => {
    const out = diffRows(diffLines('a = 1\n', 'a = 2\n'));
    expect(out.map((r) => r.pieces.length)).toEqual([1, 1]);
  });
});

describe('splitRows', () => {
  it('pairs a removed run beside the added run and pads the shorter side', () => {
    const out = splitRows(rows('keep\nold1\nold2\n', 'keep\nnew1\n'));
    expect(out.map((r) => [r.left && text(r.left), r.right && text(r.right)])).toEqual([
      ['keep', 'keep'],
      ['old1', 'new1'],
      ['old2', undefined],
    ]);
  });

  it('puts a pure addition on the right only', () => {
    const out = splitRows(rows('a\n', 'a\nb\n'));
    expect(out[1]).toEqual({ left: undefined, right: expect.objectContaining({ kind: 'added' }) });
  });
});
