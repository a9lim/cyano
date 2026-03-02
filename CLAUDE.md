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
  ├── src/dashboard.js    — initDashboard(), updateDashboard(), showActiveStep(enzyme,reaction,yields,pathway), applyYields(). Active step enzyme name colored by pathway via _pwColor map; yield line uses accent color.
  ├── src/enzymes.js      — EnzymeStyles, CFG, _F, _ROLE, _THEME — enzyme/particle/arrow drawing
  ├── src/renderer.js     — Renderer — Canvas 2D engine: draw pipeline, hit detection, camera/zoom (via bindZoomButtons)
  ├── src/layout.js       — computeLayout() — membrane/ETC/metabolite positioning
  ├── src/particles.js    — Particles — spawn/draw electrons, protons, photons with trail animations
  ├── src/autoplay.js     — autoplayTick(), resetAutoplayTimers() — automated pathway cycling
  ├── src/ui.js           — cacheDOMElements(), bindEvents() — DOM cache, event binding, intro screen, shortcuts, info tips
  ├── src/info.js         — ENZYMES, METABOLITES — enzyme/metabolite data for info popups
  ├── src/regulation.js   — getRegulationFactor(), getRegulationReason() — allosteric regulation
  └── src/reactions/
        ├── dispatch.js   — _dispatch map, _rotNudge, _reverseColorPathway, advanceStep() — unified reaction dispatcher
        ├── glycolysis.js — advanceGlycolysis, runGlycolysisUpper/Lower/UpperReverse/LowerReverse
        ├── krebs.js      — advanceKrebs, runKrebs
        ├── calvin.js     — advanceCalvin, runCalvin
        ├── ppp.js        — advancePPP, runPPP
        ├── etc.js        — advanceETC (photo/resp), ATPSynthase, BR, NNT
        ├── fermentation.js — advancePDH, PDC, ADH, ALDH, ACS, fermentation
        └── betaoxidation.js — advanceBetaOx, runBetaOxCycle, runBetaOxReverse (FA synthesis)
```

Color pipeline: `_PALETTE` → `_BASE` families → `_ROLE` semantics → `_pal()` palettes. `_THEME.dark`/`light` derived from `_PALETTE` values. `_F` is a frozen pre-computed font string cache in enzymes.js.

### Data Flow

- **Click-to-react**: Canvas click → `Renderer.enzymeHitboxes` → `advanceStep()` → regulation check → validate substrates → mutate `store` → spawn particles → `updateDashboard()`
- **Auto-play**: 400ms ETC tick (ATP Synthase ×3, ETC, NNT), 800ms metabolic round-robin (Krebs, PDH, Glycolysis lower/upper, Calvin, PPP, Fermentation/ADH, Beta-ox/FA synthesis, Gluconeogenesis). Direction-aware: sunlight on drives glycolysis-upper and beta-ox in reverse. Regulation factor gates autoplay reactions probabilistically.
- **Shared nodes**: `_METAB_ALPHA` table in renderer.js maps metabolites to owning-pathway fade alpha. Pyruvate/aceticAcid fade with glycolysis; acetylCoA fades with max(krebs, betaox); ethanol/acetaldehyde fade with max(fermentation, glycolysis); PDH/ACS arrows visible when krebs OR betaox active

### Draw Pipeline

`Renderer.draw(state)`: membrane → ETC complexes (13) → cytoplasm network → Krebs cycle → particles → labels

### State Model

- `store` — closed-system pools. ATP+ADP, NAD⁺+NADH, NADP⁺+NADPH, FAD+FADH₂ conserved. Realistic initial ratios: 36 ATP (90% of 40 pool), 4 NADH (10%), 4 NADPH (10%), 2 FADH₂ (10%), 3 glucose, 6 G6P, 2 OAA, 6 RuBP, 4 fatty acid.
- `simState` — pathway enables, environment flags (`lightOn`, `oxygenAvailable`), counters.
- Bidirectional enzymes check both directions. Beta-ox uses different enzymes forward (ACAD, ECH, HACD, Thiolase) vs reverse/FA synthesis (ACC+ER, DH, KR, KAS) with different cofactors (NADPH instead of NADH/FADH₂, ATP consumption).

### Allosteric Regulation

`src/regulation.js` provides `getRegulationFactor(pathway, stepIndex, store, direction)` returning 0–1.5:

| Enzyme | Condition | Factor |
|--------|-----------|--------|
| PFK (glycolysis step 2, forward only) | ATP/total > 0.8 | 0 (blocked) |
| PFK (forward only) | ATP/total > 0.6 | 0.5 (partial) |
| PK reverse (glycolysis step 9) | ATP/total < 0.3 | 0 (blocked) |
| PK reverse | ATP/total < 0.5 | 0.5 (partial) |
| Citrate synthase (krebs step 0) | ATP/total > 0.85 | 0.3 |
| Isocitrate DH (krebs step 2) | NADH/total > 0.75 | 0 |
| PDH | NADH > 0.7 AND acetylCoA > 4 | 0 |
| G6PDH (PPP step 0) | NADPH/total < 0.2 | 1.5 (activated) |
| G6PDH (PPP step 0) | NADPH/total > 0.8 | 0 (blocked) |
| G6PDH | NADPH/total > 0.6 | 0.5 (partial) |
| RuBisCO (Calvin step 0) | ATP/total < 0.15 | 0 (blocked) |
| RuBisCO | ATP/total < 0.3 | 0.5 (partial) |
| ACAD (betaox step 0, forward only) | FADH₂/total > 0.8 | 0 (blocked) |
| ACAD (forward only) | FADH₂/total > 0.6 | 0.5 (partial) |
| FA Synthesis (run_betaox reverse) | NADPH/total < 0.2 | 0 (blocked) |
| FA Synthesis (reverse) | NADPH/total < 0.4 | 0.5 (partial) |

Per-step (`glycolysis`, `krebs`, `ppp`, `calvin`, `betaox`) and batch (`run_krebs`, `run_ppp`, `run_betaox`, etc.) dispatch keys have separate regulation cases. Batch keys compute the minimum factor across all regulated steps in the pathway. Direction-aware: PFK only inhibits forward glycolysis; ACAD only inhibits forward beta-ox; FA synthesis regulation checks NADPH instead of FADH₂.

`dispatch.js` checks regulation before firing: factor 0 blocks with toast message; factor < 1 in autoplay uses probabilistic gating. `canReact(pathway, stepIndex)` export allows dry-run checks for enzyme dimming.

### Enzyme/Metabolite Info

`src/info.js` exports `ENZYMES` (~41 entries including batch cycle targets like `run_krebs`, `run_betaox`) and `METABOLITES` (~26 entries) with name, description, pathway, equation, and regulation notes. Cycle target and run arrow hitboxes map to info entries via `_enzymeInfoKey` in renderer.js.

### Enzyme Dimming

Renderer uses `_regAlpha(pathway, stepIndex)` to dim enzyme arrows: 0.4 alpha when blocked (regulation factor 0), 0.7 when partially inhibited (factor < 1), 1.0 when fully available.

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

Biosim-specific cofactor bar colors: `atp` (`extended.yellow`), `nadh` (`extended.blue`), `nadph` (`extended.green`), `fadh2` (`extended.rose`). Also `textOnAccent`, `light.togBg`.

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
- **Substrate bar** (`#glucose-bar`): fixed bottom-center pill with glucose + fatty acid buttons separated by a thin vertical divider (`.substrate-pill-group`)

### Responsive Breakpoints

- **900px**: body becomes scrollable, sidebar stacks below canvas (`position: relative`), glass stripped from dashboard. `#top-bar` goes sticky with `border-radius: 0`.
- **600px**: tighter spacing, smaller tool buttons (30×30), reduced canvas height.

### HTML ↔ JS Contract

JS binds via `getElementById` (~40 IDs). **Only IDs must be preserved** — class names/hierarchy can change freely. CSS class refs in JS: `app-ready`, `closed`, `active`, `bump`. Data attributes: `data-theme` (`light`/`dark`).

## Key Patterns

- `_dispatch` / `_rotNudge` / `_reverseColorPathway` maps in `src/reactions/dispatch.js` replace 20-branch if-else in `advanceStep`. `_reverseColorPathway` maps shared glycolysis enzymes to their alternate pathway color when right-clicked in reverse (e.g. PGI reverse → PPP, GAPDH reverse → Calvin).
- Module-scope constants (`_TWO_PI`, `_KREBS_METABS` Sets, `_FONT`, `_METAB_ALPHA`, `_fadeCurve`) avoid per-frame allocation
- `_F` frozen object (enzymes.js) — pre-computed `ctx.font` strings for all canvas text; eliminates per-frame template-literal allocation. `_labelFont(size)` caches uncommon sizes on first use.
- `_calcEndpoints` + `_ep` reusable object shared across arrow-draw methods in renderer.js
- `_drawRunArrow()` — shared helper for batch run arrows (hitbox + label + arrowhead); `bidir` param adds reverse arrowhead for gluconeogenesis/FA synthesis
- `drawCycleTarget()` in enzymes.js — circular arrow for batch reactions (Krebs, Calvin, PPP, beta-ox); `bidir` param adds arrowheads at both ends; rotation reverses when direction is `'reverse'`
- ATP Synthase and NNT always visible (no fade alpha); glow when `protonGradient > 0`. Other ETC complexes fade with `rA`/`phA`.

### Keyboard Shortcuts & Info Tips

- **Shortcuts** via `initShortcuts()` from `shared-shortcuts.js`: Space (autoplay), G (glucose), F (fatty acid), L (light), O (oxygen), 1-5 (pathway toggles: glycolysis/PPP/Calvin/Krebs/beta-ox), T (theme), S (sidebar).
- **Info tips** via `createInfoTip()` from `shared-info.js`: `?` buttons next to each pathway toggle (glycolysis, PPP, Calvin, Krebs), Sunlight, Ambient O₂, Auto-Play, and Proton Motive Force. Data defined inline in `ui.js`.

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
- **Renderer uses minimum content dimensions** — `LW = Math.max(rawLW, 900)` and `LH = Math.max(H, 600)` so pathways never compress below readable size on small screens. Zoom auto-fits to `_minZoom()` on first init. When vertical zoom < 1, `_updateLayout` does a two-pass: first to get `contentH`, then recomputes with `zoom` param to widen content so it fills the viewport edge-to-edge at that zoom level.
- **Pan clamping left/top-aligns** — `_clampCamera()` positions content at the viewport origin when it fits (`cam.x = vw / (2 * zoom)`), not centered. This ensures no gap between content and screen edges at any zoom level.
