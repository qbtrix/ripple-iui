<!-- docs/publishing.md — how @ripple-ui/svelte gets to npm, and the one-time
     setup that unblocks it. Created 2026-07-08 (RCR-2). -->
# Publishing `@ripple-ui/svelte`

## How a release works

Tagging `v*` (or running the `release-manifest` workflow by hand) triggers
`.github/workflows/release-manifest.yml`, which builds the library, publishes to
npm with `bun publish --access public`, and attaches the manifest bundle to a
GitHub release.

The package is publish-ready: `license`, `publishConfig.access: public`, a
`LICENSE` file, a `files` allowlist (`dist`, minus test files), and the npm
listing metadata (`description`, `repository`, `keywords`, `homepage`, `bugs`)
are all in `package.json`. `bun publish --dry-run` packs the intended 1309-file
`dist` tree cleanly.

## Why nothing has published yet (the current blocker)

`@ripple-ui/svelte` is 404 on npm. The last three tag runs (v0.5.0, v0.5.1,
v0.6.0) all failed at the publish step with:

```
NPM_TOKEN:
bun publish v1.3.14
error: missing authentication (run `bunx npm login`)
```

Two things are missing, both one-time and both owner-only:

1. The `@ripple-ui` scope/org does not exist on npm (the org page 403s, every
   package under it 404s).
2. The `NPM_TOKEN` repo secret is empty, so the workflow authenticates as nobody.

## One-time setup to unblock publishing (owner)

1. **Create the npm org/scope.** On npmjs.com, create an organization named
   `ripple-ui` (this owns the `@ripple-ui` scope). A free org is fine for public
   packages.
2. **Mint an automation token.** npm → Access Tokens → Generate → *Automation*
   (bypasses 2FA in CI). Scope it to publish `@ripple-ui/*`.
3. **Set the repo secret.** In `qbtrix/ripple-iui` → Settings → Secrets and
   variables → Actions → New repository secret, name `NPM_TOKEN`, paste the
   token.
4. **Release.** Push a tag, e.g. `v0.6.1`, or run the `release-manifest` workflow
   with that tag. The publish step now authenticates and pushes to npm.
5. **Verify.** `npm view @ripple-ui/svelte version` returns the tag's version.

## After the first publish

Both hosts (paw-enterprise, pocketpaw) can drop the `file:../ripple` dependency
and pin the npm version, which retires the manual build → reinstall loop. That
host change is a separate follow-up, not part of this setup.
