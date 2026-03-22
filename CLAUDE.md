# CLAUDE.md

Part of the **a9l.im** portfolio. See root `CLAUDE.md` for the shared design system, head loading order, CSS conventions, and shared code policy. Sibling projects: `physsim`, `finsim`, `gerry`.

## Shared Code Policy

Always prefer shared modules over project-specific reimplementations. This project uses: `shared-tokens.js`, `shared-utils.js`, `shared-haptics.js`, `shared-toolbar.js`, `shared-forms.js`, `shared-intro.js`, `shared-base.css`, `shared-tabs.js`, `shared-camera.js`, `shared-info.js`, `shared-shortcuts.js`, `shared-touch.js`, `shared-tooltip.js`, `shared-sparkline.js`. Before adding utility code, check whether a `shared-*.js` file already provides it. New utilities useful across projects should be added to the shared files in the root repo.

## Overview

Metabolism Simulator -- interactive HTML5 Canvas visualization of cellular metabolism. Click enzyme labels to advance reactions step-by-step, tracking metabolites and bioenergetics in real time. Zero dependencies -- vanilla HTML5/CSS3/JS with ES6 modules.

## Running Locally

```bash
npx serve .                    # serve locally (no build step)
```

Verify HTML-to-JS ID contract after restructuring:
```bash
diff <(grep -rPoH "getElementById\('\K[^']*" src/ main.js | sed 's/.*://' | sort -u) \
     <(grep -oP 'id="[^"]*"' index.html | sed 's/id="//;s/"//' | sort -u)
```

## Architecture

CSS loads `/shared-base.css` (shared reset, layout tokens, `.glass`, `.tool-btn`, intro screen, keyframes, sim layout components, toast notifications) then `styles.css` (project overrides + tab system, ctrl-group/row). Scripts:

0. **shared-tokens.js** provides `_r`, `_parseHex`, `_rgb2hsl`, `_hsl2hex`, `_darken`, `_FONT`, `_PALETTE` (shared tokens + `extended` sub-object)
0b. **colors.js** extends `_PALETTE` with pathway colors via `_PALETTE.extended.*` references, defines `_darkFill`, `_makeBase`, `_BASE` families. Injects project-specific CSS vars (`--pw-*`, `--co-*`, `--tog-*`). Freezes all objects. Exposes `window._BASE` and `window._darkFill`.
1. **main.js** is the ES6 module entry point: imports all modules, initializes canvas/DOM/theme, wires `Renderer.onEnzymeClick = advanceStep`, runs `requestAnimationFrame` loop with sparkline sampling at 5 Hz.

```
main.js (entry point)
  +-  src/state.js        -- simState, store, counters, histories, resetState(), updateAnimations()
  +-  src/anim.js         -- Anim, _TWO_PI, _HALF_PI -- easing, fade trackers, rotation accumulators, trail
  +-  src/sparkline.js    -- createHistory(), pushSample(), drawSparkline() -- ring buffer time-series
  +-  src/theme.js        -- updateTheme(), cycleTheme() -- three-state theme toggle
  +-  src/dashboard.js    -- initDashboard(), updateDashboard(), showActiveStep(), applyYields()
  +-  src/enzymes.js      -- EnzymeStyles, CFG, _F, _ROLE, _THEME -- enzyme/particle/arrow drawing
  +-  src/renderer.js     -- Renderer -- Canvas 2D engine: draw pipeline, hit detection, camera/zoom, tooltip via shared-tooltip.js, resize via resizeCanvasDPR()
  +-  src/layout.js       -- computeLayout() -- membrane/ETC/metabolite positioning
  +-  src/particles.js    -- Particles -- spawn/draw electrons (single + multi-hop chain), protons, photons
  +-  src/autoplay.js     -- autoplayTick(), protonLeakTick(), resetAutoplayTimers()
  +-  src/ui.js           -- cacheDOMElements(), bindEvents() -- DOM cache, events, intro, shortcuts, info tips, reference overlay
  +-  src/info.js         -- ENZYMES, METABOLITES -- enzyme/metabolite data for canvas hover tooltips
  +-  src/reference.js    -- REFERENCE -- in-depth reference pages for each pathway/concept (Shift+click on ? buttons)
  +-  src/organisms.js    -- ORGANISMS -- preset configurations (Cyanobacterium, Animal Cell, etc.)
  +-  src/regulation.js   -- getRegulationFactor(), getRegulationReason() -- allosteric regulation
  +-- src/reactions/
        +-  dispatch.js     -- _dispatch map, _rotNudge, _reverseColorPathway, advanceStep(), canReact()
        +-  glycolysis.js   -- advanceGlycolysis, runGlycolysisUpper/Lower/UpperReverse/LowerReverse
        +-  krebs.js        -- advanceKrebs, runKrebsCycle
        +-  calvin.js       -- advanceCalvin, runCalvinCycle
        +-  ppp.js          -- advancePPP, runPPPCycle
        +-  etc.js          -- advanceETC (photo/resp/cyclic), ATPSynthase, BR, NNT
        +-  fermentation.js -- advancePDH, PDC, ADH, ALDH, ACS, fermentation
        +-  betaoxidation.js-- advanceBetaOx, runBetaOxCycle, runBetaOxReverse (FA synthesis)
        +-- ros.js          -- advanceSOD, advanceCatalase, advanceGPx, runROSScavenging
```

Color pipeline: `_PALETTE` (shared-tokens.js) -> `_BASE` families (colors.js) -> `_ROLE` semantics (enzymes.js) -> `_pal()` palettes (enzymes.js). `_THEME.dark`/`light` derived from `_PALETTE` values. `_F` is a frozen pre-computed font string cache in enzymes.js.

### Data Flow

- **Click-to-react**: Canvas click -> `Renderer.enzymeHitboxes` hit test -> `advanceStep(pathway, stepIndex, direction)` -> regulation check (`getRegulationFactor`) -> validate substrates -> mutate `store` -> spawn particles -> `updateDashboard()`
- **Auto-play**: 400ms ETC tick (ATP Synthase x3, ETC resp, ETC photo, NNT), 800ms metabolic round-robin (Krebs, PDH, Glycolysis lower/upper, Calvin, PPP, Fermentation/ADH, Beta-ox/FA synthesis, Gluconeogenesis). Direction-aware: sunlight on drives glycolysis-upper and beta-ox in reverse. Regulation factor gates autoplay reactions probabilistically.
- **Passive drains**: 1.6s passive ATP drain (3 ATP per tick to mimic cellular maintenance). 0.5s proton leak tick (2% base leak, 10% with uncoupling enabled). Proton leak tick also handles ROS damage (0.3 health per active ROS) and auto-scavenging (SOD+catalase free, GPx consumes NADPH).
- **Shared nodes**: `_METAB_ALPHA` table in renderer.js maps metabolites to owning-pathway fade alpha. Pyruvate/aceticAcid fade with glycolysis; acetylCoA fades with max(krebs, betaox); ethanol/acetaldehyde fade with max(fermentation, glycolysis); PDH/ACS arrows visible when krebs OR betaox active.

### Draw Pipeline

`Renderer.draw(state)`: membrane -> ETC complexes (14 complexes: PSII, NDH-1, SDH, PQ, Cyt b6f, PC, Cyt c Ox, PSI, Fd, FNR, ATP Synthase, BR, NNT, UCP) -> cytoplasm network -> Krebs cycle -> beta-ox cycle -> particles -> labels

### State Model

- `store` -- closed-system pools. ATP+ADP (`totalAtpAdp=40`), NAD++NADH (`totalNad=40`), NADP++NADPH (`totalNadp=40`), FAD+FADH2 (`totalFad=20`) are conserved. Realistic initial ratios: 36 ATP (90%), 4 NADH (10%), 4 NADPH (10%), 2 FADH2 (10%), 3 glucose, 6 G6P, 2 OAA, 6 RuBP, 4 fatty acid, 100 cell health. Also tracks: protonGradient, protonsPumped, o2Produced/Consumed, h2oSplit/Produced, electronsTransferred, co2Fixed/Produced, atpSubstrate/Oxidative, protonsLeaked, rosProduced/Scavenged, cellHealth.
- `simState` -- pathway enables (glycolysis, ppp, calvin, krebs, betaox, oxphos, linearLight, cyclicLight), environment flags (`lightOn`, `oxygenAvailable`, `fermenting`, `uncouplingEnabled`), `activeOrganism`, `lockedPathways`, autoPlay, animation state (fade trackers, rotation accumulators).
- `histories` -- ring buffer sparkline histories for atp, nadh, nadph, fadh2, gradient (300 samples at 5 Hz = 60-second window).
- `counters` -- krebsTurns, calvinTurns, glycRuns, pppRuns, betaoxRuns.
- Bidirectional enzymes check both directions. Beta-ox uses different enzymes forward (ACAD, ECH, HACD, Thiolase) vs reverse/FA synthesis (ACC+ER, DH, KR, KAS) with different cofactors (NADPH instead of NADH/FADH2, ATP consumption).

### Allosteric Regulation

`src/regulation.js` provides `getRegulationFactor(pathway, stepIndex, store, direction)` returning 0--1.5:

| Enzyme | Condition | Factor |
|--------|-----------|--------|
| PFK (glycolysis step 2, forward only) | ATP/total > 0.8 | 0 (blocked) |
| PFK (forward only) | ATP/total > 0.6 | 0.5 (partial) |
| PK reverse (glycolysis step 9) | ATP/total < 0.3 | 0 (blocked) |
| PK reverse | ATP/total < 0.5 | 0.5 (partial) |
| Citrate synthase (krebs step 0) | ATP/total > 0.85 | 0.3 |
| Isocitrate DH (krebs step 2) | NADH/total > 0.75 | 0 |
| Isocitrate DH (krebs step 2) | NADH/total > 0.5 | 0.5 |
| PDH | NADH > 0.7 AND acetylCoA > 4 | 0 |
| G6PDH (PPP step 0) | NADPH/total < 0.2 | 1.5 (activated) |
| G6PDH (PPP step 0) | NADPH/total > 0.8 | 0 (blocked) |
| G6PDH | NADPH/total > 0.6 | 0.5 (partial) |
| RuBisCO (Calvin step 0) | ATP/total < 0.15 | 0 (blocked) |
| RuBisCO | ATP/total < 0.3 | 0.5 (partial) |
| ACAD (betaox step 0, forward only) | FADH2/total > 0.8 | 0 (blocked) |
| ACAD (forward only) | FADH2/total > 0.6 | 0.5 (partial) |
| FA Synthesis (run_betaox reverse) | NADPH/total < 0.2 | 0 (blocked) |
| FA Synthesis (reverse) | NADPH/total < 0.4 | 0.5 (partial) |

Per-step (`glycolysis`, `krebs`, `ppp`, `calvin`, `betaox`) and batch (`run_krebs`, `run_ppp`, `run_betaox`, `run_glycolysis_upper`, `run_glycolysis_lower`, `run_calvin`) dispatch keys have separate regulation cases. Batch keys compute the minimum factor across all regulated steps in the pathway. Direction-aware: PFK only inhibits forward glycolysis; ACAD only inhibits forward beta-ox; FA synthesis regulation checks NADPH instead of FADH2.

`dispatch.js` checks regulation before firing: factor 0 blocks with toast message (manual clicks only, not autoplay); factor < 1 in autoplay uses probabilistic gating (`Math.random() > regFactor`). `canReact(pathway, stepIndex)` export allows dry-run checks for enzyme dimming.

### Organism Presets

`src/organisms.js` defines 5 presets plus a Custom option:

| Preset | Pathways | Environment | Notes |
|--------|----------|-------------|-------|
| Cyanobacterium | All | Light + O2 | Default. All pathways available. |
| Animal Cell | No Calvin | No light, O2 | Calvin locked ("lacks RuBisCO and photosystems") |
| Obligate Anaerobe | Glycolysis + PPP | No light, no O2 | Calvin, Krebs, beta-ox locked (no O2) |
| Plant Chloroplast | Calvin only | Light + O2 | All others locked (organelle scope) |
| Archaeon | No Calvin | Light, no O2 | Uses bacteriorhodopsin for light-driven proton pumping |

Preset selection resets `store` with organism-specific initial cofactor ratios. Locked pathways disable toggles and show lock indicator. Custom mode unlocks all toggles.

### Enzyme/Metabolite Info & Reference Pages

`src/info.js` exports `ENZYMES` (~50 entries including batch cycle targets, ROS scavenging enzymes, and mobile electron carriers) and `METABOLITES` (~26 entries) with name, description, pathway, equation, and regulation notes. Cycle target and run arrow hitboxes map to info entries via `_enzymeInfoKey` and `_etcInfoKey` in renderer.js. Used for canvas hover tooltips.

`src/reference.js` exports `REFERENCE` (11 entries) with in-depth multi-section HTML content for each sidebar `?` button topic. Uses KaTeX math (`$$...$$` display, `$...$` inline) rendered via `renderMathInElement()` on open. Opened via Shift+click (desktop) or long-press (mobile) on info triggers, shown in the `#reference-overlay` modal. Keys match `data-info` attributes: glycolysis, ppp, calvin, krebs, betaox, sunlight, oxygen, autoplay, protons, uncoupling, oxStress.

### Enzyme Dimming

Renderer checks `getRegulationFactor()` and `canReact()` per enzyme to determine arrow opacity: 0.4 alpha when blocked (regulation factor 0 or missing substrates), 0.7 when partially inhibited (factor < 1), 1.0 when fully available.

### Membrane and ETC

Membrane at `membraneY = LH * 0.22` (where `LH = Math.max(H, 600)`). 60px tall. Above = lumen, below = matrix/stroma. Proton pumps push H+ upward. Membrane extends `LW + 400` to avoid cutoff behind translucent sidebar.

14 complexes distributed linearly across available membrane width (`mW / (numComplexes + 1)` spacing):

| Position | Complex | Role |
|----------|---------|------|
| 1 | PSII | Photosynthetic, water splitting |
| 2 | NDH-1 (CI) | Respiratory, NADH oxidation |
| 3 | SDH (CII) | Respiratory/Krebs, succinate oxidation |
| 4 | PQ | Mobile carrier (diamond shape) |
| 5 | Cyt b6f | Shared proton pump (hourglass shape) |
| 6 | PC | Mobile carrier (circle) |
| 7 | Cyt c Ox | Respiratory terminal oxidase |
| 8 | PSI | Photosynthetic, electron re-energization |
| 9 | Fd | Mobile carrier (diamond) |
| 10 | FNR | NADP+ reductase (ellipse) |
| 11 | ATP Synthase | Chemiosmotic ATP production |
| 12 | BR | Bacteriorhodopsin, archaeal light pump |
| 13 | NNT | NADH-to-NADPH transhydrogenase |
| 14 | UCP | Uncoupling protein, proton leak channel |

ETC complex shapes in enzymes.js each have unique silhouettes. All share signature `(ctx, cx, cy, w, h, glow, lightMode)` -- renderer.js positions/sizes are independent of shape internals.

**Adding a New Complex:**
1. **src/enzymes.js**: `draw<Name>()` shape + palette in `colors` + role in `_ROLE`
2. **src/renderer.js**: Bump `numComplexes` in layout.js, add position in `etcComplexes`, draw call + arrows + hitbox in `drawETCChain()`
3. **src/layout.js**: Add to `etcComplexes` object in `computeLayout()`
4. **src/reactions/etc.js**: Write `advance<Name>()` reaction function
5. **src/reactions/dispatch.js**: Add to `_dispatch` map
6. **src/autoplay.js**: Add to ETC fast tick
7. **index.html**: Update legend if needed
8. **styles.css**: Add CSS variable if new color

### Particle System

`src/particles.js` manages three particle types:

- **Electrons**: Single-hop (legacy) or multi-hop chain (`spawnElectronChain`) with waypoints. Trail rendering via `Anim.trail()`. Segment callbacks fire when electron enters a new hop (used to trigger intermediate proton pumps). Sinusoidal y-offset.
- **Protons**: Vertical transit across membrane. Spawned upward (pumped) or downward (ATP synthase consumption, UCP leak). Horizontal wobble via sine wave.
- **Photons**: Converge toward target complex from above at angle. Higher speed (0.02 vs 0.012 for electrons).

All particles use progress-based interpolation (0 to 1), `_fadeCurve` for opacity (fade in over first 15%, full opacity, fade out over last 15%), and are splice-removed on completion.

### Reactive Oxygen Species

2% electron leak at Complex I and the Q-cycle produces ROS (tracked via `store.rosProduced`). Three scavenging pathways:
- **SOD**: Converts superoxide to H2O2 (free, no cofactor cost)
- **Catalase**: Decomposes H2O2 (free, produces 0.5 O2)
- **GPx**: Reduces peroxide using NADPH (links PPP to antioxidant defense)

ROS damage reduces `store.cellHealth` by 0.3 per active ROS per leak tick. Health regenerates at 0.5/tick when active ROS is zero. Critical health (<20) triggers toast warning. Dashboard shows health bar, ROS produced/scavenged/active counts.

## Color System

`_PALETTE` is the single source of truth. All 10 pathway/particle base hues reference `_PALETTE.extended.*` from `shared-tokens.js`. Changing a value in `shared-tokens.js` auto-updates both CSS custom properties and canvas JS.

### Pathway Colors (`_PALETTE.*` -> `_BASE` -> CSS `--pw-*`)

| Pathway | Extended key | CSS var |
|---------|-------------|---------|
| Glycolysis / Shared | `extended.orange` | `--pw-glyc` |
| Calvin / Photosynthetic | `extended.green` | `--pw-calvin` |
| PPP | `extended.rose` | `--pw-ppp` |
| Krebs / Respiratory ETC | `extended.blue` | `--pw-krebs` |
| Cyclic / BR | `extended.purple` | `--pw-cyclic` |
| Fermentation | `extended.brown` | `--pw-ferment` |
| Beta Oxidation | `extended.yellow` | `--pw-betaox` |
| ROS / Antioxidant | `extended.red` | `--pw-ros` |
| Electrons | `extended.cyan` | `--pw-electron` |
| Protons | `extended.red` | `--pw-proton` |
| Photons | `extended.yellow` | `--pw-photon` |
| ATP Synthase / NNT | `extended.orange` | -- |
| UCP (Uncoupling Protein) | `extended.red` | -- |
| Neutral / Slate | `extended.slate` | -- |

Biosim-specific cofactor bar colors: `atp` (`extended.yellow`), `nadh` (`extended.blue`), `nadph` (`extended.green`), `fadh2` (`extended.rose`). Also `textOnAccent` (`light.elevated`).

### Canvas Theme (`_THEME`)

`EnzymeStyles.t(lightMode)` returns mode-dependent colors for canvas text (primary/secondary/muted), surfaces (primary/secondary/elevated/muted), accent (badge/glow), metabolite strokes (active/inactive), membrane (head/tail), section labels, proton pool labels, and chromophore alpha. All derived from `_PALETTE` via `_r(hex, alpha)`.

### CSS Design Tokens

No hardcoded colors -- every CSS color is a `var()` or `color-mix()`. Shared layout tokens in `shared-base.css`; project-specific overrides in `styles.css`. Alpha uses 8-digit hex (`#RRGGBBAA`).

Naming: `--bg-*` (surfaces), `--text-*` (text), `--accent-*` (accent), `--tog-*` (toggles), `--pw-*` (pathways), `--co-*` (cofactors).

## UI and Layout

### Theme

Three-state toggle: **Simulation** (follows sunlight), **Light**, **Dark**. CSS `data-theme` attribute is set on `<html>` (`document.documentElement.dataset.theme` in `src/theme.js`). Canvas reads `simState.visualLightMode` (decoupled from sim `lightOn`). `getPalette(key, lightMode)` swaps fill/stroke. Theme toggle icons are inline SVGs (auto/sun/moon), controlled via CSS `display` based on `#theme-btn[data-theme]` attribute.

### Layout

- **Intro** (`#intro-screen`): full overlay with themed splash, three instruction cards, CTA button. `.hidden` class fades out, then `.app-ready` on `<body>` triggers entrance animations.
- **Sidebar** (`#dashboard`): floating glass panel with three tabs -- Controls, Stats, Reference. `Renderer.sidebarInset` pushes canvas layout. Sidebar open/close animated with cubic-bezier easing matching CSS transition (0.45s).
- **Substrate bar** (`#glucose-bar`): fixed bottom-center pill with glucose + fatty acid buttons separated by a thin vertical divider (`.substrate-pill-group`).
- **Zoom controls** (`#canvas-controls`): zoom in/out/reset buttons with percentage indicator. Wired via `bindZoomButtons()` from `shared-camera.js`.

### Sidebar Tabs

- **Controls**: Organism preset selector, pathway toggles (glycolysis, PPP, Calvin, Krebs, beta-ox), environment toggles (sunlight, O2, autoplay, uncoupling). Each pathway toggle has an info tip `?` button.
- **Stats**: Active step display (enzyme name colored by pathway, reaction equation, yield summary), turn/run counters, metabolite gauge cards (ATP/NADH/NADPH/FADH2 with sparkline canvases), proton gradient with sparkline, oxidative stress (health bar, ROS counters), ATP source breakdown (substrate-level vs oxidative stacked bar), net gas exchange (CO2, O2, H2O).
- **Reference**: Pathway net equations, legend (pathway colors + particle types).

### Responsive Breakpoints

- **900px**: body becomes scrollable, sidebar stacks below canvas (`position: relative`), glass stripped from dashboard. `#top-bar` goes sticky with `border-radius: 0`.
- **600px**: tighter spacing, smaller tool buttons (30x30), reduced canvas height.

### HTML-to-JS Contract

JS binds via `getElementById` (~60 IDs cached in `cacheDOMElements()`). **Only IDs must be preserved** -- class names/hierarchy can change freely. CSS class refs in JS: `app-ready`, `open`, `active`, `bump`, `locked`, `hidden`. Data attributes: `data-theme` (on `<html>`), `data-tab` (tab buttons), `data-info` (info tip triggers).

## Key Patterns

- `_dispatch` / `_rotNudge` / `_reverseColorPathway` maps in `src/reactions/dispatch.js` replace multi-branch if-else in `advanceStep`. `_reverseColorPathway` maps shared glycolysis enzymes to their alternate pathway color when run in reverse (e.g. PGI reverse -> PPP, GAPDH/PGK/ALDO/FBPase reverse -> Calvin, TKT+TAL reverse -> Calvin).
- Module-scope constants (`_TWO_PI`, `_KREBS_METABS` Sets, `_FONT`, `_METAB_ALPHA`, `_fadeCurve`) avoid per-frame allocation.
- `_F` frozen object (enzymes.js) -- pre-computed `ctx.font` strings for all canvas text; eliminates per-frame template-literal allocation. `_labelFont(size)` caches uncommon sizes on first use.
- `_calcEndpoints` + `_ep` reusable object shared across arrow-draw methods in renderer.js.
- `_drawRunArrow()` -- shared helper for batch run arrows (hitbox + label + arrowhead); `bidir` param adds reverse arrowhead for gluconeogenesis/FA synthesis.
- `drawCycleTarget()` in enzymes.js -- circular arrow for batch reactions (Krebs, Calvin, PPP, beta-ox); `bidir` param adds arrowheads at both ends; rotation reverses when direction is `'reverse'`.
- ATP Synthase, NNT, and UCP always visible (no fade alpha); ATP Synthase and NNT glow when `protonGradient > 0`; UCP glows when `uncouplingEnabled` and `protonGradient > 0`, spawning visual proton particles downward. Other ETC complexes fade with respiratory/photosynthetic alpha.
- Multi-hop electron chains (`spawnElectronChain`) use waypoint arrays with per-segment callbacks, replacing multiple single-hop spawns with a single continuous animation.
- `_pwColor` map in dashboard.js maps dispatch keys to CSS variable names for coloring the active step enzyme name by pathway.
- Sparkline ring buffer (`createHistory()` in sparkline.js): fixed-size `Float32Array(300)`, circular write via `head` index, drawn as polyline with dashed "now" marker.
- Sidebar inset animation in renderer.js matches the CSS transition (0.45s cubic-bezier(0.23, 1, 0.32, 1)) via `cubicBezier()` from shared-utils.js.

### Keyboard Shortcuts, Info Tips, and Reference Pages

- **Shortcuts** via `initShortcuts()` from `shared-shortcuts.js`: Space (autoplay), G (glucose), F (fatty acid), L (light), O (oxygen), 1-5 (pathway toggles: glycolysis/PPP/Calvin/Krebs/beta-ox), T (theme), S (sidebar). Groups: Simulation, Environment, Pathways, View.
- **Info tips** via `createInfoTip()` from `shared-info.js`: `?` buttons with `data-info` attribute matching keys in `infoData` object defined in `ui.js`. Short 1-sentence summaries. Topics: glycolysis, ppp, calvin, krebs, betaox, sunlight, oxygen, autoplay, protons, uncoupling, oxStress.
- **Reference pages** via `REFERENCE` in `src/reference.js`: in-depth multi-section pages for each topic, opened via Shift+click (desktop) or long-press (mobile) on `?` buttons. Shown in a `.sim-overlay` modal (`#reference-overlay`). Same `data-info` keys as info tips.

### CSS Parameterization

Repeated per-variant CSS blocks are collapsed via custom property assignments + generic rules:
- **Toggles**: `.tog-*` classes set `--tog-color`, one generic `:checked` rule applies to all. `--tog-shift` controls thumb translateX (20px default, 22px on coarse pointers).
- **Metabolite cards**: `.mc-*` classes set `--mc-color`, generic `[class*="mc-"]` rules style background/bar/text.
- **Legend dots**: `.legend-dot.*` variants set `--dot-color`, one generic rule sets `background`.
- **Equations**: `.eq-*` variants set `--eq-color`, one generic rule colors `.eq-name` and `.eq-dot`.
- **Tab system** (in `shared-base.css`): `.tabs-wrap`, `.tab-bar`, `.tab-btn`, `.tab-panels`, `.tab-panel` -- shared across all sims.
- **Control group/row** (in `shared-base.css`): `.ctrl-group`, `.ctrl-row`, `.ctrl-disabled`, `.ctrl-row.locked` -- shared across all sims.
- **Glass panels**: `.glass` class on `header`, `#canvas-controls`, `#glucose-bar`, `#dashboard`. Dashboard overrides to `shadow-lg`. 900px breakpoint strips glass from dashboard.
- **Shared utilities**: `_toolbar.initSidebar()` for sidebar toggle/close/swipe with `sidebarInset` callback, `_intro.init()` for intro screen dismiss with auto-open-sidebar callback, `_forms.bindToggle()` for all 9 pathway/environment toggles, `registerInfoTips()` for info tips, `initReferenceOverlay()`/`bindReferenceTriggers()` for reference pages with KaTeX caching. Three-state theme is project-specific (not shared).

## Gotchas

- **`data-theme` is on `<html>` (document.documentElement)** -- `src/theme.js` uses `document.documentElement.dataset.theme`, and `index.html` has `<html lang="en" data-theme="light">`. CSS selectors like `[data-theme="dark"]` target the root element. This is the same as physsim and gerry.
- **No `@import` in CSS** -- fonts are loaded via `<link>` in HTML. Duplicate `@import` causes FOUC.
- **Shared CSS at domain root** -- `shared-base.css` is loaded via `/shared-base.css` (absolute path). When serving locally, serve from the parent `a9lim.github.io/` directory or the shared file won't resolve.
- **Intro card SVGs keep their attributes** -- `.tool-btn svg` defaults don't apply to intro cards. Those SVGs need explicit `fill="none" stroke="currentColor"` etc.
- **Renderer uses minimum content dimensions** -- `LW = Math.max(rawLW, MIN_CONTENT_W)` (900) and `LH = Math.max(H, MIN_CONTENT_H)` (600) so pathways never compress below readable size on small screens. Zoom auto-fits to `_minZoom()` on first init. When vertical zoom < 1, `_updateLayout` does a two-pass: first to get `contentH`, then recomputes with `zoom` param to widen content so it fills the viewport edge-to-edge at that zoom level.
- **Pan clamping left/top-aligns** -- `_clampCamera()` positions content at the viewport origin when it fits, not centered. This ensures no gap between content and screen edges at any zoom level.
- **Tab switching runs outside module scope** -- `shared-tabs.js` (loaded as a plain `<script>` at end of body) handles tab button clicks before the module loads. This means tab switching works even if the main module fails to load.
- **Organism presets reset state** -- selecting a preset calls `resetState()` and then applies organism-specific initial ratios. It also dispatches `change` events on toggles to update `simState`.
- **`_BASE` must be on `window`** -- colors.js exposes `window._BASE` and `window._darkFill` so ES6 modules (which run in strict mode) can access them. These are read-only after `Object.freeze(_PALETTE)`.
