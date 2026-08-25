// @file widgets/marketing/marketing.test.ts
// @description Render + catalog-registration + motion-aware tests for the RFC 12
//   marketing widget pack (Navbar, Footer, CTA, Testimonial, FeatureGrid,
//   Newsletter, LogoCloud). Each widget is asserted to be registered, to render
//   its core content, and (where checked) to gain a [data-ripple-motion] wrapper
//   when a node-level motion field is present.
// @created 2026-05-30 — RFC 12 marketing widget pack (Phase 3).
// @change 2026-06-09 — marketing-pack enrich: FeatureGrid now renders the
//   per-feature lucide icon (ITEM 2); added Faq (native <details>, ITEM 3) and
//   MarketingHero (bespoke hero, ITEM 4) render + registration tests; extended
//   the catalog-coverage list to include faq + marketing-hero.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { getWidgetTypes } from '$lib/widgets/index.js';
// The BOUND validateCatalog. The engine's own takes its catalog as an
// argument and knows no widgets, so asserting "navbar is known" is a claim
// about this renderer's registry, not about the engine.
import { validateCatalog } from '../validate-catalog-bound.js';
import type { UINode } from '@ripple-ui/core';
import type { Motion, MotionInput } from '@ripple-ui/core';

const r = (ui: UINode) => render(Ripple, { props: { spec: { ui } } });

describe('Navbar', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('navbar'); });
  it('renders the brand and links', () => {
    const { getByText } = r({ type: 'navbar', props: { brand: 'BrightSmile', links: [{ label: 'Services', href: '#services' }, { label: 'Contact', href: '#contact' }] } });
    expect(getByText('BrightSmile')).toBeInTheDocument();
    expect(getByText('Services')).toBeInTheDocument();
    expect(getByText('Contact')).toBeInTheDocument();
  });
  it('is motion-aware (gets a wrapper when a motion field is present)', () => {
    const { container } = r({ type: 'navbar', props: { brand: 'X', links: [] }, motion: ({ enter: { opacity: 0, y: -12 } } satisfies MotionInput) as Motion });
    expect(container.querySelector('[data-ripple-motion]')).not.toBeNull();
  });
});

describe('Footer', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('footer'); });
  it('renders columns of links and a copyright', () => {
    const { getByText } = r({ type: 'footer', props: { copyright: '© 2026 BrightSmile', columns: [{ title: 'Company', links: [{ label: 'About', href: '#' }] }] } });
    expect(getByText('© 2026 BrightSmile')).toBeInTheDocument();
    expect(getByText('Company')).toBeInTheDocument();
    expect(getByText('About')).toBeInTheDocument();
  });
});

describe('CTA', () => {
  it('is registered (cta + call-to-action alias)', () => {
    const t = getWidgetTypes();
    expect(t).toContain('cta');
  });
  it('renders headline + button', () => {
    const { getByText } = r({ type: 'cta', props: { headline: 'Ready to book?', button: 'Book now', href: '#book' } });
    expect(getByText('Ready to book?')).toBeInTheDocument();
    expect(getByText('Book now')).toBeInTheDocument();
  });
});

describe('Testimonial', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('testimonial'); });
  it('renders the quote, author, and role', () => {
    const { getByText } = r({ type: 'testimonial', props: { quote: 'Changed how we work.', author: 'Dr. Lee', role: 'Owner, BrightSmile' } });
    expect(getByText(/Changed how we work/)).toBeInTheDocument();
    expect(getByText('Dr. Lee')).toBeInTheDocument();
    expect(getByText('Owner, BrightSmile')).toBeInTheDocument();
  });
});

describe('FeatureGrid', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('feature-grid'); });
  it('renders each feature title + description', () => {
    const { getByText } = r({ type: 'feature-grid', props: { columns: 2, features: [
      { title: 'Fast', description: 'Edge-served.' }, { title: 'Owned', description: 'Your domain.' },
    ] } });
    expect(getByText('Fast')).toBeInTheDocument();
    expect(getByText('Edge-served.')).toBeInTheDocument();
    expect(getByText('Owned')).toBeInTheDocument();
  });
  it('renders the per-feature lucide icon as an inline SVG (ITEM 2)', () => {
    const { container } = r({ type: 'feature-grid', props: { columns: 2, features: [
      { icon: 'zap', title: 'Fast', description: 'Edge-served.' },
      { icon: 'shield-check', title: 'Owned', description: 'Your domain.' },
    ] } });
    // Two feature cards each resolve a lucide slug to an inline <svg>.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });
  it('renders no icon chip when the slug is missing or unknown (graceful, static-safe)', () => {
    const { container } = r({ type: 'feature-grid', props: { columns: 2, features: [
      { title: 'No icon here' },
      { icon: 'definitely-not-a-real-lucide-icon', title: 'Bad slug' },
    ] } });
    // Neither feature yields an SVG glyph; the cards still render their titles.
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toContain('No icon here');
    expect(container.textContent).toContain('Bad slug');
  });
});

describe('Faq', () => {
  it('is registered (faq + faqs alias)', () => {
    const t = getWidgetTypes();
    expect(t).toContain('faq');
    expect(t).toContain('faqs');
  });
  it('renders each question/answer pair inside a native <details>/<summary> (no JS needed)', () => {
    const { getByText, container } = r({ type: 'faq', props: { title: 'Common questions', items: [
      { question: 'How long does it take?', answer: 'About 45 minutes.' },
      { question: 'Do you bill insurance?', answer: 'Yes, all major plans.' },
    ] } });
    expect(getByText('Common questions')).toBeInTheDocument();
    expect(getByText('How long does it take?')).toBeInTheDocument();
    expect(getByText('About 45 minutes.')).toBeInTheDocument();
    expect(getByText('Do you bill insurance?')).toBeInTheDocument();
    // Static-safety contract: native disclosure elements, one per item.
    expect(container.querySelectorAll('details').length).toBe(2);
    expect(container.querySelectorAll('summary').length).toBe(2);
  });
});

describe('MarketingHero', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('marketing-hero'); });
  it('renders eyebrow, title, subtitle, and both CTAs as links', () => {
    const { getByText, container } = r({ type: 'marketing-hero', props: {
      eyebrow: 'Bright Smile',
      title: 'A dentist you look forward to',
      subtitle: 'Gentle care, same-week visits.',
      cta: 'Book now', ctaHref: '#book',
      secondaryCta: 'See services', secondaryCtaHref: '#services',
    } });
    expect(getByText('Bright Smile')).toBeInTheDocument();
    expect(getByText('A dentist you look forward to')).toBeInTheDocument();
    expect(getByText('Gentle care, same-week visits.')).toBeInTheDocument();
    expect(container.querySelector('a[href="#book"]')).not.toBeNull();
    expect(container.querySelector('a[href="#services"]')).not.toBeNull();
  });
  it("omits the visual panel when visual='plain'", () => {
    const { container } = r({ type: 'marketing-hero', props: { title: 'Plain hero', visual: 'plain' } });
    expect(container.querySelector('.ripple-mhero-panel')).toBeNull();
  });
  it("renders the bespoke visual panel by default (visual='grid')", () => {
    const { container } = r({ type: 'marketing-hero', props: { title: 'Default hero' } });
    expect(container.querySelector('.ripple-mhero-panel')).not.toBeNull();
  });
});

describe('Newsletter', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('newsletter'); });
  it('renders an email input and a submit button', () => {
    const { getByPlaceholderText, getByText } = r({ type: 'newsletter', props: { placeholder: 'you@email.com', button: 'Subscribe', heading: 'Stay in the loop' } });
    expect(getByText('Stay in the loop')).toBeInTheDocument();
    expect(getByPlaceholderText('you@email.com')).toBeInTheDocument();
    expect(getByText('Subscribe')).toBeInTheDocument();
  });
  it('submitting the form does not throw and prevents default navigation', async () => {
    const { container } = r({ type: 'newsletter', props: { button: 'Go' }, on_submit: { action: 'toast', message: 'Subscribed' } });
    const form = container.querySelector('form')!;
    const ev = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe('LogoCloud', () => {
  it('is registered', () => { expect(getWidgetTypes()).toContain('logo-cloud'); });
  it('renders a heading and each logo image', () => {
    const { getByText, container } = r({ type: 'logo-cloud', props: { heading: 'Trusted by', logos: [{ src: '/a.svg', alt: 'Acme' }, { src: '/b.svg', alt: 'Globex' }] } });
    expect(getByText('Trusted by')).toBeInTheDocument();
    expect(container.querySelectorAll('img').length).toBe(2);
    expect(container.querySelector('img[alt="Acme"]')).not.toBeNull();
  });
});

describe('marketing catalog coverage', () => {
  it('every marketing type is known to validateCatalog (no unknown-widget errors)', () => {
    for (const type of ['navbar', 'footer', 'cta', 'testimonial', 'feature-grid', 'newsletter', 'logo-cloud', 'faq', 'marketing-hero']) {
      expect(validateCatalog({ type, props: {} } as UINode)).toEqual([]);
    }
  });
});
