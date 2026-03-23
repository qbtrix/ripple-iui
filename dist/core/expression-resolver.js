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
 * Expression pattern: {expression}
 * Matches content between curly braces.
 */
const EXPRESSION_REGEX = /\{([^}]+)\}/g;
/**
 * Single expression pattern for exact match.
 */
const SINGLE_EXPRESSION_REGEX = /^\{([^}]+)\}$/;
/**
 * Check if a string contains any expressions.
 */
export function hasExpressions(value) {
    if (typeof value !== 'string')
        return false;
    return EXPRESSION_REGEX.test(value);
}
/**
 * Check if a string is a single expression (not embedded in text).
 *
 * @example
 * isSingleExpression('{state.name}'); // true
 * isSingleExpression('Hello {state.name}'); // false
 */
export function isSingleExpression(value) {
    return SINGLE_EXPRESSION_REGEX.test(value);
}
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
export function evaluateExpression(expression, context) {
    const trimmed = expression.trim();
    // Check for ternary operator first (condition ? trueVal : falseVal)
    // First normalize optional chaining to avoid confusion with ternary operator
    // We replace ?. with a placeholder, find ternary, then restore
    const normalized = trimmed.replace(/\?\./g, '\x00OPTCHAIN\x00');
    const ternaryMatch = normalized.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
    if (ternaryMatch) {
        // Restore optional chaining in the matched parts
        const restoreOptChain = (s) => s.replace(/\x00OPTCHAIN\x00/g, '?.');
        const [, conditionExpr, trueExpr, falseExpr] = ternaryMatch;
        const condition = evaluateExpression(restoreOptChain(conditionExpr.trim()), context);
        return condition
            ? evaluateExpression(restoreOptChain(trueExpr.trim()), context)
            : evaluateExpression(restoreOptChain(falseExpr.trim()), context);
    }
    // Check for OR operator (||) - split and evaluate each part
    if (trimmed.includes('||')) {
        const parts = splitLogicalOperator(trimmed, '||');
        if (parts.length > 1) {
            for (let i = 0; i < parts.length; i++) {
                const result = evaluateExpression(parts[i].trim(), context);
                // If truthy, return it immediately (short-circuit)
                if (result) {
                    return result;
                }
                // If it's the last item and we haven't returned yet, return it (even if falsy)
                if (i === parts.length - 1) {
                    return result;
                }
            }
        }
    }
    // Check for AND operator (&&) - split and evaluate each part
    if (trimmed.includes('&&')) {
        const parts = splitLogicalOperator(trimmed, '&&');
        if (parts.length > 1) {
            let result;
            for (let i = 0; i < parts.length; i++) {
                result = evaluateExpression(parts[i].trim(), context);
                // If falsy, return it immediately (short-circuit)
                if (!result) {
                    return result;
                }
            }
            // If we got here, all were truthy, return the last result
            return result;
        }
    }
    // Check for NOT operator (!)
    if (trimmed.startsWith('!')) {
        const inner = trimmed.slice(1).trim();
        // Handle parentheses: !(...)
        if (inner.startsWith('(') && inner.endsWith(')')) {
            return !evaluateExpression(inner.slice(1, -1), context);
        }
        return !evaluateExpression(inner, context);
    }
    // Handle parentheses for grouping
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return evaluateExpression(trimmed.slice(1, -1), context);
    }
    // Check for comparison operators (order matters - check === before ==)
    const comparisonMatch = trimmed.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
        const [, leftExpr, operator, rightExpr] = comparisonMatch;
        const left = evaluateSimplePath(leftExpr.trim(), context);
        const right = parseValue(rightExpr.trim(), context);
        switch (operator) {
            case '===':
                return left === right;
            case '!==':
                return left !== right;
            case '==':
                return left == right; // eslint-disable-line eqeqeq
            case '!=':
                return left != right; // eslint-disable-line eqeqeq
            case '>':
                return left > right;
            case '<':
                return left < right;
            case '>=':
                return left >= right;
            case '<=':
                return left <= right;
        }
    }
    // Fallback: try to parse as value (literal or path)
    return parseValue(trimmed, context);
}
/**
 * Split expression by logical operator, respecting parentheses.
 */
function splitLogicalOperator(expr, operator) {
    const parts = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];
        if (char === '(') {
            depth++;
            current += char;
        }
        else if (char === ')') {
            depth--;
            current += char;
        }
        else if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
            parts.push(current.trim());
            current = '';
            i += operator.length - 1; // Skip operator
        }
        else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
}
/**
 * Evaluate a simple dot-notation path against context.
 * Supports optional chaining: "state.user?.name" treats ?. same as .
 *
 * @param path - Dot-separated path like "state.user.name" or "state.user?.name"
 * @param context - The resolver context
 */
function evaluateSimplePath(path, context) {
    // Normalize optional chaining - treat ?. as . (we already handle null/undefined)
    const normalizedPath = path.replace(/\?\./g, '.');
    const parts = normalizedPath.split('.');
    const rootKey = parts[0];
    // Determine the root object
    let root;
    if (rootKey === 'state') {
        root = context.state;
        parts.shift(); // Remove 'state' from path
    }
    else if (rootKey === 'data' && context.data) {
        root = context.data;
        parts.shift();
    }
    else if (rootKey === 'item' && context.item !== undefined) {
        root = context.item;
        parts.shift();
    }
    else if (rootKey === 'index' && context.index !== undefined) {
        return context.index;
    }
    else if (context[rootKey] !== undefined) {
        // Custom loop variable (e.g., 'flight' from item_as: 'flight')
        root = context[rootKey];
        parts.shift();
    }
    else {
        // Assume it's a state path without 'state.' prefix
        root = context.state;
    }
    // Navigate the path
    let current = root;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
/**
 * Parse a value from expression (handles literals and paths).
 */
function parseValue(value, context) {
    // Null literal
    if (value === 'null')
        return null;
    if (value === 'undefined')
        return undefined;
    // Boolean literals
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    // String literals (single or double quotes)
    const stringMatch = value.match(/^['"](.*)['"]$/);
    if (stringMatch) {
        return stringMatch[1];
    }
    // Number literals
    const num = Number(value);
    if (!isNaN(num)) {
        return num;
    }
    // Otherwise, treat as path
    return evaluateSimplePath(value, context);
}
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
export function resolveString(value, context) {
    // Single expression - return raw value (preserves type)
    if (isSingleExpression(value)) {
        const match = value.match(SINGLE_EXPRESSION_REGEX);
        if (match) {
            try {
                return evaluateExpression(match[1], context);
            }
            catch {
                return undefined;
            }
        }
    }
    // Multiple expressions - interpolate as string
    return value.replace(EXPRESSION_REGEX, (_, expr) => {
        try {
            const result = evaluateExpression(expr, context);
            return result === null || result === undefined ? '' : String(result);
        }
        catch {
            return '';
        }
    });
}
/**
 * Resolve all expressions in an object's values recursively.
 *
 * @param obj - Object with potential expression values
 * @param context - The resolver context
 * @returns New object with resolved values
 */
export function resolveObject(obj, context) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = resolveValue(value, context);
    }
    return result;
}
/**
 * Resolve any value (string, object, array, or primitive).
 */
export function resolveValue(value, context) {
    if (typeof value === 'string') {
        return resolveString(value, context);
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolveValue(item, context));
    }
    if (value !== null && typeof value === 'object') {
        return resolveObject(value, context);
    }
    return value;
}
/**
 * Evaluate a condition expression for use in 'show' or 'condition' props.
 * Always returns a boolean.
 */
export function evaluateCondition(expression, context) {
    // Remove curly braces if present
    const clean = expression.replace(/^\{|\}$/g, '').trim();
    const result = evaluateExpression(clean, context);
    // Convert to boolean
    return Boolean(result);
}
