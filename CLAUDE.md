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

1. **anim.js** → `Anim` global — easing functions, fade trackers (smooth pathway enable/disable), trail ring-buffers for particle glow, and rotation accumulators. Must load before `enzymes.js`.
2. **enzymes.js** → `EnzymeStyles` global + `_BASE`/`_ROLE`/`_THEME`/`_pal` helpers — drawing functions for membrane complexes, metabolite nodes, particles, arrows. All pathway stroke colors derive from `_BASE` color families via `_ROLE` → `_pal()`. All other canvas UI colors (surfaces, text, membrane, labels, cofactors, particles) are centralised in `_THEME` with `dark`/`light` sub-objects. Access via `EnzymeStyles.t(lightMode)` for mode-dependent colors, `EnzymeStyles.theme.*` for mode-independent (e.g. `photonFill`, `cofactorDot`).
3. **renderer.js** → `Renderer` global — Canvas 2D engine handling layout computation, zoom/pan, hit detection, and the draw pipeline (membrane → ETC complexes → cytoplasm network → Krebs cycle → particles → labels).
4. **sim.js** → initialization and game loop — owns the `store` object (all metabolite counts), `simState` (pathway toggles, environment flags), reaction validation/execution, dashboard DOM sync, and the `requestAnimationFrame` main loop.

### Key Data Flow

- **Click-to-react**: Canvas click → `Renderer.enzymeHitboxes` lookup → `advanceStep(pathway, stepIndex)` in sim.js → validates substrates → mutates `store` → spawns particle animation → calls `updateDashboard()`.
- **Auto-play**: 400ms tick in `mainLoop()` attempts pathways in priority order (ATP Synthase → ETC → PDH → Krebs → Glycolysis → Fermentation → Calvin → PPP → BR), respecting toggles and metabolite availability.
- **Shared metabolite nodes**: Metabolites like G3P, F6P, R5P are drawn once but referenced by multiple pathways. `shouldDrawMetab()` controls visibility based on enabled pathway toggles.

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

Each membrane protein has a unique silhouette in `enzymes.js` reflecting its real structure: ATP Synthase (mushroom: Fo + stalk + F1), NDH-1 (T-shape: narrow neck + wide peripheral head), Cyt b6f (hourglass), PSII/PSI (ellipses), SDH/CytOx (trapezoids), PQ/Fd (diamonds), PC (circle), FNR (ellipse), BR (barrel with helix lines), NNT (rounded rect with subunit dividers). All share the same call signature `(ctx, cx, cy, w, h, glow, lightMode)` — renderer.js positions/sizes are independent of shape internals.

### Dev Workflow

- `node -c *.js` — quick syntax check all JS files (no test runner exists)
- Kill stale server: `lsof -ti:<port> | xargs kill -9`

### Key Patterns

- `_dispatch` / `_rotNudge` maps in sim.js replace a 20-branch if-else in `advanceStep`
- Module-scope constants (`_TWO_X`, `_KREBS_METABS` Sets; `_fadeCurve` fn) avoid per-frame allocation in hot render path
- `_calcEndpoints` + `_ep` reusable object shared across all three arrow-draw methods in renderer.js
- `drawSmallProtonArrow(ctx, x, y, label, dir)` — `dir='down'` variant for ATP Synthase/NNT; label renders below arrowhead tip
- ATP Synthase and NNT are always visible (no fade alpha); they glow when `protonGradient > 0`. Other ETC complexes fade with `rA`/`phA`.

### Adding a New Membrane Complex

1. **enzymes.js**: Add `draw<Name>()` shape function + palette entry in `colors` + role in `_ROLE`
2. **renderer.js**: Bump `numComplexes`, add position in `etcComplexes`, draw call + proton arrow + yield labels + hitbox in `drawETCChain()`
3. **sim.js**: Add to `_dispatch` map, write `advance<Name>()` reaction function, add to autoplay ETC tick
4. **index.html**: Update legend if needed
5. **style.css**: Update CSS variables if new color

### Light/Dark Mode

CSS `.light-mode` class on `<body>` toggles theme variables. Canvas drawing reads `lightMode` flag and calls `getPalette(key, lightMode)` to swap fill/stroke colors. Both UI and canvas adapt simultaneously.
