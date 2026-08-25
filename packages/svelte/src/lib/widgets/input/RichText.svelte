<!-- src/lib/widgets/input/RichText.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import BoldIcon from '@lucide/svelte/icons/bold';
  import ItalicIcon from '@lucide/svelte/icons/italic';
  import StrikethroughIcon from '@lucide/svelte/icons/strikethrough';
  import ListIcon from '@lucide/svelte/icons/list';
  import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
  import QuoteIcon from '@lucide/svelte/icons/quote';
  import CodeIcon from '@lucide/svelte/icons/code';
  import Heading2Icon from '@lucide/svelte/icons/heading-2';
  import Undo2Icon from '@lucide/svelte/icons/undo-2';
  import Redo2Icon from '@lucide/svelte/icons/redo-2';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** HTML string. Bind via `bind: "<state-path>"`. */
    value?: string;
    placeholder?: string;
    /** Hide the toolbar — useful for inline editing. */
    hideToolbar?: boolean;
    minHeight?: string;
    maxHeight?: string;
    onchange?: (html: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '',
    placeholder = 'Write something...',
    hideToolbar = false,
    minHeight = '120px',
    maxHeight = '320px',
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let editorEl = $state<HTMLDivElement | null>(null);
  let editor: any = null;
  let ready = $state(false);
  let _ = $state(0); // tick to force toolbar re-render on selection updates

  onMount(() => {
    let cancelled = false;
    let stopFns: Array<() => void> = [];

    (async () => {
      const [{ Editor }, { default: StarterKit }] = await Promise.all([
        import('@tiptap/core'),
        import('@tiptap/starter-kit')
      ]);
      if (cancelled || !editorEl) return;

      editor = new Editor({
        element: editorEl,
        extensions: [StarterKit],
        content: value || '',
        editorProps: {
          attributes: {
            class:
              'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 ' +
              `min-h-[${minHeight}] [&>*:first-child]:mt-0`,
            style: `min-height:${minHeight}; max-height:${maxHeight}; overflow-y:auto;`
          }
        },
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          onchange?.(html);
        },
        onSelectionUpdate: () => {
          _ = _ + 1;
        },
        onTransaction: () => {
          _ = _ + 1;
        }
      });
      ready = true;
      stopFns.push(() => editor?.destroy());
    })();

    return () => {
      cancelled = true;
      for (const f of stopFns) f();
      editor = null;
    };
  });

  // Sync external value changes (avoid clobbering when value already matches).
  $effect(() => {
    if (!editor || !ready) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  });

  function active(name: string, attrs: Record<string, unknown> = {}): boolean {
    if (!editor) return false;
    void _;
    return editor.isActive(name, attrs);
  }

  function run(fn: (chain: any) => any) {
    if (!editor) return;
    fn(editor.chain().focus()).run();
  }

  type Btn = { id: string; icon: any; title: string; isActive?: () => boolean; onClick: () => void };
  const buttons: Btn[] = $derived([
    { id: 'h2', icon: Heading2Icon, title: 'Heading', isActive: () => active('heading', { level: 2 }), onClick: () => run((c) => c.toggleHeading({ level: 2 })) },
    { id: 'b', icon: BoldIcon, title: 'Bold', isActive: () => active('bold'), onClick: () => run((c) => c.toggleBold()) },
    { id: 'i', icon: ItalicIcon, title: 'Italic', isActive: () => active('italic'), onClick: () => run((c) => c.toggleItalic()) },
    { id: 's', icon: StrikethroughIcon, title: 'Strikethrough', isActive: () => active('strike'), onClick: () => run((c) => c.toggleStrike()) },
    { id: 'ul', icon: ListIcon, title: 'Bullet list', isActive: () => active('bulletList'), onClick: () => run((c) => c.toggleBulletList()) },
    { id: 'ol', icon: ListOrderedIcon, title: 'Numbered list', isActive: () => active('orderedList'), onClick: () => run((c) => c.toggleOrderedList()) },
    { id: 'q', icon: QuoteIcon, title: 'Quote', isActive: () => active('blockquote'), onClick: () => run((c) => c.toggleBlockquote()) },
    { id: 'code', icon: CodeIcon, title: 'Inline code', isActive: () => active('code'), onClick: () => run((c) => c.toggleCode()) },
    { id: 'u', icon: Undo2Icon, title: 'Undo', onClick: () => run((c) => c.undo()) },
    { id: 'r', icon: Redo2Icon, title: 'Redo', onClick: () => run((c) => c.redo()) }
  ]);
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}

  <div
    {id}
    class="rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]"
  >
    {#if !hideToolbar}
      <div class="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-1 py-1">
        {#each buttons as btn (btn.id)}
          {@const isOn = btn.isActive?.() ?? false}
          <button
            type="button"
            title={btn.title}
            aria-label={btn.title}
            aria-pressed={isOn}
            disabled={!ready}
            onmousedown={(e) => e.preventDefault()}
            onclick={btn.onClick}
            class={cn(
              'h-7 w-7 grid place-items-center rounded transition-colors',
              isOn ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              !ready && 'opacity-40 cursor-not-allowed'
            )}
          >
            <btn.icon size={14} />
          </button>
        {/each}
      </div>
    {/if}

    <div bind:this={editorEl} class="text-sm" data-placeholder={placeholder}></div>
  </div>
</div>

<style>
  /* Show placeholder text via attribute when the editor is empty. */
  :global(.tiptap.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--muted-foreground);
    pointer-events: none;
    height: 0;
  }
</style>
