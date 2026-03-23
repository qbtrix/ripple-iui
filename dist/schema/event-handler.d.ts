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
export declare const EventAction: z.ZodEnum<{
    set: "set";
    api: "api";
    navigate: "navigate";
    toast: "toast";
    emit: "emit";
    open: "open";
    pin: "pin";
    unpin: "unpin";
}>;
export type EventAction = z.infer<typeof EventAction>;
/**
 * Event handler specification.
 * Defines what happens when a widget event fires.
 */
export declare const EventHandler: z.ZodObject<{
    action: z.ZodEnum<{
        set: "set";
        api: "api";
        navigate: "navigate";
        toast: "toast";
        emit: "emit";
        open: "open";
        pin: "pin";
        unpin: "unpin";
    }>;
    target: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        GET: "GET";
        POST: "POST";
        PUT: "PUT";
        DELETE: "DELETE";
        PATCH: "PATCH";
    }>>;
    body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    message: z.ZodOptional<z.ZodString>;
    variant: z.ZodOptional<z.ZodEnum<{
        success: "success";
        default: "default";
        error: "error";
        warning: "warning";
        info: "info";
    }>>;
}, z.core.$strip>;
export type EventHandler = z.infer<typeof EventHandler>;
/**
 * Multiple event handlers can be chained.
 * Example: On click, set state AND show toast.
 */
export declare const EventHandlerOrArray: z.ZodUnion<readonly [z.ZodObject<{
    action: z.ZodEnum<{
        set: "set";
        api: "api";
        navigate: "navigate";
        toast: "toast";
        emit: "emit";
        open: "open";
        pin: "pin";
        unpin: "unpin";
    }>;
    target: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        GET: "GET";
        POST: "POST";
        PUT: "PUT";
        DELETE: "DELETE";
        PATCH: "PATCH";
    }>>;
    body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    message: z.ZodOptional<z.ZodString>;
    variant: z.ZodOptional<z.ZodEnum<{
        success: "success";
        default: "default";
        error: "error";
        warning: "warning";
        info: "info";
    }>>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    action: z.ZodEnum<{
        set: "set";
        api: "api";
        navigate: "navigate";
        toast: "toast";
        emit: "emit";
        open: "open";
        pin: "pin";
        unpin: "unpin";
    }>;
    target: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodEnum<{
        GET: "GET";
        POST: "POST";
        PUT: "PUT";
        DELETE: "DELETE";
        PATCH: "PATCH";
    }>>;
    body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    message: z.ZodOptional<z.ZodString>;
    variant: z.ZodOptional<z.ZodEnum<{
        success: "success";
        default: "default";
        error: "error";
        warning: "warning";
        info: "info";
    }>>;
}, z.core.$strip>>]>;
export type EventHandlerOrArray = z.infer<typeof EventHandlerOrArray>;
