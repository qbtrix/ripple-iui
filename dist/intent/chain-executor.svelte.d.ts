import type { UniversalSpec } from '../schema/universal-spec.js';
/**
 * State snapshot for chain navigation
 */
export interface ChainState {
    selected: unknown;
    formData: Record<string, unknown>;
    /** Human-readable label for breadcrumb display */
    displayLabel?: string;
}
/**
 * History entry with both spec and state
 */
interface HistoryEntry {
    spec: UniversalSpec;
    state: ChainState;
}
/**
 * Manages client-side intent chaining and navigation history.
 * Allows instant transitions between steps without AI roundtrips.
 *
 * V4: Adds forward navigation (browser-like history) and display labels.
 */
export declare class ChainExecutor {
    private _history;
    private _forwardStack;
    private _context;
    private _quizScore;
    /**
     * Initialize with the root spec
     */
    constructor(rootSpec?: UniversalSpec);
    /**
     * Get history (reactive)
     */
    get history(): HistoryEntry[];
    /**
     * Get context (reactive)
     */
    get context(): Record<string, unknown>;
    /**
     * Set context (for external updates)
     */
    set context(value: Record<string, unknown>);
    /**
     * Get the current active spec
     */
    get currentSpec(): UniversalSpec | null;
    /**
     * Get the current state
     */
    get currentState(): ChainState | null;
    /**
     * Check if back navigation is possible (reactive!)
     */
    get canGoBack(): boolean;
    /**
     * Get history length for UI display
     */
    get historyLength(): number;
    /**
     * Check if forward navigation is possible (reactive!)
     */
    get canGoForward(): boolean;
    /**
     * Get forward stack length for UI display
     */
    get forwardStackLength(): number;
    /**
     * Check if current spec has a chain (more steps to come)
     */
    get hasNextChain(): boolean;
    /**
     * Estimate total steps by walking the chain structure
     * Returns undefined if unknown (dynamic chain_map)
     */
    get estimatedTotalSteps(): number | undefined;
    /**
     * Get quiz score (reactive)
     */
    get quizScore(): {
        correct: number;
        wrong: number;
        answers: boolean[];
    };
    /**
     * Record a quiz answer (updates score)
     */
    recordQuizAnswer(isCorrect: boolean): void;
    /**
     * Reset quiz score (call when starting new quiz)
     */
    resetQuizScore(): void;
    /**
     * Advance to the next step in the chain based on selection
     * Returns the next spec if found locally, or null if we need to emit to AI
     *
     * @param selection - Current selection (item or array of items)
     * @param formData - Current form data
     * @param idField - Custom ID field name (from fields mapping)
     */
    advance(selection: unknown, formData?: Record<string, unknown>, idField?: string): UniversalSpec | null;
    /**
     * Go back one step in history (pushes current to forward stack)
     */
    back(): {
        spec: UniversalSpec;
        state: ChainState;
    } | null;
    /**
     * Go forward one step (pops from forward stack)
     */
    forward(): {
        spec: UniversalSpec;
        state: ChainState;
    } | null;
    /**
     * Reset history with a new root spec
     */
    reset(spec: UniversalSpec): void;
    /**
     * Update the state of the current history entry
     */
    updateCurrentState(selected: unknown, formData: Record<string, unknown>): void;
    /**
     * Get all accumulated context (for confirmation step)
     */
    getAccumulatedContext(): Record<string, unknown>;
    /**
     * Push a new spec onto the history stack
     */
    private push;
    /**
     * Generate a unique context key for a spec
     */
    private getContextKey;
    /**
     * Helper to extract a string key from selection for chain_map lookup
     */
    private getSelectionKey;
}
export {};
