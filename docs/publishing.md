<!-- docs/publishing.md — how @ripple-ui/svelte gets to npm, and the one-time
     setup that unblocks it. Created 2026-07-08 (RCR-2). Updated (review): the
     workflow publishes the package.json version verbatim (no tag→version
     sync), so the release steps now include the manual bump; token guidance
     switched to granular access tokens; provenance status noted. -->
# Publishing `@ripple-ui/svelte`

## How a release works

Tagging `v*` (or running the `release-manifest` workflow by hand) triggers
`.github/workflows/release-manifest.yml`, which builds the library, publishes to
npm with `bun publish --access public`, and attaches the manifest bundle to a
GitHub release.

**The workflow publishes whatever version `package.json` declares — it does not
derive the version from the tag.** Tags on this repo already run ahead of the
`version` field (tags to `v0.6.0`, `package.json` at `0.5.0`), so every release
starts with a version bump (step 4 below). Skipping it publishes the stale
version, and the *next* attempt then fails with `EPUBLISHCONFLICT` because npm
refuses to publish over an existing version.

The package metadata is otherwise publish-ready: `license`,
`publishConfig.access: public`, a `LICENSE` file, a `files` allowlist (`dist`,
minus test files), and the npm listing metadata (`description`, `repository`,
`keywords`, `homepage`, `bugs`) are all in `package.json`. `bun publish
--dry-run` packs the intended 1309-file `dist` tree cleanly.

Provenance is not enabled: `bun publish` doesn't support npm provenance /
OIDC trusted publishing. Revisit if the publish step ever switches to the npm
CLI (`--provenance` + `id-token: write`).

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
2. **Mint a granular access token.** npm → Access Tokens → Generate New Token →
   *Granular Access Token*: packages-and-scopes permission **Read and write**,
   scoped to the `@ripple-ui` scope only, expiry set, and "Bypass 2FA" enabled
   so CI can publish. (Don't use a classic *Automation* token — those are
   account-wide and can't be scoped to a package or org.)
3. **Set the repo secret.** In `qbtrix/ripple-iui` → Settings → Secrets and
   variables → Actions → New repository secret, name `NPM_TOKEN`, paste the
   token.
4. **Bump the version.** Set `version` in `package.json` to the release version
   and commit — the workflow publishes this field verbatim (see "How a release
   works" above).
5. **Release.** Push the matching tag, e.g. `v0.6.1`, or run the
   `release-manifest` workflow with that tag. The publish step now
   authenticates and pushes to npm.
6. **Verify.** `npm view @ripple-ui/svelte version` returns the version from
   step 4.

## After the first publish

Both hosts (paw-enterprise, pocketpaw) can drop the `file:../ripple` dependency
and pin the npm version, which retires the manual build → reinstall loop. That
host change is a separate follow-up, not part of this setup.
