/**
 * @file primitives/index.ts
 * @description NEW (2026-09-18). The `./primitives` export subpath: the
 *   shadcn-svelte atoms under `components/ui/`, reaching consumers for the
 *   first time.
 *
 *   WHY A SEPARATE SUBPATH. Not taste — a name collision. `./ui` already
 *   exports `Button`, `Input`, `Switch`, `Badge`, `Card`, `Tabs`, `Separator`
 *   and `Skeleton`, and every one of those resolves to a SPEC WIDGET under
 *   `widgets/`. A spec widget takes `{ id, text, variant, class }` and has no
 *   `children`; the shadcn twin of the same name takes `children` and the
 *   shadcn prop surface. They are different components that happen to share a
 *   word. Adding the twins to `./ui` would collide on eight of the ten names
 *   below, and renaming either side would break callers that already depend on
 *   it. A second subpath costs one line in `exports` and breaks nothing.
 *
 *   WHAT THIS IS NOT. Not a copy and not a move. Every name is re-exported from
 *   `components/ui/`, where it already lives and where the overlay namespaces
 *   on `./ui` already come from. The same file backs both surfaces, so a fix
 *   lands once.
 *
 *   SHAPE. Each group matches its own barrel, which is the rule `./ui` follows
 *   for the overlays: a NAMESPACE where the component has sub-parts
 *   (`Card.Header`, `Select.Trigger`, `Tabs.List`, `Chart.Container`), a plain
 *   component where it does not, and the variant helpers and types the local
 *   barrel already exports. Nothing is reshaped on the way through.
 *
 *   WHAT IS ABSENT, DELIBERATELY. `label`, `scroll-area` and `skeleton` — the
 *   three atoms paw-enterprise has that ripple has no twin for. They stay local
 *   to their consumer until ripple grows a real one; listing a name here that
 *   resolves to a different component is the exact mistake this file exists to
 *   avoid.
 */

/* ── with sub-parts: namespaces, same as the overlays on ./ui ───────────── */
export * as Card from '../components/ui/card/index.js';
export * as Chart from '../components/ui/chart/index.js';
export * as Select from '../components/ui/select/index.js';
export * as Tabs from '../components/ui/tabs/index.js';

/* ── single components ──────────────────────────────────────────────────── */
export { Badge, badgeVariants, type BadgeVariant } from '../components/ui/badge/index.js';
export {
	Button,
	buttonVariants,
	type ButtonProps,
	type ButtonSize,
	type ButtonVariant,
} from '../components/ui/button/index.js';
export { Input } from '../components/ui/input/index.js';
export { Progress } from '../components/ui/progress/index.js';
export { Separator } from '../components/ui/separator/index.js';
export { Switch } from '../components/ui/switch/index.js';
