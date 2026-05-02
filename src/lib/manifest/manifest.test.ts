import { describe, expect, it } from 'vitest';
import { manifestEntries, buildManifest } from './index.js';
import { getWidgetTypes } from '../widgets/index.js';

describe('widget manifest', () => {
  it('has at least one entry registered', () => {
    expect(manifestEntries.length).toBeGreaterThan(0);
  });

  it('every entry references a real widget type (no ghosts)', () => {
    const knownTypes = new Set(getWidgetTypes());
    const ghosts = manifestEntries
      .map((e) => e.type)
      .filter((t) => !knownTypes.has(t));
    expect(ghosts).toEqual([]);
  });

  it('every entry has a non-empty description under 200 chars', () => {
    for (const entry of manifestEntries) {
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeLessThan(200);
    }
  });

  it('every entry has a runnable example with matching type', () => {
    for (const entry of manifestEntries) {
      expect(entry.example.type).toBe(entry.type);
    }
  });

  it('buildManifest produces a v1 document', () => {
    const m = buildManifest();
    expect(m.schema).toBe('ripple.manifest/v1');
    expect(m.version).toBeTruthy();
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(m.widgets.length).toBe(manifestEntries.length);
  });
});
