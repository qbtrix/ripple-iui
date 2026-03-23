import type { EventHandlerOrArray } from '../schema/event-handler.js';
import type { StateManager } from './state-manager.svelte.js';
import { type ResolverContext } from './expression-resolver.js';
import type { RippleEvent } from '../types.js';
export type OnEventCallback = (event: RippleEvent) => void;
export declare class EventDispatcher {
    private stateManager;
    private onEvent?;
    constructor(stateManager: StateManager, onEvent?: OnEventCallback | undefined);
    dispatch(handler: EventHandlerOrArray, context: ResolverContext, eventValue?: unknown): Promise<void>;
    private dispatchSingle;
    private handleSet;
    private handleOpen;
    private emitExternal;
}
export declare function createEventDispatcher(stateManager: StateManager, onEvent?: OnEventCallback): EventDispatcher;
