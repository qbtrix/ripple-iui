<!-- docs/monorepo.md — the package layout and the boundary rules. Created 2026-08-25 with the split. -->

# The monorepo

Ripple is two packages: an engine with no framework dependency, and a
renderer that draws it.

```
ripple/
├── package.json           # workspace root, private, fans out with bun
├── docs/                  # shared docs (this file, headless.md, widgets.md, …)
└── packages/
    ├── core/              # @ripple-ui/core — the engine
    │   └── src/
    │       ├── schema/    # zod spec types (UISpec, UniversalSpec, motion, brand)
    │       ├── core/      # expressions, dispatcher, mutators, state contract
    │       ├── motion/    # animation compiler + presets
    │       ├── headless/  # the runtime: spec + state → ResolvedNode tree
    │       └── types.ts   # host-facing event types
    └── svelte/            # @ripple-ui/svelte — the Svelte 5 renderer
        └── src/
            ├── lib/       # widgets, components, editor, intents, streaming
            └── routes/    # dev playground (not published)
```

## Which package does my change go in?

If it needs the Svelte compiler — a `.svelte` file, a `$state` rune, a
`use:` action — or a live DOM, it belongs in `packages/svelte`.

Everything else goes in `packages/core`. When unsure, try core: the purity
test and core's DOM-free test environment will tell you immediately if it
does not belong there.

Things that surprise people:

| Lives in core | Lives in svelte | Why |
|---|---|---|
| `motion/engine.ts` (compiler) | `actions/with-motion.ts` (player) | Compiling a motion is math; playing one needs a node. |
| `state-store.ts` (interface) | `state-manager.svelte.ts` (runes) | `$state` needs the compiler. |
| `validate-catalog.ts` (engine) | `validate-catalog-bound.ts` (registry) | The engine ships no widgets. |
| `schema/motion.ts` | `widgets/motion/Reveal.svelte` | Type vs. component. |

## The boundary, and how it's held

`packages/core` may never import from `packages/svelte`. Enforced three ways:

1. **`headless/purity.test.ts`** crawls the transitive import graph from
   core's entry point and fails on any Svelte import, any `.svelte.ts`
   module, or any top-level `document` / `window` access.
2. **Core's vitest runs in the `node` environment.** No jsdom. A test that
   needs a DOM fails, which is the signal that the code under test belongs
   in a renderer.
3. **Core builds with plain `tsc`.** No Svelte plugin exists in that build,
   so a `.svelte` import cannot resolve.

### Three injection points

Where the engine genuinely needs something a renderer owns, the renderer
passes it in rather than the engine importing it.

**Widget catalog.** `validateCatalog(spec, { widgetTypes })` — the engine
has no widgets, so it cannot know what is renderable. `@ripple-ui/svelte`
exports a version bound to its registry, so its callers are unchanged.
Importing the raw one from core and expecting `flex` to be known is the
mistake to watch for.

**Motion player.** `createEventDispatcher(state, onEvent, registry, getRoot,
playMotion)` — the 5th argument. `Ripple.svelte` passes a lazy import of its
`playMotion` action. Without one, `animate` emits its event and skips the
pulse, which is what the headless runtime wants.

**State store.** Both packages implement `StateStore`. The engine depends
on the interface and never on either class, which is what lets the headless
runtime accept the rune-based store from a Svelte host.

## Commands

```bash
bun install          # link the workspace
bun run build        # every package
bun run check        # every package
bun run test         # every package
bun run dev          # the Svelte playground

cd packages/core && bun run test      # one package
```

## Versioning and release

Both packages sit at the same version and move together. `@ripple-ui/svelte`
depends on `@ripple-ui/core` via **`file:../core`**, not `workspace:*`.

That distinction cost a day, so it is worth stating plainly. `workspace:` is
a protocol whose meaning comes from the workspace ROOT. It resolves here and
resolves against nothing for a consumer linking
`file:../ripple/packages/svelte`, which has no such root:

    error: Workspace dependency "@ripple-ui/core" not found

Every in-repo signal was green when that shipped — the whole suite, the type
check, both builds — because the repo only ever tests itself from inside the
workspace. `file:../core` satisfies both: bun links it here, and a consumer
gets core nested under the svelte package. `manifest-consumable.test.ts`
guards the general rule, that nothing in the published manifest may depend on
being inside the monorepo.

A real npm release rewrites the range to a version. Publishing order matters:
core first, then svelte.

> npm publishing is currently broken for this repo — the last three tag runs
> failed and neither package is on npm yet. Consumers use `file:` links.
> Tracked separately; the split does not depend on it.

## Consumers

Workspace consumers point at the package directory rather than the repo root:

```json
"@ripple-ui/svelte": "file:../ripple/packages/svelte"
```

Import paths are unchanged. `@ripple-ui/svelte` re-exports everything it did
before the split, including the engine symbols it now gets from core.
