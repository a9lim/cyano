# CLAUDE.md

## Project Overview

Metabolism Simulator — interactive HTML5 Canvas visualization of cellular metabolism. Click enzyme labels to advance reactions step-by-step, tracking metabolites and bioenergetics in real time.

## Commands

```bash
npx serve .                    # serve locally (no build step)
node -c *.js                   # syntax check (no test runner)
lsof -ti:<port> | xargs kill -9  # kill stale server
```

Verify HTML ↔ JS ID contract after restructuring:
```bash
diff <(grep -oP "getElementById\('\K[^']*" sim.js renderer.js | sed 's/.*://' | sort -u) \
     <(grep -oP 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u)
```

## Architecture

Zero dependencies — vanilla HTML5/CSS3/JS, ES6 IIFE pattern. Scripts load in order via `<script>` tags:

0. **colors.js** → `_r`, `_FONT`, `_PALETTE`, `_parseHex`, `_rgb2hsl`, `_hsl2hex`, `_darkFill`, `_strokeDark`, `_makeBase`, `_BASE` — Single source of truth for all shared design tokens (colors, fonts) and color math helpers. Loads in `<head>`, injects `<style id="palette-vars">` with CSS custom properties (`:root` light defaults + `[data-theme="dark"]` overrides). Accent/fonts are mode-independent.
1. **anim.js** → `Anim`, `_TWO_PI`, `_HALF_PI` — easing, fade trackers, trail ring-buffers, rotation accumulators. Must load before enzymes.js.
2. **enzymes.js** → `EnzymeStyles`, `CFG`, `_ROLE`, `_THEME` — enzyme/particle/arrow drawing. Also exports `_F` (frozen pre-computed font strings) and `_labelFont(size)` cache for canvas `ctx.font` assignments. Color pipeline: `_PALETTE` → `_BASE` families → `_ROLE` semantics → `_pal()` palettes. `_THEME.dark`/`light` derived from `_PALETTE` values.
3. **renderer.js** → `Renderer` — Canvas 2D engine: layout, zoom/pan, hit detection, draw pipeline.
4. **sim.js** → IIFE — `store` (metabolites), `simState` (toggles/flags), reaction logic, dashboard DOM sync, `requestAnimationFrame` loop.

### Data Flow

- **Click-to-react**: Canvas click → `Renderer.enzymeHitboxes` → `advanceStep()` → validate substrates → mutate `store` → spawn particles → `updateDashboard()`
- **Auto-play**: 400ms tick, priority order: ATP Synthase → ETC → PDH → Krebs → Glycolysis → Fermentation → Calvin → PPP → BR
- **Shared nodes**: `_METAB_ALPHA` table in renderer.js maps metabolites (G3P, F6P, R5P…) to owning-pathway fade alpha

### Draw Pipeline

`Renderer.draw(state)`: membrane → ETC complexes (13) → cytoplasm network → Krebs cycle → particles → labels

### State Model

- `store` — closed-system pools. ATP+ADP, NAD⁺+NADH, NADP⁺+NADPH, FAD+FADH₂ conserved.
- `simState` — pathway enables, environment flags (`lightOn`, `oxygenAvailable`), counters.
- Bidirectional enzymes check both directions.

## Color System

See `colors.js` in Architecture above — `_PALETTE` is the single source of truth. Changing a hex there auto-updates both CSS custom properties and canvas JS.

### Pathway Colors (`_PALETTE.*` → `_BASE` → CSS `--pw-*`)

| Pathway | Hex | `_PALETTE` key / CSS var |
|---------|-----|--------------------------|
| Glycolysis / Shared | `#d9924c` orange | `.orange` / `--pw-glyc` |
| Calvin / Photosynthetic | `#52a87a` green | `.green` / `--pw-calvin` |
| PPP / ATP Synthase | `#c85c74` rose | `.rose` / `--pw-ppp` |
| Krebs / Respiratory ETC | `#5898ba` blue | `.blue` / `--pw-krebs` |
| Cyclic / BR | `#a882bc` purple | `.purple` / `--pw-cyclic` |
| Fermentation / NNT | `#9e6842` brown | `.brown` / `--pw-ferment` |
| Electrons | `#48b4aa` cyan | `.cyan` / `--pw-electron` |
| Protons | `#cc4c3c` red | `.red` / `--pw-proton` |
| Photons | `#dbb850` yellow | `.yellow` / `--pw-photon` |

### CSS Design Tokens

No hardcoded colors — every CSS color is a `var()` or `color-mix()`. Non-color tokens (radius, layout, easing) remain in `styles.css` `:root`/`[data-theme="dark"]`. Alpha uses 8-digit hex (`#RRGGBBAA`).

Naming convention: `--bg-*` (surfaces), `--text-*` (text), `--accent-*` (accent), `--tog-*` (toggles), `--pw-*` (pathways), `--co-*` (cofactors). Fonts: `--font-display` (Instrument Serif), `--font-body` (Geist), `--font-mono` (Geist Mono). Canvas uses `_FONT` from colors.js.

### Canvas Theme (`_THEME`)

`EnzymeStyles.t(lightMode)` returns mode-dependent colors for canvas text, surfaces, accents, membrane, and section labels. All derived from `_PALETTE` via `_r(hex, alpha)`. See `_THEME` in enzymes.js for full property list.

## Key Patterns

- `_dispatch` / `_rotNudge` maps in sim.js replace 20-branch if-else in `advanceStep`
- Module-scope constants (`_TWO_PI`, `_KREBS_METABS` Sets, `_FONT`, `_METAB_ALPHA`, `_fadeCurve`) avoid per-frame allocation
- `_F` frozen object (enzymes.js) — pre-computed `ctx.font` strings for all canvas text; eliminates per-frame template-literal allocation. `_labelFont(size)` caches uncommon sizes on first use.
- `_calcEndpoints` + `_ep` reusable object shared across arrow-draw methods in renderer.js
- `_drawRunArrow()` — shared helper for glycolysis run arrows (hitbox + label + arrowhead)
- ATP Synthase and NNT always visible (no fade alpha); glow when `protonGradient > 0`. Other ETC complexes fade with `rA`/`phA`.

## Membrane & ETC

Membrane at `membraneY = H * 0.22`. Above = lumen, below = matrix/stroma. Proton pumps push H⁺ upward.

ETC complex shapes in enzymes.js each have unique silhouettes. All share signature `(ctx, cx, cy, w, h, glow, lightMode)` — renderer.js positions/sizes are independent of shape internals.

### Adding a New Complex

1. **enzymes.js**: `draw<Name>()` shape + palette in `colors` + role in `_ROLE`
2. **renderer.js**: Bump `numComplexes`, add position in `etcComplexes`, draw call + arrows + hitbox in `drawETCChain()`
3. **sim.js**: Add to `_dispatch`, write `advance<Name>()`, add to autoplay ETC tick
4. **index.html**: Update legend if needed
5. **styles.css**: Add CSS variable if new color

## UI

### Theme

Three-state toggle: **Simulation** (follows sunlight), **Light**, **Dark**. CSS `data-theme` on `<body>` toggles variables (`light` default, `dark` override). Canvas reads `simState.visualLightMode` (decoupled from sim `lightOn`). `getPalette(key, lightMode)` swaps fill/stroke.

### Layout

- **Intro** (`#intro-screen`): full overlay → `.hidden` → `.app-ready` on `<body>` triggers entrance animations
- **Sidebar** (`#dashboard`): Gerry-style floating panel, tabbed — Controls / Stats / Reference. `Renderer.sidebarInset` pushes canvas layout. Membrane extends `W + 400` to avoid cutoff.
- **Glucose bar** (`#glucose-bar`): fixed bottom-center pill

### HTML ↔ JS Contract

JS binds via `getElementById` (~40 IDs). **Only IDs must be preserved** — class names/hierarchy can change freely. CSS class refs in JS: `app-ready`, `closed`, `active`, `bump`. Data attributes: `data-theme` (`light`/`dark`).

### Gerry Design System

Floating panels use `.glass` class (`bg-panel` + blur + border + shadow), `position: fixed`, `border-radius: 20px`, warm earth-tone palette, three-tier shadows. Icons: Feather-style SVGs (`viewBox="0 0 24 24"`, `18×18`, `stroke-width="2"`).

### CSS Parameterization

Repeated per-variant CSS blocks are collapsed via custom property assignments + generic rules:
- **Toggles**: `.tog-*` classes set `--tog-color`, one generic `:checked` rule applies to all. `--tog-shift` controls thumb translateX (20px default, 22px on coarse pointers).
- **Metabolite cards**: `.mc-*` classes set `--mc-color`, generic `[class*="mc-"]` rules style background/bar/text.
- **Legend dots**: `.legend-dot.*` variants set `--dot-color`, one generic rule sets `background`.
- **Equations**: `.eq-*` variants set `--eq-color`, one generic rule colors `.eq-name` and `.eq-dot`.
- **Glass panels**: `.glass` class on `header`, `#canvas-controls`, `#glucose-bar`, `#dashboard` — `bg-panel` + `blur(24px) saturate(1.3)` + border + `shadow-md`. Dashboard overrides to `shadow-lg`. Tablet breakpoint strips glass from dashboard.
