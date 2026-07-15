<!--
  @file widgets/display/RichTextDisplay.svelte
  @description DISPLAY widget that renders a trusted rich-HTML string (e.g. the
    structural HTML TipTap StarterKit emits) via `{@html}`, wrapped in the same
    prose Tailwind classes Markdown.svelte uses. This is the read/render half of
    the editor's rich-text inline edit (PIECE 1): the inline editor mounts a
    TipTap editor ON this element to author the `html` prop, and this component
    paints the committed result.

    HTML posture: matches Markdown.svelte — the `html` is DOMPurify-sanitized
    (HTML profile) before `{@html}`, because spec content can be LLM-authored and
    untrusted. StarterKit's structural output (p / strong / em / lists / headings /
    blockquote / code) survives the profile unchanged; scripts / on* handlers /
    javascript: URIs are stripped. See utils/sanitize-html.ts.

    The `{@html html}` is the SOLE child of the id-bearing div on purpose: Svelte 5
    compiles a lone `{@html}` to the `is_controlled` path (`element.innerHTML = value`),
    which (a) lets the inline editor clear/replace the element while TipTap is mounted
    and (b) repaints correctly on the next `html` prop change. Do not add sibling
    nodes inside this div or that optimization is lost.
  @created 2026-06-30 (editor chrome PIECE 1 — TipTap rich-HTML inline editing)
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { sanitizeHtml } from '$lib/utils/sanitize-html.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Rich HTML to render (e.g. TipTap StarterKit output). Spec-controlled and
     *  possibly LLM-authored, so it is sanitized before {@html}. */
    html?: string;
  }

  let { id, class: className, style, html = '' }: Props = $props();

  // Sanitize before {@html}. Structural TipTap/StarterKit markup survives the
  // HTML profile; scripts / on* handlers / javascript: URIs are stripped. Still a
  // lone {@html} expression, so Svelte's is_controlled (element.innerHTML) path —
  // which the inline editor relies on — is preserved.
  const safeHtml = $derived(sanitizeHtml(html));

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn(
    'ripple-richtext text-sm leading-relaxed',
    '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2',
    '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2',
    '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
    '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2',
    '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
    '[&_li]:my-1',
    '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80',
    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]',
    '[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-3',
    '[&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_pre>code]:text-[0.85em]',
    '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
    '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3',
    '[&_th]:border-b [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold',
    '[&_td]:border-b [&_td]:border-border/50 [&_td]:p-2',
    '[&_hr]:my-4 [&_hr]:border-border',
    className
  )}
  style={styleString}
>
  {@html safeHtml}
</div>
