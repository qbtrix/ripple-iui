import { describe, expect, it } from 'vitest';
import { manifestEntries, buildManifest } from './index.js';
import { getWidgetTypes } from '../widgets/index.js';
import { EventHandler, EventAction } from '../schema/event-handler.js';
import { UISpec, UINode } from '../schema/ui-spec.js';
import { manifestActions } from './actions.js';
import { Motion } from '../schema/motion.js';
import { motionDoc } from './motion-doc.js';

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

describe('manifest pockets', () => {
  function entriesWithPockets() {
    return manifestEntries.flatMap((e) => {
      if (e.pocket && e.pockets) {
        // covered by a separate test, but skip here so we don't double-fail.
        return [];
      }
      if (e.pocket) return [{ entry: e, pocket: { name: 'default', ...e.pocket } }];
      if (e.pockets) return e.pockets.map((p) => ({ entry: e, pocket: p }));
      return [];
    });
  }

  it('no entry sets both `pocket` and `pockets`', () => {
    const offenders = manifestEntries.filter((e) => e.pocket && e.pockets).map((e) => e.type);
    expect(offenders).toEqual([]);
  });

  it('every pocket.ui parses against the UISpec ui-tree schema', () => {
    for (const { entry, pocket } of entriesWithPockets()) {
      const result = UINode.safeParse(pocket.ui);
      expect(
        result.success,
        `${entry.type}.${pocket.name}.ui failed: ${result.success ? '' : JSON.stringify(result.error.issues, null, 2)}`,
      ).toBe(true);
    }
  });

  it('every pocket as a complete spec parses against UISpec (including state)', () => {
    for (const { entry, pocket } of entriesWithPockets()) {
      const result = UISpec.safeParse({
        version: '1.0',
        state: pocket.state ?? {},
        ui: pocket.ui,
      });
      expect(
        result.success,
        `${entry.type}.${pocket.name} spec failed: ${result.success ? '' : JSON.stringify(result.error.issues, null, 2)}`,
      ).toBe(true);
    }
  });

  it('every event handler inside any pocket parses against EventHandler', () => {
    const EVENT_KEYS = ['on_click', 'on_change', 'on_input', 'on_submit', 'on_focus', 'on_blur'] as const;

    function walk(node: unknown, path: string, fail: (msg: string) => void) {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      for (const k of EVENT_KEYS) {
        if (n[k] === undefined) continue;
        const handlers = Array.isArray(n[k]) ? (n[k] as unknown[]) : [n[k]];
        for (const [i, h] of handlers.entries()) {
          const r = EventHandler.safeParse(h);
          if (!r.success) fail(`${path}.${k}[${i}] invalid: ${JSON.stringify(r.error.issues)}`);
        }
      }
      const children = n.children;
      if (Array.isArray(children)) {
        for (const [i, c] of children.entries()) walk(c, `${path}.children[${i}]`, fail);
      }
      const elseChildren = n.else_children;
      if (Array.isArray(elseChildren)) {
        for (const [i, c] of elseChildren.entries()) walk(c, `${path}.else_children[${i}]`, fail);
      }
    }

    const failures: string[] = [];
    for (const { entry, pocket } of entriesWithPockets()) {
      walk(pocket.ui, `${entry.type}.${pocket.name}`, (msg) => failures.push(msg));
    }
    expect(failures).toEqual([]);
  });

  it('every `bind` path resolves against the pocket\'s state', () => {
    function collectBinds(node: unknown, out: string[]) {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (typeof n.bind === 'string') out.push(n.bind);
      const children = n.children;
      if (Array.isArray(children)) for (const c of children) collectBinds(c, out);
      const elseChildren = n.else_children;
      if (Array.isArray(elseChildren)) for (const c of elseChildren) collectBinds(c, out);
    }

    const failures: string[] = [];
    for (const { entry, pocket } of entriesWithPockets()) {
      const binds: string[] = [];
      collectBinds(pocket.ui, binds);
      const state = (pocket.state ?? {}) as Record<string, unknown>;
      for (const raw of binds) {
        // Accept both 'state.x' and '{state.x}' forms; strip braces and the leading 'state.'.
        const stripped = raw.replace(/^\{(.*)\}$/, '$1');
        const path = stripped.startsWith('state.') ? stripped.slice('state.'.length) : stripped;
        const head = path.split('.')[0]?.split('[')[0];
        if (!head) continue;
        if (!(head in state)) {
          failures.push(`${entry.type}.${pocket.name}: bind "${raw}" references state.${head} which is missing from pocket.state`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('manifest motion documentation', () => {
  it('reveal and parallax have manifest entries', () => {
    const types = manifestEntries.map((e) => e.type);
    expect(types).toContain('reveal');
    expect(types).toContain('parallax');
  });

  it('buildManifest exposes a motion doc block', () => {
    const m = buildManifest() as ReturnType<typeof buildManifest> & { motion?: typeof motionDoc };
    expect(m.motion).toBeTruthy();
    expect(m.motion!.field).toBe('motion');
    expect(m.motion!.budgetRule.length).toBeGreaterThan(0);
  });

  it('the reveal-section recipe ui parses against UINode', async () => {
    const { UINode } = await import('../schema/ui-spec.js');
    const recipe = motionDoc.recipes.find((r) => r.name === 'reveal-section');
    expect(recipe).toBeTruthy();
    expect(UINode.safeParse(recipe!.ui).success).toBe(true);
  });

  it('every motion-doc example motion parses against the Motion schema', () => {
    for (const ex of motionDoc.examples) {
      const r = Motion.safeParse(ex.motion);
      expect(r.success, `${ex.name} failed: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });
});
