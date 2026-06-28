// @file widgets/ai/index.ts
// @description NEW (AI-native tier, 2026-06-24). Barrel for the AI-native
//   widgets — the surfaces a generative-UI engine renders to show / gate an
//   agent's work: StreamText (progressive/streaming text), ToolCall
//   (tool-invocation card), ReasoningTrace (collapsible thinking steps), and
//   ApprovalGate (human-in-the-loop approve/deny/diff-review organism — the
//   "human mans the gate" Instinct layer).
export { default as StreamText } from './StreamText.svelte';
export { default as ToolCall } from './ToolCall.svelte';
export { default as ReasoningTrace } from './ReasoningTrace.svelte';
export { default as ApprovalGate } from './ApprovalGate.svelte';
