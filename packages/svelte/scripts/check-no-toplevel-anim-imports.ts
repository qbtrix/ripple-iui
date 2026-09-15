// scripts/check-no-toplevel-anim-imports.ts
// @file scripts/check-no-toplevel-anim-imports.ts
// @description workerd-SSR contract gate. Fails if any source file (other than
//   the allowlisted lazy loader) STATICALLY imports a JS animation engine at
//   module top level. motion.dev / gsap touch window/document at import time
//   and throw on the workerd SSR pass, killing the whole render. All such
//   imports MUST be dynamic + client-only. Run as `bun run lint:anim`; also
//   asserted by check-no-toplevel-anim-imports.test.ts.
// @created 2026-05-30 — RFC 12 animation primitive.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');

/** Engines that must never be imported at module top level. */
export const BANNED_ENGINES = ['motion', 'gsap', '@formkit/auto-animate'] as const;

/** Files permitted to dynamically import an engine (still never statically). */
export const ALLOWLIST = ['src/lib/motion/load-tier1.ts'] as const;

export interface Offender { file: string; line: number; text: string; }

/** Match a STATIC top-level import of a banned engine. Dynamic import() is fine. */
export function findTopLevelAnimImports(file: string, source: string): Offender[] {
  const normalized = file.replace(/\\/g, '/');
  if (ALLOWLIST.some((a) => normalized.endsWith(a))) return [];
  const out: Offender[] = [];
  const lines = source.split('\n');
  const banned = BANNED_ENGINES.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Static import forms: `import x from 'motion'`, `import {a} from "motion"`,
  // `import 'motion'`, `export ... from 'motion'`. NOT `import('motion')`.
  const re = new RegExp(`^\\s*(?:import|export)\\b[^\\n]*?\\bfrom\\s+['"](${banned.join('|')})['"]|^\\s*import\\s+['"](${banned.join('|')})['"]`);
  lines.forEach((text, i) => {
    if (/\bimport\s*\(/.test(text)) return; // dynamic import — allowed
    if (re.test(text)) out.push({ file: normalized, line: i + 1, text: text.trim() });
  });
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)) acc.push(full);
  }
  return acc;
}

export function runGate(): { offenders: Offender[] } {
  const offenders: Offender[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(resolve(__dirname, '..'), file);
    offenders.push(...findTopLevelAnimImports(rel, readFileSync(file, 'utf-8')));
  }
  return { offenders };
}

// CLI entry — exit non-zero on any offender so the build fails.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { offenders } = runGate();
  if (offenders.length) {
    console.error(`✗ ${offenders.length} top-level animation-engine import(s) — these break workerd SSR:`);
    for (const o of offenders) console.error(`  ${o.file}:${o.line}  ${o.text}`);
    console.error('Move them to a client-only dynamic import (see src/lib/motion/load-tier1.ts).');
    process.exit(1);
  }
  console.log('✓ no top-level animation-engine imports');
}
