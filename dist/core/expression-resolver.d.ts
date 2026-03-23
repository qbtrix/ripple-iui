/**
 * @file expression-resolver.ts
 * @description Resolves binding expressions like {state.value} and {item.name}.
 * @created 2024-12-XX
 * @changes
 *   - Initial creation with expression parsing and evaluation
 *   - Support for simple paths, comparisons, and null checks
 *   - Template string resolution for embedded expressions
 */
/**
 * Context for resolving expressions.
 * Contains all available scopes (state, loop variables, data).
 */
export interface ResolverContext {
    /** Main application state */
    state: Record<string, unknown>;
    /** Data fetcher results */
    data?: Record<string, unknown>;
    /** Loop item variable (from 'each' widget) */
    item?: unknown;
    /** Loop index (from 'each' widget) */
    index?: number;
    /** Custom loop variable names */
    [key: string]: unknown;
}
/**
 * Check if a string contains any expressions.
 */
export declare function hasExpressions(value: unknown): boolean;
/**
 * Check if a string is a single expression (not embedded in text).
 *
 * @example
 * isSingleExpression('{state.name}'); // true
 * isSingleExpression('Hello {state.name}'); // false
 */
export declare function isSingleExpression(value: string): boolean;
/**
 * Parse an expression and evaluate it against context.
 *
 * Supported expressions:
 * - Simple paths: "state.user.name", "item.price"
 * - Equality: "state.selected == 'foo'"
 * - Inequality: "state.selected != null"
 * - Comparison: "state.count > 0", "item.price < 100"
 * - Ternary: "state.selected == 'foo' ? 'yes' : 'no'"
 *
 * @param expression - The expression without curly braces
 * @param context - The resolver context
 * @returns The evaluated value
 */
export declare function evaluateExpression(expression: string, context: ResolverContext): unknown;
/**
 * Resolve all expressions in a string, returning the result.
 *
 * If the string is a single expression, returns the raw value.
 * If the string contains embedded expressions, returns a string with values interpolated.
 *
 * @example
 * resolveString('{state.name}', ctx); // Returns actual value (could be object)
 * resolveString('Hello {state.name}!', ctx); // Returns "Hello Alice!"
 */
export declare function resolveString(value: string, context: ResolverContext): unknown;
/**
 * Resolve all expressions in an object's values recursively.
 *
 * @param obj - Object with potential expression values
 * @param context - The resolver context
 * @returns New object with resolved values
 */
export declare function resolveObject(obj: Record<string, unknown>, context: ResolverContext): Record<string, unknown>;
/**
 * Resolve any value (string, object, array, or primitive).
 */
export declare function resolveValue(value: unknown, context: ResolverContext): unknown;
/**
 * Evaluate a condition expression for use in 'show' or 'condition' props.
 * Always returns a boolean.
 */
export declare function evaluateCondition(expression: string, context: ResolverContext): boolean;
