# Design system

This document describes Datagini's visual language: theme, color tokens,
typography, layout patterns, components, icons, and animations. It's a
reference for keeping new UI consistent with the existing app.

Source of truth for everything here:
[`app/globals.css`](app/globals.css) (CSS variables + animations) and
[`tailwind.config.ts`](tailwind.config.ts) (token mapping).

## Look & feel

Datagini's visual style is a calm, warm "stone gray" dark theme (with a
matching light theme) and a single green accent color used sparingly —
for active states, links, primary actions, and the schema diagrams. The
overall feel is minimal, slightly technical (monospace for code/SQL), and
soft — rounded corners, subtle glows instead of hard shadows, gentle
fade/slide transitions instead of snappy ones.

## Theme system (dark default + light)

The app ships with a dark theme by default and an optional light theme,
toggled by [`components/ThemeToggle.tsx`](components/ThemeToggle.tsx).

- Toggling adds/removes a `light` class on `<html>`.
- The choice is persisted to `localStorage` under the key
  `"datagini-theme"`.
- An inline script in [`app/layout.tsx`](app/layout.tsx) (`THEME_SCRIPT`)
  applies the saved theme to `<html>` before the page paints, so there's no
  flash of the wrong theme on load.

All colors are defined as CSS custom properties (RGB triplets, no `#`) in
`:root` (dark) and `:root.light` (light) in `app/globals.css`, then mapped
to Tailwind color names in `tailwind.config.ts` via
`rgb(var(--token) / <alpha-value>)`. **Always use the Tailwind token names
below — never hardcode hex colors or `gray-*`/`stone-*` Tailwind defaults —
so components automatically adapt to both themes.**

### Color tokens

| Tailwind class | CSS variable | Dark value | Light value | Use for |
| --- | --- | --- | --- | --- |
| `bg-bg` | `--bg-base` | `12 10 9` (near-black) | `250 250 249` (near-white) | Page background |
| `bg-surface` | `--bg-surface` | `23 20 18` | `245 245 244` | Sidebars, input bars, secondary panels |
| `bg-card` | `--bg-card` | `28 25 23` | `255 255 255` | Cards, modals, panels |
| `bg-elevated` | `--bg-elevated` | `41 37 36` | `231 229 228` | Hover states, pills, active nav items |
| `border-border` | `--border` | `54 50 47` | `214 211 209` | Default borders/dividers |
| `border-border-bright` | `--border-bright` | `87 83 78` | `168 162 158` | Hover/active/selected borders |
| `text-ink` | `--text-primary` | `250 250 249` | `28 25 23` | Primary text/headings |
| `text-ink-secondary` | `--text-secondary` | `168 162 158` | `87 83 78` | Body/secondary text |
| `text-ink-tertiary` | `--text-tertiary` | `120 113 108` | `120 113 108` | Muted labels, captions |
| `text-ink-dim` | `--text-dim` | `87 83 78` | `150 145 140` | Disabled/placeholder text, icons |
| `text-accent` / `bg-accent` | `--accent-green` | `34 197 94` | `22 163 74` | Primary accent (links, active states, "thinking" indicator) |
| `accent-glow` | `--accent-glow` | `22 163 74` | `21 128 61` | Accent hover/glow variant |
| `accent-dim` | `--accent-dim` | `21 128 61` | `22 101 52` | Secondary accent (e.g. chart series 2) |
| `accent-muted` | `--accent-muted` | `20 83 45` | `220 252 231` | Accent backgrounds/fills |
| `text-error` | fixed `#ef4444` | same in both themes | | Error text |
| `text-success` | fixed `#22c55e` | same in both themes | | Success text |

Box shadows use a fixed warm-gray glow regardless of theme:

| Class | Value |
| --- | --- |
| `shadow-glow-sm` | `0 0 12px rgba(120, 113, 108, 0.15)` |
| `shadow-glow-md` | `0 0 24px rgba(120, 113, 108, 0.2)` |
| `shadow-glow-lg` | `0 0 48px rgba(120, 113, 108, 0.12)` |

Border radius: Tailwind defaults plus a custom `rounded-xl` = `12px`. Cards
typically use `rounded-2xl`, smaller elements `rounded-lg`/`rounded-xl`,
pills/badges `rounded-full`.

## Typography

Two Google Fonts, loaded in [`app/layout.tsx`](app/layout.tsx) via
`next/font/google` and exposed as CSS variables:

- **Inter** (`--font-inter`) → Tailwind `font-sans` (default) — all UI text.
- **JetBrains Mono** (`--font-jetbrains-mono`) → Tailwind `font-mono` —
  generated SQL, table/column names in the visualizer, code snippets.

Heading sizes are plain Tailwind scale (`text-lg`/`text-xl`/`text-2xl`,
`font-semibold`), no custom type scale.

## Layout patterns

- **Page background**: `bg-bg` (the darkest/lightest surface). Auth and
  landing pages add `.dot-grid` or `.dot-grid-canvas` — a radial-gradient
  dot pattern using `--glow-color` — for texture.
- **Page transitions**: top-level pages use the `.page-fade` class
  (`fade-in` keyframes, 200ms ease-out) so navigating between pages doesn't
  feel abrupt.
- **Cards**: `rounded-2xl border border-border bg-card`, often with
  `hover:border-border-bright hover:shadow-glow-md` and
  `transition-all duration-200` for hover lift.
- **Glass panels**: `.glass` utility — `backdrop-filter: blur(12px)` over a
  translucent `bg-surface` with a faint `--glow-color` border. Used for the
  active sidebar nav item.
- **Modals**: `bg-card` panel with `border-border-bright`,
  `shadow-glow-lg`, `rounded-2xl`, and `.page-fade` entrance, over a
  `bg-black/50` backdrop.

## Components

### Buttons & interactive elements

Buttons generally follow this shape: `rounded-lg`/`rounded-xl` +
`transition-all duration-150` + `active:scale-[0.97]` for a subtle press
effect. Two common variants:

- **Primary**: `bg-ink text-bg` (inverted — light button on dark theme,
  dark button on light theme), `hover:opacity-90`.
- **Secondary/ghost**: `text-ink-secondary hover:bg-elevated hover:text-ink`,
  no fill until hover.

### Selectable option grids (AI/DB provider pickers)

Used in the new-project modal and Config → AI Model tab to choose a
database type or AI provider. A responsive grid (`grid-cols-2
sm:grid-cols-4`) of buttons, each showing an icon + label:

```tsx
function providerButtonClass(active: boolean): string {
  return `rounded-lg border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.97] ${
    active
      ? "border-border-bright bg-elevated text-ink shadow-glow-sm"
      : "border-border text-ink-secondary hover:border-border-bright"
  }`;
}
```

- Active option: brighter border, `bg-elevated`, `shadow-glow-sm`.
- Inactive: plain border, secondary text, border brightens on hover.

### Provider icon badges

Small pill badges combine an icon + label, used for showing example
providers (e.g. the "Custom AI provider" examples — DeepSeek, Qwen,
Mistral):

```tsx
<span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-ink-secondary">
  <img src={icon} alt="" className="h-3.5 w-3.5 shrink-0" />
  {label}
</span>
```

Icon sources live in `public/db-icons/` (PostgreSQL, MySQL, SQLite) and
`public/model-icons/` (Gemini, OpenAI, Claude, Custom, DeepSeek, Qwen,
Mistral, etc.), referenced via `lib/provider-meta.ts`
(`DB_TYPE_ICONS`, `AI_PROVIDER_ICONS`, `CUSTOM_PROVIDER_EXAMPLES`).

### Tabs (Config page)

The Config page (`components/project/ConfigClient.tsx`) uses a simple
horizontal tab bar (Database / AI Model / Setup Guide) — active tab gets
`text-ink` + an underline/border in `border-border-bright` or
`bg-elevated`, inactive tabs use `text-ink-secondary`.

### Sidebar (project shell)

[`components/project/ProjectShell.tsx`](components/project/ProjectShell.tsx):

- Fixed-width (`220px`) sidebar, collapsible to `56px` (`w-14`) on desktop,
  off-canvas drawer on mobile (`-translate-x-full` when closed, backdrop
  overlay).
- Top: the **Gini mascot** (animates while a chat response is being
  generated, via `GiniProvider`/`useGini` context) + project name.
- Nav items (Chat, DB Visualizer, Config — `lucide-react` icons
  `MessageSquare`, `Workflow`, `Settings`): active item uses `.glass` +
  `shadow-glow-sm`, inactive uses `hover:bg-elevated`.
- Footer: "Back to Dashboard" link with `ArrowLeft` icon.

### Result rendering

[`components/ResultTable.tsx`](components/ResultTable.tsx) and
[`components/ResultChart.tsx`](components/ResultChart.tsx) render query
results as a table or chart (bar/line/pie, via Recharts), inside
`rounded-lg border border-border bg-surface` panels. Chart colors:

| Constant | Value | Use |
| --- | --- | --- |
| `ACCENT` | `#a8a29e` | Bar/line fill |
| `GRID_COLOR` | `rgba(168, 162, 158, 0.15)` | Chart grid lines |
| `AXIS_COLOR` | `#78716c` | Axis labels |
| `TOOLTIP_BG` / `TOOLTIP_BORDER` / `TOOLTIP_TEXT` / `TOOLTIP_ITEM` | `#1c1917` / `#44403c` / `#fafaf9` / `#d6d3d1` | Tooltip styling |

A single big number (e.g. "total revenue: 48,200") is shown as a large
centered stat: `text-4xl font-bold text-ink sm:text-5xl` inside the same
`rounded-lg border border-border bg-surface` panel.

### DB Visualizer (React Flow)

[`components/visualizer/VisualizerClient.tsx`](components/visualizer/VisualizerClient.tsx)
renders the schema as an interactive graph using `@xyflow/react` + `dagre`
for auto-layout (`rankdir: "LR"`).

- Table nodes (`TableNode`): `rounded-lg border bg-card`, header row
  `bg-elevated` with the table name in `font-semibold text-ink`, column
  rows separated by `border-border/60`. Primary keys show a `Key` icon
  (`text-ink`), foreign keys a `Link2` icon (`text-ink-dim`). Selected node
  gets `border-border-bright` + `shadow-glow-md`; hover gets
  `border-border-bright`.
- Edges (foreign-key relationships): indigo (`#6366f1`) `smoothstep` lines
  with arrow markers; edge labels and backgrounds adapt to theme
  (`#78716c`/`#f5f5f4` light, `#9ca3af`/`#1a1a1a` dark).
- `<ReactFlow colorMode>`, `<Background>`, and `<MiniMap>` all switch
  between light/dark palettes based on a `MutationObserver` watching the
  `light` class on `<html>` (see `isLight` state) — this keeps the
  visualizer in sync with the app-wide theme toggle.
- Clicking a table opens a slide-in `DetailPanel` (right side,
  `bg-surface`, `border-l border-border`) showing row count, columns, and a
  sample-data table, plus an "Ask about this table" button
  (`bg-ink text-bg`) that jumps to chat with a pre-filled question.

## Icons

[`lucide-react`](https://lucide.dev/) is the icon library for all UI
chrome (nav, buttons, status indicators — `Menu`, `Settings`,
`MessageSquare`, `Workflow`, `Key`, `Link2`, `X`, `Loader2`, etc.), typically
at `size={16}`–`20` with `strokeWidth={1.5}`.

Brand/provider icons are flat SVG files (not from an icon library):

- `public/db-icons/` — `postgresql-icon.svg`, `mysql-icon.svg`,
  `sqlite-icon.svg`
- `public/model-icons/` — `gemini-icon.svg`, `openai-icon.svg`,
  `claude-icon.svg`, `custom-icon.svg`, plus example "custom provider"
  icons (`deepseek-logo-icon.svg`, `qwen-ai-icon.svg`,
  `mistral-ai-icon.svg`)

Both are centralized in [`lib/provider-meta.ts`](lib/provider-meta.ts) so
any UI that needs a provider's label/icon imports from one place.

## The Gini mascot & loaders

[`components/GiniMascot.tsx`](components/GiniMascot.tsx) is a small pixel-art
character used as the app's "face" (sidebar, chat responses, favicon).
It's a sprite animation driven by swapping `<img>` sources every 150ms:

- **Idle**: first frame of the "typing" set (`gini-a1-f1.svg`), static.
- **Typing** (`typing` prop): loops `gini-a1-f1..f4` — used while an AI
  response is being generated.
- **Hover**: loops a separate `gini-a2-f1..f4` set when the mouse is over
  it.

All frames live in `public/animation-frames/` and are preloaded on mount.

[`components/PixelLoader.tsx`](components/PixelLoader.tsx) reuses the same
`gini-a1-*` frame sequence as a full loading state (`imageRendering:
"pixelated"`, larger size, optional label with three `.pulse-dot` dots —
`pulse-dot` keyframes fade opacity 1→0.3→1 over 1.2s, staggered by 200ms).

## Landing page demos

[`components/landing/ChatDemo.tsx`](components/landing/ChatDemo.tsx) is a
self-playing, looping animation (~10s per scenario, 4 scenarios) that
simulates a real chat exchange:

1. **Idle** → **typing** a question character-by-character (35ms/char,
   `.blink-cursor` caret).
2. **Thinking** — Gini mascot in `typing` mode + cycling phrases ("Reading
   your schema...", "Writing SQL...", "Running query...") with three
   `.pulse-dot` dots in `text-accent`.
3. **Answer** fades/slides in (`translate-y` + opacity transition).
4. **Result** — a bar chart, grouped comparison chart, donut/pie chart, or
   table, animating in (bars grow, pie arcs sweep via `strokeDasharray`,
   table rows slide in staggered by 80ms).
5. **Generated SQL** panel fades in, shown in `font-mono` inside a
   `bg-surface` block.

The whole thing is wrapped in a fake browser window (`rounded-2xl
border border-border bg-card shadow-glow-md`, traffic-light dots, a fake
URL bar, and a rotating AI-provider badge).

[`components/landing/SchemaPreview.tsx`](components/landing/SchemaPreview.tsx)
shows three connected table cards (`customers` → `orders` → `order_items`)
representing the DB Visualizer:

- Cards fade/scale in on mount (`.schema-card` → `schema-card-in`
  keyframes, staggered 150ms) and then loop a subtle border/glow pulse
  (`schema-glow` keyframes, 6s, switching between `border-border` and an
  `accent-green`-tinted glow).
- Connectors between cards show a small green dot animating along the
  line (`.schema-dot` / `.schema-dot-vertical`, `travel-dot`/
  `travel-dot-vertical` keyframes, 3s linear loop, fading in/out at the
  ends).
- Primary keys use a `KeyRound` icon (`text-accent`), foreign keys a `Hash`
  icon (`text-ink-dim`).

## Animation reference

All custom keyframes/utilities are defined in
[`app/globals.css`](app/globals.css):

| Class | Keyframes | Duration | Used for |
| --- | --- | --- | --- |
| `.page-fade` | `fade-in` (opacity 0→1) | 200ms ease-out | Page-level entrance |
| `.auth-glow` | `drift` (translate + scale + opacity) | 8s ease-in-out, infinite | Soft floating glow blobs on auth pages |
| `.pulse-dot` | `pulse-dot` (opacity 1→0.3→1) | 1.2s ease-in-out, infinite | "Thinking"/loading dot trios |
| `.blink-cursor` | `blink-cursor` (opacity step) | 1s step-end, infinite | Typing-text caret in the chat demo |
| `.schema-card` | `schema-card-in` + `schema-glow` | 600ms in, then 6s glow loop | Schema preview card entrance + pulse |
| `.schema-dot` / `.schema-dot-vertical` | `travel-dot` / `travel-dot-vertical` | 3s linear, infinite | Dot traveling along schema connectors |
| `.zzz-letter` | `zzz-float` (translate + opacity) | 2.4s ease-in-out, infinite | "Zzz" sleep animation (e.g. empty/idle states) |

## Conventions for new UI

- Use the color tokens table above — never `gray-*`, `stone-*`, or raw hex
  for anything that should adapt to the light/dark theme. Fixed hex is only
  acceptable for chart series colors and the indigo FK-edge color
  (`#6366f1`), which are intentionally theme-independent.
- Reuse `providerButtonClass`-style active/inactive pairs for any new
  selectable grid of options.
- Prefer `rounded-2xl` for top-level cards/modals, `rounded-lg`/`rounded-xl`
  for nested panels and inputs, `rounded-full` for pills/badges.
- Any element that should feel "pressable" gets `active:scale-[0.97]` plus
  `transition-all duration-150`.
- New brand/provider icons go in `public/model-icons/` or
  `public/db-icons/` and get registered in
  [`lib/provider-meta.ts`](lib/provider-meta.ts) rather than referenced ad
  hoc.
