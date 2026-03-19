# ReviewLens AI — Design Book

> Brand identity, color system, typography, components, and visual language.

---

## 1. Logo & Brand Identity

### Logo Mark

The ReviewLens AI logo consists of a **Search icon** (from Lucide) placed inside a rounded gradient container, paired with a wordmark.

| Property            | Value                                      |
| ------------------- | ------------------------------------------ |
| Icon                | `Search` (lucide-react)                    |
| Container Size      | `36 x 36 px` (`w-9 h-9`)                  |
| Container Radius    | `rounded-xl` (~12 px)                      |
| Container Gradient  | `linear-gradient(to bottom-right, #8b5cf6, #4f46e5)` — Violet 500 to Indigo 600 |
| Container Shadow    | `0 10px 15px rgba(139, 92, 246, 0.25)`     |
| Icon Color          | `#ffffff` (White)                          |
| Icon Size           | `18 px`                                    |

### Wordmark

```
ReviewLens AI
```

- **"Review"** — `font-bold`, white (`#f0f0ff`)
- **"Lens"** — `font-bold`, gradient text (`#8b5cf6 → #6366f1 → #06b6d4`)
- **"AI"** — `font-medium`, muted violet (`rgba(139, 92, 246, 0.7)`)

### Favicon

- Location: `src/app/favicon.ico`

---

## 2. Color Palette

### Core Brand Colors

| Swatch | Name           | Hex / Value                  | Usage                          |
| ------ | -------------- | ---------------------------- | ------------------------------ |
| ![#8b5cf6](https://via.placeholder.com/16/8b5cf6/8b5cf6.png) | **Violet 500** (Primary) | `#8b5cf6` | Primary brand, buttons, links, focus rings |
| ![#6366f1](https://via.placeholder.com/16/6366f1/6366f1.png) | **Indigo 500**  | `#6366f1`  | Gradient secondary, charts     |
| ![#06b6d4](https://via.placeholder.com/16/06b6d4/06b6d4.png) | **Cyan 500**    | `#06b6d4`  | Gradient accent, chart-4       |
| ![#0a0a1a](https://via.placeholder.com/16/0a0a1a/0a0a1a.png) | **Deep Navy**   | `#0a0a1a`  | Page background                |
| ![#f0f0ff](https://via.placeholder.com/16/f0f0ff/f0f0ff.png) | **Ghost White** | `#f0f0ff`  | Primary text, foreground       |

### Extended Palette

| Swatch | Name            | Hex / Value | Usage                    |
| ------ | --------------- | ----------- | ------------------------ |
| ![#c4b5fd](https://via.placeholder.com/16/c4b5fd/c4b5fd.png) | Violet 300  | `#c4b5fd` | Accent text, code syntax    |
| ![#9898b8](https://via.placeholder.com/16/9898b8/9898b8.png) | Muted Blue  | `#9898b8` | Muted/secondary text        |
| ![#e0e0ff](https://via.placeholder.com/16/e0e0ff/e0e0ff.png) | Light Blue  | `#e0e0ff` | Secondary foreground        |
| ![#3b82f6](https://via.placeholder.com/16/3b82f6/3b82f6.png) | Blue 500    | `#3b82f6` | Chart-3                     |
| ![#10b981](https://via.placeholder.com/16/10b981/10b981.png) | Emerald 500 | `#10b981` | Chart-5, positive sentiment |
| ![#ef4444](https://via.placeholder.com/16/ef4444/ef4444.png) | Red 500     | `#ef4444` | Destructive, negative       |
| ![#f59e0b](https://via.placeholder.com/16/f59e0b/f59e0b.png) | Amber 500   | `#f59e0b` | Mixed sentiment             |
| ![#64748b](https://via.placeholder.com/16/64748b/64748b.png) | Slate 500   | `#64748b` | Neutral sentiment           |

### Sentiment Colors

| Sentiment  | Color     | Hex       |
| ---------- | --------- | --------- |
| Positive   | Emerald   | `#22c55e` |
| Negative   | Red       | `#ef4444` |
| Neutral    | Slate     | `#64748b` |
| Mixed      | Amber     | `#f59e0b` |

### Star Rating Colors

| Stars | Color  | Hex       |
| ----- | ------ | --------- |
| 1     | Red    | `#ef4444` |
| 2     | Orange | `#f97316` |
| 3     | Yellow | `#eab308` |
| 4     | Lime   | `#84cc16` |
| 5     | Green  | `#22c55e` |

### Chart Colors

| Token      | Hex       |
| ---------- | --------- |
| `chart-1`  | `#8b5cf6` |
| `chart-2`  | `#6366f1` |
| `chart-3`  | `#3b82f6` |
| `chart-4`  | `#06b6d4` |
| `chart-5`  | `#10b981` |

---

## 3. Transparency & Surface System

The UI uses layered semi-transparent surfaces on a dark base.

| CSS Variable      | Value                         | Purpose             |
| ----------------- | ----------------------------- | ------------------- |
| `--background`    | `#0a0a1a`                     | Page base           |
| `--card`          | `rgba(255,255,255, 0.06)`     | Card surfaces       |
| `--secondary`     | `rgba(255,255,255, 0.08)`     | Secondary surfaces  |
| `--muted`         | `rgba(255,255,255, 0.06)`     | Muted surfaces      |
| `--accent`        | `rgba(139,92,246, 0.15)`      | Accent overlays     |
| `--input`         | `rgba(255,255,255, 0.08)`     | Form field bg       |
| `--border`        | `rgba(255,255,255, 0.1)`      | Borders             |
| `--ring`          | `rgba(139,92,246, 0.5)`       | Focus rings         |
| `--popover`       | `rgba(15,15,35, 0.95)`        | Popovers/overlays   |
| `--sidebar`       | `rgba(15,15,35, 0.8)`         | Sidebar background  |

---

## 4. Gradients

### Primary Brand Gradient

```css
linear-gradient(135deg, #8b5cf6, #6366f1)
```

Used for: buttons, active states, user chat bubbles.

### Extended Text Gradient

```css
linear-gradient(135deg, #8b5cf6, #6366f1, #06b6d4)
```

Used for: hero text highlights, the "Lens" wordmark.

### Icon Background Gradients

| Context    | From           | To              |
| ---------- | -------------- | --------------- |
| Primary    | `violet-500`   | `purple-600`    |
| Warning    | `amber-500`    | `orange-600`    |
| Success    | `emerald-500`  | `green-600`     |
| Info       | `cyan-500`     | `blue-600`      |
| Secondary  | `indigo-500`   | `blue-600`      |

### Animated Mesh Background

Three radial gradients layered on the page background, animating over 20 seconds:

```css
radial-gradient(at 20% 50%, rgba(99,102,241, 0.15))   /* Indigo */
radial-gradient(at 80% 20%, rgba(139,92,246, 0.12))    /* Violet */
radial-gradient(at 50% 80%, rgba(6,182,212, 0.1))      /* Cyan   */
```

---

## 5. Typography

### Font Families

| Role        | Font         | Variable              | Fallback     |
| ----------- | ------------ | --------------------- | ------------ |
| Sans-serif  | **Geist**      | `--font-geist-sans` | `sans-serif` |
| Monospace   | **Geist Mono** | `--font-geist-mono` | `monospace`  |

Both loaded via `next/font/google`.

### Type Scale

| Level            | Classes                                           | Weight       |
| ---------------- | ------------------------------------------------- | ------------ |
| Hero Heading     | `text-5xl sm:text-6xl lg:text-7xl tracking-tight` | `font-bold`  |
| Section Heading  | `text-2xl sm:text-3xl`                            | `font-bold`  |
| Card Title       | `text-lg`                                         | `font-semibold` |
| Body             | `text-sm`                                         | `font-normal` |
| Label / Meta     | `text-xs uppercase tracking-wider`                | `font-medium` |
| Tiny Badge       | `text-[10px]`                                     | varies       |

---

## 6. Border Radius

| Token          | Computed Value | Pixels  |
| -------------- | -------------- | ------- |
| `--radius`     | `0.75rem`      | 12 px   |
| `--radius-sm`  | `0.45rem`      | ~7.2 px |
| `--radius-md`  | `0.6rem`       | ~9.6 px |
| `--radius-lg`  | `0.75rem`      | 12 px   |
| `--radius-xl`  | `1.05rem`      | ~16.8 px |
| `--radius-2xl` | `1.35rem`      | ~21.6 px |
| `--radius-3xl` | `1.65rem`      | ~26.4 px |
| `--radius-4xl` | `1.95rem`      | ~31.2 px |

Common usage: `rounded-xl` for cards, `rounded-lg` for buttons/inputs, `rounded-full` for badges/pills.

---

## 7. Glassmorphism

Three glass variants form the core visual language:

### `.glass` — Base

```css
background:      rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px);
border:          1px solid rgba(255, 255, 255, 0.1);
```

### `.glass-strong` — Elevated

```css
background:      rgba(255, 255, 255, 0.08);
backdrop-filter: blur(30px);
border:          1px solid rgba(255, 255, 255, 0.12);
```

### `.glass-card` — Interactive

```css
background:      rgba(255, 255, 255, 0.04);
backdrop-filter: blur(16px);
border:          1px solid rgba(255, 255, 255, 0.08);
transition:      all 0.3s ease;

/* Hover */
background:      rgba(255, 255, 255, 0.07);
border-color:    rgba(255, 255, 255, 0.15);
box-shadow:      0 8px 32px rgba(139, 92, 246, 0.1);
transform:       translateY(-2px);
```

---

## 8. Shadows & Glow Effects

### Glow Classes

| Class          | Box Shadow                                  |
| -------------- | ------------------------------------------- |
| `.glow-purple` | `0 0 20px rgba(139, 92, 246, 0.2)`         |
| `.glow-blue`   | `0 0 20px rgba(99, 102, 241, 0.2)`         |
| `.glow-cyan`   | `0 0 20px rgba(6, 182, 212, 0.2)`          |
| `.glow-green`  | `0 0 20px rgba(16, 185, 129, 0.2)`         |
| `.glow-red`    | `0 0 20px rgba(239, 68, 68, 0.2)`          |

### Hover Shadows

- **Glass card hover:** `0 8px 32px rgba(139, 92, 246, 0.1)`
- **Gradient button hover:** `0 0 30px rgba(139, 92, 246, 0.4)`
- **Icon badges:** `shadow-lg shadow-{color}-500/25`

---

## 9. Animations

### Keyframe Animations

| Name          | Duration | Easing          | Description                           |
| ------------- | -------- | --------------- | ------------------------------------- |
| `meshShift`   | 20s      | ease-in-out     | Flowing mesh gradient background      |
| `shine`       | 3s       | ease-in-out     | Diagonal shine sweep on buttons       |
| `fadeUp`      | 0.6s     | ease-out        | Fade in + slide up 20px              |
| `fadeIn`      | 0.5s     | ease-out        | Simple opacity fade                   |
| `scaleIn`     | 0.4s     | ease-out        | Scale from 95% + fade in             |
| `pulse-glow`  | —        | —               | Pulsing opacity (0.5 → 1 → 0.5)     |

### Stagger Delays

```css
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
```

---

## 10. Background Patterns

### Dot Grid

```css
.dot-grid {
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Applied to the `<body>` for a subtle textured background.

### Floating Gradient Orbs (Home Page)

| Orb     | Size       | Color                | Blur       |
| ------- | ---------- | -------------------- | ---------- |
| Orb 1   | `288 px`   | `violet-600/20`      | `120px`    |
| Orb 2   | `384 px`   | `indigo-600/15`      | `150px`    |
| Orb 3   | `256 px`   | `cyan-500/10`        | `100px`    |

All positioned absolutely with `pointer-events-none`.

---

## 11. Component Patterns

### Buttons

| Variant     | Background                           | Text           | Border              |
| ----------- | ------------------------------------ | -------------- | ------------------- |
| Default     | `var(--primary)` — `#8b5cf6`        | White          | —                   |
| Outline     | Transparent                          | Foreground     | `var(--border)`     |
| Secondary   | `var(--secondary)`                   | Secondary fg   | —                   |
| Ghost       | Transparent → hover: accent          | Foreground     | —                   |
| Destructive | `var(--destructive)` — `#ef4444`    | White          | —                   |
| Link        | Transparent                          | Primary        | —                   |

Sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

### Gradient Button (`.gradient-btn`)

```css
background: linear-gradient(135deg, #8b5cf6, #6366f1);
/* + animated shine overlay */
/* Hover: box-shadow 0 0 30px rgba(139, 92, 246, 0.4) */
```

### Inputs & Text Areas

```
bg-white/5  border-white/10  text-white  placeholder:text-white/20
focus:border-violet-500/50  focus:ring-violet-500/20
```

### Chat Bubbles

| Sender    | Style                                                     |
| --------- | --------------------------------------------------------- |
| User      | `bg-gradient-to-r from-violet-600 to-indigo-600`, white text, violet shadow |
| Assistant | `.glass` — frosted translucent surface                    |
| Guarded   | `.glass` + `border-red-500/20 bg-red-500/5 glow-red`     |

### Chat Markdown Styling

- **Bold text:** `rgba(255,255,255, 0.95)`, weight 600
- **Italic text:** `rgba(167,139,250, 0.9)` (violet tint)
- **Inline code:** `bg rgba(255,255,255, 0.08)`, color `rgba(196,181,253, 0.9)`
- **Blockquote:** 3px left border `rgba(139,92,246, 0.5)`
- **List markers:** `rgba(139,92,246, 0.6)`

### Badge / Sentiment Tags

| Tier   | Text Color    | Background         | Border              |
| ------ | ------------- | ------------------ | ------------------- |
| High   | `violet-300`  | `violet-500/15`    | `violet-500/20`     |
| Medium | `indigo-300`  | `indigo-500/10`    | `indigo-500/15`     |
| Low    | `white/50`    | `white/5`          | `white/10`          |

---

## 12. Layout Grid

### Container Widths

| Token        | Width     | Usage               |
| ------------ | --------- | ------------------- |
| `max-w-7xl`  | 80 rem    | Main content area   |
| `max-w-5xl`  | 64 rem    | Feature grids       |
| `max-w-4xl`  | 56 rem    | Landing sections    |
| `max-w-2xl`  | 42 rem    | Forms               |
| `max-w-lg`   | 32 rem    | Suggested questions |
| `max-w-md`   | 28 rem    | Text blocks         |

### Responsive Grids

| Context          | Columns                             | Gap    |
| ---------------- | ----------------------------------- | ------ |
| Dashboard cards  | `1 → sm:2 → lg:4`                  | `1rem` |
| Feature cards    | `1 → sm:2 → lg:4`                  | `1rem` |
| Reviews          | `1 → md:2`                         | `1rem` |
| Charts           | `1 → lg:2`                         | `1.5rem` |

### Page Padding

```
px-4  sm:px-6  lg:px-8
```

---

## 13. Scrollbar

```css
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255, 0.2);
}
```

---

## 14. Icon Library

**Lucide React** (`lucide-react ^0.577.0`)

All icons are sourced from the Lucide icon set. Key icons used throughout the app:

- `Search` — Logo mark
- `Star` — Ratings
- `MessageSquare` — Reviews / chat
- `TrendingUp` / `TrendingDown` — Trends
- `BarChart3` — Analytics
- `Send` — Submit
- `Sparkles` — AI indicators
- `Shield` / `ShieldAlert` — Guardrails
- `Plus`, `Trash2`, `Edit`, `Check`, `X` — Actions

---

## 15. Design Dependencies

| Package                   | Version  | Purpose                     |
| ------------------------- | -------- | --------------------------- |
| `tailwindcss`             | ^4       | Utility-first CSS framework |
| `@tailwindcss/postcss`    | ^4       | PostCSS integration         |
| `tw-animate-css`          | ^1.4.0   | Animation utilities         |
| `tailwind-merge`          | ^3.5.0   | Class deduplication         |
| `class-variance-authority`| ^0.7.1   | Component variant system    |
| `clsx`                    | ^2.1.1   | Conditional class joining   |
| `lucide-react`            | ^0.577.0 | Icon set                    |
| `recharts`                | ^3.8.0   | Data visualization          |
| `react-markdown`          | ^10.1.0  | Markdown rendering          |
| `@base-ui/react`          | ^1.3.0   | Headless component primitives |
| `shadcn`                  | ^4.0.8   | UI component library        |

---

## 16. Design Principles

1. **Dark-first** — Deep navy base (`#0a0a1a`) with layered transparency.
2. **Glassmorphism** — Frosted-glass surfaces create depth without heavy shadows.
3. **Violet-anchored** — `#8b5cf6` is the single source of brand identity; all accents derive from or complement it.
4. **Subtle motion** — Animations are slow (0.4s–20s), eased, and never jarring.
5. **Progressive disclosure** — Hover states reveal additional depth (lift, glow, border brightening).
6. **Accessible contrast** — Text uses high-opacity white on dark; muted text stays above `0.5` opacity.

---

*This document is the single source of truth for all visual decisions in ReviewLens AI.*
