// stream-spec.sim.test.ts — Real-world simulation harness.
// Shreds fixture JSONs into LLM-like chunks with realistic cadence and
// asserts: (1) final spec matches full parse, (2) intermediate specs are
// structurally valid, (3) node counts are monotonically non-decreasing,
// (4) no truncated enum keys ever leak through.
// Created: 2026-04-16

import { describe, it, expect } from 'vitest';
import { streamSpec } from './stream-spec.svelte.js';
import { parsePartialSpec } from './json-parse.js';
import type { StreamSpec } from './types.js';
import { getWidget } from '../widgets/index.js';

import simpleForm from './fixtures/simple-form.json' with { type: 'json' };
import nestedDashboard from './fixtures/nested-dashboard.json' with { type: 'json' };
import deepChildren from './fixtures/deep-children.json' with { type: 'json' };
import chatWidget from './fixtures/chat-widget-stream.json' with { type: 'json' };
import truncatedCorpus from './fixtures/truncated-corpus.json' with { type: 'json' };

const ENUM_KEYS = new Set(['type', 'intent', 'version', 'action', 'variant']);
const KNOWN_WIDGET_TYPES = new Set<string>();

// ---------- helpers ----------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Simulate an LLM stream: chunk sizes vary 4–30 bytes, inter-chunk delays
 * jitter 2–12ms, with a rare 60ms pause to mimic server-side flushing.
 * Faster than real LLMs on purpose — tests would take forever otherwise.
 */
async function* llmLikeStream(full: string, seed = 1): AsyncGenerator<string> {
  const rng = mulberry32(seed);
  let i = 0;
  while (i < full.length) {
    const size = Math.max(4, Math.floor(rng() * 30));
    const chunk = full.slice(i, i + size);
    i += size;
    if (rng() < 0.02) {
      await sleep(60);
    } else {
      await sleep(2 + Math.floor(rng() * 10));
    }
    yield chunk;
  }
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function countNodes(spec: unknown): number {
  if (spec == null || typeof spec !== 'object') return 0;
  const obj = spec as Record<string, unknown>;
  let count = 0;
  const stack: unknown[] = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (cur == null || typeof cur !== 'object') continue;
    if (Array.isArray(cur)) {
      stack.push(...cur);
      continue;
    }
    const node = cur as Record<string, unknown>;
    if ('type' in node && typeof node.type === 'string') count++;
    for (const key of Object.keys(node)) {
      stack.push(node[key]);
    }
  }
  return count;
}

/**
 * Walk only UINode-shaped nodes — anything with a `type` string AND at least
 * one of the UINode sibling fields (children, props, bind, show, on_*).
 * Skips internal config like `chart.props.type = "line"` which is a prop,
 * not a widget type.
 */
function collectWidgetTypes(spec: unknown, out: Set<string>, inUINode = false): void {
  if (spec == null || typeof spec !== 'object') return;
  if (Array.isArray(spec)) {
    for (const item of spec) collectWidgetTypes(item, out, inUINode);
    return;
  }
  const node = spec as Record<string, unknown>;
  const looksLikeUINode =
    typeof node.type === 'string' &&
    ('children' in node ||
      'props' in node ||
      'bind' in node ||
      'show' in node ||
      Object.keys(node).some((k) => k.startsWith('on_')));

  if (looksLikeUINode && typeof node.type === 'string') {
    out.add(node.type);
  }

  // Only recurse into fields that can hold UINodes: children, ui, top-level containers
  const uiNodeKeys = new Set(['children', 'ui']);
  for (const key of Object.keys(node)) {
    if (!inUINode || uiNodeKeys.has(key) || !looksLikeUINode) {
      collectWidgetTypes(node[key], out, looksLikeUINode);
    }
  }
}

async function runSim(fixture: unknown, seed = 1): Promise<StreamSpec[]> {
  const full = JSON.stringify(fixture);
  const emissions: StreamSpec[] = [];
  const store = streamSpec(llmLikeStream(full, seed), {
    throttleMs: 20,
    onUpdate: (spec) => emissions.push(JSON.parse(JSON.stringify(spec)) as StreamSpec),
  });
  const deadline = Date.now() + 15000;
  while (!store.done && Date.now() < deadline) await sleep(10);
  expect(store.done).toBe(true);
  return emissions;
}

// Pre-populate known widget types once
collectWidgetTypes(simpleForm, KNOWN_WIDGET_TYPES);
collectWidgetTypes(nestedDashboard, KNOWN_WIDGET_TYPES);
collectWidgetTypes(deepChildren, KNOWN_WIDGET_TYPES);
collectWidgetTypes(chatWidget, KNOWN_WIDGET_TYPES);

// ---------- simulation suites ----------

describe.each([
  ['simple-form', simpleForm],
  ['nested-dashboard', nestedDashboard],
  ['deep-children', deepChildren],
  ['chat-widget-stream', chatWidget],
])('sim — fixture %s', (name, fixture) => {
  it('final emission matches non-streaming parse', async () => {
    const emissions = await runSim(fixture);
    expect(emissions.length).toBeGreaterThan(0);
    const final = emissions[emissions.length - 1];
    expect(final).toMatchObject(fixture as object);
  });

  it('node counts never decrease across emissions', async () => {
    const emissions = await runSim(fixture, 2);
    const counts = emissions.map(countNodes);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it('every emitted widget type resolves to a known widget', async () => {
    const emissions = await runSim(fixture, 3);
    const offenders: string[] = [];
    for (const emission of emissions) {
      const seen = new Set<string>();
      collectWidgetTypes(emission, seen);
      for (const type of seen) {
        if (!getWidget(type)) offenders.push(type);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('runs with multiple seeds (deterministic under given seed)', { timeout: 30000 }, async () => {
    for (const seed of [1, 7, 42]) {
      const emissions = await runSim(fixture, seed);
      expect(emissions.length).toBeGreaterThan(0);
      expect(emissions[emissions.length - 1]).toMatchObject(fixture as object);
    }
  });
});

// ---------- truncated-corpus coverage ----------

describe('sim — truncated corpus never surfaces broken enum values', () => {
  const cases = (truncatedCorpus as { cases: { name: string; buffer: string }[] }).cases;

  it.each(cases.map((c) => [c.name, c.buffer]))('case %s', (_name, buffer) => {
    const { value } = parsePartialSpec(buffer);
    if (value == null) return; // null is fine — nothing to render

    // Walk the tree: any string value under an enum key must also appear
    // closed (wrapped in quotes) somewhere in the raw buffer.
    const walk = (node: unknown): void => {
      if (node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const obj = node as Record<string, unknown>;
      for (const [key, v] of Object.entries(obj)) {
        if (ENUM_KEYS.has(key) && typeof v === 'string') {
          const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          expect(buffer.includes(`"${escaped}"`)).toBe(true);
        }
        walk(v);
      }
    };
    walk(value);
  });
});
