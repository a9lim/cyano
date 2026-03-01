# CLAUDE.md

Part of the **a9l.im** portfolio. See parent `site-meta/CLAUDE.md` for the shared design system specification. Sibling projects: `physsim`, `gerry`.

## Overview

Metabolism Simulator — interactive HTML5 Canvas visualization of cellular metabolism. Click enzyme labels to advance reactions step-by-step, tracking metabolites and bioenergetics in real time. Zero dependencies — vanilla HTML5/CSS3/JS with ES6 modules.

## Running Locally

```bash
npx serve .                    # serve locally (no build step)
node -c *.js                   # syntax check (no test runner)
```

Verify HTML ↔ JS ID contract after restructuring:
```bash
diff <(grep -rPoH "getElementById\('\K[^']*" src/ main.js | sed 's/.*://' | sort -u) \
     <(grep -oP 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u)
```

## Architecture

CSS loads `/shared-base.css` (shared reset, layout tokens, `.glass`, `.tool-btn`, intro screen, keyframes, sim layout components, toast notifications) then `styles.css` (project overrides + tab system, ctrl-group/row). Scripts:

0. **shared-tokens.js** → `_r`, `_parseHex`, `_rgb2hsl`, `_hsl2hex`, `_darken`, `_FONT`, `_PALETTE` (shared tokens + `extended` sub-object)
0b. **colors.js** → extends `_PALETTE` with pathway colors via `_PALETTE.extended.*` references, defines `_darkFill`, `_makeBase`, `_BASE` families. Injects project-specific CSS vars (`--pw-*`, `--co-*`, `--tog-*`). Freezes all objects.
1. **main.js** → ES6 module entry point: imports all modules, initializes canvas/DOM/theme, runs `requestAnimationFrame` loop.

```
main.js (entry point)
  ├── src/state.js        — simState, store, counters, resetState(), updateAnimations()
  ├── src/anim.js         — Anim, _TWO_PI, _HALF_PI — easing, fade trackers, rotation accumulators
  ├── src/theme.js        — updateTheme(), cycleTheme() — three-state theme toggle
  ├── src/dashboard.js    — initDashboard(), updateDashboard(), showActiveStep(), applyYields()
  ├── src/enzymes.js      — EnzymeStyles, CFG, _F, _ROLE, _THEME — enzyme/particle/arrow drawing
  ├── src/renderer.js     — Renderer — Canvas 2D engine: draw pipeline, hit detection, camera/zoom (via bindZoomButtons)
  ├── src/layout.js       — computeLayout() — membrane/ETC/metabolite positioning
  ├── src/particles.js    — Particles — spawn/draw electrons, protons, photons with trail animations
  ├── src/autoplay.js     — autoplayTick(), resetAutoplayTimers() — automated pathway cycling
  ├── src/ui.js           — cacheDOMElements(), bindEvents() — DOM cache, event binding, intro screen
  └── src/reactions/
        ├── dispatch.js   — _dispatch map, _rotNudge, advanceStep() — unified reaction dispatcher
        ├── glycolysis.js — advanceGlycolysis, runGlycolysisUpper/Lower
        ├── krebs.js      — advanceKrebs, runKrebs
        ├── calvin.js     — advanceCalvin, runCalvin
        ├── ppp.js        — advancePPP, runPPP
        ├── etc.js        — advanceETC (photo/resp), ATPSynthase, BR, NNT
        └── fermentation.js — advancePDH, PDC, ADH, ALDH, ACS, fermentation
```

Color pipeline: `_PALETTE` → `_BASE` families → `_ROLE` semantics → `_pal()` palettes. `_THEME.dark`/`light` derived from `_PALETTE` values. `_F` is a frozen pre-computed font string cache in enzymes.js.

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

### Membrane & ETC

Membrane at `membraneY = LH * 0.22` (where `LH = Math.max(H, 600)`). Above = lumen, below = matrix/stroma. Proton pumps push H⁺ upward.

ETC complex shapes in enzymes.js each have unique silhouettes. All share signature `(ctx, cx, cy, w, h, glow, lightMode)` — renderer.js positions/sizes are independent of shape internals.

**Adding a New Complex:**
1. **src/enzymes.js**: `draw<Name>()` shape + palette in `colors` + role in `_ROLE`
2. **src/renderer.js**: Bump `numComplexes`, add position in `etcComplexes`, draw call + arrows + hitbox in `drawETCChain()`
3. **src/reactions/etc.js**: Write `advance<Name>()` reaction function
4. **src/reactions/dispatch.js**: Add to `_dispatch` map
5. **src/autoplay.js**: Add to ETC fast tick
6. **index.html**: Update legend if needed
7. **styles.css**: Add CSS variable if new color

## Color System

`_PALETTE` is the single source of truth. All 10 pathway/particle base hues reference `_PALETTE.extended.*` from `shared-tokens.js`. Changing a value in `shared-tokens.js` auto-updates both CSS custom properties and canvas JS.

### Pathway Colors (`_PALETTE.*` → `_BASE` → CSS `--pw-*`)

| Pathway | Extended key | CSS var |
|---------|-------------|---------|
| Glycolysis / Shared | `extended.orange` | `--pw-glyc` |
| Calvin / Photosynthetic | `extended.green` | `--pw-calvin` |
| PPP / ATP Synthase | `extended.rose` | `--pw-ppp` |
| Krebs / Respiratory ETC | `extended.blue` | `--pw-krebs` |
| Cyclic / BR | `extended.purple` | `--pw-cyclic` |
| Fermentation / NNT | `extended.brown` | `--pw-ferment` |
| Electrons | `extended.cyan` | `--pw-electron` |
| Protons | `extended.red` | `--pw-proton` |
| Photons | `extended.yellow` | `--pw-photon` |
| Neutral / Slate | `extended.slate` | — |

Biosim-specific colors (not from `extended`): cofactor bars (`atp`, `nadh`, `nadph`, `fadh2`), `textOnAccent`, `light.togBg`.

### Canvas Theme (`_THEME`)

`EnzymeStyles.t(lightMode)` returns mode-dependent colors for canvas text, surfaces, accents, membrane, and section labels. All derived from `_PALETTE` via `_r(hex, alpha)`.

### CSS Design Tokens

No hardcoded colors — every CSS color is a `var()` or `color-mix()`. Shared layout tokens in `shared-base.css`; project-specific overrides (e.g. `--tog-shadow`) in `styles.css`. Alpha uses 8-digit hex (`#RRGGBBAA`).

Naming: `--bg-*` (surfaces), `--text-*` (text), `--accent-*` (accent), `--tog-*` (toggles), `--pw-*` (pathways), `--co-*` (cofactors).

## UI & Layout

### Theme

Three-state toggle: **Simulation** (follows sunlight), **Light**, **Dark**. CSS `data-theme` on `<body>` (not `<html>` — unique among sibling projects). Canvas reads `simState.visualLightMode` (decoupled from sim `lightOn`). `getPalette(key, lightMode)` swaps fill/stroke. Theme toggle icons are inline SVGs (sun/moon), not Unicode characters.

### Layout

- **Intro** (`#intro-screen`): full overlay → `.hidden` → `.app-ready` on `<body>` triggers entrance animations
- **Sidebar** (`#dashboard`): floating glass panel, tabbed — Controls / Stats / Reference (tab system from `shared-base.css`). `Renderer.sidebarInset` pushes canvas layout. Membrane extends `LW + 400` to avoid cutoff.
- **Glucose bar** (`#glucose-bar`): fixed bottom-center pill

### Responsive Breakpoints

- **900px**: body becomes scrollable, sidebar stacks below canvas (`position: relative`), glass stripped from dashboard. `#top-bar` goes sticky with `border-radius: 0`.
- **600px**: tighter spacing, smaller tool buttons (30×30), reduced canvas height.

### HTML ↔ JS Contract

JS binds via `getElementById` (~40 IDs). **Only IDs must be preserved** — class names/hierarchy can change freely. CSS class refs in JS: `app-ready`, `closed`, `active`, `bump`. Data attributes: `data-theme` (`light`/`dark`).

## Key Patterns

- `_dispatch` / `_rotNudge` maps in `src/reactions/dispatch.js` replace 20-branch if-else in `advanceStep`
- Module-scope constants (`_TWO_PI`, `_KREBS_METABS` Sets, `_FONT`, `_METAB_ALPHA`, `_fadeCurve`) avoid per-frame allocation
- `_F` frozen object (enzymes.js) — pre-computed `ctx.font` strings for all canvas text; eliminates per-frame template-literal allocation. `_labelFont(size)` caches uncommon sizes on first use.
- `_calcEndpoints` + `_ep` reusable object shared across arrow-draw methods in renderer.js
- `_drawRunArrow()` — shared helper for glycolysis run arrows (hitbox + label + arrowhead)
- ATP Synthase and NNT always visible (no fade alpha); glow when `protonGradient > 0`. Other ETC complexes fade with `rA`/`phA`.

### CSS Parameterization

Repeated per-variant CSS blocks are collapsed via custom property assignments + generic rules:
- **Toggles**: `.tog-*` classes set `--tog-color`, one generic `:checked` rule applies to all. `--tog-shift` controls thumb translateX (20px default, 22px on coarse pointers).
- **Metabolite cards**: `.mc-*` classes set `--mc-color`, generic `[class*="mc-"]` rules style background/bar/text.
- **Legend dots**: `.legend-dot.*` variants set `--dot-color`, one generic rule sets `background`.
- **Equations**: `.eq-*` variants set `--eq-color`, one generic rule colors `.eq-name` and `.eq-dot`.
- **Tab system** (in `styles.css`, moved from shared-base.css): `.tabs-wrap`, `.tab-bar`, `.tab-btn`, `.tab-panels`, `.tab-panel` — biosim sidebar only.
- **Control group/row** (in `styles.css`, moved from shared-base.css): `.ctrl-group`, `.ctrl-row` — biosim only.
- **Glass panels**: `.glass` class on `header`, `#canvas-controls`, `#glucose-bar`, `#dashboard`. Dashboard overrides to `shadow-lg`. Tablet breakpoint strips glass from dashboard.

## Gotchas

- **`data-theme` is on `<body>`, not `<html>`** — unique among all a9l.im projects. CSS theme rules depend on this.
- **No `@import` in CSS** — fonts are loaded via `<link>` in HTML. Duplicate `@import` causes FOUC.
- **Shared CSS at domain root** — `shared-base.css` is loaded via `/shared-base.css` (absolute path). When serving locally, serve from the parent `a9lim.github.io/` directory or the shared file won't resolve.
- **Intro card SVGs keep their attributes** — `.tool-btn svg` defaults don't apply to intro cards. Those SVGs need explicit `fill="none" stroke="currentColor"` etc.
- **Renderer uses minimum content dimensions** — `LW = Math.max(rawLW, 900)` and `LH = Math.max(H, 600)` so pathways never compress below readable size on small screens. Zoom auto-fits to `_minZoom()` on first init.
- **Pan clamping uses viewport vs content dimensions** — `clampPan()` compares scaled content size (`cw * zoom`) against viewport size (`this.W`), not content against itself. This allows zooming out to see full content on narrow screens.
