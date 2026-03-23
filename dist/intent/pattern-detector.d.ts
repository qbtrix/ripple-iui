/**
 * @file pattern-detector.ts
 * @description Detects UI patterns (quiz, results) and transforms data.
 * Extracted from IntentRenderer for modularity.
 */
type FieldMapping = Record<string, string>;
export interface QuizOption {
    id: string;
    text: string;
    correct: boolean;
}
export interface ResultsItem {
    label: string;
    value: string;
    icon?: string;
    highlight?: boolean;
}
/**
 * Detect if this is a quiz pattern:
 * - Intent is 'select'
 * - Items have 'correct' field
 */
export declare function isQuizPattern(spec: {
    intent: string;
}, items: Record<string, unknown>[]): boolean;
/**
 * Detect if this is a results/summary pattern:
 * - Intent is 'info'
 * - Items have 'label' and 'value' fields
 */
export declare function isResultsPattern(spec: {
    intent: string;
}, items: Record<string, unknown>[]): boolean;
/**
 * Convert items to quiz options format
 */
export declare function toQuizOptions(items: Record<string, unknown>[], fields?: FieldMapping): QuizOption[];
/**
 * Convert items to results summary format
 */
export declare function toResultsItems(items: Record<string, unknown>[]): ResultsItem[];
export interface ChartDataPoint {
    label: string;
    value: number;
    [key: string]: unknown;
}
/**
 * Detect if this is a chart pattern:
 * - Intent is 'info'
 * - Items have numeric values
 * - Items have label/category field
 * - OR display.chart_type is explicitly set
 */
export declare function isChartPattern(spec: {
    intent: string;
    display?: {
        chart_type?: string;
    };
}, items: Record<string, unknown>[]): boolean;
/**
 * Convert items to chart data format
 */
export declare function toChartData(items: Record<string, unknown>[], fields?: FieldMapping): ChartDataPoint[];
export {};
