/**
 * @file universal-spec.ts
 * @description Universal Spec schema (Gen 2) - The unified specification for all UI intents.
 * Supports Intents, Lifecycles, and Composability.
 */
import { z } from 'zod';
import { UINode, ThemeOverrides, DataFetcher } from './ui-spec.js';
export declare const IntentType: z.ZodEnum<{
    action: "action";
    custom: "custom";
    info: "info";
    search: "search";
    browse: "browse";
    select: "select";
    detail: "detail";
    form: "form";
    confirm: "confirm";
    workspace: "workspace";
    dashboard: "dashboard";
}>;
export type IntentType = z.infer<typeof IntentType>;
export declare const LifecycleType: z.ZodEnum<{
    ephemeral: "ephemeral";
    tool: "tool";
    persistent: "persistent";
}>;
export type LifecycleType = z.infer<typeof LifecycleType>;
/**
 * Configuration for the 'lifecycle' behavior.
 */
export declare const LifecycleConfig: z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<{
        ephemeral: "ephemeral";
        tool: "tool";
        persistent: "persistent";
    }>>;
    id: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LifecycleConfig = z.infer<typeof LifecycleConfig>;
/**
 * Field mapping for intents that need to understand data structure.
 * e.g., "Which field is the title? Which is the image?"
 */
export declare const FieldMapping: z.ZodRecord<z.ZodString, z.ZodString>;
/**
 * Display hints for the auto-layout engine.
 */
export declare const DisplayHints: z.ZodObject<{
    layout: z.ZodDefault<z.ZodEnum<{
        split: "split";
        auto: "auto";
        grid: "grid";
        list: "list";
        masonry: "masonry";
        carousel: "carousel";
        hero: "hero";
    }>>;
    columns: z.ZodOptional<z.ZodNumber>;
    density: z.ZodDefault<z.ZodEnum<{
        compact: "compact";
        comfortable: "comfortable";
        spacious: "spacious";
    }>>;
    item_template: z.ZodOptional<z.ZodType<UINode, unknown, z.core.$ZodTypeInternals<UINode, unknown>>>;
}, z.core.$strip>;
/**
 * The Universal Spec - One type to rule them all.
 */
export declare const UniversalSpec: z.ZodType<UniversalSpecType>;
type UniversalSpecType = {
    id?: string;
    version: '2.0';
    intent: z.infer<typeof IntentType>;
    lifecycle?: z.infer<typeof LifecycleConfig>;
    title?: string;
    description?: string;
    theme?: z.infer<typeof ThemeOverrides>;
    data?: Record<string, any> | z.infer<typeof DataFetcher>;
    fields?: Record<string, string>;
    display?: z.infer<typeof DisplayHints>;
    ui?: z.infer<typeof UINode>;
    selection?: 'single' | 'multiple' | 'none';
    on_select?: any;
    on_complete?: any;
    chain?: UniversalSpecType;
};
export type UniversalSpec = UniversalSpecType;
/**
 * Helper to parse a Universal Spec
 */
export declare function parseUniversalSpec(input: unknown): UniversalSpec;
/**
 * Helper to safely parse a Universal Spec
 */
export declare function safeParseUniversalSpec(input: unknown): z.ZodSafeParseResult<UniversalSpecType>;
/**
 * Normalizes any spec (Legacy or Universal) into a UniversalSpec.
 * This ensures backward compatibility with "Gen 1" specs.
 */
export declare function normalizeSpec(input: any): UniversalSpec;
export {};
