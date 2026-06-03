// @file widgets/marketing/marketing.test.ts
// @description Render + catalog-registration + motion-aware tests for the RFC 12
//   marketing widget pack (Navbar, Footer, CTA, Testimonial, FeatureGrid,
//   Newsletter, LogoCloud). Each widget is asserted to be registered, to render
//   its core content, and (where checked) to gain a [data-ripple-motion] wrapper
//   when a node-level motion field is present.
// @created 2026-05-30 — RFC 12 marketing widget pack (Phase 3).
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { getWidgetTypes } from '$lib/widgets/index.js';
import { validateCatalog } from '$lib/core/validate-catalog.js';
import type { UINode } from '$lib/schema/ui-spec.js';
import type { Motion, MotionInput } from '$lib/schema/motion.js';

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
    for (const type of ['navbar', 'footer', 'cta', 'testimonial', 'feature-grid', 'newsletter', 'logo-cloud']) {
      expect(validateCatalog({ type, props: {} } as UINode)).toEqual([]);
    }
  });
});
