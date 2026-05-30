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
import type { UINode } from '$lib/schema/ui-spec.js';

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
    const { container } = r({ type: 'navbar', props: { brand: 'X', links: [] }, motion: { enter: { opacity: 0, y: -12 } } });
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
