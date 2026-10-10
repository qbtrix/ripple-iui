// routes/pawbar/chip-icons.ts — The lucide icon for each suggestion chip, by the name
// live/scenarios.ts's suggestionGroups gives it. That file stays free of Svelte
// imports (the recorder runs it in node), so the name to component map lives here.
// A name missing from this map renders the chip without an icon.

import type { Component } from 'svelte';
import Activity from '@lucide/svelte/icons/activity';
import Bike from '@lucide/svelte/icons/bike';
import BookOpen from '@lucide/svelte/icons/book-open';
import Briefcase from '@lucide/svelte/icons/briefcase';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import ChartPie from '@lucide/svelte/icons/chart-pie';
import ChefHat from '@lucide/svelte/icons/chef-hat';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import Cloud from '@lucide/svelte/icons/cloud';
import Coffee from '@lucide/svelte/icons/coffee';
import Columns2 from '@lucide/svelte/icons/columns-2';
import ConciergeBell from '@lucide/svelte/icons/concierge-bell';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Dumbbell from '@lucide/svelte/icons/dumbbell';
import FileSearch from '@lucide/svelte/icons/file-search';
import FileText from '@lucide/svelte/icons/file-text';
import Film from '@lucide/svelte/icons/film';
import GitBranch from '@lucide/svelte/icons/git-branch';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Hamburger from '@lucide/svelte/icons/hamburger';
import Hash from '@lucide/svelte/icons/hash';
import Headphones from '@lucide/svelte/icons/headphones';
import Heart from '@lucide/svelte/icons/heart';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import Languages from '@lucide/svelte/icons/languages';
import Laptop from '@lucide/svelte/icons/laptop';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import ListChecks from '@lucide/svelte/icons/list-checks';
import ListTodo from '@lucide/svelte/icons/list-todo';
import Map from '@lucide/svelte/icons/map';
import Megaphone from '@lucide/svelte/icons/megaphone';
import Music from '@lucide/svelte/icons/music';
import Navigation from '@lucide/svelte/icons/navigation';
import Pencil from '@lucide/svelte/icons/pencil';
import PersonStanding from '@lucide/svelte/icons/person-standing';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Pizza from '@lucide/svelte/icons/pizza';
import Plane from '@lucide/svelte/icons/plane';
import Podcast from '@lucide/svelte/icons/podcast';
import Receipt from '@lucide/svelte/icons/receipt';
import Rocket from '@lucide/svelte/icons/rocket';
import Salad from '@lucide/svelte/icons/salad';
import Search from '@lucide/svelte/icons/search';
import Shield from '@lucide/svelte/icons/shield';
import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
import Split from '@lucide/svelte/icons/split';
import SquareCheck from '@lucide/svelte/icons/square-check';
import StickyNote from '@lucide/svelte/icons/sticky-note';
import Tag from '@lucide/svelte/icons/tag';
import Timer from '@lucide/svelte/icons/timer';
import TreePalm from '@lucide/svelte/icons/tree-palm';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
import WholeWord from '@lucide/svelte/icons/whole-word';

export const chipIcons: Record<string, Component> = {
	'activity': Activity,
	'bike': Bike,
	'book-open': BookOpen,
	'briefcase': Briefcase,
	'calendar': Calendar,
	'calendar-check': CalendarCheck,
	'chart-pie': ChartPie,
	'chef-hat': ChefHat,
	'circle-dot': CircleDot,
	'clipboard-list': ClipboardList,
	'cloud': Cloud,
	'coffee': Coffee,
	'columns-2': Columns2,
	'concierge-bell': ConciergeBell,
	'dollar-sign': DollarSign,
	'dumbbell': Dumbbell,
	'file-search': FileSearch,
	'file-text': FileText,
	'film': Film,
	'git-branch': GitBranch,
	'graduation-cap': GraduationCap,
	'hamburger': Hamburger,
	'hash': Hash,
	'headphones': Headphones,
	'heart': Heart,
	'heart-pulse': HeartPulse,
	'languages': Languages,
	'laptop': Laptop,
	'layout-grid': LayoutGrid,
	'lightbulb': Lightbulb,
	'list-checks': ListChecks,
	'list-todo': ListTodo,
	'map': Map,
	'megaphone': Megaphone,
	'music': Music,
	'navigation': Navigation,
	'pencil': Pencil,
	'person-standing': PersonStanding,
	'piggy-bank': PiggyBank,
	'pizza': Pizza,
	'plane': Plane,
	'podcast': Podcast,
	'receipt': Receipt,
	'rocket': Rocket,
	'salad': Salad,
	'search': Search,
	'shield': Shield,
	'shopping-bag': ShoppingBag,
	'split': Split,
	'square-check': SquareCheck,
	'sticky-note': StickyNote,
	'tag': Tag,
	'timer': Timer,
	'tree-palm': TreePalm,
	'trending-up': TrendingUp,
	'utensils-crossed': UtensilsCrossed,
	'whole-word': WholeWord
};
