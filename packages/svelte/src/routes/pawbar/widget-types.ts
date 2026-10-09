// routes/pawbar/widget-types.ts — Widget types a chat card may use: the vendored
// static/manifest.json types minus embed, ripple-frame and richtext (they render
// frames or raw HTML), rich-text (a Tiptap editor its value seeds as HTML), and
// map and company-header (they fetch third-party tiles and logos the CSP blocks). Canonical
// names only, no registry aliases (iframe, frame, nested-spec, label, ...), the
// same list the backend validates against. card-policy.test.ts fails if this
// drifts from the manifest; regenerate it from there.

export const CHAT_WIDGET_TYPES: ReadonlySet<string> = new Set([
	'accordion', 'alert', 'analyst-bar', 'analytics-dashboard', 'animated-beam', 'api-key',
	'app-shell', 'approval-gate', 'article-meta', 'ask-user-questions', 'audio', 'audit-log',
	'aurora', 'avatar', 'avatar-group', 'badge', 'bento-grid', 'bill-split', 'board-game', 'booking', 'border-beam', 'breadcrumb',
	'bulk-action-bar', 'button', 'c4', 'calendar', 'callout', 'card', 'chart', 'checkbox',
	'checkbox-group', 'checklist-layout', 'chip', 'citation', 'coachmark', 'code', 'code-block',
	'code-editor', 'collapsible', 'color-picker', 'combobox', 'command-palette', 'comment-thread',
	'comparison-layout', 'comparison-table', 'confirm-dialog', 'container', 'context-menu', 'copy',
	'cta', 'dashboard', 'dashboard-slot', 'data-grid', 'date-picker', 'definition-list', 'diff',
	'discover-card', 'drawing-canvas', 'dropdown-menu', 'each', 'empty-state', 'entity-detail',
	'error-state', 'exec-dashboard', 'faq', 'feature-grid', 'file-upload', 'fill-grid', 'filter-bar',
	'flashcard', 'flashcard-deck', 'flex', 'follow-up', 'footer', 'form', 'form-layout', 'funnel',
	'gantt', 'gauge', 'glass-card', 'glyph-grid', 'grid', 'growth-projection', 'heading', 'heatmap',
	'hero', 'highlight', 'hover-card', 'icon', 'if', 'illustration', 'image', 'input', 'interval-workout',
	'invoice-layout', 'invoice-lines', 'itinerary', 'kanban', 'kbd', 'kv-table', 'led-clock',
	'link-preview', 'loading', 'location-picker', 'logo-cloud', 'markdown', 'marketing-hero',
	'marquee', 'master-detail', 'meal-plan', 'mention', 'menu-order', 'metric', 'modal',
	'model-viewer', 'multi-select', 'navbar', 'news-card', 'newsletter', 'notification-center',
	'number-input', 'ops-dashboard', 'order-status', 'org-chart', 'otp-input', 'page-header',
	'parallax', 'people-picker', 'permission-matrix', 'pipeline-dashboard', 'popover',
	'pricing-table', 'progress', 'progress-ring', 'project-dashboard', 'pros-cons', 'qr', 'quote',
	'radio-group', 'range-bar', 'rating', 'reasoning-trace', 'recipe', 'report-layout', 'reveal',
	'sankey', 'saved-views', 'search', 'section', 'segmented', 'seismograph', 'select', 'separator',
	'settings-list', 'sheet', 'shimmer', 'sidebar', 'skeleton', 'slider', 'soul-status',
	'source-card', 'sources-bar', 'sparkline', 'split', 'spotlight', 'stat', 'status-dot', 'steps',
	'streak-bars', 'stream-text', 'switch', 'table', 'tabs', 'terminal', 'testimonial', 'text',
	'text-effect', 'textarea', 'ticker', 'time-picker', 'timeline', 'timer', 'toast', 'todo-list',
	'tool-call', 'tooltip', 'tree', 'tree-table', 'treemap', 'trend', 'video', 'virtual-list',
	'wizard-layout', 'workflow'
]);
