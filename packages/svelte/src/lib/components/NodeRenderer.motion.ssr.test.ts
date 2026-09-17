// src/lib/components/NodeRenderer.motion.ssr.test.ts
// @file components/NodeRenderer.motion.ssr.test.ts
// @description THE load-bearing workerd-SSR contract test. Renders a motion
//   spec through `svelte/server` (server build) and asserts the server HTML
//   shows the RESTING/final frame — never the pre-animation "from" frame:
//   no opacity:0, no translateY(40px). This proves no FOUC and a no-JS-safe,
//   crawler-safe page. The withMotion action is client-only, so it never runs
//   on the server and the page renders finished.
//   Runs in the dedicated `ssr` vitest project (server resolve conditions);
//   the browser-pinned default project cannot drive svelte/server cleanly.
// @created 2026-05-30 — RFC 12 animation primitive, Task 1.8.
import { render as renderToString } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

describe('NodeRenderer motion — SSR final frame (workerd contract)', () => {
  it('SSR renders the FINAL frame, not the pre-animation frame (no FOUC, no-JS-safe)', () => {
    // Server render must NOT carry opacity:0 / translateY — the page must look
    // finished for crawlers and no-JS users. The action (client-only) paints
    // the initial frame on hydrate.
    const { body } = renderToString(Ripple, {
      props: { spec: { ui: { type: 'hero', props: { title: 'SEO title' }, motion: { enter: { opacity: 0, y: 40 } } } } },
    });
    expect(body).toContain('SEO title');
    expect(body).not.toMatch(/opacity:\s*0/);
    expect(body).not.toMatch(/translateY\(40px\)/);
  });
});
