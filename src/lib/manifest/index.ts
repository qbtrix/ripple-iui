// Build-time-generated manifest of every Ripple widget the LLM should know
// about. Aggregated into dist/manifest.json by scripts/build-manifest.ts.
//
// Per-widget entries live in ./entries/<kebab-type>.ts. Adding a new widget
// requires both a new entry file AND adding the import + array entry below.

import pkg from '../../../package.json' with { type: 'json' };

import { manifestActions } from './actions.js';
import { accordionEntry } from './entries/accordion.js';
import { alertEntry } from './entries/alert.js';
import { analystBarEntry } from './entries/analyst-bar.js';
import { apiKeyEntry } from './entries/api-key.js';
import { appShellEntry } from './entries/app-shell.js';
import { askUserQuestionsEntry } from './entries/ask-user-questions.js';
import { articleMetaEntry } from './entries/article-meta.js';
import { audioEntry } from './entries/audio.js';
import { auditLogEntry } from './entries/audit-log.js';
import { avatarEntry } from './entries/avatar.js';
import { avatarGroupEntry } from './entries/avatar-group.js';
import { badgeEntry } from './entries/badge.js';
import { breadcrumbEntry } from './entries/breadcrumb.js';
import { bulkActionBarEntry } from './entries/bulk-action-bar.js';
import { buttonEntry } from './entries/button.js';
import { c4Entry } from './entries/c4.js';
import { calendarEntry } from './entries/calendar.js';
import { calloutEntry } from './entries/callout.js';
import { cardEntry } from './entries/card.js';
import { chartEntry } from './entries/chart.js';
import { checkboxEntry } from './entries/checkbox.js';
import { chipEntry } from './entries/chip.js';
import { citationEntry } from './entries/citation.js';
import { coachmarkEntry } from './entries/coachmark.js';
import { codeEntry } from './entries/code.js';
import { codeBlockEntry } from './entries/code-block.js';
import { codeEditorEntry } from './entries/code-editor.js';
import { collapsibleEntry } from './entries/collapsible.js';
import { colorPickerEntry } from './entries/color-picker.js';
import { comboboxEntry } from './entries/combobox.js';
import { commandPaletteEntry } from './entries/command-palette.js';
import { commentThreadEntry } from './entries/comment-thread.js';
import { companyHeaderEntry } from './entries/company-header.js';
import { analyticsDashboardEntry } from './entries/analytics-dashboard.js';
import { checklistLayoutEntry } from './entries/checklist-layout.js';
import { comparisonLayoutEntry } from './entries/comparison-layout.js';
import { comparisonTableEntry } from './entries/comparison-table.js';
import { confirmDialogEntry } from './entries/confirm-dialog.js';
import { containerEntry } from './entries/container.js';
import { contextMenuEntry } from './entries/context-menu.js';
import { copyEntry } from './entries/copy.js';
import { dashboardEntry } from './entries/dashboard.js';
import { dashboardSlotEntry } from './entries/dashboard-slot.js';
import { dataGridEntry } from './entries/data-grid.js';
import { datePickerEntry } from './entries/date-picker.js';
import { definitionListEntry } from './entries/definition-list.js';
import { diffEntry } from './entries/diff.js';
import { discoverCardEntry } from './entries/discover-card.js';
import { drawingCanvasEntry } from './entries/drawing-canvas.js';
import { dropdownMenuEntry } from './entries/dropdown-menu.js';
import { eachEntry } from './entries/each.js';
import { embedEntry } from './entries/embed.js';
import { emptyStateEntry } from './entries/empty-state.js';
import { entityDetailEntry } from './entries/entity-detail.js';
import { execDashboardEntry } from './entries/exec-dashboard.js';
import { errorStateEntry } from './entries/error-state.js';
import { fileUploadEntry } from './entries/file-upload.js';
import { filterBarEntry } from './entries/filter-bar.js';
import { flashcardEntry } from './entries/flashcard.js';
import { flexEntry } from './entries/flex.js';
import { followUpEntry } from './entries/follow-up.js';
import { formEntry } from './entries/form.js';
import { formLayoutEntry } from './entries/form-layout.js';
import { funnelEntry } from './entries/funnel.js';
import { ganttEntry } from './entries/gantt.js';
import { gaugeEntry } from './entries/gauge.js';
import { glassCardEntry } from './entries/glass-card.js';
import { gridEntry } from './entries/grid.js';
import { headingEntry } from './entries/heading.js';
import { heatmapEntry } from './entries/heatmap.js';
import { heroEntry } from './entries/hero.js';
import { highlightEntry } from './entries/highlight.js';
import { hoverCardEntry } from './entries/hover-card.js';
import { iconEntry } from './entries/icon.js';
import { ifEntry } from './entries/if.js';
import { imageEntry } from './entries/image.js';
import { inputEntry } from './entries/input.js';
import { invoiceLayoutEntry } from './entries/invoice-layout.js';
import { invoiceLinesEntry } from './entries/invoice-lines.js';
import { kanbanEntry } from './entries/kanban.js';
import { kbdEntry } from './entries/kbd.js';
import { kvTableEntry } from './entries/kv-table.js';
import { linkPreviewEntry } from './entries/link-preview.js';
import { loadingEntry } from './entries/loading.js';
import { locationPickerEntry } from './entries/location-picker.js';
import { mapEntry } from './entries/map.js';
import { markdownEntry } from './entries/markdown.js';
import { masterDetailEntry } from './entries/master-detail.js';
import { mentionEntry } from './entries/mention.js';
import { metricEntry } from './entries/metric.js';
import { modalEntry } from './entries/modal.js';
import { modelViewerEntry } from './entries/model-viewer.js';
import { multiSelectEntry } from './entries/multi-select.js';
import { newsCardEntry } from './entries/news-card.js';
import { notificationCenterEntry } from './entries/notification-center.js';
import { numberInputEntry } from './entries/number-input.js';
import { opsDashboardEntry } from './entries/ops-dashboard.js';
import { orderStatusEntry } from './entries/order-status.js';
import { orgChartEntry } from './entries/org-chart.js';
import { otpInputEntry } from './entries/otp-input.js';
import { pageHeaderEntry } from './entries/page-header.js';
import { peoplePickerEntry } from './entries/people-picker.js';
import { pipelineDashboardEntry } from './entries/pipeline-dashboard.js';
import { permissionMatrixEntry } from './entries/permission-matrix.js';
import { popoverEntry } from './entries/popover.js';
import { pricingTableEntry } from './entries/pricing-table.js';
import { progressEntry } from './entries/progress.js';
import { progressRingEntry } from './entries/progress-ring.js';
import { projectDashboardEntry } from './entries/project-dashboard.js';
import { prosConsEntry } from './entries/pros-cons.js';
import { qrEntry } from './entries/qr.js';
import { quoteEntry } from './entries/quote.js';
import { radioGroupEntry } from './entries/radio-group.js';
import { rangeBarEntry } from './entries/range-bar.js';
import { ratingEntry } from './entries/rating.js';
import { reportLayoutEntry } from './entries/report-layout.js';
import { richTextEntry } from './entries/rich-text.js';
import { rippleFrameEntry } from './entries/ripple-frame.js';
import { sankeyEntry } from './entries/sankey.js';
import { savedViewsEntry } from './entries/saved-views.js';
import { searchEntry } from './entries/search.js';
import { sectionEntry } from './entries/section.js';
import { segmentedEntry } from './entries/segmented.js';
import { selectEntry } from './entries/select.js';
import { separatorEntry } from './entries/separator.js';
import { settingsListEntry } from './entries/settings-list.js';
import { sheetEntry } from './entries/sheet.js';
import { sidebarEntry } from './entries/sidebar.js';
import { skeletonEntry } from './entries/skeleton.js';
import { sliderEntry } from './entries/slider.js';
import { soulStatusEntry } from './entries/soul-status.js';
import { sourceCardEntry } from './entries/source-card.js';
import { sourcesBarEntry } from './entries/sources-bar.js';
import { sparklineEntry } from './entries/sparkline.js';
import { splitEntry } from './entries/split.js';
import { statEntry } from './entries/stat.js';
import { statusDotEntry } from './entries/status-dot.js';
import { stepsEntry } from './entries/steps.js';
import { switchEntry } from './entries/switch.js';
import { tableEntry } from './entries/table.js';
import { tabsEntry } from './entries/tabs.js';
import { terminalEntry } from './entries/terminal.js';
import { textEntry } from './entries/text.js';
import { textareaEntry } from './entries/textarea.js';
import { tickerEntry } from './entries/ticker.js';
import { timelineEntry } from './entries/timeline.js';
import { timePickerEntry } from './entries/time-picker.js';
import { timerEntry } from './entries/timer.js';
import { todoListEntry } from './entries/todo-list.js';
import { toastEntry } from './entries/toast.js';
import { tooltipEntry } from './entries/tooltip.js';
import { treeEntry } from './entries/tree.js';
import { treemapEntry } from './entries/treemap.js';
import { treeTableEntry } from './entries/tree-table.js';
import { trendEntry } from './entries/trend.js';
import { videoEntry } from './entries/video.js';
import { virtualListEntry } from './entries/virtual-list.js';
import { wizardLayoutEntry } from './entries/wizard-layout.js';
import { workflowEntry } from './entries/workflow.js';

export interface WidgetPropSpec {
  type: string;
  required: boolean;
  description: string;
}

/**
 * A runnable mini-spec demonstrating realistic interaction wiring for a
 * widget. Sibling to `example` — never a replacement for it. `example`
 * is a liftable node; `pocket` is a complete pocket.
 */
export interface PocketSpec {
  /** Optional state seed. Required if `ui` uses `bind` or reads `{state.*}`. */
  state?: Record<string, unknown>;
  /** The runnable widget tree. Top-level node should match (or contain) the entry's widget type. */
  ui: WidgetManifestEntry['example'];
}

/**
 * A named pocket variant for widgets with distinct interaction modes
 * (e.g. form submit-with-api vs submit-with-emit). Use `pocket` for the
 * single-variant case; reach for `pockets` only when one example genuinely
 * cannot represent the widget's range.
 */
export interface NamedPocketSpec extends PocketSpec {
  name: string;
  description?: string;
}

export interface WidgetManifestEntry {
  /** Canonical widget type as registered in `widgets/index.ts`. */
  type: string;
  /** Top-level grouping — display | layout | input | data | control | composite | overlay | research | vertical. */
  category: string;
  /** One-line summary, < 200 chars. Long docs stay in the wiki. */
  description: string;
  /** Prop name → spec. Only LLM-relevant props; internal/passthrough props omitted. */
  props: Record<string, WidgetPropSpec>;
  /**
   * Node-level event handlers (`on_click`, `on_change`, …). These live as
   * siblings to `props` on the UINode, not inside `props`. See ui-spec.ts.
   */
  events?: Record<string, WidgetPropSpec>;
  /**
   * Other node-level fields specific to control-flow widgets — `condition`
   * for `if`, `items`/`item_as`/`index_as` for `each`. Sibling to `props`.
   */
  nodeFields?: Record<string, WidgetPropSpec>;
  /**
   * A runnable UISpec node the LLM can lift as a starting point. May include
   * sibling fields like `on_click`, `condition`, `items` alongside `props`.
   */
  example: {
    type: string;
    props?: Record<string, unknown>;
    children?: unknown;
    [extraNodeField: string]: unknown;
  };

  /**
   * A complete, runnable mini-spec showing realistic interaction wiring.
   * Present on Tier A (interactive) and Tier B (composite) widgets only.
   * At most one of `pocket` / `pockets` may be set.
   */
  pocket?: PocketSpec;

  /**
   * Multiple named pockets — only when one example genuinely cannot show
   * the widget's interaction range. Cap at 3 entries.
   */
  pockets?: NamedPocketSpec[];
}

/**
 * Documents a single EventAction variant — what fields it takes, when to
 * use it, and a minimal valid example. Mirrors `EventHandler` zod schemas
 * in `src/lib/schema/event-handler.ts`. The drift test ensures every
 * `example` here parses against the live schema.
 */
export interface ActionSpec {
  /** One-line guidance — what this action does and when to use it. */
  description: string;
  /** Field name -> "type — note". Mark required fields with no `?`. */
  shape: Record<string, string>;
  /** A minimal valid handler — must parse against EventHandler. */
  example: Record<string, unknown>;
}

/**
 * Top-level spec envelope contract — the shape every Ripple spec MUST follow.
 *
 * The agent's most expensive failure mode is inventing the wrong field name
 * for the renderable tree (`root` / `tree` / `view` / `body` / `content`)
 * and shipping a spec the renderer can't mount. Documenting the envelope
 * here, in the same artifact that documents widget shapes, anchors the
 * field names in the LLM context alongside the per-widget reference.
 */
export interface SpecEnvelope {
  /** The required top-level field name for the renderable node tree. */
  uiField: 'ui';
  /** The required top-level field name for the StateManager seed. */
  stateField: 'state';
  /** Current envelope version. */
  version: '1.0';
  /** Aliases the agent sometimes invents — explicitly NOT supported. */
  aliasesNotAllowed: readonly string[];
  /** One-line contract summary suitable for prompt injection. */
  description: string;
  /** A minimal but complete example showing every required field in place. */
  example: Record<string, unknown>;
}

export interface WidgetManifest {
  schema: 'ripple.manifest/v1';
  version: string;
  generatedAt: string;
  /**
   * The spec envelope contract — describes how widgets compose into a
   * complete spec. Read this BEFORE the widget catalog: the catalog
   * documents nodes, the envelope documents the tree they live in.
   */
  spec: SpecEnvelope;
  /** Grammar reference for every EventAction variant the dispatcher accepts. */
  actions: Record<string, ActionSpec>;
  widgets: WidgetManifestEntry[];
}

export const specEnvelope: SpecEnvelope = {
  uiField: 'ui',
  stateField: 'state',
  version: '1.0',
  aliasesNotAllowed: ['root', 'tree', 'view', 'body', 'content'],
  description:
    'A Ripple spec is a JSON object with two top-level fields that matter for ' +
    "rendering: `ui` (the node tree the renderer mounts — REQUIRED) and `state` " +
    '(the StateManager seed — required when any node uses `bind` or reads ' +
    '`{state.*}`). The renderable tree field is named `ui` exactly — never ' +
    '`root`, `tree`, `view`, `body`, or `content`. Specs that use those ' +
    'aliases will not render.',
  example: {
    version: '1.0',
    state: { draft: '', items: [] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'input', bind: 'draft', props: { placeholder: 'Add an item' } },
      ],
    },
  },
};

export const manifestEntries: WidgetManifestEntry[] = [
  accordionEntry,
  alertEntry,
  analystBarEntry,
  apiKeyEntry,
  askUserQuestionsEntry,
  appShellEntry,
  articleMetaEntry,
  auditLogEntry,
  avatarEntry,
  avatarGroupEntry,
  badgeEntry,
  breadcrumbEntry,
  bulkActionBarEntry,
  buttonEntry,
  c4Entry,
  calendarEntry,
  calloutEntry,
  cardEntry,
  chartEntry,
  checkboxEntry,
  chipEntry,
  citationEntry,
  coachmarkEntry,
  codeEntry,
  codeBlockEntry,
  codeEditorEntry,
  collapsibleEntry,
  colorPickerEntry,
  comboboxEntry,
  commandPaletteEntry,
  commentThreadEntry,
  companyHeaderEntry,
  analyticsDashboardEntry,
  checklistLayoutEntry,
  comparisonLayoutEntry,
  comparisonTableEntry,
  confirmDialogEntry,
  containerEntry,
  contextMenuEntry,
  copyEntry,
  dashboardEntry,
  dashboardSlotEntry,
  dataGridEntry,
  datePickerEntry,
  definitionListEntry,
  diffEntry,
  discoverCardEntry,
  dropdownMenuEntry,
  eachEntry,
  embedEntry,
  emptyStateEntry,
  entityDetailEntry,
  execDashboardEntry,
  errorStateEntry,
  fileUploadEntry,
  filterBarEntry,
  flexEntry,
  followUpEntry,
  formEntry,
  formLayoutEntry,
  funnelEntry,
  ganttEntry,
  gaugeEntry,
  glassCardEntry,
  gridEntry,
  headingEntry,
  heatmapEntry,
  heroEntry,
  highlightEntry,
  hoverCardEntry,
  iconEntry,
  ifEntry,
  imageEntry,
  inputEntry,
  invoiceLayoutEntry,
  invoiceLinesEntry,
  kanbanEntry,
  kbdEntry,
  kvTableEntry,
  linkPreviewEntry,
  loadingEntry,
  locationPickerEntry,
  mapEntry,
  markdownEntry,
  masterDetailEntry,
  mentionEntry,
  metricEntry,
  modalEntry,
  modelViewerEntry,
  multiSelectEntry,
  newsCardEntry,
  notificationCenterEntry,
  numberInputEntry,
  opsDashboardEntry,
  orderStatusEntry,
  orgChartEntry,
  otpInputEntry,
  pageHeaderEntry,
  peoplePickerEntry,
  pipelineDashboardEntry,
  permissionMatrixEntry,
  popoverEntry,
  pricingTableEntry,
  progressEntry,
  progressRingEntry,
  projectDashboardEntry,
  prosConsEntry,
  qrEntry,
  quoteEntry,
  radioGroupEntry,
  rangeBarEntry,
  ratingEntry,
  reportLayoutEntry,
  richTextEntry,
  rippleFrameEntry,
  sankeyEntry,
  savedViewsEntry,
  searchEntry,
  sectionEntry,
  segmentedEntry,
  selectEntry,
  separatorEntry,
  settingsListEntry,
  sheetEntry,
  sidebarEntry,
  skeletonEntry,
  sliderEntry,
  soulStatusEntry,
  sourceCardEntry,
  sourcesBarEntry,
  sparklineEntry,
  splitEntry,
  statEntry,
  statusDotEntry,
  stepsEntry,
  switchEntry,
  tableEntry,
  tabsEntry,
  terminalEntry,
  textEntry,
  textareaEntry,
  tickerEntry,
  timelineEntry,
  timePickerEntry,
  toastEntry,
  tooltipEntry,
  treeEntry,
  treemapEntry,
  treeTableEntry,
  trendEntry,
  virtualListEntry,
  wizardLayoutEntry,
  workflowEntry,
  // Composite consumer widgets (ocean-flow port, 2026-05-31)
  todoListEntry,
  drawingCanvasEntry,
  timerEntry,
  flashcardEntry,
  audioEntry,
  videoEntry,
];

export function buildManifest(): WidgetManifest {
  if (manifestEntries.length === 0) {
    throw new Error('No manifest entries registered');
  }
  return {
    schema: 'ripple.manifest/v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    spec: specEnvelope,
    actions: manifestActions,
    widgets: manifestEntries,
  };
}
