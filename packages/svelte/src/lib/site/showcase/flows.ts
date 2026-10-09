// site/showcase/flows.ts — The Flows facet of /showcase: multi-widget specs
// whose point is the wiring (bound state, each/if, push/remove, confirm,
// derived totals), not any one widget. They are not manifest entries, so this
// is their single source: the index cards, /showcase/flows/<id> and the
// spotlight all read FLOWS. Public page content: fictional people and
// products only, no dashes or emoji in visible copy (catalog.test.ts checks).

type Spec = Record<string, unknown>;

export interface ShowcaseFlow {
	id: string;
	title: string;
	line: string;
	spec: Spec;
}

const counterFlow: Spec = {
	version: '1.0',
	state: { count: 0 },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{ type: 'text', props: { text: 'Count: {state.count}', size: 'xl', weight: 'bold' } },
			{
				type: 'flex',
				props: { gap: '8px' },
				children: [
					{ type: 'button', props: { label: '+1' }, on_click: { action: 'set', target: 'count', value: '{state.count + 1}' } },
					{ type: 'button', props: { label: '-1', variant: 'outline' }, on_click: { action: 'set', target: 'count', value: '{state.count - 1}' } },
					{ type: 'button', props: { label: 'Reset', variant: 'ghost' }, on_click: { action: 'set', target: 'count', value: 0 } },
				]
			},
			{ type: 'progress', props: { value: '{state.count}', max: 20 } },
		]
	}
};

const formFlow: Spec = {
	version: '1.0',
	state: { name: '', role: '', agreed: false },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{ type: 'input', props: { label: 'Full Name', placeholder: 'Jane Doe' }, bind: 'name' },
			{ type: 'select', props: { placeholder: 'Select role', options: ['Engineer', 'Designer', 'PM', 'Other'] }, bind: 'role' },
			{ type: 'checkbox', props: { label: 'I accept the terms and conditions' }, bind: 'agreed' },
			{
				type: 'if',
				condition: '{state.name && state.role && state.agreed}',
				children: [
					{ type: 'button', props: { label: 'Submit' }, on_click: { action: 'emit', target: 'form-submit' } }
				],
				else_children: [
					{ type: 'button', props: { label: 'Submit', disabled: true } }
				]
			},
			{ type: 'text', props: { text: 'Preview: {state.name}, {state.role}', size: 'xs' } },
		]
	}
};

// Live Calculator: bind on number inputs, arithmetic in expressions
const calculatorFlow: Spec = {
	version: '1.0',
	state: { a: 5, b: 3, op: '+' },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '10px' },
		children: [
			{
				type: 'flex',
				props: { gap: '8px', align: 'end' },
				children: [
					{ type: 'input', props: { label: 'A', type: 'number' }, bind: 'a', class: 'flex-1' },
					{
						type: 'select',
						props: { options: ['+', '-', '*', '/'] },
						bind: 'op',
						class: 'w-20'
					},
					{ type: 'input', props: { label: 'B', type: 'number' }, bind: 'b', class: 'flex-1' }
				]
			},
			{
				type: 'if',
				condition: '{state.op == "+"}',
				children: [{ type: 'text', props: { text: '{state.a} + {state.b} = {state.a + state.b}', size: 'lg', weight: 'semibold' } }]
			},
			{
				type: 'if',
				condition: '{state.op == "-"}',
				children: [{ type: 'text', props: { text: '{state.a} − {state.b} = {state.a - state.b}', size: 'lg', weight: 'semibold' } }]
			},
			{
				type: 'if',
				condition: '{state.op == "*"}',
				children: [{ type: 'text', props: { text: '{state.a} × {state.b} = {state.a * state.b}', size: 'lg', weight: 'semibold' } }]
			},
			{
				type: 'if',
				condition: '{state.op == "/"}',
				children: [{ type: 'text', props: { text: '{state.a} ÷ {state.b} = {state.a / state.b}', size: 'lg', weight: 'semibold' } }]
			}
		]
	}
};

// Stepper Wizard: current step drives which content + buttons appear
const wizardFlow: Spec = {
	version: '1.0',
	state: { step: 1, account: '', plan: '' },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{ type: 'text', props: { text: 'Step {state.step} of 3', size: 'xs' } },
			{ type: 'progress', props: { max: 3 }, bind: 'step' },

			{
				type: 'if',
				condition: '{state.step == 1}',
				children: [
					{ type: 'heading', props: { text: 'Create your account', level: 4 } },
					{ type: 'input', props: { label: 'Email', placeholder: 'you@company.com' }, bind: 'account' }
				]
			},
			{
				type: 'if',
				condition: '{state.step == 2}',
				children: [
					{ type: 'heading', props: { text: 'Pick a plan', level: 4 } },
					{
						type: 'select',
						props: { placeholder: 'Choose…', options: ['Free', 'Pro', 'Enterprise'] },
						bind: 'plan'
					}
				]
			},
			{
				type: 'if',
				condition: '{state.step == 3}',
				children: [
					{ type: 'heading', props: { text: 'Confirm', level: 4 } },
					{ type: 'text', props: { text: 'Account: {state.account}', size: 'sm' } },
					{ type: 'text', props: { text: 'Plan: {state.plan}', size: 'sm' } }
				]
			},

			{
				type: 'flex',
				props: { gap: '8px' },
				children: [
					{
						type: 'if',
						condition: '{state.step > 1}',
						children: [
							{
								type: 'button',
								props: { label: 'Back', variant: 'outline' },
								on_click: { action: 'set', target: 'step', value: '{state.step - 1}' }
							}
						]
					},
					{
						type: 'if',
						condition: '{state.step < 3}',
						children: [
							{
								type: 'button',
								props: { label: 'Next' },
								on_click: { action: 'set', target: 'step', value: '{state.step + 1}' }
							}
						]
					},
					{
						type: 'if',
						condition: '{state.step == 3}',
						children: [
							{
								type: 'button',
								props: { label: 'Submit' },
								on_click: [
									{ action: 'toast', message: 'Account created for {state.account} on the {state.plan} plan!', variant: 'success' },
									{ action: 'set', target: 'step', value: 1 },
									{ action: 'set', target: 'account', value: '' },
									{ action: 'set', target: 'plan', value: '' }
								]
							}
						]
					}
				]
			}
		]
	}
};

// Dynamic todo list: push/remove array actions; clear input after add via flow
const todoFlow: Spec = {
	version: '1.0',
	state: { items: ['Buy milk', 'Read changelog'], draft: '' },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: [
			{
				type: 'flex',
				props: { gap: '6px' },
				children: [
					{
						type: 'input',
						bind: 'draft',
						props: { placeholder: 'New item...', class: 'flex-1' }
					},
					{
						type: 'button',
						props: { label: 'Add' },
						on_click: {
							action: 'flow',
							steps: [
								{ action: 'validate', condition: '{state.draft.trim() != ""}', message: 'Type something first.' },
								{ action: 'push', target: 'items', value: '{state.draft.trim()}' },
								{ action: 'set', target: 'draft', value: '' }
							]
						}
					}
				]
			},
			{
				type: 'each',
				items: 'items',
				item_as: 'item',
				index_as: 'i',
				children: [
					{
						type: 'flex',
						props: { gap: '6px', align: 'center' },
						children: [
							{ type: 'text', props: { text: '• {item}' }, class: 'flex-1' },
							{
								type: 'button',
								props: { label: '✕', variant: 'ghost', size: 'sm' },
								on_click: { action: 'remove', target: 'items', value: '{item}' }
							}
						]
					}
				]
			},
			{ type: 'text', props: { text: '{state.items.length} items', size: 'xs' } }
		]
	}
};

// Side-by-side comparison: two cards in a grid driven by the same state
const compareFlow: Spec = {
	version: '1.0',
	state: { plan: 'pro' },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'radio-group',
				props: {
					label: 'Choose your plan',
					options: [
						{ value: 'free', label: 'Free' },
						{ value: 'pro', label: 'Pro' },
						{ value: 'enterprise', label: 'Enterprise' }
					]
				},
				bind: 'plan'
			},
			{
				type: 'grid',
				props: { columns: 2, gap: '12px' },
				children: [
					{
						type: 'card',
						props: { title: 'Free', variant: '{state.plan == "free" ? "selected" : "default"}' },
						children: [
							{ type: 'text', props: { text: '$0 / month', size: 'lg', weight: 'semibold' } },
							{ type: 'text', props: { text: '• 1 user' } },
							{ type: 'text', props: { text: '• Community support' } }
						]
					},
					{
						type: 'card',
						props: { title: 'Pro', variant: '{state.plan == "pro" ? "selected" : "default"}' },
						children: [
							{ type: 'text', props: { text: '$19 / month', size: 'lg', weight: 'semibold' } },
							{ type: 'text', props: { text: '• Up to 10 users' } },
							{ type: 'text', props: { text: '• Priority support' } }
						]
					}
				]
			}
		]
	}
};

// Multi-select chips: toggle action adds/removes values from an array
const multiSelectFlow: Spec = {
	version: '1.0',
	state: {
		selected: ['svelte'],
		tags: ['svelte', 'react', 'vue', 'solid', 'qwik', 'angular']
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: [
			{ type: 'text', props: { text: 'Pick your stack:', size: 'sm' } },
			{
				type: 'flex',
				props: { gap: '6px', wrap: 'wrap' },
				children: [
					{
						type: 'each',
						items: 'tags',
						item_as: 'tag',
						children: [
							{
								type: 'button',
								props: {
									label: '{tag}',
									variant: '{state.selected.includes(tag) ? "default" : "outline"}',
									size: 'sm'
								},
								on_click: { action: 'toggle', target: 'selected', value: '{tag}' }
							}
						]
					}
				]
			},
			{ type: 'text', props: { text: 'selected: {state.selected.join(", ")}', size: 'xs' } }
		]
	}
};

// Live Filter: input + each + if condition with case-insensitive substring match
const filterFlow: Spec = {
	version: '1.0',
	state: {
		query: '',
		people: [
			{ name: 'Alice Chen', role: 'Engineer' },
			{ name: 'Bob Kumar', role: 'Designer' },
			{ name: 'Carol Smith', role: 'PM' },
			{ name: 'Dana Singh', role: 'Engineer' },
			{ name: 'Eve Park', role: 'Researcher' }
		]
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: [
			{ type: 'input', props: { placeholder: 'Filter by name or role...' }, bind: 'query' },
			{
				type: 'each',
				items: 'people',
				item_as: 'p',
				children: [
					{
						type: 'if',
						condition: '{p.name.toLowerCase().includes(state.query.toLowerCase()) || p.role.toLowerCase().includes(state.query.toLowerCase())}',
						children: [
							{
								type: 'flex',
								props: { gap: '8px', align: 'center' },
								children: [
									{ type: 'avatar', props: { name: '{p.name}', size: 'sm' } },
									{ type: 'text', props: { text: '{p.name}', weight: 'medium' } },
									{ type: 'badge', props: { text: '{p.role}', variant: 'secondary' } }
								]
							}
						]
					}
				]
			}
		]
	}
};

// Delete with Confirmation: confirm action → toast on confirm
const confirmFlow: Spec = {
	version: '1.0',
	state: { item: 'project-alpha' },
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '10px' },
		children: [
			{ type: 'text', props: { text: 'Item: {state.item}', size: 'sm' } },
			{
				type: 'button',
				props: { label: 'Delete', variant: 'destructive' },
				on_click: {
					action: 'confirm',
					title: 'Delete {state.item}?',
					message: 'This cannot be undone. Type the name in your head and click Confirm.',
					confirm_label: 'Delete',
					cancel_label: 'Keep',
					on_confirm: [
						{ action: 'set', target: 'item', value: '(deleted)' },
						{ action: 'toast', message: 'Deleted.', variant: 'success' }
					],
					on_cancel: [
						{ action: 'toast', message: 'Cancelled. Nothing was deleted.' }
					]
				}
			}
		]
	}
};

// Settings Page: fat form with all input types + dirty tracking
const settingsFlow: Spec = {
	version: '1.0',
	state: {
		saved: { name: 'Ada Moreno', email: 'ada@example.com', role: 'engineer', bio: 'Founding engineer.', dark: true, emailDigests: true, dailySummary: false, language: 'en', fontSize: 14, notify: 'email', dob: '1990-12-10', rating: 4 },
		draft: { name: 'Ada Moreno', email: 'ada@example.com', role: 'engineer', bio: 'Founding engineer.', dark: true, emailDigests: true, dailySummary: false, language: 'en', fontSize: 14, notify: 'email', dob: '1990-12-10', rating: 4 },
		_toast: ''
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '16px' },
		children: [
			{ type: 'page-header', props: { eyebrow: 'Account', title: 'Settings', subtitle: 'Edit and save. Every input is bound to draft state.' } },

			// Profile section
			{
				type: 'section',
				props: { title: 'Profile', description: 'Your public information.' },
				children: [
					{
						type: 'grid',
						props: { columns: 2, gap: '12px' },
						children: [
							{ type: 'input', props: { label: 'Name' }, bind: 'draft.name' },
							{ type: 'input', props: { label: 'Email', type: 'email' }, bind: 'draft.email' }
						]
					},
					{
						type: 'select',
						props: {
							label: 'Role',
							options: [
								{ value: 'engineer', label: 'Engineer' },
								{ value: 'designer', label: 'Designer' },
								{ value: 'pm', label: 'Product Manager' },
								{ value: 'researcher', label: 'Researcher' }
							]
						},
						bind: 'draft.role'
					},
					{ type: 'textarea', props: { label: 'Bio', rows: 2 }, bind: 'draft.bio' },
					{ type: 'input', props: { label: 'Date of birth', type: 'date' }, bind: 'draft.dob' }
				]
			},

			{ type: 'separator' },

			// Preferences section
			{
				type: 'section',
				props: { title: 'Preferences', description: 'How the app feels.' },
				children: [
					{
						type: 'flex',
						props: { direction: 'column', gap: '8px' },
						children: [
							{ type: 'switch', props: { label: 'Dark mode' }, bind: 'draft.dark' },
							{ type: 'checkbox', props: { label: 'Email me weekly digests' }, bind: 'draft.emailDigests' },
							{ type: 'checkbox', props: { label: 'Daily summary at 9am' }, bind: 'draft.dailySummary' }
						]
					},
					{
						type: 'select',
						props: {
							label: 'Language',
							options: [
								{ value: 'en', label: 'English' },
								{ value: 'es', label: 'Español' },
								{ value: 'fr', label: 'Français' },
								{ value: 'de', label: 'Deutsch' }
							]
						},
						bind: 'draft.language'
					},
					{ type: 'slider', props: { label: 'Font size', min: 12, max: 22, step: 1 }, bind: 'draft.fontSize' }
				]
			},

			{ type: 'separator' },

			// Notifications
			{
				type: 'section',
				props: { title: 'Notifications', description: 'Where to reach you.' },
				children: [
					{
						type: 'radio-group',
						props: {
							options: [
								{ value: 'email', label: 'Email only' },
								{ value: 'push', label: 'Push notifications' },
								{ value: 'sms', label: 'SMS' },
								{ value: 'none', label: 'None' }
							]
						},
						bind: 'draft.notify'
					}
				]
			},

			{ type: 'separator' },

			// Feedback
			{
				type: 'section',
				props: { title: 'Feedback', description: 'How are we doing?' },
				children: [
					{ type: 'rating', props: { label: 'Rate this product', max: 5, showValue: true }, bind: 'draft.rating' }
				]
			},

			{ type: 'separator' },

			// Save / Reset
			{
				type: 'flex',
				props: { gap: '8px', justify: 'end' },
				children: [
					{
						type: 'button',
						props: { label: 'Reset', variant: 'outline' },
						on_click: [
							{ action: 'set', target: 'draft', value: '{state.saved}' },
							{ action: 'toast', message: 'Reverted to last saved.' }
						]
					},
					{
						type: 'button',
						props: { label: 'Save changes' },
						on_click: [
							{ action: 'set', target: 'saved', value: '{state.draft}' },
							{ action: 'toast', message: 'Settings saved.', variant: 'success' }
						]
					}
				]
			}
		]
	}
};

// Mini Inbox: master/detail with multi-select + bulk actions
const inboxFlow: Spec = {
	version: '1.0',
	state: {
		messages: [
			{ id: 1, from: 'Ada Moreno', subject: 'Re: API design review', preview: "I've left comments inline. Most things are nits, but the auth flow needs another pass.", read: false, starred: true, body: "I've left comments inline. Most things are nits, but the auth flow needs another pass: the refresh token semantics aren't obvious from the docstring." },
			{ id: 2, from: 'Bob Kumar', subject: 'Friday demo prep', preview: 'Slides outline attached. Can we slot 30m on Thursday?', read: false, starred: false, body: 'Slides outline attached. Can we slot 30m on Thursday for a dry run? Also, should we record? I think it would help the GTM team.' },
			{ id: 3, from: 'Carol Smith', subject: 'New onboarding copy', preview: 'Marketing wants to land the new hero by EOM.', read: true, starred: false, body: 'Marketing wants to land the new hero by EOM. Pushed first draft to Figma, link inside. Want a quick read before they ship?' },
			{ id: 4, from: 'Dana Singh', subject: 'p99 latency dashboard', preview: 'Spotted a regression after yesterday\'s deploy.', read: true, starred: true, body: 'Spotted a regression after yesterday\'s deploy. p99 from 280ms to 410ms on /search. Created an issue, but heads-up.' },
			{ id: 5, from: 'Eve Park', subject: 'Welcome aboard', preview: 'Looking forward to meeting on Monday. Here\'s your reading list.', read: true, starred: false, body: 'Looking forward to meeting on Monday. Here\'s your reading list. The first three are required; the rest are useful when you find time.' }
		],
		selectedIds: [],
		openId: 1
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			// Toolbar: appears differently when there's a selection
			{
				type: 'flex',
				props: { gap: '8px', align: 'center' },
				children: [
					{ type: 'heading', props: { text: 'Inbox', level: 4 } },
					{ type: 'badge', props: { text: '{state.selectedIds.length} selected', variant: 'secondary' }, show: '{state.selectedIds.length > 0}' },
					{ type: 'text', props: { text: '{state.messages.length} total · {state.messages.length - state.selectedIds.length} unselected', size: 'xs' } },
					// Bulk actions when there's a selection
					{
						type: 'if',
						condition: '{state.selectedIds.length > 0}',
						children: [
							{
								type: 'flex',
								props: { gap: '6px' },
								class: 'ml-auto',
								children: [
									{
										type: 'button',
										props: { label: 'Mark read', size: 'sm', variant: 'outline' },
										on_click: [
											// Iterate via each pattern is overkill; we just clear selection and rely on per-row toggle
											{ action: 'toast', message: 'Marked {state.selectedIds.length} as read (demo: per-row toggle below).' }
										]
									},
									{
										type: 'button',
										props: { label: 'Clear', size: 'sm', variant: 'ghost' },
										on_click: { action: 'set', target: 'selectedIds', value: [] }
									}
								]
							}
						]
					}
				]
			},

			{
				type: 'grid',
				props: { columns: 2, gap: '12px' },
				style: { 'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' },
				children: [
					// List
					{
						type: 'flex',
						props: { direction: 'column', gap: '4px' },
						children: [
							{
								type: 'each',
								items: 'messages',
								item_as: 'msg',
								index_as: 'i',
								children: [
									{
										type: 'flex',
										props: { gap: '8px', align: 'start' },
										class: '{state.openId == msg.id ? "rounded-md bg-muted/60 border border-border p-2" : "rounded-md border border-transparent p-2 hover:bg-muted/30"}',
										children: [
											{
												type: 'checkbox',
												props: { },
												value: '{state.selectedIds.includes(msg.id)}',
												on_change: { action: 'toggle', target: 'selectedIds', value: '{msg.id}' }
											},
											{
												type: 'flex',
												props: { direction: 'column', gap: '2px' },
												class: 'flex-1 min-w-0 cursor-pointer',
												children: [
													{
														type: 'flex',
														props: { gap: '6px', align: 'center' },
														children: [
															{ type: 'text', props: { text: '{msg.from}', size: 'sm', weight: '{msg.read ? "normal" : "semibold"}' } },
															{ type: 'badge', props: { text: 'Unread', variant: 'default' }, show: '{!msg.read}' },
															{ type: 'text', props: { text: '★', size: 'xs' }, show: '{msg.starred}' }
														]
													},
													{ type: 'text', props: { text: '{msg.subject}', size: 'sm', weight: '{msg.read ? "normal" : "medium"}' } },
													{ type: 'text', props: { text: '{msg.preview}', size: 'xs', class: 'truncate' } }
												],
												on_click: [
													{ action: 'set', target: 'openId', value: '{msg.id}' },
													{ action: 'set', target: 'messages.{i}.read', value: true }
												]
											}
										]
									}
								]
							}
						]
					},

					// Detail
					{
						type: 'card',
						props: { title: 'Message' },
						children: [
							{
								type: 'each',
								items: 'messages',
								item_as: 'msg',
								index_as: 'i',
								children: [
									{
										type: 'if',
										condition: '{state.openId == msg.id}',
										children: [
											{
												type: 'flex',
												props: { direction: 'column', gap: '10px' },
												children: [
													{ type: 'heading', props: { text: '{msg.subject}', level: 4 } },
													{
														type: 'flex',
														props: { gap: '8px', align: 'center' },
														children: [
															{ type: 'avatar', props: { name: '{msg.from}', size: 'sm' } },
															{ type: 'text', props: { text: '{msg.from}', weight: 'medium' } }
														]
													},
													{ type: 'separator' },
													{ type: 'text', props: { text: '{msg.body}' } },
													{ type: 'separator' },
													{
														type: 'flex',
														props: { gap: '6px' },
														children: [
															{
																type: 'button',
																props: { label: '{msg.starred ? "Unstar" : "Star"}', size: 'sm', variant: 'outline' },
																on_click: { action: 'set', target: 'messages.{i}.starred', value: '{!msg.starred}' }
															},
															{
																type: 'button',
																props: { label: '{msg.read ? "Mark unread" : "Mark read"}', size: 'sm', variant: 'ghost' },
																on_click: { action: 'set', target: 'messages.{i}.read', value: '{!msg.read}' }
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
};

// Invoice Builder: array CRUD with per-line totals + sum
const invoiceFlow: Spec = {
	version: '1.0',
	state: {
		lines: [
			{ description: 'Initial design pass', qty: 1, price: 1200, total: 1200 },
			{ description: 'Frontend implementation', qty: 8, price: 150, total: 1200 },
			{ description: 'QA + handoff', qty: 4, price: 90, total: 360 }
		],
		taxRate: 8,
		discount: 100
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{ type: 'page-header', props: { eyebrow: 'Billing', title: 'New invoice', subtitle: 'Add line items; line totals and grand total update live.' } },

			// Line items
			{
				type: 'flex',
				props: { direction: 'column', gap: '6px' },
				children: [
					{
						type: 'each',
						items: 'lines',
						item_as: 'line',
						index_as: 'i',
						children: [
							{
								type: 'flex',
								props: { gap: '8px', align: 'end' },
								children: [
									{
										type: 'input',
										props: { label: '{i == 0 ? "Description" : ""}', class: 'flex-1' },
										bind: 'lines.{i}.description'
									},
									{
										type: 'input',
										props: { label: '{i == 0 ? "Qty" : ""}', type: 'number', class: 'w-20' },
										bind: 'lines.{i}.qty',
										on_change: { action: 'set', target: 'lines.{i}.total', value: '{line.qty * line.price}' }
									},
									{
										type: 'input',
										props: { label: '{i == 0 ? "Unit price" : ""}', type: 'number', class: 'w-28' },
										bind: 'lines.{i}.price',
										on_change: { action: 'set', target: 'lines.{i}.total', value: '{line.qty * line.price}' }
									},
									{ type: 'text', props: { text: '${line.total}', size: 'sm', class: 'w-20 text-right tabular-nums font-medium' } },
									{
										type: 'button',
										props: { label: '✕', size: 'sm', variant: 'ghost' },
										on_click: { action: 'remove', target: 'lines', value: '{line}' }
									}
								]
							}
						]
					},
					{
						type: 'button',
						props: { label: '+ Add line', variant: 'outline', size: 'sm' },
						on_click: { action: 'push', target: 'lines', value: { description: '', qty: 1, price: 0, total: 0 } }
					}
				]
			},

			{ type: 'separator' },

			// Tax + discount
			{
				type: 'grid',
				props: { columns: 2, gap: '12px' },
				children: [
					{ type: 'slider', props: { label: 'Tax rate (%)', min: 0, max: 25, step: 0.5 }, bind: 'taxRate' },
					{ type: 'input', props: { label: 'Discount ($)', type: 'number' }, bind: 'discount' }
				]
			},

			{ type: 'separator' },

			// Totals
			{
				type: 'flex',
				props: { direction: 'column', gap: '4px', align: 'end' },
				children: [
					{
						type: 'definition-list',
						props: {
							items: [
								{ term: 'Subtotal', definition: '${state.lines.sum("total")}' },
								{ term: 'Tax', definition: '{state.taxRate}%' },
								{ term: 'Discount', definition: '-${state.discount}' }
							]
						}
					}
				]
			},

			// Issue button with confirm
			{
				type: 'flex',
				props: { gap: '8px', justify: 'end' },
				children: [
					{
						type: 'button',
						props: { label: 'Issue invoice' },
						on_click: {
							action: 'confirm',
							title: 'Issue this invoice?',
							message: 'Issuing locks the line items and emails the recipient.',
							confirm_label: 'Issue',
							on_confirm: [
								{ action: 'toast', message: 'Invoice issued.', variant: 'success' }
							]
						}
					}
				]
			}
		]
	}
};

// Issue Tracker: comprehensive E2E flow where every interaction is wired
const issueTrackerFlow: Spec = {
	version: '1.0',
	state: {
		issues: [
			{ id: 1, title: 'Login broken on Safari', body: 'Users on iOS 17 see a blank screen after submitting the form.', status: 'open', priority: 'high', assignee: 'Ada' },
			{ id: 2, title: 'Search returns stale results', body: 'After deleting an item, it still appears in search until the index rebuilds.', status: 'in_progress', priority: 'medium', assignee: 'Bob' },
			{ id: 3, title: 'Add a chat integration', body: 'Customers want notifications when a thread is updated.', status: 'open', priority: 'low', assignee: 'Carol' },
			{ id: 4, title: 'p99 latency regression', body: 'Last deploy bumped p99 from 280ms to 410ms on the search endpoint.', status: 'in_progress', priority: 'high', assignee: 'Dana' },
			{ id: 5, title: 'Update onboarding copy', body: 'Marketing requested fresh copy on the welcome step.', status: 'closed', priority: 'low', assignee: 'Eve' }
		],
		query: '',
		statusFilter: 'all',
		selected: 1,
		draftTitle: '',
		nextId: 6
	},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			// Header
			{
				type: 'page-header',
				props: { eyebrow: 'Project', title: 'Issues', subtitle: 'A complete spec where every button, dropdown, and filter is wired.' }
			},

			// Filter row
			{
				type: 'flex',
				props: { gap: '8px', align: 'center' },
				children: [
					{ type: 'input', props: { placeholder: 'Search title or assignee...', class: 'flex-1' }, bind: 'query' },
					{
						type: 'select',
						props: {
							placeholder: 'All statuses',
							options: [
								{ value: 'all', label: 'All' },
								{ value: 'open', label: 'Open' },
								{ value: 'in_progress', label: 'In progress' },
								{ value: 'closed', label: 'Closed' }
							]
						},
						bind: 'statusFilter'
					}
				]
			},

			// Two-pane: list + detail
			{
				type: 'grid',
				props: { columns: 2, gap: '12px' },
				style: { 'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' },
				children: [
					// ── master list
					{
						type: 'flex',
						props: { direction: 'column', gap: '6px' },
						children: [
							{
								type: 'each',
								items: 'issues',
								item_as: 'issue',
								index_as: 'i',
								children: [
									{
										type: 'if',
										condition: '{(state.statusFilter == "all" || issue.status == state.statusFilter) && (state.query.trim() == "" || issue.title.toLowerCase().includes(state.query.toLowerCase()) || issue.assignee.toLowerCase().includes(state.query.toLowerCase()))}',
										children: [
											{
												type: 'flex',
												props: { gap: '8px', align: 'center' },
												class: '{state.selected == issue.id ? "rounded-md bg-muted/60 border border-border p-2" : "rounded-md border border-transparent p-2 hover:bg-muted/30"}',
												children: [
													{
														type: 'flex',
														props: { direction: 'column', gap: '2px' },
														class: 'flex-1 min-w-0 cursor-pointer',
														children: [
															{
																type: 'flex',
																props: { gap: '6px', align: 'center' },
																children: [
																	{ type: 'text', props: { text: '{issue.title}', size: 'sm', weight: 'medium' } },
																	{ type: 'badge', props: { text: '{issue.priority}', variant: '{issue.priority == "high" ? "destructive" : issue.priority == "medium" ? "default" : "secondary"}' } }
																]
															},
															{ type: 'text', props: { text: '@{issue.assignee} · {issue.status}', size: 'xs' } }
														],
														on_click: { action: 'set', target: 'selected', value: '{issue.id}' }
													},
													{
														type: 'dropdown-menu',
														props: {
															label: '⋯',
															triggerVariant: 'ghost',
															hideChevron: true,
															align: 'end',
															items: [
																{ label: 'Mark in progress', icon: 'play', value: 'progress-{i}' },
																{ label: 'Mark closed', icon: 'check', value: 'close-{i}' },
																{ label: 'Reopen', icon: 'rotate-ccw', value: 'reopen-{i}' },
																{ type: 'separator' },
																{ label: 'Delete', icon: 'trash-2', value: 'delete-{issue.id}', variant: 'destructive' }
															]
														},
														on_change: {
															action: 'flow',
															steps: [
																// Stash the dropdown value into state so the branches can read it.
																{ action: 'set', target: '_row_action' },
																{
																	action: 'branch',
																	if: '{state._row_action.startsWith("progress-")}',
																	then: [
																		{ action: 'set', target: 'issues.{i}.status', value: 'in_progress' },
																		{ action: 'toast', message: 'Moved to in progress.' }
																	]
																},
																{
																	action: 'branch',
																	if: '{state._row_action.startsWith("close-")}',
																	then: [
																		{ action: 'set', target: 'issues.{i}.status', value: 'closed' },
																		{ action: 'toast', message: 'Closed issue.', variant: 'success' }
																	]
																},
																{
																	action: 'branch',
																	if: '{state._row_action.startsWith("reopen-")}',
																	then: [
																		{ action: 'set', target: 'issues.{i}.status', value: 'open' },
																		{ action: 'toast', message: 'Reopened.' }
																	]
																},
																{
																	action: 'branch',
																	if: '{state._row_action.startsWith("delete-")}',
																	then: [
																		{
																			action: 'confirm',
																			title: 'Delete this issue?',
																			message: 'This cannot be undone.',
																			confirm_label: 'Delete',
																			on_confirm: [
																				{ action: 'remove', target: 'issues', value: '{issue}' },
																				{ action: 'toast', message: 'Deleted.', variant: 'success' }
																			]
																		}
																	]
																}
															]
														}
													}
												]
											}
										]
									}
								]
							},

							// Empty state
							{
								type: 'if',
								condition: '{state.issues.length == 0}',
								children: [
									{
										type: 'empty-state',
										props: { icon: 'inbox', title: 'No issues yet', description: 'Add the first one below.' }
									}
								]
							},

							// Add new
							{
								type: 'flex',
								props: { gap: '6px' },
								children: [
									{ type: 'input', bind: 'draftTitle', props: { placeholder: 'New issue title...', class: 'flex-1' } },
									{
										type: 'button',
										props: { label: 'Add' },
										on_click: {
											action: 'flow',
											steps: [
												{ action: 'validate', condition: '{state.draftTitle.trim() != ""}', message: 'Type a title first.' },
												{ action: 'push', target: 'issues', value: { id: '{state.nextId}', title: '{state.draftTitle.trim()}', body: '', status: 'open', priority: 'medium', assignee: 'You' } },
												{ action: 'set', target: 'nextId', value: '{state.nextId + 1}' },
												{ action: 'set', target: 'selected', value: '{state.nextId - 1}' },
												{ action: 'set', target: 'draftTitle', value: '' },
												{ action: 'toast', message: 'Issue created.', variant: 'success' }
											]
										}
									}
								]
							}
						]
					},

					// ── detail
					{
						type: 'card',
						props: { title: 'Detail' },
						children: [
							{
								type: 'each',
								items: 'issues',
								item_as: 'issue',
								index_as: 'i',
								children: [
									{
										type: 'if',
										condition: '{state.selected == issue.id}',
										children: [
											{
												type: 'flex',
												props: { direction: 'column', gap: '10px' },
												children: [
													{ type: 'heading', props: { text: '{issue.title}', level: 4 } },
													{
														type: 'flex',
														props: { gap: '8px', wrap: 'wrap' },
														children: [
															{ type: 'badge', props: { text: '{issue.status}' } },
															{ type: 'badge', props: { text: '{issue.priority}', variant: '{issue.priority == "high" ? "destructive" : "secondary"}' } },
															{ type: 'badge', props: { text: '@{issue.assignee}', variant: 'outline' } }
														]
													},
													{ type: 'text', props: { text: '{issue.body}', size: 'sm' } },
													{ type: 'separator' },
													{
														type: 'flex',
														props: { direction: 'column', gap: '6px' },
														children: [
															{ type: 'text', props: { text: 'Status', size: 'xs', weight: 'medium' } },
															{
																type: 'select',
																props: {
																	value: '{issue.status}',
																	options: [
																		{ value: 'open', label: 'Open' },
																		{ value: 'in_progress', label: 'In progress' },
																		{ value: 'closed', label: 'Closed' }
																	]
																},
																on_change: { action: 'set', target: 'issues.{i}.status' }
															}
														]
													},
													{
														type: 'flex',
														props: { direction: 'column', gap: '6px' },
														children: [
															{ type: 'text', props: { text: 'Priority', size: 'xs', weight: 'medium' } },
															{
																type: 'select',
																props: {
																	value: '{issue.priority}',
																	options: [
																		{ value: 'low', label: 'Low' },
																		{ value: 'medium', label: 'Medium' },
																		{ value: 'high', label: 'High' }
																	]
																},
																on_change: { action: 'set', target: 'issues.{i}.priority' }
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			},

			// Stats footer
			{
				type: 'flex',
				props: { gap: '16px' },
				children: [
					{ type: 'text', props: { text: 'Total: {state.issues.length}', size: 'xs' } },
					{ type: 'text', props: { text: 'Selected: {state.selected}', size: 'xs' } }
				]
			}
		]
	}
};

const researchFlow: Spec = {
	version: '1.0',
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '20px' },
		children: [
			{ type: 'heading', props: { text: 'AI Regulation: Where Do We Stand in 2026?', level: 2 } },
			{ type: 'text', props: {
				text: 'The global landscape for AI regulation has shifted dramatically over the past year, with the EU AI Act now fully enforced, and the US debating its own federal framework.',
				size: 'base'
			}},
			{
				type: 'flex',
				props: { gap: '10px' },
				style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
				children: [
					{ type: 'source-card', props: { favicon: '/icons/source.svg', source: 'circuitpost', title: 'EU AI Act enforcement begins with first penalties', color: '#000' } },
					{ type: 'source-card', props: { favicon: '/icons/source.svg', source: 'startupwire', title: 'US senators introduce bipartisan AI safety bill', color: '#22c55e' } },
					{ type: 'source-card', props: { favicon: '/icons/source.svg', source: 'wirefeed', title: 'Regulators publish draft AI governance rules', color: '#0080ff' } },
				]
			},
			{ type: 'heading', props: { text: 'Key Developments', level: 3 } },
			{ type: 'text', props: {
				text: 'The EU has issued its first fines under the AI Act, targeting companies that failed to disclose AI-generated content. Meanwhile, the US Senate has introduced a bipartisan bill focused on AI safety testing requirements.',
				size: 'sm'
			}},
			{
				type: 'flex',
				props: { gap: '6px', wrap: 'wrap' },
				children: [
					{ type: 'citation', props: { favicon: '/icons/source.svg', source: 'circuitpost', color: '#000', number: 1 } },
					{ type: 'citation', props: { favicon: '/icons/source.svg', source: 'startupwire', color: '#22c55e', number: 2 } },
				]
			},
			{ type: 'sources-bar', props: {
				sources: [
					{ favicon: '/icons/source.svg', name: 'circuitpost', color: '#000' },
					{ favicon: '/icons/source.svg', name: 'startupwire', color: '#22c55e' },
					{ favicon: '/icons/source.svg', name: 'wirefeed', color: '#0080ff' },
				],
				label: 'sources'
			}},
			{ type: 'heading', props: { text: 'Discover more', level: 4 } },
			{
				type: 'flex',
				props: { gap: '12px' },
				style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
				children: [
					{ type: 'discover-card', props: { title: 'EU fines first AI companies under new act', description: 'Penalties target non-disclosure of AI content...', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=70' } },
					{ type: 'discover-card', props: { title: 'US AI Safety Bill: What It Means', description: 'New requirements for testing and auditing AI systems...', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=70' } },
				]
			},
			{ type: 'follow-up', props: { placeholder: 'Ask follow-up about AI regulation...' } }
		]
	}
};


export const FLOWS: ShowcaseFlow[] = [
	{ id: 'issue-tracker', title: 'Issue tracker', line: 'Search, filter by status, add, close and delete issues, with a detail pane.', spec: issueTrackerFlow },
	{ id: 'settings', title: 'Settings page', line: 'Every input type bound to a draft, with dirty tracking, reset and save.', spec: settingsFlow },
	{ id: 'inbox', title: 'Mini inbox', line: 'Master and detail with multi-select, star and bulk mark-read.', spec: inboxFlow },
	{ id: 'invoice', title: 'Invoice builder', line: 'Add and remove lines; line totals, tax and the grand total update live.', spec: invoiceFlow },
	{ id: 'counter', title: 'Counter', line: 'Three buttons and one number in state.', spec: counterFlow },
	{ id: 'calculator', title: 'Live calculator', line: 'Two bound number inputs and arithmetic in expressions.', spec: calculatorFlow },
	{ id: 'filter', title: 'Live filter', line: 'A search box filtering a list with each and if.', spec: filterFlow },
	{ id: 'chips', title: 'Multi-select chips', line: 'Toggle adds and removes values from an array.', spec: multiSelectFlow },
	{ id: 'todo', title: 'Todo list', line: 'Push and remove array items, clearing the input after each add.', spec: todoFlow },
	{ id: 'plan-compare', title: 'Plan comparison', line: 'Two cards driven by one piece of state.', spec: compareFlow },
	{ id: 'wizard', title: 'Stepper wizard', line: 'The current step decides which fields and buttons appear.', spec: wizardFlow },
	{ id: 'confirm-delete', title: 'Delete with confirmation', line: 'A confirm action, then a toast either way.', spec: confirmFlow },
	{ id: 'form', title: 'Form with validation', line: 'Submit stays disabled until the form is complete.', spec: formFlow },
	{ id: 'research', title: 'Research article', line: 'Sources, an answer, related stories and a follow-up box.', spec: researchFlow }
];
