// index.ts — vendored shadcn-svelte ContextMenu barrel, carrying the paw
// frosted-popover canon on Content / SubContent. Mirrors ui/dropdown-menu's
// index idiom. bits-ui ContextMenu is cursor-anchored (Trigger wraps the
// right-clickable region). Vendored 2026-07-10 (feat/canonical-menubar-contextmenu).
import Root from "./context-menu.svelte";
import Sub from "./context-menu-sub.svelte";
import CheckboxItem from "./context-menu-checkbox-item.svelte";
import Content from "./context-menu-content.svelte";
import Group from "./context-menu-group.svelte";
import Item from "./context-menu-item.svelte";
import Label from "./context-menu-label.svelte";
import RadioGroup from "./context-menu-radio-group.svelte";
import RadioItem from "./context-menu-radio-item.svelte";
import Separator from "./context-menu-separator.svelte";
import Shortcut from "./context-menu-shortcut.svelte";
import Trigger from "./context-menu-trigger.svelte";
import SubContent from "./context-menu-sub-content.svelte";
import SubTrigger from "./context-menu-sub-trigger.svelte";
import GroupHeading from "./context-menu-group-heading.svelte";
import Portal from "./context-menu-portal.svelte";

export {
	CheckboxItem,
	Content,
	Portal,
	Root as ContextMenu,
	CheckboxItem as ContextMenuCheckboxItem,
	Content as ContextMenuContent,
	Portal as ContextMenuPortal,
	Group as ContextMenuGroup,
	Item as ContextMenuItem,
	Label as ContextMenuLabel,
	RadioGroup as ContextMenuRadioGroup,
	RadioItem as ContextMenuRadioItem,
	Separator as ContextMenuSeparator,
	Shortcut as ContextMenuShortcut,
	Sub as ContextMenuSub,
	SubContent as ContextMenuSubContent,
	SubTrigger as ContextMenuSubTrigger,
	Trigger as ContextMenuTrigger,
	GroupHeading as ContextMenuGroupHeading,
	Group,
	GroupHeading,
	Item,
	Label,
	RadioGroup,
	RadioItem,
	Root,
	Separator,
	Shortcut,
	Sub,
	SubContent,
	SubTrigger,
	Trigger,
};
