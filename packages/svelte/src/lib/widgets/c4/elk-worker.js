// elk-worker.js — the module worker C4 layouts run in (elk-layout.ts runElk starts it). elkjs's
// layout engine, once loaded in a worker, installs its own `self.onmessage`
// dispatcher, so loading it is the whole worker: it speaks elkjs's worker protocol
// ({ id, cmd: 'register' | 'layout', ... } in, { id, data } or { id, error } out).
//
// elk.bundled.js loads the engine lazily, inside the ELK constructor, which then throws in a worker
// (the fake worker it would build is a page-only export); the throw is expected and swallowed.
// Anywhere else (a page, SSR) this module does nothing: elk-layout.ts imports it there only so a dev server
// serving a linked (file:) copy of this package lets the worker URL load.
//
// Plain JS on purpose: hosts bundle it through `new Worker(new URL('./elk-worker.js', import.meta.url))`,
// which must name a file that exists both in src and in the packaged dist.
import ELK from 'elkjs/lib/elk.bundled.js';

if ('WorkerGlobalScope' in globalThis) {
  try {
    new ELK();
  } catch {
    // expected: see the header
  }
}
