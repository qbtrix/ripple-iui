// @file widgets/ai/index.ts
// @description NEW (AI-native tier, 2026-06-24). Barrel for the AI-native
//   display widgets — the read-only surfaces a generative-UI engine renders to
//   show an agent's work: StreamText (progressive/streaming text), ToolCall
//   (tool-invocation card), ReasoningTrace (collapsible thinking steps).
export { default as StreamText } from './StreamText.svelte';
export { default as ToolCall } from './ToolCall.svelte';
export { default as ReasoningTrace } from './ReasoningTrace.svelte';
