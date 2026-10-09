// widgets/data-kit/icons.ts — the KIND_ICONS maps (design doc 2026-10-09 §2.4).
// The model writes a `kind` from a closed enum, never an icon name; the widget
// looks it up here, and an unknown or missing kind renders CircleDot. Emoji in
// model text stay text and never become icons. The one exception is
// menu-order's OPTION_ICONS: an option or group may carry an `icon`, honoured
// only when it is a key of that map; otherwise optionIconKey infers the key
// from the option's name with a keyword scan.
//
// One map per enum in the doc, each its own export so a widget's bundle carries
// only the icons it imports. A widget with an enum not listed here
// (record-summary RowKind) adds its map here, so the vocabulary stays one set.
// Sizes: 16px in rows, 20px in tiles, stroke 1.75 (ICON).
import type { LucideIcon } from '@lucide/svelte';
import CircleDot from '@lucide/svelte/icons/circle-dot';
// stops
import Landmark from '@lucide/svelte/icons/landmark';
import Utensils from '@lucide/svelte/icons/utensils';
import BedDouble from '@lucide/svelte/icons/bed-double';
import TramFront from '@lucide/svelte/icons/tram-front';
import Ticket from '@lucide/svelte/icons/ticket';
import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
import Mountain from '@lucide/svelte/icons/mountain';
import Moon from '@lucide/svelte/icons/moon';
import Plane from '@lucide/svelte/icons/plane';
// legs
import TrainFront from '@lucide/svelte/icons/train-front';
import Bus from '@lucide/svelte/icons/bus';
import Car from '@lucide/svelte/icons/car';
import Ship from '@lucide/svelte/icons/ship';
import Footprints from '@lucide/svelte/icons/footprints';
// meals and aisles
import Coffee from '@lucide/svelte/icons/coffee';
import Sandwich from '@lucide/svelte/icons/sandwich';
import Cookie from '@lucide/svelte/icons/cookie';
import Carrot from '@lucide/svelte/icons/carrot';
import Beef from '@lucide/svelte/icons/beef';
import Milk from '@lucide/svelte/icons/milk';
import Wheat from '@lucide/svelte/icons/wheat';
import Package from '@lucide/svelte/icons/package';
import Snowflake from '@lucide/svelte/icons/snowflake';
// menu items
import Hamburger from '@lucide/svelte/icons/hamburger';
import Salad from '@lucide/svelte/icons/salad';
import CupSoda from '@lucide/svelte/icons/cup-soda';
import IceCreamCone from '@lucide/svelte/icons/ice-cream-cone';
// menu options
import Maximize2 from '@lucide/svelte/icons/maximize-2';
import Minimize2 from '@lucide/svelte/icons/minimize-2';
import Ham from '@lucide/svelte/icons/ham';
import Drumstick from '@lucide/svelte/icons/drumstick';
import Fish from '@lucide/svelte/icons/fish';
import EggFried from '@lucide/svelte/icons/egg-fried';
import Leaf from '@lucide/svelte/icons/leaf';
import LeafyGreen from '@lucide/svelte/icons/leafy-green';
import Droplet from '@lucide/svelte/icons/droplet';
import Ban from '@lucide/svelte/icons/ban';
import CirclePlus from '@lucide/svelte/icons/circle-plus';
import Popcorn from '@lucide/svelte/icons/popcorn';
import HandPlatter from '@lucide/svelte/icons/hand-platter';
import Croissant from '@lucide/svelte/icons/croissant';
import WheatOff from '@lucide/svelte/icons/wheat-off';
import Vegan from '@lucide/svelte/icons/vegan';
import Nut from '@lucide/svelte/icons/nut';
import CakeSlice from '@lucide/svelte/icons/cake-slice';
// booking services
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
import Scissors from '@lucide/svelte/icons/scissors';
import Sparkles from '@lucide/svelte/icons/sparkles';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import Users from '@lucide/svelte/icons/users';
import Calendar from '@lucide/svelte/icons/calendar';
// exercises
import Activity from '@lucide/svelte/icons/activity';
import Dumbbell from '@lucide/svelte/icons/dumbbell';
import Flame from '@lucide/svelte/icons/flame';
import PersonStanding from '@lucide/svelte/icons/person-standing';
import Timer from '@lucide/svelte/icons/timer';
// records
import User from '@lucide/svelte/icons/user';
import Building2 from '@lucide/svelte/icons/building-2';
import FileText from '@lucide/svelte/icons/file-text';
import Gem from '@lucide/svelte/icons/gem';
// comparison features
import BatteryFull from '@lucide/svelte/icons/battery-full';
import Weight from '@lucide/svelte/icons/weight';
import Monitor from '@lucide/svelte/icons/monitor';
import Cpu from '@lucide/svelte/icons/cpu';
import MemoryStick from '@lucide/svelte/icons/memory-stick';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import Camera from '@lucide/svelte/icons/camera';
import Gauge from '@lucide/svelte/icons/gauge';
import Tag from '@lucide/svelte/icons/tag';
import Usb from '@lucide/svelte/icons/usb';
import Wifi from '@lucide/svelte/icons/wifi';
import Keyboard from '@lucide/svelte/icons/keyboard';
import Speaker from '@lucide/svelte/icons/speaker';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import BadgeCheck from '@lucide/svelte/icons/badge-check';
import Ruler from '@lucide/svelte/icons/ruler';
import Star from '@lucide/svelte/icons/star';
import Headset from '@lucide/svelte/icons/headset';

export const FALLBACK_ICON: LucideIcon = CircleDot;

/** Lucide props for the two placements. */
export const ICON = { row: { size: 16, strokeWidth: 1.75 }, tile: { size: 20, strokeWidth: 1.75 } } as const;

/** `map[kind]`, or CircleDot for an unknown, missing or non-string kind. */
export function kindIcon(map: Readonly<Record<string, LucideIcon>>, kind: unknown): LucideIcon {
	return (typeof kind === 'string' && Object.hasOwn(map, kind) ? map[kind] : undefined) ?? FALLBACK_ICON;
}

/** itinerary StopKind (§3.5) */
export const STOP_ICONS = {
	sight: Landmark,
	food: Utensils,
	stay: BedDouble,
	transit: TramFront,
	activity: Ticket,
	shop: ShoppingBag,
	nature: Mountain,
	nightlife: Moon,
	flight: Plane
} satisfies Record<string, LucideIcon>;

/** itinerary legs (§3.5) */
export const LEG_ICONS = {
	flight: Plane,
	train: TrainFront,
	bus: Bus,
	car: Car,
	ferry: Ship,
	walk: Footprints
} satisfies Record<string, LucideIcon>;

/** recipe kind and meal-plan slot (§3.6) */
export const MEAL_ICONS = {
	breakfast: Coffee,
	lunch: Sandwich,
	dinner: Utensils,
	snack: Cookie
} satisfies Record<string, LucideIcon>;

/** shopping-list aisle (§3.6); `other` is the fallback */
export const AISLE_ICONS = {
	produce: Carrot,
	protein: Beef,
	dairy: Milk,
	grains: Wheat,
	pantry: Package,
	frozen: Snowflake
} satisfies Record<string, LucideIcon>;

/** menu-order item kind (§3.3) */
export const MENU_ICONS = {
	main: Hamburger,
	side: Salad,
	drink: CupSoda,
	dessert: IceCreamCone,
	product: ShoppingBag
} satisfies Record<string, LucideIcon>;

/** menu-order option and group icons: the closed set an option's `icon` may name. */
export const OPTION_ICONS = {
	size: Ruler,
	large: Maximize2,
	small: Minimize2,
	cheese: Milk,
	bacon: Ham,
	meat: Beef,
	chicken: Drumstick,
	fish: Fish,
	egg: EggFried,
	avocado: Leaf,
	veg: LeafyGreen,
	spicy: Flame,
	sauce: Droplet,
	none: Ban,
	extra: CirclePlus,
	fries: Popcorn,
	side: HandPlatter,
	drink: CupSoda,
	coffee: Coffee,
	shake: Milk,
	ice: Snowflake,
	bread: Croissant,
	gluten_free: WheatOff,
	vegan: Vegan,
	nut: Nut,
	sweet: CakeSlice
} satisfies Record<string, LucideIcon>;

export type OptionIconKey = keyof typeof OPTION_ICONS;

// First match wins, so the order is the rule: "No sauce" is `none` before it
// is `sauce`, "Extra cheese" is `cheese` before `extra`, "Chipotle mayo" is a
// sauce before chipotle reads as spicy, "Gluten-free bun" is not bread.
const OPTION_WORDS: ReadonlyArray<[RegExp, OptionIconKey]> = [
	[/^(no|without|hold the)\b|\bnone\b/, 'none'],
	[/gluten/, 'gluten_free'],
	[/vegan|plant[- ]based/, 'vegan'],
	[/chees|cheddar|mozzarella|parmesan|feta|halloumi|brie|swiss/, 'cheese'],
	[/bacon|\bham\b|pork|prosciutto|pancetta|chorizo|sausage|pepperoni/, 'bacon'],
	[/chicken|wing|drumstick|turkey/, 'chicken'],
	[/fish|salmon|tuna|shrimp|prawn|anchov/, 'fish'],
	[/beef|patty|patties|steak|brisket|burger/, 'meat'],
	[/\beggs?\b/, 'egg'],
	[/avocado|guac/, 'avocado'],
	[/sauce|aioli|mayo|ketchup|mustard|dressing|\bdip\b|gravy|ranch|salsa|honey|syrup|glaze|bbq|barbecue|pesto|vinaigrette/, 'sauce'],
	[/jalapeno|chil(i|e|li)|spic|\bhot\b|sriracha|habanero|cayenne|chipotle/, 'spicy'],
	[/lettuce|tomato|onion|pickle|mushroom|pepper|spinach|kale|cucumber|olive|veg|salad|slaw|greens/, 'veg'],
	[/fries|chips|wedges|tots/, 'fries'],
	[/coffee|latte|espresso|cappuccino|mocha/, 'coffee'],
	[/shake|milk|smoothie/, 'shake'],
	[/cola|soda|lemonade|juice|drink|water|\btea\b|beverage/, 'drink'],
	[/\bice\b|iced|frozen/, 'ice'],
	[/\bbuns?\b|bread|wrap|brioche|toast|sourdough|bagel|croissant|tortilla/, 'bread'],
	[/\bnuts?\b|almond|peanut|walnut|pecan|cashew|pistachio/, 'nut'],
	[/cake|cookie|brownie|chocolate|caramel|dessert|sweet/, 'sweet'],
	[/\bsides?\b/, 'side'],
	[/large|\bbig\b|double|triple|jumbo|\bxl\b/, 'large'],
	[/small|single|mini|kids|\bxs\b/, 'small'],
	[/\bsizes?\b/, 'size'],
	[/extra|topping|add[- ]?ons?|\badd\b/, 'extra']
];

const isOptionIconKey = (k: unknown): k is OptionIconKey => typeof k === 'string' && Object.hasOwn(OPTION_ICONS, k);

/**
 * The OPTION_ICONS key for a menu option or group: a valid `explicit` key
 * first (anything else is ignored, never rendered), then the first keyword in
 * the accent-stripped name. Undefined when nothing matches, so the caller falls
 * back (option → its group's icon → CircleDot via kindIcon).
 */
export function optionIconKey(name: unknown, explicit?: unknown): OptionIconKey | undefined {
	if (isOptionIconKey(explicit)) return explicit;
	if (typeof name !== 'string') return undefined;
	const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
	return OPTION_WORDS.find(([re]) => re.test(n))?.[1];
}

/** booking service kind (§3.4) */
export const SERVICE_ICONS = {
	table: UtensilsCrossed,
	hair: Scissors,
	beauty: Sparkles,
	health: HeartPulse,
	class: Users,
	other: Calendar
} satisfies Record<string, LucideIcon>;

/** interval-workout exercise kind (§3.8) */
export const EXERCISE_ICONS = {
	cardio: Activity,
	strength: Dumbbell,
	core: Flame,
	mobility: PersonStanding,
	rest: Timer
} satisfies Record<string, LucideIcon>;

/** record-summary header kind (§3.1) */
export const RECORD_ICONS = {
	person: User,
	company: Building2,
	document: FileText,
	asset: Gem
} satisfies Record<string, LucideIcon>;

/** comparison-layout FeatureKind (§3.2): a feature row's icon, and the value of an `icon`-kind cell */
export const FEATURE_ICONS = {
	battery: BatteryFull,
	weight: Weight,
	display: Monitor,
	cpu: Cpu,
	memory: MemoryStick,
	storage: HardDrive,
	camera: Camera,
	speed: Gauge,
	price: Tag,
	ports: Usb,
	wifi: Wifi,
	keyboard: Keyboard,
	audio: Speaker,
	security: ShieldCheck,
	warranty: BadgeCheck,
	size: Ruler,
	rating: Star,
	support: Headset
} satisfies Record<string, LucideIcon>;

export type StopKind = keyof typeof STOP_ICONS;
export type LegKind = keyof typeof LEG_ICONS;
export type MealKind = keyof typeof MEAL_ICONS;
export type AisleKind = keyof typeof AISLE_ICONS | 'other';
export type MenuKind = keyof typeof MENU_ICONS;
export type ServiceKind = keyof typeof SERVICE_ICONS;
export type ExerciseKind = keyof typeof EXERCISE_ICONS;
export type RecordKind = keyof typeof RECORD_ICONS;
export type FeatureKind = keyof typeof FEATURE_ICONS;
