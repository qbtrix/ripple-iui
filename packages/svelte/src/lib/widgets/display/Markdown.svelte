<script lang="ts">
  import { marked } from 'marked';
  import { cn } from '$lib/utils.js';
  import { sanitizeHtml } from '$lib/utils/sanitize-html.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Markdown source. */
    content?: string;
    /** Alias for `content`. Some specs author this as `text`. */
    text?: string;
    /** Use GitHub-Flavored Markdown features (tables, strikethrough, autolinks). */
    gfm?: boolean;
  }

  let { id, class: className, style, content, text, gfm = true }: Props = $props();

  const source = $derived(content ?? text ?? '');

  const html = $derived.by(() => {
    if (!source) return '';
    try {
      // Sanitize before {@html}: markdown source is spec-controlled and may be
      // untrusted (LLM-authored), and marked passes raw HTML through by default,
      // so `<img src=x onerror=…>` in the source would otherwise run as XSS.
      return sanitizeHtml(marked.parse(source, { gfm, breaks: true, async: false }) as string);
    } catch (e) {
      console.warn('[ripple/markdown] parse failed:', e);
      return '';
    }
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn(
    'ripple-markdown text-sm leading-relaxed',
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
  {@html html}
</div>
