<!--
  @file WizardLayout.svelte
  @description Multi-step form wizard. Renders a step indicator at the top and
  a sticky back/next/cancel bar at the bottom; the content for the active step
  is rendered by the children snippet (author uses `if` / `each` against
  `state.currentStep` to switch panels). On the final step the next button
  switches to `finishLabel` and runs `finishActions`.
-->
<script lang="ts">
    import type { Snippet } from "svelte";
    import { getContext } from "svelte";
    import { cn } from "$lib/utils.js";
    import Icon from "$lib/widgets/display/Icon.svelte";
    import type {
        EventHandler,
        EventHandlerOrArray,
    } from "$lib/schema/event-handler.js";
    import type { EventDispatcher } from "$lib/core/event-dispatcher.js";
    import type { StateManager } from "$lib/core/state-manager.svelte.js";

    interface Step {
        id: string;
        label: string;
        description?: string;
        icon?: string;
        /** If false, blocks the next button from advancing past this step. */
        valid?: boolean;
        /** Marks the step as skippable. */
        optional?: boolean;
    }

    interface Props {
        id?: string;
        class?: string;
        style?: Record<string, string>;
        title?: string;
        description?: string;
        steps?: Step[];
        /** ID of the active step. Two-way bindable. */
        currentStep?: string;
        orientation?: "horizontal" | "vertical";
        nextLabel?: string;
        backLabel?: string;
        finishLabel?: string;
        cancelLabel?: string;
        showCancel?: boolean;
        /** Allow clicking already-visited steps to jump back. Default true. */
        allowJumpBack?: boolean;
        nextActions?: EventHandlerOrArray;
        backActions?: EventHandlerOrArray;
        finishActions?: EventHandlerOrArray;
        cancelActions?: EventHandlerOrArray;
        children?: Snippet;
        hasChildren?: boolean;
        onnext?: () => void;
        onback?: () => void;
        onfinish?: () => void;
        oncancel?: () => void;
        onstepchange?: (id: string) => void;
    }

    let {
        id,
        class: className,
        style,
        title,
        description,
        steps = [],
        currentStep = $bindable(),
        orientation = "horizontal",
        nextLabel = "Next",
        backLabel = "Back",
        finishLabel = "Submit",
        cancelLabel = "Cancel",
        showCancel = true,
        allowJumpBack = true,
        nextActions,
        backActions,
        finishActions,
        cancelActions,
        children,
        hasChildren = false,
        onnext,
        onback,
        onfinish,
        oncancel,
        onstepchange,
    }: Props = $props();

    const styleString = $derived(
        style
            ? Object.entries(style)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(";")
            : undefined,
    );

    const eventDispatcher = getContext<EventDispatcher | undefined>(
        "ui-events",
    );
    const stateManager = getContext<StateManager | undefined>("ui-state");

    $effect(() => {
        if (
            steps.length > 0 &&
            (currentStep === undefined ||
                !steps.some((s) => s.id === currentStep))
        ) {
            currentStep = steps[0].id;
        }
    });

    const currentIdx = $derived(
        Math.max(
            0,
            steps.findIndex((s) => s.id === currentStep),
        ),
    );
    const isFirst = $derived(currentIdx <= 0);
    const isLast = $derived(currentIdx >= steps.length - 1);
    const currentValid = $derived(steps[currentIdx]?.valid !== false);

    function fire(
        handler: EventHandlerOrArray | undefined,
        fallback?: () => void,
    ) {
        if (handler && eventDispatcher) {
            const handlers = Array.isArray(handler) ? handler : [handler];
            void eventDispatcher.dispatch(handlers as EventHandler[], {
                state: stateManager?.state ?? {},
            });
            return;
        }
        fallback?.();
    }

    function goTo(idx: number) {
        if (idx < 0 || idx >= steps.length) return;
        const target = steps[idx].id;
        if (target === currentStep) return;
        currentStep = target;
        onstepchange?.(target);
    }

    function handleNext() {
        if (!currentValid) return;
        if (isLast) {
            fire(finishActions, onfinish);
        } else {
            fire(nextActions, onnext);
            goTo(currentIdx + 1);
        }
    }
    function handleBack() {
        if (isFirst) return;
        fire(backActions, onback);
        goTo(currentIdx - 1);
    }
    function handleCancel() {
        fire(cancelActions, oncancel);
    }
    function handleStepClick(idx: number) {
        if (!allowJumpBack) return;
        if (idx <= currentIdx) goTo(idx);
    }
</script>

<div
    {id}
    class={cn(
        "rwizard",
        orientation === "vertical" && "rwizard-vertical",
        className,
    )}
    style={styleString}
>
    {#if title || description}
        <header class="rwizard-header">
            {#if title}<h2 class="rwizard-title">{title}</h2>{/if}
            {#if description}<p class="rwizard-description">
                    {description}
                </p>{/if}
        </header>
    {/if}

    {#if steps.length > 0}
        <ol
            class={cn(
                "rwizard-steps",
                orientation === "vertical"
                    ? "rwizard-steps-vertical"
                    : "rwizard-steps-horizontal",
            )}
        >
            {#each steps as s, i}
                {@const status =
                    i < currentIdx
                        ? "done"
                        : i === currentIdx
                          ? "active"
                          : "pending"}
                <li class={cn("rwizard-step", `rwizard-step-${status}`)}>
                    <button
                        type="button"
                        class="rwizard-step-btn"
                        disabled={!allowJumpBack || i > currentIdx}
                        onclick={() => handleStepClick(i)}
                    >
                        <span class="rwizard-step-pip">
                            {#if status === "done"}
                                <Icon name="check" size={14} color="white" />
                            {:else}
                                <span class="rwizard-step-num">{i + 1}</span>
                            {/if}
                        </span>
                        <span class="rwizard-step-text">
                            <span class="rwizard-step-label">
                                {s.label}
                                {#if s.optional}<span
                                        class="rwizard-step-optional"
                                        >Optional</span
                                    >{/if}
                            </span>
                            {#if s.description}<span class="rwizard-step-desc"
                                    >{s.description}</span
                                >{/if}
                        </span>
                    </button>
                    {#if i < steps.length - 1}
                        <span class="rwizard-step-line"></span>
                    {/if}
                </li>
            {/each}
        </ol>
    {/if}

    <div class="rwizard-content">
        {#if hasChildren && children}
            {@render children()}
        {/if}
    </div>

    <div class="rwizard-bar">
        <div>
            {#if showCancel}
                <button
                    type="button"
                    class="rwizard-btn rwizard-btn-ghost"
                    onclick={handleCancel}
                >
                    {cancelLabel}
                </button>
            {/if}
        </div>
        <div class="rwizard-bar-meta">
            <span class="rwizard-bar-pos"
                >Step {currentIdx + 1} of {steps.length || 1}</span
            >
        </div>
        <div class="rwizard-bar-actions">
            <button
                type="button"
                class="rwizard-btn rwizard-btn-outline"
                onclick={handleBack}
                disabled={isFirst}
            >
                <Icon name="arrow-left" size={14} />
                <span>{backLabel}</span>
            </button>
            <button
                type="button"
                class="rwizard-btn rwizard-btn-primary"
                onclick={handleNext}
                disabled={!currentValid}
            >
                <span>{isLast ? finishLabel : nextLabel}</span>
                {#if !isLast}
                    <Icon name="arrow-right" size={14} />
                {:else}
                    <Icon name="check" size={14} />
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    .rwizard {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }
    .rwizard-header {
        border-bottom: 1px solid var(--border);
        padding-bottom: 12px;
    }
    .rwizard-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
    }
    .rwizard-description {
        font-size: 13px;
        color: var(--muted-foreground);
        margin: 4px 0 0;
    }

    .rwizard-steps {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .rwizard-steps-horizontal {
        display: flex;
        align-items: stretch;
        gap: 0;
        overflow-x: auto;
    }
    .rwizard-steps-vertical {
        display: flex;
        flex-direction: column;
    }
    .rwizard-step {
        position: relative;
        display: flex;
        flex: 1;
        min-width: 0;
    }
    .rwizard-steps-horizontal .rwizard-step {
        flex-direction: column;
        align-items: stretch;
        min-width: 120px;
    }
    .rwizard-steps-vertical .rwizard-step {
        flex: 0 0 auto;
    }
    .rwizard-step-btn {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: transparent;
        border: 0;
        padding: 4px 8px 8px;
        cursor: pointer;
        text-align: left;
        flex: 1;
        min-width: 0;
        color: var(--muted-foreground);
    }
    .rwizard-steps-horizontal .rwizard-step-btn {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        padding: 0 8px 4px;
        width: 100%;
        position: relative;
        z-index: 1;
    }
    .rwizard-step-btn:disabled {
        cursor: default;
    }
    .rwizard-step-pip {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--muted);
        color: var(--muted-foreground);
        border: 2px solid var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
        transition: all 0.18s ease;
    }
    .rwizard-step-active .rwizard-step-pip {
        background: oklch(0.55 0.18 250);
        color: white;
        border-color: oklch(0.55 0.18 250);
        box-shadow: 0 0 0 4px
            color-mix(in oklab, oklch(0.55 0.18 250) 18%, transparent);
    }
    .rwizard-step-done .rwizard-step-pip {
        background: oklch(0.55 0.18 250);
        border-color: oklch(0.55 0.18 250);
        color: white;
    }
    .rwizard-step-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }
    .rwizard-steps-horizontal .rwizard-step-text {
        align-items: center;
    }
    .rwizard-step-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--foreground);
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .rwizard-steps-horizontal .rwizard-step-label {
        justify-content: center;
    }
    .rwizard-step-pending .rwizard-step-label {
        color: var(--muted-foreground);
    }
    .rwizard-step-optional {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted-foreground);
        background: var(--muted);
        padding: 1px 6px;
        border-radius: 999px;
    }
    .rwizard-step-desc {
        font-size: 11px;
        color: var(--muted-foreground);
        line-height: 1.4;
    }
    .rwizard-step-line {
        flex-shrink: 0;
        background: var(--border);
    }
    .rwizard-steps-horizontal .rwizard-step-line {
        position: absolute;
        top: 13px;
        left: calc(50% + 18px);
        right: calc(-50% + 18px);
        height: 2px;
    }
    .rwizard-step-done + .rwizard-step .rwizard-step-line,
    .rwizard-step-done .rwizard-step-line {
        background: oklch(0.55 0.18 250);
    }
    .rwizard-steps-vertical .rwizard-step-line {
        position: absolute;
        width: 2px;
        height: calc(100% - 24px);
        top: 28px;
        left: 21px;
    }

    .rwizard-content {
        min-height: 80px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .rwizard-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--card);
        position: sticky;
        bottom: 8px;
        z-index: 10;
        backdrop-filter: blur(12px);
    }
    .rwizard-bar-meta {
        color: var(--muted-foreground);
        font-size: 12px;
    }
    .rwizard-bar-actions {
        display: flex;
        gap: 8px;
    }
    .rwizard-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 34px;
        padding: 0 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: 0;
        transition:
            background 0.15s,
            opacity 0.15s,
            border-color 0.15s;
    }
    .rwizard-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
    .rwizard-btn-ghost {
        background: transparent;
        color: var(--foreground);
    }
    .rwizard-btn-ghost:hover:not(:disabled) {
        background: var(--muted);
    }
    .rwizard-btn-outline {
        background: transparent;
        color: var(--foreground);
        border: 1px solid var(--border);
    }
    .rwizard-btn-outline:hover:not(:disabled) {
        background: var(--muted);
    }
    .rwizard-btn-primary {
        background: oklch(0.55 0.18 250);
        color: white;
    }
    .rwizard-btn-primary:hover:not(:disabled) {
        background: oklch(0.5 0.18 250);
    }
</style>
