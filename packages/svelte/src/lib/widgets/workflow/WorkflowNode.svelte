<!--
  WorkflowNode.svelte — Custom node component for SvelteFlow.
  Renders trigger, action, condition, approval, connector, and output node types
  with type-specific colors, status indicators, and connection handles.
  Condition nodes get two output handles (yes/no).
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  let { data, id }: { data: Record<string, unknown>; id?: string } = $props();

  const TYPE_CONFIG: Record<string, { color: string; bg: string; borderColor: string; icon: string }> = {
    trigger:   { color: '#0A84FF', bg: 'rgba(10,132,255,0.12)',  borderColor: 'rgba(10,132,255,0.30)', icon: '⚡' },
    action:    { color: '#34C759', bg: 'rgba(52,199,89,0.12)',   borderColor: 'rgba(52,199,89,0.30)',  icon: '▶' },
    condition: { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)',  borderColor: 'rgba(255,159,10,0.30)', icon: '◆' },
    approval:  { color: '#FFD60A', bg: 'rgba(255,214,10,0.12)',  borderColor: 'rgba(255,214,10,0.30)', icon: '✓' },
    connector: { color: '#BF5AF2', bg: 'rgba(191,90,242,0.12)',  borderColor: 'rgba(191,90,242,0.30)', icon: '⟷' },
    output:    { color: '#64D2FF', bg: 'rgba(100,210,255,0.12)', borderColor: 'rgba(100,210,255,0.30)', icon: '◎' },
  };

  const STATUS_COLORS: Record<string, string> = {
    idle:    '#6B7280',
    running: '#F59E0B',
    success: '#22C55E',
    error:   '#EF4444',
    waiting: '#8B5CF6',
  };

  const nodeType = $derived((data.nodeType as string) ?? 'action');
  const config = $derived(TYPE_CONFIG[nodeType] ?? TYPE_CONFIG.action);
  const label = $derived((data.label as string) ?? '');
  const status = $derived((data.status as string) ?? 'idle');
  const statusColor = $derived(STATUS_COLORS[status] ?? STATUS_COLORS.idle);
  const icon = $derived((data.icon as string) ?? config.icon);
  const isCondition = $derived(nodeType === 'condition');
</script>

<div
  class="workflow-node"
  style="
    background: {config.bg};
    border: 1px solid {config.borderColor};
    --node-color: {config.color};
  "
>
  <!-- Input handle (left) — all nodes except triggers -->
  {#if nodeType !== 'trigger'}
    <Handle type="target" position={Position.Left} class="wf-handle" />
  {/if}

  <div class="node-content">
    <span class="node-icon" style="color: {config.color}">{icon}</span>
    <span class="node-label">{label}</span>
    <span class="node-status" style="background: {statusColor}" title={status}></span>
  </div>

  <!-- Output handles -->
  {#if isCondition}
    <!-- Two output handles for yes/no -->
    <Handle
      type="source"
      position={Position.Right}
      id="yes"
      class="wf-handle wf-handle-yes"
      style="top: 30%"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="no"
      class="wf-handle wf-handle-no"
      style="top: 70%"
    />
    <span class="condition-label condition-yes" style="top: 30%">yes</span>
    <span class="condition-label condition-no" style="top: 70%">no</span>
  {:else if nodeType !== 'output'}
    <Handle type="source" position={Position.Right} class="wf-handle" />
  {/if}
</div>

<style>
  .workflow-node {
    display: flex;
    align-items: center;
    min-width: 160px;
    min-height: 56px;
    border-radius: 10px;
    padding: 10px 14px;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: grab;
    transition: box-shadow 0.15s ease;
  }

  .workflow-node:hover {
    box-shadow: 0 0 0 1px var(--node-color, rgba(255,255,255,0.2));
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .node-icon {
    font-size: 14px;
    flex-shrink: 0;
    width: 20px;
    text-align: center;
    line-height: 1;
  }

  .node-label {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .node-status {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .condition-label {
    position: absolute;
    right: -28px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .condition-yes {
    color: #34C759;
  }

  .condition-no {
    color: #EF4444;
  }

  /* Handle styling via global since @xyflow controls the handle elements */
  :global(.wf-handle) {
    width: 8px !important;
    height: 8px !important;
    background: rgba(255, 255, 255, 0.25) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.45) !important;
    border-radius: 50% !important;
  }

  :global(.wf-handle:hover) {
    background: rgba(255, 255, 255, 0.5) !important;
  }
</style>
