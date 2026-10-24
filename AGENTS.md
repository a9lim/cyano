# Lumen

Interactive cellular-metabolism simulator at a9l.im/lumen: the user steps enzymes (or runs autoplay) across connected carbon pathways, a 14-component membrane electron transport chain, and conserved cofactor pools, drawn on Canvas 2D. Vanilla ES modules with no dependencies of its own; KaTeX from jsDelivr renders the reference overlay.
It is a submodule of the a9l.im repository (`a9lim.github.io`, at `projects/lumen`); the root `AGENTS.md` covers the shared layer, design system, build, and deployment.

## Running and checking

Preview through the parent build (serve `dist/`, open `/lumen/`). There is no test runner or linter; check syntax with:

```bash
for f in main.js colors.js src/*.js src/reactions/*.js; do node --check "$f"; done
git diff --check
```

## Layout

```
index.html         toolbar, canvas, sidebar (Controls / Stats / Reference tabs), reference overlay, edu content, JSON-LD
main.js            entry: init, rAF loop (anim + autoplay + leak ticks, 5 Hz sparkline samples, draw)
colors.js          classic script: pathway/cofactor palette aliases, _BASE families, --pw-* / --co-* vars
styles.css         project CSS
about.md           published reference doc; frontmatter feeds SEO and the about-panel date
src/state.js       simState, store, counters, sparkline histories, resetState(), updateAnimations()
src/organisms.js   the five presets
src/regulation.js  getRegulationFactor / getRegulationReason
src/autoplay.js    autoplayTick, protonLeakTick (leak, ROS damage, scavenging)
src/reactions/     dispatch.js (advanceStep) + glycolysis, krebs, calvin, ppp, etc, fermentation, betaoxidation, ros
src/layout.js      computeLayout: membrane, ETC complex columns, metabolite grid
src/renderer.js    Renderer singleton: camera, input, hitboxes, draw pipeline, tooltips
src/enzymes.js     EnzymeStyles: role colors, theme sets, font cache, complex shapes, pills, tags, arrows
src/particles.js   electrons (multi-hop chains with segment callbacks), protons, photons
src/anim.js        fade, rotation, and trail primitives
src/dashboard.js   sidebar readouts, sparklines, active-step panel (rAF-coalesced)
src/ui.js          DOM cache, toggles, presets, shortcuts, about panel, info tips, reference overlay
src/theme.js       three-state theme
src/info.js        ENZYMES / METABOLITES tooltip data
src/reference.js   REFERENCE overlay pages (HTML + KaTeX)
```

## How it works

### State

`store` (state.js) is the one mutable store every reaction shares: cofactor pools, metabolite counts, the proton gradient, and cumulative tallies (gases and water, ATP by source, ROS, cell health). The four cofactor pairs are closed. `store` holds only the reduced or charged member (`atp`, `nadh`, `nadph`, `fadh2`) plus a fixed total (`totalAtpAdp`, `totalNad`, `totalNadp`, `totalFad`); ADP, NAD⁺, NADP⁺ and FAD are total minus that value. `simState` holds environment and pathway flags, the active preset, autoplay, `visualLightMode`, and the `Anim` fade and rotation trackers. The gradient is a single number; proton particles are visual only.

### Reactions and regulation

Every reaction goes through `advanceStep(key, stepIndex, direction)` in `reactions/dispatch.js`, which looks up the `_dispatch` handler, applies the regulation gate, runs the handler, then updates the active-step display and nudges the cycle's rotation. Handlers check their pathway's enable flag and substrates, mutate `store`, and return `{ enzyme, reaction, yields }` or `false`. Keys come in three shapes: per-step keys taking a step index and direction (`glycolysis`, `krebs`, `calvin`, `ppp`, `betaox`), batch `run_*` keys that apply a whole cycle's net stoichiometry, and single-enzyme or membrane keys (`pdh`, `adh`, `atp_syn`, `etc_resp`, …).

Glycolysis step indices double as the shared Calvin/PPP enzymes. Steps 0–3, 5, 6 and 10 run when any owning pathway is enabled, and their reverse directions are the gluconeogenesis and Calvin reactions (FBPase, NADPH-linked GAPDH, TK+SBPase). Index 4 is unused (aldolase and TPI are step 3). On the canvas `calvin` contributes only RuBisCO (0) and PRK (7). `_reverseColorPathway` recolors the active-step label when a reverse glycolysis step belongs to another pathway.

`getRegulationFactor` (regulation.js) returns 0 (blocked), a fraction (partially inhibited), 1, or 1.5 (G6PDH at low NADPH, which the dispatcher treats like 1). A blocked manual click shows `getRegulationReason` as a toast; autoplay fails silently. A fractional factor is a probability gate in autoplay only, so manual clicks always fire. The renderer dims arrows by the same factor (`Renderer._regAlpha`), so dimming reflects regulation, not substrate availability.

### Membrane chain and particles

`advanceETC` (reactions/etc.js) runs one of three chains: `etc_resp` (NADH at NDH-1 or FADH₂ at SDH → PQ → Cyt b6f → PC → Cyt c oxidase; needs O₂), `etc_photo` (linear, PSII → … → FNR; needs light), and `etc_cyclic` (PSI → Fd → PQ → Cyt b6f → PC → PSI). The entry step mutates `store` at once. The downstream effects are segment callbacks on the electron particle from `Renderer.spawnElectronChain`, fired by `Particles.draw` as the particle enters each segment: Cyt b6f and oxidase pumping, O₂ use, FNR's NADPH, and the Q-cycle ROS leak. They therefore land a beat after the click, scale with the speed setting (`,` and `.` change only particle speed), and are dropped by Reset, which clears the particle arrays. ATP synthase, bacteriorhodopsin, and NNT act immediately.

### Timing

`main.js` runs one rAF loop: `updateAnimations`, `autoplayTick`, `protonLeakTick`, sparkline samples every 0.2 s into 60-second histories, then `Renderer.draw`. While autoplay is on, `autoplayTick` runs a fast membrane tick (`atp_syn` ×3, `etc_resp`, `etc_photo`, `nnt`), a slower round-robin over `metabolicSteps` in which light and oxygen choose directions (gluconeogenesis and fatty-acid synthesis in light, fermentation without O₂), and a passive ATP drain. `protonLeakTick` always runs: gradient leak (faster with uncoupling), ROS damage to cell health, free SOD/catalase scavenging, NADPH-costing GPx, and health regeneration once ROS clears. Each tick's interval is at the top of its block.

### Rendering

`Renderer` (renderer.js) owns the canvas and a shared `createCamera` whose clamp left/top-aligns content that fits and whose `minZoom` is fit-to-view. `computeLayout` (layout.js) places the membrane, the 14 ETC complexes in evenly spaced columns, and the metabolite grid. Content never shrinks below `MIN_CONTENT_W` × `MIN_CONTENT_H`; when it is taller than the viewport, `_updateLayout` lays out a second time at that vertical zoom so the network still fills the width. Draw order: membrane, ETC chain, cytoplasm network, Krebs cycle, beta-oxidation cycle, particles, light indicator.

Hitboxes are pooled per frame. Cytoplasm hitboxes are pushed only for arrows that are drawn, so a faded-out pathway can't be clicked; most ETC hitboxes are always present, and the chain handlers check light and O₂ themselves. Left click fires forward and right or middle click reverse; a touch tap uses the toolbar's forward/reverse mode (X). `_info` hitboxes (PQ, Cyt b6f, PC, Cyt c oxidase, Fd, FNR) are tooltip-only. Tooltips resolve canvas labels through `_enzymeInfoKey` and ETC hitboxes through `_etcInfoKey` (`pathway:stepIndex`) into `ENZYMES`. `_METAB_ALPHA` fades each shared metabolite with the most visible of its owning pathways.

Tags, yield texts, and count badges from `drawCytoplasmNetwork` are queued (`_deferTags`) and flushed after the metabolite pills, in that order, so nothing hides under a pill and no count hides under a tag. `_tagY` decides when a long tag rides above the pill row.

### Color, text, and theme

Colors flow `_PALETTE` (shared) → colors.js (`_BASE` families) → `_ROLE` in enzymes.js (semantic role to family) → `EnzymeStyles.colors` → `_THEME.light` / `_THEME.dark`, picked per frame by `EnzymeStyles.t(visualLightMode)`. Pathway hues are data encoding and deliberately don't follow the accent. Canvas text uses the frozen `_F` font strings and `_labelFont(size)` from enzymes.js, sized in canvas units so the camera scales them. Widths go through `_cachedMeasure`, whose cache is cleared once `_loadTextFonts()` and the emoji face resolve, so pills never keep fallback-font widths.

The theme has three states (theme.js): Simulation (follows the light toggle), Light, and Dark. `visualLightMode` drives the canvas independently of `lightOn`. `data-theme` changes through `_toolbar.toggleTheme()` with no storage key, so the choice isn't persisted and `prefers-color-scheme` is ignored.

### Presets and UI

ui.js wires the controls, the `shortcuts` array (the source of truth for keys), the about panel, info tips, and the reference overlay (Shift+click or long-press on an info button). Selecting a preset sets each pathway toggle (dispatching `change` so `simState` follows) and disables the rows it rules out, marking them `.locked`. It then sets light and oxygen the same way, calls `resetState()`, and applies the preset's cofactor ratios. "Custom" unlocks every row without resetting.

## Conventions

- Check bounds before touching a conserved pool: raise the reduced or charged member only below its total, and lower it only above zero. Nothing clamps afterwards, so the implicit partner would silently go negative.
- Call reactions through `advanceStep`. Calling an `advance*` or `run*` function directly skips regulation, the active-step display, and the rotation nudge.
- colors.js is a deferred classic script ordered before the `main.js` module, and enzymes.js reads `window._BASE` and `window._darkFill` at import. colors.js assigns both explicitly because a top-level `const` in a classic script is not a `window` property. Its `_freezeTokens()` call freezes `_PALETTE`, so new palette keys go above it.
- The about-panel `lastUpdated` is in `src/ui.js`. The parent build rewrites it, along with index.html's title, descriptions, and `dateModified`, from about.md's frontmatter.
- The canvas inset for the open sidebar (`_SIDEBAR_W` in ui.js) and its ease in `Renderer.draw` are hand-copied from the shared `.sim-panel` width and transition rather than read from CSS. At 900 px and below the sidebar is a bottom sheet and the inset is 0.
- The membrane is drawn `_LW + 400` wide so it continues under the translucent sidebar.
- A new ETC complex touches `layout.js` (`etcComplexes`, `numComplexes`), `enzymes.js` (`draw<Name>`, plus a `_ROLE` and palette entry for a new role), `renderer.js` (`drawETCChain` draw call, arrows, and hitbox; `_etcInfoKey`), `info.js` (`ENZYMES`), `reactions/etc.js` and the `_dispatch` map, `autoplay.js` if it should fire on the membrane tick, and the sidebar legend in index.html if it brings a new color.

## Open work

- Presets gate only the carbon pathways. `etc_photo` runs whenever light is on, so the archaeon preset (light, no O₂) splits water and releases O₂ under autoplay, while bacteriorhodopsin and cyclic flow fire only on clicks.
- Unreachable code: `canReact` (imported by renderer.js, never called), `Particles.spawnElectron` and its `Renderer` wrapper, the `sod` / `catalase` / `gpx` / `run_ros_scavenge` dispatch keys (scavenging runs inline in `protonLeakTick`), `calvin` step 5, and the renderer's `glycolysisStep` / `calvinStep` / `pppStep` / `krebsStep` reads, which nothing sets, so those tags never highlight as the next step. The `ucp` hitbox has no dispatch handler, so clicking UCP does nothing.
- `_SIDEBAR_W` (374) and the 450 ms inset ease have drifted from `.sim-panel` (360 px wide at a 12 px inset, 0.55 s slide).
- Keyboard zoom (`=` / `-`) pivots at `canvas.width / 2`, a device-pixel value, so on a 2× screen it pivots on the lower-right corner instead of the center.
- The glycolysis step-9 regulation gate (commented as PK reverse) applies in both directions.
