import { describe, expect, it } from 'vitest';
import { manifestEntries, buildManifest } from './index.js';
import { getWidgetTypes } from '../widgets/index.js';
import { EventHandler, EventAction } from '../schema/event-handler.js';
import { manifestActions } from './actions.js';

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

  it('on_* event handlers never appear inside props (they are node-level)', () => {
    // Per ui-spec.ts, on_click/on_change/etc. are siblings to props, not inside it.
    const offenders: string[] = [];
    for (const entry of manifestEntries) {
      for (const key of Object.keys(entry.props ?? {})) {
        if (key.startsWith('on_')) offenders.push(`${entry.type}.props.${key}`);
      }
      const exampleProps = (entry.example.props ?? {}) as Record<string, unknown>;
      for (const key of Object.keys(exampleProps)) {
        if (key.startsWith('on_')) offenders.push(`${entry.type}.example.props.${key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('control-flow fields (if.condition, each.items/item_as/index_as) live at node level', () => {
    // The renderer reads `node.condition` and `node.items` directly — putting them
    // inside `props` makes the example non-functional and misleads the LLM.
    const ifEntry = manifestEntries.find((e) => e.type === 'if');
    const eachEntry = manifestEntries.find((e) => e.type === 'each');

    expect(ifEntry?.props).not.toHaveProperty('condition');
    expect(ifEntry?.example.props ?? {}).not.toHaveProperty('condition');
    expect(ifEntry?.example).toHaveProperty('condition');

    for (const k of ['items', 'item_as', 'index_as']) {
      expect(eachEntry?.props).not.toHaveProperty(k);
      expect(eachEntry?.example.props ?? {}).not.toHaveProperty(k);
    }
    expect(eachEntry?.example).toHaveProperty('items');
  });

  it('buildManifest produces a v1 document', () => {
    const m = buildManifest();
    expect(m.schema).toBe('ripple.manifest/v1');
    expect(m.version).toBeTruthy();
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(m.widgets.length).toBe(manifestEntries.length);
  });

  it('manifest exposes the spec envelope with the canonical ui field', () => {
    // The agent sometimes invents `root` / `tree` / `view` for the renderable
    // tree. The envelope must explicitly anchor `ui` so prompt-formatting
    // surfaces it before per-widget reference, and the aliases must be
    // listed as not-allowed so the contract is unambiguous.
    const m = buildManifest();
    expect(m.spec).toBeTruthy();
    expect(m.spec.uiField).toBe('ui');
    expect(m.spec.stateField).toBe('state');
    expect(m.spec.version).toBe('1.0');
    expect(m.spec.aliasesNotAllowed).toEqual(
      expect.arrayContaining(['root', 'tree', 'view', 'body', 'content']),
    );
    // Example must itself be a valid envelope-shaped doc.
    expect(m.spec.example).toHaveProperty('ui');
    expect(m.spec.example).toHaveProperty('state');
    expect((m.spec.example as { ui: { type: string } }).ui.type).toBeTruthy();
  });
});

describe('manifest actions section', () => {
  const ALL_VARIANTS = EventAction.options;

  it('documents every EventAction variant the dispatcher supports', () => {
    const documented = new Set(Object.keys(manifestActions));
    const missing = ALL_VARIANTS.filter((v) => !documented.has(v));
    expect(missing).toEqual([]);
  });

  it('does not document any unknown action variants', () => {
    const known = new Set(ALL_VARIANTS);
    const ghosts = Object.keys(manifestActions).filter((k) => !known.has(k as never));
    expect(ghosts).toEqual([]);
  });

  it('every action.example parses against the live EventHandler schema', () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      const result = EventHandler.safeParse(spec.example);
      expect(
        result.success,
        `actions.${name}.example failed: ${result.success ? '' : JSON.stringify(result.error.issues)}`,
      ).toBe(true);
    }
  });

  it("every action.example's `action` field matches its key", () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      expect((spec.example as { action: string }).action).toBe(name);
    }
  });

  it('every action has a non-empty description and shape', () => {
    for (const [name, spec] of Object.entries(manifestActions)) {
      expect(spec.description.length, `actions.${name}.description is empty`).toBeGreaterThan(0);
      expect(Object.keys(spec.shape).length, `actions.${name}.shape is empty`).toBeGreaterThan(0);
    }
  });
});
