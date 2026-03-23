/**
 * @file ui-spec.ts
 * @description Main UISpec schema - the complete specification for a JSON UI.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with UINode, DataFetcher, and UISpec schemas
 *   - Recursive UINode definition for nested component trees
 */
import { z } from 'zod';
/**
 * Data fetcher for loading external data.
 * Can be configured to refetch on state changes or at intervals.
 */
export declare const DataFetcher: z.ZodObject<{
    url: z.ZodString;
    method: z.ZodDefault<z.ZodEnum<{
        GET: "GET";
        POST: "POST";
    }>>;
    depends_on: z.ZodOptional<z.ZodArray<z.ZodString>>;
    refresh_interval: z.ZodOptional<z.ZodNumber>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    transform: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DataFetcher = z.infer<typeof DataFetcher>;
/**
 * Base UI Node schema (before adding recursive children).
 * Represents a single widget in the UI tree.
 */
declare const UINodeBase: z.ZodObject<{
    type: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    bind: z.ZodOptional<z.ZodString>;
    show: z.ZodOptional<z.ZodString>;
    class: z.ZodOptional<z.ZodString>;
    style: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    on_click: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>>]>>;
    on_change: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>>]>>;
    on_submit: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>>]>>;
    on_focus: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>>]>>;
    on_blur: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strip>>]>>;
    items: z.ZodOptional<z.ZodString>;
    item_as: z.ZodOptional<z.ZodString>;
    index_as: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Recursive UINode type.
 * Uses z.lazy() for self-referencing children and else_children.
 */
export type UINode = z.infer<typeof UINodeBase> & {
    children?: UINode[];
    else_children?: UINode[];
};
export declare const UINode: z.ZodType<UINode>;
/**
 * Theme overrides for customizing appearance.
 */
export declare const ThemeOverrides: z.ZodObject<{
    colors: z.ZodOptional<z.ZodObject<{
        background: z.ZodOptional<z.ZodString>;
        foreground: z.ZodOptional<z.ZodString>;
        card: z.ZodOptional<z.ZodString>;
        'card-foreground': z.ZodOptional<z.ZodString>;
        popover: z.ZodOptional<z.ZodString>;
        'popover-foreground': z.ZodOptional<z.ZodString>;
        primary: z.ZodOptional<z.ZodString>;
        'primary-foreground': z.ZodOptional<z.ZodString>;
        secondary: z.ZodOptional<z.ZodString>;
        'secondary-foreground': z.ZodOptional<z.ZodString>;
        muted: z.ZodOptional<z.ZodString>;
        'muted-foreground': z.ZodOptional<z.ZodString>;
        accent: z.ZodOptional<z.ZodString>;
        'accent-foreground': z.ZodOptional<z.ZodString>;
        destructive: z.ZodOptional<z.ZodString>;
        'destructive-foreground': z.ZodOptional<z.ZodString>;
        border: z.ZodOptional<z.ZodString>;
        input: z.ZodOptional<z.ZodString>;
        ring: z.ZodOptional<z.ZodString>;
        'chart-1': z.ZodOptional<z.ZodString>;
        'chart-2': z.ZodOptional<z.ZodString>;
        'chart-3': z.ZodOptional<z.ZodString>;
        'chart-4': z.ZodOptional<z.ZodString>;
        'chart-5': z.ZodOptional<z.ZodString>;
        sidebar: z.ZodOptional<z.ZodString>;
        'sidebar-foreground': z.ZodOptional<z.ZodString>;
        'sidebar-primary': z.ZodOptional<z.ZodString>;
        'sidebar-primary-foreground': z.ZodOptional<z.ZodString>;
        'sidebar-accent': z.ZodOptional<z.ZodString>;
        'sidebar-accent-foreground': z.ZodOptional<z.ZodString>;
        'sidebar-border': z.ZodOptional<z.ZodString>;
        'sidebar-ring': z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    radius: z.ZodOptional<z.ZodString>;
    mode: z.ZodOptional<z.ZodEnum<{
        light: "light";
        dark: "dark";
        system: "system";
    }>>;
}, z.core.$strip>;
export type ThemeOverrides = z.infer<typeof ThemeOverrides>;
/**
 * Complete UI Specification.
 * This is the root schema that LLMs generate.
 */
export declare const UISpec: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<"1.0">>;
    state: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        url: z.ZodString;
        method: z.ZodDefault<z.ZodEnum<{
            GET: "GET";
            POST: "POST";
        }>>;
        depends_on: z.ZodOptional<z.ZodArray<z.ZodString>>;
        refresh_interval: z.ZodOptional<z.ZodNumber>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        body: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        transform: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    ui: z.ZodType<UINode, unknown, z.core.$ZodTypeInternals<UINode, unknown>>;
    theme: z.ZodOptional<z.ZodObject<{
        colors: z.ZodOptional<z.ZodObject<{
            background: z.ZodOptional<z.ZodString>;
            foreground: z.ZodOptional<z.ZodString>;
            card: z.ZodOptional<z.ZodString>;
            'card-foreground': z.ZodOptional<z.ZodString>;
            popover: z.ZodOptional<z.ZodString>;
            'popover-foreground': z.ZodOptional<z.ZodString>;
            primary: z.ZodOptional<z.ZodString>;
            'primary-foreground': z.ZodOptional<z.ZodString>;
            secondary: z.ZodOptional<z.ZodString>;
            'secondary-foreground': z.ZodOptional<z.ZodString>;
            muted: z.ZodOptional<z.ZodString>;
            'muted-foreground': z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodString>;
            'accent-foreground': z.ZodOptional<z.ZodString>;
            destructive: z.ZodOptional<z.ZodString>;
            'destructive-foreground': z.ZodOptional<z.ZodString>;
            border: z.ZodOptional<z.ZodString>;
            input: z.ZodOptional<z.ZodString>;
            ring: z.ZodOptional<z.ZodString>;
            'chart-1': z.ZodOptional<z.ZodString>;
            'chart-2': z.ZodOptional<z.ZodString>;
            'chart-3': z.ZodOptional<z.ZodString>;
            'chart-4': z.ZodOptional<z.ZodString>;
            'chart-5': z.ZodOptional<z.ZodString>;
            sidebar: z.ZodOptional<z.ZodString>;
            'sidebar-foreground': z.ZodOptional<z.ZodString>;
            'sidebar-primary': z.ZodOptional<z.ZodString>;
            'sidebar-primary-foreground': z.ZodOptional<z.ZodString>;
            'sidebar-accent': z.ZodOptional<z.ZodString>;
            'sidebar-accent-foreground': z.ZodOptional<z.ZodString>;
            'sidebar-border': z.ZodOptional<z.ZodString>;
            'sidebar-ring': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        radius: z.ZodOptional<z.ZodString>;
        mode: z.ZodOptional<z.ZodEnum<{
            light: "light";
            dark: "dark";
            system: "system";
        }>>;
    }, z.core.$strip>>;
    meta: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UISpec = z.infer<typeof UISpec>;
/**
 * Validate a UISpec object.
 * Returns parsed result or throws ZodError.
 */
export declare function parseUISpec(input: unknown): UISpec;
/**
 * Safely validate a UISpec object.
 * Returns { success, data, error } instead of throwing.
 */
export declare function safeParseUISpec(input: unknown): z.ZodSafeParseResult<{
    version: "1.0";
    ui: UINode;
    state?: Record<string, any> | undefined;
    data?: Record<string, {
        url: string;
        method: "GET" | "POST";
        depends_on?: string[] | undefined;
        refresh_interval?: number | undefined;
        headers?: Record<string, string> | undefined;
        body?: Record<string, any> | undefined;
        transform?: string | undefined;
    }> | undefined;
    theme?: {
        colors?: {
            background?: string | undefined;
            foreground?: string | undefined;
            card?: string | undefined;
            'card-foreground'?: string | undefined;
            popover?: string | undefined;
            'popover-foreground'?: string | undefined;
            primary?: string | undefined;
            'primary-foreground'?: string | undefined;
            secondary?: string | undefined;
            'secondary-foreground'?: string | undefined;
            muted?: string | undefined;
            'muted-foreground'?: string | undefined;
            accent?: string | undefined;
            'accent-foreground'?: string | undefined;
            destructive?: string | undefined;
            'destructive-foreground'?: string | undefined;
            border?: string | undefined;
            input?: string | undefined;
            ring?: string | undefined;
            'chart-1'?: string | undefined;
            'chart-2'?: string | undefined;
            'chart-3'?: string | undefined;
            'chart-4'?: string | undefined;
            'chart-5'?: string | undefined;
            sidebar?: string | undefined;
            'sidebar-foreground'?: string | undefined;
            'sidebar-primary'?: string | undefined;
            'sidebar-primary-foreground'?: string | undefined;
            'sidebar-accent'?: string | undefined;
            'sidebar-accent-foreground'?: string | undefined;
            'sidebar-border'?: string | undefined;
            'sidebar-ring'?: string | undefined;
        } | undefined;
        radius?: string | undefined;
        mode?: "light" | "dark" | "system" | undefined;
    } | undefined;
    meta?: {
        title?: string | undefined;
        description?: string | undefined;
    } | undefined;
}>;
export {};
