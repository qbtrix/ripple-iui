# Theming

Ripple uses Tailwind CSS with shadcn-svelte's semantic token system for theming.

## Theme Overrides

Apply theme customizations via the `theme` property in any spec:

```json
{
  "theme": {
    "colors": {
      "primary": "#3b82f6",
      "background": "#0a0a0a",
      "foreground": "#fafafa"
    },
    "radius": "0.5rem",
    "mode": "dark"
  }
}
```

## Available Color Tokens

### Core

| Token | Description |
|-------|-------------|
| `background` | Page background |
| `foreground` | Default text color |
| `border` | Border color |
| `input` | Input border color |
| `ring` | Focus ring color |

### Component

| Token | Description |
|-------|-------------|
| `card` / `card-foreground` | Card background and text |
| `popover` / `popover-foreground` | Popover background and text |
| `primary` / `primary-foreground` | Primary action colors |
| `secondary` / `secondary-foreground` | Secondary action colors |
| `muted` / `muted-foreground` | Muted/subtle colors |
| `accent` / `accent-foreground` | Accent colors |
| `destructive` / `destructive-foreground` | Destructive/error colors |

### Chart

| Token | Description |
|-------|-------------|
| `chart-1` through `chart-5` | Chart color palette |

### Sidebar

| Token | Description |
|-------|-------------|
| `sidebar` / `sidebar-foreground` | Sidebar background and text |
| `sidebar-primary` / `sidebar-primary-foreground` | Sidebar primary colors |
| `sidebar-accent` / `sidebar-accent-foreground` | Sidebar accent colors |
| `sidebar-border` | Sidebar border color |
| `sidebar-ring` | Sidebar focus ring color |

## Color Format

Colors can be specified as:
- Hex: `"#3b82f6"`
- OKLCH: `"oklch(0.623 0.214 259.1)"`
- RGB: `"rgb(59, 130, 246)"`

## Mode

| Value | Description |
|-------|-------------|
| `'light'` | Force light mode |
| `'dark'` | Force dark mode |
| `'system'` | Follow system preference |

## Border Radius

The `radius` value applies globally to all components:

```json
{
  "theme": {
    "radius": "0.75rem"
  }
}
```

## Base Color Palette

The default theme uses a **neutral** base color palette (configured via shadcn's `components.json`).
