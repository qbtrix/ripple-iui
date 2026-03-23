/**
 * @file pattern-detector.ts
 * @description Detects UI patterns (quiz, results) and transforms data.
 * Extracted from IntentRenderer for modularity.
 */

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Detect if this is a quiz pattern:
 * - Intent is 'select'
 * - Items have 'correct' field
 */
export function isQuizPattern(
  spec: { intent: string },
  items: Record<string, unknown>[]
): boolean {
  if (spec.intent !== 'select') return false;
  if (items.length === 0) return false;

  return items.some((item) => 'correct' in item);
}

/**
 * Detect if this is a results/summary pattern:
 * - Intent is 'info'
 * - Items have 'label' and 'value' fields
 */
export function isResultsPattern(
  spec: { intent: string },
  items: Record<string, unknown>[]
): boolean {
  if (spec.intent !== 'info') return false;
  if (items.length === 0) return false;

  return items.some((item) => 'label' in item && 'value' in item);
}

// ============================================================================
// Data Transformers
// ============================================================================

/**
 * Convert items to quiz options format
 */
export function toQuizOptions(
  items: Record<string, unknown>[],
  fields?: FieldMapping
): QuizOption[] {
  const idField = fields?.id || 'id';
  const titleField = fields?.title || 'title';

  return items.map((item) => ({
    id: String(item[idField] || item.id),
    text: String(item[titleField] || item.option || item.text || ''),
    correct: Boolean(item.correct)
  }));
}

/**
 * Convert items to results summary format
 */
export function toResultsItems(
  items: Record<string, unknown>[]
): ResultsItem[] {
  return items.map((item) => ({
    label: String(item.label || ''),
    value: String(item.value || ''),
    icon: item.icon ? String(item.icon) : undefined,
    highlight: Boolean(item.highlight)
  }));
}

// ============================================================================
// Chart Pattern Detection
// ============================================================================

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
export function isChartPattern(
  spec: { intent: string; display?: { chart_type?: string } },
  items: Record<string, unknown>[]
): boolean {
  // Explicit chart type in display hints
  if (spec.display?.chart_type) return true;

  // Auto-detect from data structure
  if (spec.intent !== 'info') return false;
  if (items.length === 0) return false;

  const first = items[0];

  // Check for numeric values
  const hasNumeric = Object.values(first).some(v => typeof v === 'number');

  // Check for label field
  const hasLabel = 'label' in first || 'name' in first || 'category' in first || 'title' in first;

  return hasNumeric && hasLabel;
}

/**
 * Convert items to chart data format
 */
export function toChartData(
  items: Record<string, unknown>[],
  fields?: FieldMapping
): ChartDataPoint[] {
  const labelField = fields?.title || 'label';
  const valueField = fields?.value || fields?.price || 'value';

  return items.map(item => ({
    label: String(item[labelField] || item.label || item.name || item.category || ''),
    value: Number(item[valueField] || item.value || 0),
    ...item
  }));
}
