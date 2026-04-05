# CLAUDE.md

Part of the **a9l.im** portfolio. See root `CLAUDE.md` for the shared design system and shared code policy. Sibling projects: `geon`, `shoals`, `gerry`, `scripture`.

## Rules

- Always prefer shared modules over project-specific reimplementations. Check `shared-*.js` files before adding utility code.

## Running Locally

```bash
cd path/to/a9lim.github.io && python -m http.server
```

Serve from root — shared files load via absolute paths. No build step.

Verify HTML-to-JS ID contract after restructuring:
```bash
diff <(grep -rPoH "getElementById\('\K[^']*" src/ main.js | sed 's/.*://' | sort -u) \
     <(grep -oP 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u)
```

## Overview

Interactive metabolism visualization. Click enzyme labels to advance reactions step-by-step, tracking metabolites and bioenergetics in real time. 12 pathways, 14 ETC complexes, allosteric regulation, particle system (electrons/protons/photons), ROS production/scavenging, 5 organism presets. Zero dependencies, vanilla ES6 modules.

## Architecture

**`main.js`**: entry point, wires `Renderer.onEnzymeClick = advanceStep`, runs rAF loop with sparkline sampling at 5 Hz.

**Color pipeline**: `_PALETTE` (shared-tokens.js) → `_BASE` families (colors.js) → `_ROLE` semantics (enzymes.js) → `_pal()` palettes. `_F` is a frozen pre-computed font string cache. `_BASE` and `_darkFill` exposed on `window` for ES6 module access.

**Data flow**: Canvas click → `Renderer.enzymeHitboxes` hit test → `advanceStep(pathway, stepIndex, direction)` → regulation check → validate substrates → mutate `store` → spawn particles → `updateDashboard()`

**Autoplay**: 400ms ETC tick (ATP Synthase ×3, ETC resp/photo, NNT), 800ms metabolic round-robin (Krebs, PDH, glycolysis, Calvin, PPP, fermentation, beta-ox). 1.6s passive ATP drain. 0.5s proton leak tick (2% base, 10% with uncoupling; also handles ROS damage and auto-scavenging).

## State Model

`store` — closed-system pools. ATP+ADP (40), NAD⁺+NADH (40), NADP⁺+NADPH (40), FAD+FADH₂ (20) are **conserved** totals. Also tracks: protonGradient, glucose, G6P, OAA, RuBP, fatty acid, cellHealth, and various counters.

`simState` — pathway enables, environment flags (`lightOn`, `oxygenAvailable`, `fermenting`, `uncouplingEnabled`), `activeOrganism`, `lockedPathways`, autoPlay, animation state.

Bidirectional enzymes check both directions. Beta-ox forward uses FADH₂/NADH; reverse (FA synthesis) uses NADPH/ATP.

## Key Conventions

### Theme

Three-state toggle: **Simulation** (follows sunlight), **Light**, **Dark**. Canvas reads `simState.visualLightMode` (decoupled from sim `lightOn`).

### Shared Metabolite Nodes

`_METAB_ALPHA` table in renderer.js maps metabolites to owning-pathway fade alpha. Pyruvate/aceticAcid fade with glycolysis; acetylCoA fades with max(krebs, betaox); PDH/ACS arrows visible when krebs OR betaox active.

### Adding a New ETC Complex

1. `enzymes.js`: `draw<Name>()` shape + palette + role
2. `layout.js`: add to `etcComplexes`, bump `numComplexes`
3. `renderer.js`: draw call + arrows + hitbox in `drawETCChain()`
4. `reactions/etc.js`: `advance<Name>()` function
5. `reactions/dispatch.js`: add to `_dispatch` map
6. `autoplay.js`: add to ETC fast tick
7. `index.html`: update legend if needed

### Regulation Gating

`dispatch.js` checks `getRegulationFactor()` before firing: factor 0 blocks with toast (manual only); factor < 1 in autoplay uses probabilistic gating (`Math.random() > regFactor`). `canReact()` enables enzyme dimming (0.4 alpha blocked, 0.7 partial, 1.0 available).

## Gotchas

- **`data-theme` is on `<html>`** — `document.documentElement.dataset.theme`
- **`_BASE` must be on `window`** — colors.js exposes `window._BASE` and `window._darkFill` for ES6 module access. Read-only after `Object.freeze(_PALETTE)`
- **Renderer uses minimum content dimensions** — `LW = max(rawLW, 900)`, `LH = max(H, 600)`. Zoom auto-fits to `_minZoom()` on first init. When vertical zoom < 1, `_updateLayout` does a two-pass to widen content for edge-to-edge fill
- **Pan clamping left/top-aligns** — positions content at viewport origin when it fits, not centered
- **Tab switching runs outside module scope** — `shared-tabs.js` (plain `<script>`) works even if the main module fails to load
- **Organism presets reset state** — calls `resetState()` then applies organism-specific ratios, dispatches `change` events on toggles
- **Intro card SVGs need explicit attributes** — `.tool-btn svg` defaults don't apply to intro cards
- **Membrane extends `LW + 400`** — avoids cutoff behind translucent sidebar
- **Conserved pools are enforced** — consuming NADH below 0 or producing ATP above the total is a bug. Always check availability before mutating `store`
- **Sidebar uses `.sidebar-tabs` in `.stats-header`** — the main sidebar has no `<h2 class="stats-title">`. Tab buttons live directly inside `.stats-header`. The old title + separate `.tab-bar` pattern is gone for project sidebars
- **Shared CSS at domain root** — `/shared-base.css` absolute path requires serving from parent directory
