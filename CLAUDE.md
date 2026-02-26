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

0. **colors.js** → `_r`, `_FONT`, `_PALETTE`, `_parseHex`, `_rgb2hsl`, `_hsl2hex`, `_darkFill`, `_strokeDark`, `_makeBase`, `_BASE` — Single source of truth for all shared design tokens (colors, fonts) and color math helpers. Loads in `<head>`, injects `<style id="palette-vars">` with CSS custom properties (`:root` dark defaults + `body.light-mode` surface/text overrides). Accent/fonts are mode-independent.
1. **anim.js** → `Anim`, `_TWO_PI`, `_HALF_PI` — easing, fade trackers, trail ring-buffers, rotation accumulators. Must load before enzymes.js.
2. **enzymes.js** → `EnzymeStyles`, `CFG`, `_ROLE`, `_THEME` — enzyme/particle/arrow drawing. Color pipeline: `_PALETTE` → `_BASE` families → `_ROLE` semantics → `_pal()` palettes. `_THEME.dark`/`light` derived from `_PALETTE` values.
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

All shared hex values live in `colors.js` → `_PALETTE` (single source of truth). Changing a color in `_PALETTE` updates both CSS custom properties and canvas JS automatically.

### Pathway Colors (`_PALETTE.*` → `_BASE` → CSS `--pw-*`)

| Pathway | Hex | `_PALETTE` key / CSS var |
|---------|-----|--------------------------|
| Glycolysis / Shared | `#fb923c` orange | `.orange` / `--pw-glyc` |
| Calvin / Photosynthetic | `#10b981` green | `.green` / `--pw-calvin` |
| PPP / ATP Synthase | `#f43f5e` rose | `.rose` / `--pw-ppp` |
| Krebs / Respiratory ETC | `#38bdf8` blue | `.blue` / `--pw-krebs` |
| Cyclic / BR | `#c084fc` purple | `.purple` / `--pw-cyclic` |
| Fermentation / NNT | `#a0694a` brown | `.brown` / `--pw-ferment` |
| Electrons | `#67e8f9` cyan | `.cyan` / `--pw-electron` |
| Protons | `#ef4444` red | `.red` / `--pw-proton` |
| Photons | `#fde68a` yellow | `.yellow` / `--pw-photon` |

### CSS Design Tokens

No hardcoded colors in CSS rules — every color is a `var()` or `color-mix()`. Shared color hex values are injected by `colors.js` via `<style id="palette-vars">` (not in the stylesheet). Non-shared tokens (scrim, track, toggle, shadows) remain in `style.css` `:root`/`body.light-mode`. Alpha uses 8-digit hex (`#RRGGBBAA`).

**Surfaces:** `--bg-canvas`, `--bg-panel` (translucent + blur), `--bg-panel-solid`, `--bg-elevated`, `--bg-hover`, `--bg-scrim`, `--bg-track`, `--metab-card-bg`
**Text:** `--text`, `--text-secondary`, `--text-muted`, `--text-on-accent`
**Accent:** `--accent` (#FE3B01, mode-independent), `--accent-light` (#FF6B3D), `--accent-glow`, `--accent-subtle`
**Toggle:** `--tog-bg`, `--tog-thumb-on`, `--tog-border`, `--tog-inset`, `--tog-thumb-shadow`, `--tog-checked-inset`, `--tog-checked-extra`, `--tog-shadow`, `--track-shadow`
**Fonts:** `--font-display` (Instrument Serif), `--font-body` (Geist), `--font-mono` (Geist Mono). Canvas uses same `_FONT` object from colors.js (+ `_FONT.emoji` for sun/moon).

### Canvas Theme (`_THEME`)

`EnzymeStyles.t(lightMode)` returns mode-dependent object with: `textPrimary`/`Secondary`/`Muted`/`OnAccent`, `surfacePrimary`/`Secondary`/`Elevated`/`Muted`, `accentBadge`/`Glow`, `metabActiveStroke`/`InactiveStroke`, `membraneHead`/`Tail`, `sectionLabel`/`Alt`, `protonPoolLabel`, `chromophoreAlpha`. All values derived from `_PALETTE` via `_r(hex, alpha)`.

## Key Patterns

- `_dispatch` / `_rotNudge` maps in sim.js replace 20-branch if-else in `advanceStep`
- Module-scope constants (`_TWO_PI`, `_KREBS_METABS` Sets, `_FONT`, `_METAB_ALPHA`, `_fadeCurve`) avoid per-frame allocation
- `_r(hex, a)` — appends alpha byte to hex (`_r('#E89B80', 0.2)` → `'#E89B8033'`); defined in colors.js, used throughout `_THEME` and CSS injection
- `_PALETTE` — frozen object in colors.js; single source of truth for all shared hex values (pathways, cofactors, mode surfaces/text/accent)
- `_parseHex`/`_rgb2hsl`/`_hsl2hex` — shared color math in colors.js; `_darkFill`/`_strokeDark` wrap these
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
5. **style.css**: Add CSS variable if new color

## UI

### Theme

Three-state toggle: **Simulation** (follows sunlight), **Light**, **Dark**. CSS `.light-mode` on `<body>` toggles variables. Canvas reads `simState.visualLightMode` (decoupled from sim `lightOn`). `getPalette(key, lightMode)` swaps fill/stroke.

### Layout

- **Intro** (`#intro-screen`): full overlay → `.hidden` → `.app-ready` on `<body>` triggers entrance animations
- **Sidebar** (`#dashboard`): Gerry-style floating panel, tabbed — Controls / Stats / Reference. `Renderer.sidebarInset` pushes canvas layout. Membrane extends `W + 400` to avoid cutoff.
- **Glucose bar** (`#glucose-bar`): fixed bottom-center pill

### HTML ↔ JS Contract

JS binds via `getElementById` (~40 IDs). **Only IDs must be preserved** — class names/hierarchy can change freely. CSS class refs in JS: `light-mode`, `app-ready`, `closed`, `active`, `bump`.

### Gerry Design System

Floating panels: `position: fixed`, `backdrop-filter: blur(24px) saturate(1.3)`, `border-radius: 20px`, warm earth-tone palette, three-tier shadows. Icons: Feather-style SVGs (`viewBox="0 0 24 24"`, `18×18`, `stroke-width="2"`).
