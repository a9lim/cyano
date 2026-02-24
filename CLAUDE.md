# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Metabolism Simulator — an interactive HTML5 Canvas visualization of cellular metabolism. Users click enzyme labels to advance biochemical reactions step-by-step while tracking metabolite concentrations and bioenergetic metrics in real time.

## Running Locally

No build step or package manager. Serve with any static HTTP server:
```bash
npx serve .
# or
python -m http.server 3000
```
Open `http://localhost:3000` in a browser. There are no tests, linters, or CI pipelines.

## Architecture

**Zero dependencies** — vanilla HTML5/CSS3/JS with ES6 IIFE module pattern. Scripts load in order via `<script>` tags in `index.html`:

1. **enzymes.js** → `EnzymeStyles` global + `_BASE`/`_pal` helpers — drawing functions for membrane complexes, metabolite nodes, particles, arrows. All pathway color palettes are derived from 5 base color families (`_BASE.orange`, `.blue`, `.green`, `.purple`, `.rose`) via the `_pal()` factory.
2. **renderer.js** → `Renderer` global — Canvas 2D engine handling layout computation, zoom/pan, hit detection, and the draw pipeline (membrane → ETC complexes → cytoplasm network → Krebs cycle → particles → labels).
3. **sim.js** → initialization and game loop — owns the `store` object (all metabolite counts), `simState` (pathway toggles, environment flags), reaction validation/execution, dashboard DOM sync, and the `requestAnimationFrame` main loop.

### Key Data Flow

- **Click-to-react**: Canvas click → `Renderer.enzymeHitboxes` lookup → `advanceStep(pathway, stepIndex)` in sim.js → validates substrates → mutates `store` → spawns particle animation → calls `updateDashboard()`.
- **Auto-play**: 400ms tick in `mainLoop()` attempts pathways in priority order (ATP Synthase → ETC → PDH → Krebs → Glycolysis → Fermentation → Calvin → PPP → BR), respecting toggles and metabolite availability.
- **Shared metabolite nodes**: Metabolites like G3P, F6P, R5P are drawn once but referenced by multiple pathways. `shouldDrawMetab()` controls visibility based on enabled pathway toggles.

### Rendering Pipeline

`Renderer.draw(state)` executes layers in order:
1. `drawMembrane()` — phospholipid bilayer gradient
2. `drawETCChain()` — 12 membrane complexes with arrows, yields, hitboxes
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
| Calvin Cycle | `#10b981` (green) |
| PPP | `#c084fc` (purple) |
| Krebs / Respiratory ETC | `#38bdf8` (cyan) |
| Fermentation | `#f43f5e` (rose) |

### Light/Dark Mode

CSS `.light-mode` class on `<body>` toggles theme variables. Canvas drawing reads `lightMode` flag and calls `getPalette(key, lightMode)` to swap fill/stroke colors. Both UI and canvas adapt simultaneously.
