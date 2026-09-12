// children-gate.test.ts
// Created 2026-09-12 — regression guard for the widget children gate.
//
// 25 of 27 widgets used to gate their body on `hasChildren && children`.
// `hasChildren` is a spec-renderer implementation detail; a human writing
// idiomatic Svelte never passes it, so `<Button variant="primary">Save</Button>`
// rendered a silently empty button — no warning, no type error, because
// `children` is optional and `hasChildren` defaults to false. That blocked every
// direct-import use of a ripple widget.
//
// Two halves, because fixing one without the other is how this gets re-broken:
//
//   1. DIRECT — render each widget with a `children` snippet and NO
//      `hasChildren`, assert the child content lands in the DOM.
//   2. SPEC — render label-only nodes through Ripple with no children, assert the
//      fallback prop still renders. This is the guard against a naive OR gate on
//      a widget that has an `{:else if label}` branch: such a gate would take the
//      children branch, render nothing, and drop the label on every spec-rendered
//      button in the product.

import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

import Button from '$lib/widgets/input/Button.svelte';
import Chip from '$lib/widgets/display/Chip.svelte';
import Code from '$lib/widgets/display/Code.svelte';
import Alert from '$lib/widgets/overlay/Alert.svelte';
import EmptyState from '$lib/widgets/display/EmptyState.svelte';
import Section from '$lib/widgets/layout/Section.svelte';
import PageHeader from '$lib/widgets/layout/PageHeader.svelte';
import Hero from '$lib/widgets/layout/Hero.svelte';
import Navbar from '$lib/widgets/marketing/Navbar.svelte';
import Reveal from '$lib/widgets/motion/Reveal.svelte';
import Parallax from '$lib/widgets/motion/Parallax.svelte';
import BentoGrid from '$lib/widgets/premium/BentoGrid.svelte';
import Aurora from '$lib/widgets/premium/Aurora.svelte';
import BorderBeam from '$lib/widgets/premium/BorderBeam.svelte';
import Marquee from '$lib/widgets/premium/Marquee.svelte';
import Shimmer from '$lib/widgets/premium/Shimmer.svelte';
import Spotlight from '$lib/widgets/premium/Spotlight.svelte';
import WizardLayout from '$lib/widgets/composite/WizardLayout.svelte';
import FormLayout from '$lib/widgets/composite/FormLayout.svelte';
import ReportLayout from '$lib/widgets/composite/ReportLayout.svelte';
import EntityDetail from '$lib/widgets/composite/EntityDetail.svelte';

afterEach(() => cleanup());

/** A minimal snippet, the way a hand-written `<Widget>text</Widget>` compiles. */
const kid = (text: string) =>
  createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

// Every widget whose body gate this PR touched and that mounts standalone in
// jsdom. Props are the minimum needed to reach the children branch.
const DIRECT: Array<[string, unknown, Record<string, unknown>]> = [
  // Fallback group — gate on `children` alone (each has an `{:else if}` branch).
  ['Button', Button, {}],
  ['Chip', Chip, {}],
  ['Code', Code, {}],
  ['Alert', Alert, {}],
  // No-fallback group — Card's gate, `hasChildren || children` + `children?.()`.
  ['EmptyState', EmptyState, { title: 'Nothing here' }],
  ['Section', Section, {}],
  ['PageHeader', PageHeader, { title: 'Reports' }],
  ['Hero', Hero, { title: 'Ship it' }],
  ['Navbar', Navbar, { brand: 'Paw' }],
  ['Reveal', Reveal, {}],
  ['Parallax', Parallax, {}],
  ['BentoGrid', BentoGrid, {}],
  ['Aurora', Aurora, {}],
  ['BorderBeam', BorderBeam, {}],
  ['Marquee', Marquee, {}],
  ['Shimmer', Shimmer, {}],
  ['Spotlight', Spotlight, {}],
  ['WizardLayout', WizardLayout, { steps: [{ title: 'One' }] }],
  ['FormLayout', FormLayout, { title: 'Settings' }],
  ['ReportLayout', ReportLayout, { title: 'Q3' }],
  ['EntityDetail', EntityDetail, { title: 'Acme' }],
];

test.each(DIRECT)(
  '%s renders children for a plain Svelte caller that never passes hasChildren',
  (name, Component, props) => {
    const { container } = render(Component as never, {
      props: { ...props, children: kid(`child-of-${name}`) },
    });
    expect(container.textContent).toContain(`child-of-${name}`);
  },
);

// The other half: a childless spec node must still render its fallback prop.
// An OR gate on these would swallow it.
const SPEC: Array<[string, Record<string, unknown>, string]> = [
  ['button', { label: 'Save' }, 'Save'],
  ['chip', { label: 'Beta' }, 'Beta'],
  ['code', { value: 'npm i' }, 'npm i'],
  ['alert', { description: 'Disk almost full' }, 'Disk almost full'],
];

test.each(SPEC)(
  'spec-rendered %s with no children still renders its fallback prop',
  (type, props, expected) => {
    const { container } = render(Ripple, {
      props: { spec: { state: {}, ui: { type, id: `n-${type}`, props } } },
    });
    expect(container.textContent).toContain(expected);
  },
);
