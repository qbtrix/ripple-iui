/**
 * @file event-handler.ts
 * @description Defines event handler types for widget interactions.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with set, api, navigate, toast, emit, and open actions
 */
import { z } from 'zod';
/**
 * Supported event handler actions.
 *
 * - set: Update a state value
 * - api: Make an API call
 * - navigate: Navigate to a URL
 * - toast: Show a toast notification
 * - emit: Emit a custom event to parent
 * - open: Open a modal/dialog
 */
export const EventAction = z.enum(['set', 'api', 'navigate', 'toast', 'emit', 'open', 'pin', 'unpin']);
/**
 * Event handler specification.
 * Defines what happens when a widget event fires.
 */
export const EventHandler = z.object({
    /** The action to perform */
    action: EventAction,
    /** Target for the action (state path for 'set', event name for 'emit') */
    target: z.string().optional(),
    /** Value to set or pass */
    value: z.any().optional(),
    /** URL for 'api' or 'navigate' actions */
    url: z.string().optional(),
    /** HTTP method for 'api' action */
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    /** Request body for 'api' action */
    body: z.record(z.string(), z.any()).optional(),
    /** Headers for 'api' action */
    headers: z.record(z.string(), z.string()).optional(),
    /** Toast message for 'toast' action */
    message: z.string().optional(),
    /** Toast variant for 'toast' action */
    variant: z.enum(['default', 'success', 'error', 'warning', 'info']).optional()
});
/**
 * Multiple event handlers can be chained.
 * Example: On click, set state AND show toast.
 */
export const EventHandlerOrArray = z.union([EventHandler, z.array(EventHandler)]);
