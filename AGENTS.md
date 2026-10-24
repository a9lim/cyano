# Lumen

Interactive cellular-metabolism simulator at a9l.im/lumen. The scene is one Canvas 2D figure in two registers split at the membrane: above, the specimen's membrane in cross-section, drawn in the manner of David Goodsell (lipids, complexes and carriers at roughly true relative size); below, the cell's whole carbon network as a transit map. The user runs enzymes by clicking them, or lets autoplay run its schedule, and every moving thing in the figure reads a quantity in the model. Vanilla ES modules with no dependencies of its own; KaTeX from jsDelivr renders the reference overlay.
It is a submodule of the a9l.im repository (`a9lim.github.io`, at `projects/lumen`); the root `AGENTS.md` covers the shared layer, design system ("Inside the scene"), build, and deployment, and `docs/sim-overhaul/PLAN.md` the ratified plan this rebuild follows.

## Running and checking

Preview through the parent build (serve `dist/`, open `/lumen/`), or from the working tree with `node docs/sim-overhaul/serve.mjs 8791` in the parent and `docs/sim-overhaul/check.mjs` for screenshots, console errors, overflow and fps. There is no test runner or linter; check syntax with:

```bash
for f in main.js colors.js src/*.js src/reactions/*.js; do node --check "$f"; done
git diff --check
```

## Layout

```
index.html         colophon, the figure (canvas + caption + zoom), the margin (Controls / Stats / Reference tabs), reference overlay, edu content, JSON-LD
main.js            entry: init, warm-up, rAF loop (anim + autoplay + leak ticks, flux, particles, 5 Hz sparkline samples, draw, caption)
colors.js          classic script: Lumen's ink roles for the DOM (--pw-* per line, --co-* per cofactor pool)
styles.css         the stage grid, hairline margin and controls, phone sheet
about.md           published reference doc; frontmatter feeds SEO and the about-panel date
src/state.js       simState, store, counters, sparkline ring buffers, resetState(), updateAnimations()
src/organisms.js   the five presets
src/specimens.js   the membrane each preset shows: frame, complexes in order, names, what it can run; WIDTH footprints
src/regulation.js  getRegulationFactor / getRegulationReason
src/autoplay.js    autoplayTick (specimen-aware membrane tick), protonLeakTick (leak, ROS damage, scavenging)
src/reactions/     dispatch.js (advanceStep, onReaction) + glycolysis, krebs, calvin, ppp, etc, fermentation, betaoxidation, ros
src/flux.js        reactions → map segments; leaky-integrated flux per segment
src/complexes.js   the palette (P, readPalette, shades, mix), blob, and every protein, carrier and small molecule shape
src/membrane.js    Membrane: specimen layout in world px, frames (sac, granum, cristae, cell wall, S-layer), lipids, labels, hit boxes
src/particles.js   electrons riding chains and carriers, the lumen proton pool, photons, ATP and O₂, tags
src/maplayout.js   the transit map's grid: stations, lines, tracks and segments, loops (batch services), CO₂ spurs, geometry helpers
src/map.js         MapView: builds the map in world px (upright on phones), visibility per segment, trains, hit testing
src/mapdraw.js     draws the map, the flux key and the pool gauges
src/renderer.js    Renderer: canvas, camera, layout of both registers, the membrane cache, engine hooks, input, tooltips
src/dashboard.js   the Stats tab: last reaction, counters, pools with sparklines, gradient, stress, ATP source, exchange
src/ui.js          DOM cache, presets and specimens, switches, margin, colophon, shortcuts, about panel, info tips, reference overlay
src/theme.js       three-state theme (light, dark, follows sunlight)
src/anim.js        fade and rotation primitives (simState's trackers)
src/info.js        ENZYMES / METABOLITES tooltip data
src/reference.js   REFERENCE overlay pages (HTML + KaTeX)
```

## How it works

### State

`store` (state.js) is the one mutable store every reaction shares: cofactor pools, metabolite counts, the proton gradient, and cumulative tallies (gases and water, ATP by source, ROS, cell health). The four cofactor pairs are closed. `store` holds only the reduced or charged member (`atp`, `nadh`, `nadph`, `fadh2`) plus a fixed total (`totalAtpAdp`, `totalNad`, `totalNadp`, `totalFad`); ADP, NAD⁺, NADP⁺ and FAD are total minus that value. `simState` holds environment and pathway flags, the active preset and specimen, autoplay, `visualLightMode`, and the `Anim` fade and rotation trackers. The gradient is a single number; the protons drawn in the lumen are kept equal to it.

### Reactions and regulation

Every reaction goes through `advanceStep(key, stepIndex, direction)` in `reactions/dispatch.js`, which looks up the `_dispatch` handler, applies the regulation gate, runs the handler, then updates the active-step display and nudges the cycle's rotation. Handlers check their pathway's enable flag and substrates, mutate `store`, and return `{ enzyme, reaction, yields }` or `false`. Keys come in three shapes: per-step keys taking a step index and direction (`glycolysis`, `krebs`, `calvin`, `ppp`, `betaox`), batch `run_*` keys that apply a whole cycle's net stoichiometry, and single-enzyme or membrane keys (`pdh`, `adh`, `atp_syn`, `etc_resp`, …).

Glycolysis step indices double as the shared Calvin/PPP enzymes. Steps 0–3, 5, 6 and 10 run when any owning pathway is enabled, and their reverse directions are the gluconeogenesis and Calvin reactions (FBPase, NADPH-linked GAPDH, TK+SBPase). Index 4 is unused (aldolase and TPI are step 3). On the map `calvin` contributes only RuBisCO (0) and PRK (7). `_reverseColorPathway` recolors the last-reaction label when a reverse glycolysis step belongs to another pathway. After a reaction fires, `advanceStep` calls its observers (`onReaction`) with the key, step, direction and result; `flux.js` is the one observer.

`getRegulationFactor` (regulation.js) returns 0 (blocked), a fraction (partially inhibited), 1, or 1.5 (G6PDH at low NADPH, which the dispatcher treats like 1). A blocked manual click shows `getRegulationReason` as a toast; autoplay fails silently. A fractional factor is a probability gate in autoplay only, so manual clicks always fire. The map draws a buffer bar across an enzyme whose factor is 0 in its running direction, so the bar reflects regulation, not substrate availability.

### Membrane chain and particles

`advanceETC` (reactions/etc.js) runs one of three chains: `etc_resp` (NADH at NDH-1 or FADH₂ at SDH → PQ → Cyt b6f → PC → Cyt c oxidase; needs O₂ and `oxphosEnabled`), `etc_photo` (linear, PSII → … → FNR; needs light and `linearLightEnabled`), and `etc_cyclic` (PSI → Fd → PQ → Cyt b6f → PC → PSI; needs light and `cyclicLightEnabled`). The entry step mutates `store` at once. The downstream effects are segment callbacks on the electron from `Renderer.spawnElectronChain`, fired by `Particles.update` as the electron enters each segment: Cyt b6f and oxidase pumping, O₂ use, FNR's NADPH, and the Q-cycle ROS leak. They land a beat after the click, scale with the particle speed (`,` and `.`), and are dropped by Reset, which clears the particles. A chain the specimen can't draw, or one spawned during the warm-up, fires all its callbacks at once. ATP synthase, bacteriorhodopsin and NNT act immediately.

Particles (particles.js), all in world pixels and stepped by `dt × simState.speed`:

- **Electrons** follow the chain's anchors (`Membrane.pos`). On a segment that starts or ends at PQ, PC or Fd the electron rides that carrier, drawn reduced (darker) while it does; idle carriers wait at their home positions.
- **Lumen protons** are a pool kept equal to `store.protonGradient` (capped at 600). Pumped protons cross up through their complex (the engine's `spawnProton(cx, 'up')`) and join it; protons still crossing count as pooled. When the store spends protons, the same number leave the pool at once, by the store's own tallies: four per ATP made to ATP synthase (`atpOxidative`), the leak (`protonsLeaked`) through UCP while uncoupling or else across the bilayer, and any rest to NNT. The engine's `'down'` spawns are therefore ignored. Pooled protons are full red; crossing ones are drawn paler, so the red count is the gradient.
- **Photons** are Feynman wiggles to PSII, PSI or bacteriorhodopsin.
- **ATP synthase** turns a third of a turn per ATP (twelve c subunits, four protons per ATP) and releases an ATP from its head each third; the renderer eases the rotor toward the tally. O₂ leaves PSII when `o2Produced` passes a whole number and arrives at cytochrome oxidase when `o2Consumed` does.

### Specimens

Each preset shows its own membrane (`SPECIMEN_OF` in specimens.js): the cyanobacterium a thylakoid sac with phycobilisomes under PSII and galactolipid (ring-headed) lipids; the plant chloroplast a thylakoid whose photosystem II end sits in a granum (discs stacked above and below) and whose ATP synthase and PSI sit in the stroma lamella; the animal cell a mitochondrial crista, its tip bent by an ATP synthase dimer and its junction opening upward; the obligate anaerobe a bare plasma membrane under a peptidoglycan wall; the archaeon the halophile's purple membrane, with bacteriorhodopsin in a lattice, ether lipids (methyl-branched tails) and an S-layer. Custom shows the composite membrane with all fourteen complexes.

A specimen also decides what its membrane can run. `setSpecimen` (ui.js) sets the engine's own switches `linearLightEnabled`, `cyclicLightEnabled` and `oxphosEnabled` from `spec.can`, and the autoplay membrane tick fires NNT only where the specimen has it and bacteriorhodopsin (four times a tick, in the light) only in the purple membrane. Clicks reach only complexes that are drawn. The composite membrane can run everything, which is the model as it was before specimens.

### Timing

`main.js` runs one rAF loop: `updateAnimations`, `autoplayTick`, `protonLeakTick`, `updateFlux`, `Renderer.update` (rotor, O₂, particles, trains), sparkline samples every 0.2 s into 60-second ring buffers, then the draw and the caption. While autoplay is on, `autoplayTick` runs a fast membrane tick (`atp_syn` ×3, `etc_resp`, `etc_photo`, then NNT and bacteriorhodopsin as the specimen allows), a slower round-robin over `metabolicSteps` in which light and oxygen choose directions (gluconeogenesis and fatty-acid synthesis in light, fermentation without O₂), and a passive ATP drain. `protonLeakTick` always runs: gradient leak (faster with uncoupling), ROS damage to cell health, free SOD/catalase scavenging, NADPH-costing GPx, and health regeneration once ROS clears. Each tick's interval is at the top of its block.

Lumen opens on a living frame. At boot it applies the cyanobacterium preset and runs the model silently for 24 simulated seconds (`warm` in main.js, with `Renderer.warm` set so chains land at once and visual spawns are dropped), then fills the pool and seeds a representative instant (photons and electrons in transit). Under `prefers-reduced-motion` autoplay starts off and the loop holds that frame still until the first interaction.

### Rendering

`Renderer` (renderer.js) owns the canvas and a shared `createCamera` whose clamp keeps the world in view; `minZoom` is 1, the fit. `layout()` places the membrane (`Membrane.layout`, scaled so the block fits about 42% of the height on desktop) and the map below it (`MapView.build`), and the world is as tall as both: desktop fits the canvas exactly; at widths under 640 the map is transposed upright and the world is taller than the view, so it pans and pinch-zooms. A ResizeObserver on the scene relays out.

The membrane's still parts (frame, lipids, protein bodies) are painted into an offscreen cache keyed by specimen, size, theme and zoom (re-rendered once a zoom settles); rotors, particles and labels draw live. Draw order: cache, rotor, map, particles, membrane labels.

The map (maplayout.js, map.js, mapdraw.js) is laid out by hand on an octilinear grid. Stations are store keys; ticks mark single stations and capsules or rings the interchanges. Tracks are drawn lines, one ink each: glycolysis runs the corridor, the Calvin cycle runs back along it on its own offset track, the pentose phosphate pathway loops above, the Krebs cycle is a circle line, β-oxidation a loop with an acetyl-CoA spur. Each segment is one enzyme bound to a dispatch key and step; `FLIP` marks segments whose running direction is the engine's reverse, so a left click always runs the line the way it is drawn. Corridor enzymes that serve two tracks (`PAIR`) are labelled once, named for the way carbon runs. Line weight and train speed read each segment's flux (flux.js: events per second, a leaky integral with a 6 s memory, smoothed for drawing); trains are chevrons cut from the line, so a still frame shows direction. Lines switched off, or needing oxygen they lack, are dashed hairlines; a preset's locked pathways leave the map. Loop names are batch services (`run_*`); clicking one runs a whole turn. Yields float off the segment that made them.

Hit testing: membrane hit boxes first, then segment labels, loop names, segments (within 9 screen px), and stations (tooltip only). Left click runs forward, right or middle click reverse; a touch tap uses the forward/backward mode (X). Tooltips resolve through `_ETC_INFO`, `_SEG_INFO` and loop `info` keys into `ENZYMES`, and stations into `METABOLITES`.

### Color, text, and theme

The canvas reads its palette from `_themePalette()` through `readPalette()` (complexes.js) on every theme change: the inks, the ground and text tones, and the accent, which is Lumen's one red and means protons. Each line and complex has an ink (`LINES` in maplayout.js; the shapes in complexes.js). colors.js only names the DOM's roles (`--pw-*`, `--co-*`). Canvas text is Newsreader through `_FONT.text`, at least 10 px, and the loop waits on `_loadTextFonts()` (or 1.5 s) before the first draw.

The theme has three states (theme.js): light, dark, and "follows sunlight" (dark while the light switch is off). It starts from the system preference, which `_colophon.mount` applies, and isn't stored. `visualLightMode` follows the page theme.

### Presets and UI

ui.js wires the colophon (play, theme, help), the margin, the `shortcuts` array (the source of truth for keys), the about panel, info tips, and the reference overlay (Shift+click or long-press on an info button). The margin is a 300 px column ruled off by a hairline, a bottom sheet at 760 px and below; S toggles it and Escape closes it. Selecting a specimen applies its preset: each pathway switch is set (dispatching `change` so `simState` follows) and rows the organism rules out are disabled and marked `.locked`; light and oxygen are set the same way; `resetState()` runs and the preset's cofactor ratios apply; the specimen goes under the microscope. "Custom" unlocks every row without resetting and shows the composite membrane.

## Conventions

- Check bounds before touching a conserved pool: raise the reduced or charged member only below its total, and lower it only above zero. Nothing clamps afterwards, so the implicit partner would silently go negative.
- Call reactions through `advanceStep`. Calling an `advance*` or `run*` function directly skips regulation, the last-reaction display, the rotation nudge and the flux observers.
- colors.js is a deferred classic script ordered before the `main.js` module. Its `_freezeTokens()` call freezes `_PALETTE`, so new palette keys go above it.
- The about-panel `lastUpdated` is in `src/ui.js`. The parent build rewrites it, along with index.html's title, descriptions, and `dateModified`, from about.md's frontmatter.
- Every effect in the scene reads a quantity in the model (the root AGENTS.md, "Inside the scene"). A new one names its quantity in a comment where it is drawn.
- A new membrane complex touches specimens.js (`WIDTH`, the specimens' `order` and `names`, `CLICK` if clickable), complexes.js (its shape), membrane.js (`drawStatic`, its anchor height in `layout`, its hit box), renderer.js (`_ETC_INFO`), info.js (`ENZYMES`), reactions/etc.js and the `_dispatch` map, and autoplay.js if it should fire on the membrane tick.
- A new map segment touches maplayout.js (its track's `segs`, a station if new), map.js (`LABEL_AT`, phone overrides, `FLIP`, visibility in `updateVis`), flux.js (`route`), and renderer.js (`_SEG_INFO`).

## Open work

- Unreachable code: `canReact`, the `sod` / `catalase` / `gpx` / `run_ros_scavenge` dispatch keys (scavenging runs inline in `protonLeakTick`), and `calvin` step 5. The `ucp` hit box has no dispatch handler, so clicking UCP does nothing.
- The glycolysis step-9 regulation gate (commented as PK reverse) applies in both directions.
- `pumpProtons` and ATP synthase still schedule their visual protons with `setTimeout`; the pool ignores the `'down'` ones and reconciles from the store instead.
