<!-- src/lib/widgets/input/CodeEditor.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  type Lang = 'javascript' | 'typescript' | 'json' | 'html' | 'text';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Source string. Bind via `bind: "<state-path>"`. */
    value?: string;
    language?: Lang;
    height?: string;
    readonly?: boolean;
    placeholder?: string;
    onchange?: (value: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '',
    language = 'javascript',
    height = '240px',
    readonly = false,
    placeholder,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let containerEl = $state<HTMLDivElement | null>(null);
  let view: any = null;
  let ready = $state(false);

  async function loadLanguage(lang: Lang) {
    if (lang === 'javascript' || lang === 'typescript') {
      const mod = await import('@codemirror/lang-javascript');
      return mod.javascript({ typescript: lang === 'typescript' });
    }
    if (lang === 'json') {
      const mod = await import('@codemirror/lang-json');
      return mod.json();
    }
    if (lang === 'html') {
      const mod = await import('@codemirror/lang-html');
      return mod.html();
    }
    return [];
  }

  onMount(() => {
    let cancelled = false;

    (async () => {
      const [{ EditorView, basicSetup }, { EditorState }, langExt] = await Promise.all([
        import('codemirror'),
        import('@codemirror/state'),
        loadLanguage(language)
      ]);
      if (cancelled || !containerEl) return;

      const updateListener = EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const next = u.state.doc.toString();
          onchange?.(next);
        }
      });

      view = new EditorView({
        parent: containerEl,
        state: EditorState.create({
          doc: value || '',
          extensions: [
            basicSetup,
            langExt,
            EditorView.editable.of(!readonly),
            EditorState.readOnly.of(readonly),
            EditorView.theme({
              '&': { fontSize: '13px', height: '100%' },
              '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' },
              '.cm-content': { padding: '8px 0' }
            }),
            updateListener
          ]
        })
      });
      ready = true;
    })();

    return () => {
      cancelled = true;
      view?.destroy();
      view = null;
    };
  });

  // Sync external value changes (avoid clobbering during typing).
  $effect(() => {
    if (!view || !ready) return;
    const current = view.state.doc.toString();
    if (value !== current && value !== undefined) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value || '' }
      });
    }
  });
</script>

<div class={cn('flex flex-col gap-1.5', className)} style={styleString}>
  {#if label}
    <label class="text-sm font-medium" for={id}>{label}</label>
  {/if}
  <div
    {id}
    bind:this={containerEl}
    class="rounded-md border border-input bg-ripple-input shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]"
    style={`height: ${height}`}
    aria-label={placeholder ?? 'Code editor'}
  ></div>
</div>
