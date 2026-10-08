<!--
  C4CodeNode.svelte — an expanded code element in semantic zoom: the file card grown into a
  readable panel on the map. A header with the file name, its technology and a New file tag, a
  Before/After switch once the excerpt has a change, and ripple's CodeBlock with the file's own line
  numbers and the changed range tinted (removed before, added after). The panel's size is
  semantic.ts's codePanelSize, so ELK reserves room for the longer side.

  The switch carries `nopan nodrag` and stops its click, so using it never pans the map or picks
  the node; a click anywhere else on the panel is a node click.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { C4NodeData } from '$lib/widgets/c4/index.js';
  import { activateNode } from '../activate.js';
  import CodeBlock from '../../display/CodeBlock.svelte';
  import Segmented from '../../input/Segmented.svelte';
  import { codeView, defaultCodeSide, type CodeSide } from '../semantic.js';

  let { data }: { data: C4NodeData } = $props();

  const code = $derived(data.code ?? { startLine: 1, before: [] });
  /** The side the reader picked; null follows the default (After once there is a change). */
  let picked = $state<CodeSide | null>(null);
  const side = $derived(picked ?? defaultCodeSide(code));
  const view = $derived(codeView(code, side));
  const canSwitch = $derived(!!code.after && code.before.length > 0);
  const isNew = $derived(code.before.length === 0);

  const handleClick = () => activateNode('code', data);
</script>

<Handle type="target" position={Position.Top} class="c4-handle" />
<Handle type="target" position={Position.Left} class="c4-handle" />
<Handle type="source" position={Position.Bottom} class="c4-handle" />
<Handle type="source" position={Position.Right} class="c4-handle" />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="c4-code-node" onclick={handleClick}>
  <div class="c4-code-head">
    <span class="c4-code-name font-mono">{data.name}</span>
    {#if data.technology}<span class="c4-node-tech">{data.technology}</span>{/if}
    {#if isNew}<span class="c4-code-tag">New file</span>{/if}
    {#if canSwitch}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="c4-code-switch nopan nodrag" onclick={(e) => e.stopPropagation()}>
        <Segmented
          size="sm"
          options={['Before', 'After']}
          value={side === 'before' ? 'Before' : 'After'}
          onchange={(v) => (picked = v === 'Before' ? 'before' : 'after')}
        />
      </div>
    {/if}
  </div>

  {#if view.lineCount > 0}
    <CodeBlock
      class="c4-code-body rounded-none bg-transparent ring-0"
      code={view.text}
      language={code.language ?? 'svelte'}
      hideLanguage
      hideCopy
      startLine={view.startLine}
      highlight={view.highlight}
      highlightTone={view.tone}
    />
  {:else}
    <p class="c4-code-empty">Not written yet</p>
  {/if}
</div>

<style>
  .c4-code-node {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid var(--ripple-border);
    background: var(--c4-card, var(--ripple-surface));
    color: var(--ripple-surface-foreground);
    cursor: default;
    animation: c4-panel-in 360ms var(--ripple-ease-out) both;
  }

  .c4-code-head {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    flex-shrink: 0;
    padding: 0 12px 0 14px;
    border-bottom: 1px solid var(--ripple-border);
  }

  .c4-code-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .c4-code-tag {
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
    color: var(--ripple-success-text);
    background: color-mix(in oklab, var(--ripple-success) 12%, transparent);
  }

  .c4-code-switch {
    margin-left: auto;
  }

  .c4-code-node :global(.c4-code-body) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .c4-code-empty {
    margin: auto;
    font-size: 12px;
    color: var(--ripple-muted-foreground);
  }

  @keyframes c4-panel-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .c4-code-node {
      animation: none;
    }
  }
</style>
