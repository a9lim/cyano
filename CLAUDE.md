# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Metabolism Simulator — an interactive HTML5 Canvas visualization of cellular metabolism. Users click enzyme labels to advance biochemical reactions step-by-step while tracking metabolite concentrations and bioenergetic metrics in real time.

## Running Locally

No build step or package manager. Serve with any static HTTP server:
```bash
npx serve .
# or
python3 -m http.server 3000 --bind 127.0.0.1
```
Open `http://localhost:3000` in a browser. There are no tests, linters, or CI pipelines.

## Architecture

**Zero dependencies** — vanilla HTML5/CSS3/JS with ES6 IIFE module pattern. Scripts load in order via `<script>` tags in `index.html`:

1. **anim.js** → `Anim` global + `_TWO_PI`/`_HALF_PI` cached math constants — easing functions, fade trackers (smooth pathway enable/disable), trail ring-buffers for particle glow, and rotation accumulators. Must load before `enzymes.js`.
2. **enzymes.js** → `EnzymeStyles` global + `_BASE`/`_ROLE`/`_THEME`/`_pal`/`_FONT` helpers — drawing functions for membrane complexes, metabolite nodes, particles, arrows. Color math via `_parseHex`/`_rgb2hsl`/`_hsl2hex` shared helpers. All pathway stroke colors derive from `_BASE` color families via `_ROLE` → `_pal()`. All other canvas UI colors (surfaces, text, membrane, labels, cofactors, particles) are centralised in `_THEME` with `dark`/`light` sub-objects. Access via `EnzymeStyles.t(lightMode)` for mode-dependent colors, `EnzymeStyles.theme.*` for mode-independent (e.g. `photonFill`, `photonGlow`).
3. **renderer.js** → `Renderer` global — Canvas 2D engine handling layout computation, zoom/pan, hit detection, and the draw pipeline (membrane → ETC complexes → cytoplasm network → Krebs cycle → particles → labels).
4. **sim.js** → initialization and game loop — owns the `store` object (all metabolite counts), `simState` (pathway toggles, environment flags), reaction validation/execution, dashboard DOM sync, and the `requestAnimationFrame` main loop.

### Key Data Flow

- **Click-to-react**: Canvas click → `Renderer.enzymeHitboxes` lookup → `advanceStep(pathway, stepIndex)` in sim.js → validates substrates → mutates `store` → spawns particle animation → calls `updateDashboard()`.
- **Auto-play**: 400ms tick in `mainLoop()` attempts pathways in priority order (ATP Synthase → ETC → PDH → Krebs → Glycolysis → Fermentation → Calvin → PPP → BR), respecting toggles and metabolite availability.
- **Shared metabolite nodes**: Metabolites like G3P, F6P, R5P are drawn once but referenced by multiple pathways. `_METAB_ALPHA` lookup table in renderer.js maps each metabolite to its owning-pathway fade alpha function; `getMetabAlpha()` dispatches through it.

### Rendering Pipeline

`Renderer.draw(state)` executes layers in order:
1. `drawMembrane()` — phospholipid bilayer gradient
2. `drawETCChain()` — 13 membrane complexes with arrows, yields, hitboxes
3. `drawCytoplasmNetwork()` — metabolite nodes, enzyme arrows, pathway coloring
4. `drawKrebsCycle()` — separate 3×3 grid layout
5. `drawParticles()` — animated electrons/protons with fade-out
6. `drawLabels()` — environment indicators

### State Model

- `store` — closed-system metabolite pools. Total ATP+ADP, NAD⁺+NADH, NADP⁺+NADPH, FAD+FADH₂ are conserved.
- `simState` — pathway enable flags (`glycolysisEnabled`, `calvinEnabled`, etc.), environment flags (`lightOn`, `oxygenAvailable`), tracking counters (`co2Fixed`, `protonsPumped`, etc.).
- Bidirectional enzymes check both forward and reverse substrate availability.

### Pathway Color Coding

| Pathway | Color |
|---------|-------|
| Glycolysis / Shared | `#fb923c` (orange) |
| Calvin Cycle / Photosynthetic | `#10b981` (green) |
| PPP / ATP Synthase | `#f43f5e` (rose) |
| Krebs / Respiratory ETC | `#38bdf8` (blue) |
| Cyclic / Bacteriorhodopsin | `#c084fc` (purple) |
| Fermentation / NNT | `#a0694a` (brown) |
| Electrons | `#67e8f9` (cyan) — `_BASE.cyan`, must match `.legend-dot.electron` in CSS |
| Protons | `#ef4444` (red) — `_BASE.red` |
| Photons | `#fde68a` / `#fbbf24` — `_THEME.photonFill` / `_THEME.photonGlow` |

### Membrane Orientation

Membrane is near the top of the canvas (`membraneY = H * 0.22`). Above membrane = thylakoid lumen. Below membrane = matrix/stroma/cytoplasm. Lumenal carriers (PC) sit above; stromal carriers (Fd, FNR) sit below. Proton pumps push H⁺ upward (into lumen).

### ETC Complex Shapes

Each membrane protein has a unique silhouette in `enzymes.js` reflecting its real structure: ATP Synthase (mushroom: Fo + stalk + F1), NDH-1 (T-shape: narrow neck + wide peripheral head), Cyt b6f (hourglass), PSII/PSI (ellipses), SDH/CytOx (trapezoids), PQ/Fd (diamonds), PC (circle), FNR (ellipse), BR (barrel with helix lines), NNT (rounded rect with subunit dividers). All share the same call signature `(ctx, cx, cy, w, h, glow, lightMode)` — renderer.js positions/sizes are independent of shape internals. PSII, PSI, and BR share `_drawChromophore()` for their reaction-center circles.

### Dev Workflow

- `node -c *.js` — quick syntax check all JS files (no test runner exists)
- Kill stale server: `lsof -ti:<port> | xargs kill -9`

### Key Patterns

- `_dispatch` / `_rotNudge` maps in sim.js replace a 20-branch if-else in `advanceStep`
- Module-scope constants (`_TWO_PI`/`_HALF_PI`, `_KREBS_METABS` Sets, `_FONT` lookup, `_METAB_ALPHA` table, `_fadeCurve` fn) avoid per-frame allocation in hot render path
- `_parseHex`/`_rgb2hsl`/`_hsl2hex` in enzymes.js — shared color math; `_darkFill` and `_strokeDark` are both 2-line wrappers around these
- `_calcEndpoints` + `_ep` reusable object shared across all three arrow-draw methods in renderer.js
- `drawSmallProtonArrow(ctx, x, y, label, dir)` — `dir='down'` variant for ATP Synthase/NNT; label renders below arrowhead tip
- `_drawRunArrow()` in renderer.js — shared helper for glycolysis upper/lower run arrows (hitbox + label + arrowhead)
- `updateBar()` in sim.js — shared helper for cofactor bar DOM updates
- ATP Synthase and NNT are always visible (no fade alpha); they glow when `protonGradient > 0`. Other ETC complexes fade with `rA`/`phA`.

### Adding a New Membrane Complex

1. **enzymes.js**: Add `draw<Name>()` shape function + palette entry in `colors` + role in `_ROLE`
2. **renderer.js**: Bump `numComplexes`, add position in `etcComplexes`, draw call + proton arrow + yield labels + hitbox in `drawETCChain()`
3. **sim.js**: Add to `_dispatch` map, write `advance<Name>()` reaction function, add to autoplay ETC tick
4. **index.html**: Update legend if needed
5. **style.css**: Update CSS variables if new color

### Light/Dark Mode

Three-state theme toggle in the toolbar: **Simulation** (follows sunlight toggle), **Light**, **Dark**. CSS `.light-mode` class on `<body>` toggles theme variables. Canvas drawing reads `simState.visualLightMode` (set by `updateTheme()` in sim.js) to decouple visual theme from simulation `lightOn` state. `getPalette(key, lightMode)` swaps fill/stroke colors. Both UI and canvas adapt simultaneously.

### UI Overlays & Layout

- **Intro screen** (`#intro-screen`): Full-viewport overlay, dismissed via `.hidden` class → `.app-ready` on `<body>` triggers staggered entrance animations for header, glucose bar, zoom controls.
- **Sidebar push**: `Renderer.sidebarInset` animates layout width (`LW = W - inset`) in sync with CSS sidebar transition. Membrane extends `W + 400` wide to avoid cutoff behind the translucent sidebar.
- **Glucose bar** (`#glucose-bar`): Fixed bottom-center floating pill, appears after `.app-ready`.

### HTML ↔ JS Binding Contract

`sim.js` and `renderer.js` bind to DOM elements exclusively via `getElementById` (~40 IDs). **Class names, hierarchy, and structure can change freely** — only element IDs must be preserved. The only CSS class references in JS are `light-mode` on `<body>`, `app-ready` on `<body>`, `closed` on `#dashboard`, `active` on `.tool-btn`/`.tab-btn`, and `bump` on stat value elements.

To verify after HTML restructuring:
```bash
diff <(grep -oP "getElementById\('\K[^']*" sim.js renderer.js | sed 's/.*://' | sort -u) <(grep -oP 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u)
```
All JS IDs must appear in the HTML output.

### Dashboard Tabbed Sidebar

The sidebar uses a Gerry-style floating panel with a header ("Metabolism" title + close button) and a tabbed interface with three panels: **Controls** (pathway/environment toggles), **Stats** (active step, metabolite gauges, bioenergetics counters), **Reference** (net equations, legend). Tab switching is handled by a small inline `<script>` before the sim scripts load. The hamburger menu button in the toolbar and the X close button in the sidebar header both call `toggleSidebar()`.

### CSS Design Tokens

CSS custom properties follow the Gerry project's warm earth-tone palette. Shortened names: `--pw-glyc`, `--pw-krebs`, `--pw-calvin`, `--pw-ppp`, `--pw-cyclic`, `--pw-ferment` for pathway colors; `--co-atp`, `--co-nadh`, `--co-nadph`, `--co-fadh2` for cofactor bar colors. Each has a companion `-rgb` variable for `rgba()` usage.

Surfaces: `--bg-canvas` (#0C0B09 dark / #F0EDE4 light), `--bg-panel` (translucent with backdrop blur), `--bg-elevated`, `--bg-hover`. Accent: `--accent` (#E89B80 dark / #D97757 light) / `--accent-rgb` / `--accent-light` / `--accent-glow` / `--accent-subtle` for the rust-red accent. Shadows: three-tier `--shadow-sm`/`--shadow-md`/`--shadow-lg` with mode-dependent values.

Typography: `--font-display` (Instrument Serif), `--font-body` (Geist), `--font-mono` (Geist Mono), `--font-label` (Sora). Canvas fonts remain JetBrains Mono / Sora via `_FONT` in enzymes.js.

Additional CSS tokens: `--pw-electron`, `--pw-proton`, `--pw-photon` for particle legend colors; `--tog-bg` / `--tog-thumb-on` for toggle switch base colors. Toggle gradient colors derive from pathway/cofactor variables via `color-mix(in srgb, var(--pw-*), black N%)` — no raw hex in toggle rules.

### UI Style — Gerry Design System

All UI chrome (header, sidebar, zoom controls, glucose bar) follows the Gerry project's floating panel design: `position: fixed`, `backdrop-filter: blur(24px) saturate(1.3)`, `border-radius: 20px`, warm earth-tone palette, Geist/Geist Mono/Instrument Serif/Sora fonts, three-tier shadow system. Toolbar icons are Feather-style outline SVGs (`viewBox="0 0 24 24"`, `width="18" height="18"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`).
