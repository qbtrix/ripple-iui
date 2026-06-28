/**
 * @file version.ts
 * @description Single source of truth for the Ripple library version, as a
 *   plain TS constant. The manifest used to read this via
 *   `import pkg from '../../../package.json'`, but the manifest is a CLIENT
 *   module (the visual editor is its first browser consumer), and pulling the
 *   project-root package.json into the client path trips Vite's
 *   `server.fs.allow` guard and 500s `vite dev` (most visible in a worktree
 *   checkout). A plain constant works in BOTH places the version is needed: the
 *   browser bundle AND the out-of-Vite bun build script
 *   (scripts/build-manifest.ts) — unlike a Vite `define`, which would be
 *   undefined under bun. version.test.ts asserts this stays in lockstep with
 *   package.json so a release bump can't silently drift.
 * @created 2026-06-28 (SP-1c-b — feat/ripple-editor-sp1cb)
 */

export const RIPPLE_VERSION = '0.5.0';
