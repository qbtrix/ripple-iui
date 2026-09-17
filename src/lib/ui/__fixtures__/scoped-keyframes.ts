// @file ui/__fixtures__/scoped-keyframes.ts
// @description NEW 2026-09-17. Test-only helper, shared by the scoped-keyframes
//   repo guard (ui/scoped-keyframes.test.ts) and the render checks in
//   AnswerBlock.test.ts and ai.test.ts. It lives under __fixtures__ because
//   package.json keeps that out of the published files, and it imports
//   svelte/compiler, which a shipped module must not. (It started outside
//   src/lib, but svelte-package then wrote a stray .d.ts beside it on every
//   build.)
//
// The bug class it names: Svelte scopes every @keyframes declared in a
// component's style block, renaming it to a hashed name, and rewrites the
// references it can see inside that same stylesheet. An animation named from an
// inline style (a style: directive, a style attribute, a custom property fed to
// var()) is outside that rewrite, keeps the bare name, and points at a keyframe
// that does not exist. The browser drops the animation without a warning.
import { compile, parse } from 'svelte/compiler';

/**
 * The keyframes `source` declares that compile under a hashed name and that
 * `inline` still names bare, as a whole word. An empty array means every inline
 * style in `inline` is safe.
 */
export function danglingKeyframes(source: string, inline: string): string[] {
  const styles = parse(source, { modern: true }).css?.content.styles ?? '';
  const compiled = compile(source, { filename: 'Component.svelte', css: 'external' }).css?.code ?? '';
  // Prefix-agnostic: a name is scoped when it does not survive into the
  // compiled CSS as itself, whatever hash Svelte put in front of it.
  const word = (name: string) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
  return [...styles.matchAll(/@keyframes\s+([\w-]+)/g)]
    .map((m) => m[1])
    .filter((name) => !new RegExp(`@keyframes\\s+${name}(?![\\w-])`).test(compiled))
    .filter((name) => word(name).test(inline));
}
