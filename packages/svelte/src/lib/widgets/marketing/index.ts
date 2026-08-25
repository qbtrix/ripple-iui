// @file widgets/marketing/index.ts — barrel for the marketing widget pack.
// @created 2026-05-30 — RFC 12.
// @change 2026-06-09 — added Faq (native <details>, type `faq`, ITEM 3) and
//   MarketingHero (bespoke hero, type `marketing-hero`, ITEM 4). MarketingHero
//   is exported under that name to avoid colliding with layout/Hero.
export { default as Navbar } from './Navbar.svelte';
export { default as Footer } from './Footer.svelte';
export { default as Cta } from './Cta.svelte';
export { default as Testimonial } from './Testimonial.svelte';
export { default as FeatureGrid } from './FeatureGrid.svelte';
export { default as Newsletter } from './Newsletter.svelte';
export { default as LogoCloud } from './LogoCloud.svelte';
export { default as Faq } from './Faq.svelte';
export { default as MarketingHero } from './Hero.svelte';
