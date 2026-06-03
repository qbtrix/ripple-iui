<!--
  Created: 2026-05-30 — RFC 12 marketing-widget showcase. Composes the 7
  marketing widgets into one real landing page IN ORDER — navbar → hero + cta
  → feature-grid → testimonial → logo-cloud → newsletter → footer — for a
  plausible premium product ("Lumen", a solar-install studio). A `theme` is set
  on the spec (brand colors + heading font + logo token) so the new
  theme-applier is visibly emitting CSS vars onto the ripple-root. Rendered as
  one declarative <Ripple {spec} onEvent={...} />, matching the sub-route
  pattern. Entrances + the primary CTA carry motion per the motion-budget rule.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  let lastSubmit = $state('—');
  function handleEvent(event: RippleEvent) {
    // The newsletter widget emits the entered email on submit. The `emit`
    // action carries its value in `payload` (target → `name`).
    if (event.type === 'emit' && event.name === 'subscribe') {
      lastSubmit = String(event.payload ?? '(empty)');
    }
    console.log('RippleEvent:', event);
  }

  // A single landing-page spec. The `theme` block drives white-label: the
  // theme-applier emits --primary / --ring / --ripple-font-heading / --ripple-logo
  // onto the ripple-root, so the navbar CTA, hero, and CTA band all pick up the
  // brand color with zero per-widget CSS.
  const landingSpec = {
    version: '1.0' as const,
    theme: {
      colors: {
        primary: 'oklch(0.55 0.17 256)',
        'primary-foreground': 'oklch(0.99 0 0)',
        ring: 'oklch(0.55 0.17 256)',
        accent: 'oklch(0.95 0.03 256)',
      },
      radius: '0.75rem',
      fonts: { heading: 'Fraunces, Georgia, serif' },
      logo: { src: '/logos/lumen.svg', alt: 'Lumen Solar' },
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '0' },
      children: [
        // 1 ── Navbar (sticky)
        {
          type: 'navbar',
          props: {
            brand: 'Lumen Solar',
            links: [
              { label: 'How it works', href: '#how' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Reviews', href: '#reviews' },
            ],
            cta: 'Get a quote',
            ctaHref: '#quote',
            sticky: true,
          },
        },

        // 2 ── Hero (existing `hero`) — entrance motion (fade + rise)
        {
          type: 'hero',
          props: {
            eyebrow: 'RESIDENTIAL SOLAR, DONE RIGHT',
            title: 'Power your home with the sun by next season',
            subtitle:
              'Lumen designs, permits, and installs rooftop solar in weeks — not months. Flat pricing, a 25-year workmanship warranty, and a dedicated project lead from quote to switch-on.',
            align: 'center',
          },
          class: 'px-6 py-20',
          motion: { enter: { opacity: 0, y: 24 }, transition: { preset: 'snappy' } },
          children: [
            { type: 'button', props: { label: 'Get a free quote', size: 'lg' } },
            { type: 'button', props: { label: 'See sample designs', variant: 'outline', size: 'lg' } },
          ],
        },

        // 3 ── CTA band (the new `cta`) — sits right under the hero as a conversion line
        {
          type: 'cta',
          props: {
            headline: 'See your roof’s solar potential in 60 seconds',
            subtext: 'Drop your address and we’ll estimate output, savings, and payback — no sales call required.',
            button: 'Estimate my savings',
            href: '#quote',
            align: 'center',
          },
          class: 'mx-6 my-12',
          // Primary conversion element — the one place a hover lift is earned.
          motion: { hover: { y: -2, scale: 1.01 }, transition: { preset: 'snappy' } },
        },

        // 4 ── Feature grid (the new `feature-grid`)
        {
          type: 'section',
          id: 'how',
          props: { title: 'Why homeowners pick Lumen', description: 'Everything handled end to end, by one team.' },
          class: 'px-6 py-12',
          children: [
            {
              type: 'feature-grid',
              props: {
                columns: 3,
                features: [
                  { title: 'Flat, honest pricing', description: 'One quote, locked in. No mid-project surprises or financing upsells.', icon: 'badge-dollar-sign' },
                  { title: 'Permits handled', description: 'We file every permit and schedule the inspections so you don’t chase paperwork.', icon: 'file-check' },
                  { title: 'Tier-1 panels', description: 'High-efficiency monocrystalline panels with a 25-year output warranty.', icon: 'sun' },
                  { title: 'Real-time app', description: 'Track production, savings, and CO₂ offset from your phone.', icon: 'smartphone' },
                  { title: 'Battery-ready', description: 'Add storage now or later — every install is wired for backup power.', icon: 'battery-charging' },
                  { title: 'Dedicated lead', description: 'One named project manager from first quote to switch-on.', icon: 'user-check' },
                ],
              },
            },
          ],
        },

        // 5 ── Testimonial (the new `testimonial`)
        {
          type: 'section',
          id: 'reviews',
          props: { title: 'What our customers say' },
          class: 'px-6 py-12',
          children: [
            {
              type: 'testimonial',
              props: {
                quote:
                  'The crew showed up when they said, the panels went in over a weekend, and my first full month bill dropped 80%. The app makes it weirdly satisfying to watch.',
                author: 'Maya Okafor',
                role: 'Homeowner · Austin, TX',
              },
            },
          ],
        },

        // 6 ── Logo cloud (the new `logo-cloud`)
        {
          type: 'logo-cloud',
          props: {
            heading: 'Certified installer for the brands you trust',
            logos: [
              { src: '/logos/panasonic.svg', alt: 'Panasonic' },
              { src: '/logos/tesla.svg', alt: 'Tesla' },
              { src: '/logos/enphase.svg', alt: 'Enphase' },
              { src: '/logos/qcells.svg', alt: 'Q CELLS' },
              { src: '/logos/solaredge.svg', alt: 'SolarEdge' },
            ],
          },
          class: 'px-6 py-12 border-t border-border',
        },

        // 7 ── Newsletter (the new `newsletter`) — emits the email on submit
        {
          type: 'newsletter',
          props: {
            heading: 'Get the solar-savings playbook',
            subtext: 'A short monthly note on incentives, rebates, and what they actually save you. No spam.',
            placeholder: 'you@email.com',
            button: 'Send it to me',
          },
          on_submit: { action: 'emit', target: 'subscribe', value: '{state.email}' },
          class: 'mx-6 my-12',
        },

        // 8 ── Footer (the new `footer`)
        {
          type: 'footer',
          props: {
            columns: [
              { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Careers', href: '#careers' }, { label: 'Service area', href: '#area' }] },
              { title: 'Product', links: [{ label: 'Panels', href: '#panels' }, { label: 'Batteries', href: '#batteries' }, { label: 'Financing', href: '#financing' }] },
              { title: 'Legal', links: [{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }, { label: 'Warranty', href: '#warranty' }] },
            ],
            copyright: '© 2026 Lumen Solar, Inc. Licensed C-46 #1042887.',
          },
        },
      ],
    },
  };
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Marketing pack — a full landing page</h1>
    <p>
      All seven marketing widgets composed in order as one real landing page,
      rendered from a single JSON spec. A <code>theme</code> is set on the spec
      (brand color, heading font, logo) — the theme-applier emits CSS vars onto
      the ripple-root, so the navbar CTA, hero buttons, and CTA band all pick up
      the brand blue with no per-widget styling.
    </p>
    <p class="last-event">Newsletter submit captured: <strong>{lastSubmit}</strong></p>
  </header>

  <!-- The landing page renders edge-to-edge inside this framed surface. -->
  <div class="landing-frame">
    <Ripple spec={landingSpec} onEvent={handleEvent} />
  </div>
</div>

<style>
  .showcase {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    color: hsl(var(--foreground));
  }
  .showcase-header {
    margin-bottom: 1.5rem;
  }
  .showcase-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.5rem;
    max-width: 70ch;
  }
  .showcase-header code {
    background: hsl(var(--muted) / 0.5);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .last-event {
    font-size: 0.8rem;
  }
  .landing-frame {
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
    background: hsl(var(--background));
  }
</style>
