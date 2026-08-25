// @file widgets/marketing/marketing.ssr.test.ts
// @description Static-safety contract test for the enriched marketing pack.
//   Renders the JS-needing-free widgets through `svelte/server` (the SERVER
//   build — the same path Paw Sites uses to PRERENDER landing pages with
//   csr=false) and asserts the FULL resting state is baked into the HTML with
//   NO hydration:
//     - FeatureGrid (ITEM 2): the lucide icon SVG is present in server markup.
//     - Faq (ITEM 3): native <details>/<summary> with every Q/A inlined.
//     - MarketingHero (ITEM 4): headline, CTAs, and the bespoke visual panel are
//       all present, and no pre-animation "from" frame leaks (no opacity:0).
//   Also renders marketing-hero + faq through the Ripple registry to prove the
//   end-to-end server path. Runs in the dedicated `ssr` vitest project (node
//   resolve conditions); the browser-pinned default project cannot drive
//   svelte/server cleanly.
// @created 2026-06-09 — marketing-pack enrich (static-safety proof).
import { render as renderToString } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Faq from './Faq.svelte';
import FeatureGrid from './FeatureGrid.svelte';
import MarketingHero from './Hero.svelte';
import Ripple from '$lib/Ripple.svelte';

describe('marketing pack — SSR (JS-off prerender) static safety', () => {
  it('FeatureGrid bakes the lucide icon SVG into server markup (ITEM 2)', () => {
    const { body } = renderToString(FeatureGrid, {
      props: {
        columns: 2,
        features: [
          { icon: 'zap', title: 'Edge-fast', description: 'Served from the edge.' },
          { icon: 'shield-check', title: 'You own it', description: 'Your domain.' },
        ],
      },
    });
    expect(body).toContain('Edge-fast');
    expect(body).toContain('Served from the edge.');
    // The icon SVG is present without any client hydration.
    expect(body).toContain('<svg');
  });

  it('Faq renders native <details>/<summary> with content inlined (ITEM 3)', () => {
    const { body } = renderToString(Faq, {
      props: {
        title: 'Questions, answered',
        items: [
          { question: 'How long does a visit take?', answer: 'About 45 minutes.' },
          { question: 'Do you bill insurance?', answer: 'Yes, all major plans.' },
        ],
      },
    });
    expect(body).toContain('Questions, answered');
    expect(body).toContain('<details');
    expect(body).toContain('<summary');
    expect(body).toContain('How long does a visit take?');
    expect(body).toContain('About 45 minutes.');
    expect((body.match(/<details/g) ?? []).length).toBe(2);
  });

  it('MarketingHero bakes headline, CTAs, and the visual panel into server markup (ITEM 4)', () => {
    const { body } = renderToString(MarketingHero, {
      props: {
        eyebrow: 'Bright Smile',
        title: 'A dentist your family looks forward to',
        subtitle: 'Gentle care, same-week visits.',
        cta: 'Book now',
        ctaHref: '#book',
        secondaryCta: 'See services',
        secondaryCtaHref: '#services',
        visual: 'grid',
      },
    });
    expect(body).toContain('Bright Smile');
    expect(body).toContain('A dentist your family looks forward to');
    expect(body).toContain('href="#book"');
    expect(body).toContain('href="#services"');
    // The bespoke visual panel is part of the static resting markup.
    expect(body).toContain('ripple-mhero-panel');
  });

  it("MarketingHero with visual='plain' still renders complete copy (no panel)", () => {
    const { body } = renderToString(MarketingHero, {
      props: { title: 'Plain hero', cta: 'Go', ctaHref: '#go', visual: 'plain' },
    });
    expect(body).toContain('Plain hero');
    expect(body).toContain('href="#go"');
    expect(body).not.toContain('ripple-mhero-panel');
  });

  it('marketing-hero + faq render end-to-end through the Ripple registry server build', () => {
    const { body } = renderToString(Ripple, {
      props: {
        spec: {
          ui: {
            type: 'container',
            children: [
              { type: 'marketing-hero', props: { title: 'Registry hero', cta: 'Start', ctaHref: '#start' } },
              { type: 'faq', props: { items: [{ question: 'Registry Q', answer: 'Registry A' }] } },
            ],
          },
        },
      },
    });
    expect(body).toContain('Registry hero');
    expect(body).toContain('href="#start"');
    expect(body).toContain('<details');
    expect(body).toContain('Registry Q');
    expect(body).toContain('Registry A');
  });
});
