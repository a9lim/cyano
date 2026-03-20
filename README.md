# Metabolism

An interactive simulation of cellular carbon metabolism, electron transport chains, and bioenergetics. Ten interconnected biochemical pathways mapped onto a shared metabolite grid, with allosteric regulation, organism presets, reactive oxygen species, and real-time cofactor tracking.

**[Live Demo](https://a9l.im/biosim)** | Part of the [a9l.im](https://a9l.im) portfolio

## What It Does

Visualizes ten interconnected biochemical pathways inside a photosynthetic cell. Instead of treating each pathway as an isolated textbook diagram, the simulator maps them onto a shared metabolite grid so that intersections (e.g. Fructose-6-Phosphate shared by Glycolysis, PPP, and the Calvin Cycle) are immediately visible.

Users advance the simulation by clicking enzyme labels on the canvas. Available reactions highlight based on current substrate levels and cofactor ratios. Toggle sunlight and oxygen to shift the cell between photosynthesis, aerobic respiration, and fermentation. An autoplay mode runs the full metabolic program automatically, with allosteric regulation gating reaction rates in real time.

## Pathways

1. **Glycolysis / Gluconeogenesis** -- bidirectional glucose breakdown and resynthesis
2. **Pentose Phosphate Pathway** -- NADPH production and carbon skeleton recycling
3. **Calvin Cycle** -- CO2 fixation using light-derived ATP and NADPH
4. **Krebs Cycle** -- acetyl-CoA oxidation, NADH/FADH2 generation
5. **Beta Oxidation / Fatty Acid Synthesis** -- bidirectional fatty acid catabolism and anabolism
6. **Linear Light Reactions (Z-scheme)** -- water splitting, PSII to PSI electron flow
7. **Cyclic Light Reactions** -- PSI cyclic electron flow for extra ATP
8. **Oxidative Phosphorylation** -- respiratory ETC and chemiosmotic ATP synthesis
9. **Fermentation** -- ethanol pathway when oxygen is absent
10. **NNT** -- proton-gradient-driven NADH-to-NADPH conversion

## Features

- **Click-to-React** -- manually advance metabolic flux by clicking enzyme arrows on the canvas. Substrate availability and regulation status determine which reactions are available.
- **Allosteric Regulation** -- PFK, citrate synthase, isocitrate DH, PDH, G6PDH, RuBisCO, and ACAD respond to cellular energy state. Regulation factor (0--1.5) gates reactions with toast feedback on manual clicks and probabilistic gating during autoplay.
- **Organism Presets** -- choose from Cyanobacterium, Animal Cell, Obligate Anaerobe, Plant Chloroplast, or Archaeon. Each preset locks/unlocks pathways and environment toggles to match that organism's biology.
- **Reactive Oxygen Species** -- 2% electron leak at Complex I and the Q-cycle produces ROS. SOD and catalase scavenge for free; GPx consumes NADPH. Cell health degrades if ROS accumulate unchecked.
- **Cofactor Sparklines** -- real-time time-series plots of ATP, NADH, NADPH, FADH2 ratios and proton gradient (300 samples at 5 Hz, 60-second window).
- **Enzyme and Metabolite Info** -- hover enzyme tags or metabolite nodes for popups with name, pathway, equation, and regulation notes.
- **Three-State Theme** -- Simulation (follows sunlight), Light, Dark.
- **Keyboard Shortcuts** -- Space (autoplay), G (glucose), F (fatty acid), L (light), O (oxygen), 1--5 (pathway toggles), T (theme), S (sidebar). Press `?` for help overlay.
- **Uncoupling Proteins** -- toggle passive proton leak to dissipate the gradient as heat, mimicking brown fat thermogenesis.

## Controls

| Control | Effect |
|---------|--------|
| Click enzyme label | Advance that reaction one step |
| Right-click bidirectional enzyme | Run the reverse direction |
| Add Glucose / Add Fatty Acid | Inject substrate into the system |
| Pathway toggles | Enable/disable individual pathways |
| Sunlight toggle | Enable photosynthetic light reactions; in Simulation theme, also switches light/dark canvas |
| Ambient O2 toggle | Enable aerobic respiration; disabling activates fermentation |
| Auto-Play toggle | Run all pathways automatically with regulation gating |
| Organism select | Apply preset pathway/environment configurations |
| Uncoupling toggle | Enable passive proton leak (2% base, 10% with UCP) |

## Running Locally

```bash
npx serve .
# or: python -m http.server
```

No build step, no dependencies. Shared design system files (`shared-tokens.js`, `shared-base.css`, etc.) load from the root site via absolute paths. For full functionality, serve from the parent `a9lim.github.io/` directory.

## Architecture

ES6 modules loaded via `<script type="module" src="main.js">`. Non-module scripts (`shared-tokens.js`, `colors.js`) load in `<head>` before modules run. Canvas 2D rendering with `requestAnimationFrame` loop. Zero runtime dependencies -- vanilla HTML5/CSS3/JS.

```
index.html              -- Application shell, sidebar tabs, substrate bar
styles.css              -- Visual styling, toggle switches, responsive layout
colors.js               -- Extends shared palette with pathway colors, _BASE families, CSS vars
main.js                 -- Entry point: init, rAF loop, sparkline sampling
src/
  state.js              -- simState, store, counters, histories, resetState()
  anim.js               -- Easing functions, fade trackers, rotation accumulators, trail system
  sparkline.js           -- Ring buffer time-series history, sparkline canvas renderer
  theme.js              -- Three-state theme toggle (Simulation/Light/Dark)
  dashboard.js          -- Dashboard DOM sync, stat bars, active step display, sparklines
  enzymes.js            -- ETC complex shapes, metabolite nodes, enzyme tags, arrow drawing
  renderer.js           -- Canvas 2D engine: layout, camera/zoom, hit detection, draw pipeline
  particles.js          -- Electron chain animation, proton/photon spawning and rendering
  autoplay.js           -- Automated pathway cycling, passive ATP drain, proton leak, ROS damage
  layout.js             -- Membrane/ETC/metabolite position computation
  ui.js                 -- DOM cache, event binding, sidebar, intro screen, shortcuts, info tips
  info.js               -- ENZYMES and METABOLITES data for hover popups
  organisms.js          -- Organism preset definitions (pathway/environment configurations)
  regulation.js         -- getRegulationFactor(), getRegulationReason()
  reactions/
    dispatch.js         -- Unified reaction dispatcher (_dispatch map, advanceStep, canReact)
    glycolysis.js       -- Glycolysis upper/lower + gluconeogenesis (reverse)
    krebs.js            -- Krebs cycle (8 steps)
    calvin.js           -- Calvin cycle (carbon fixation)
    ppp.js              -- Pentose phosphate pathway
    etc.js              -- ETC complexes, ATP synthase, BR, NNT
    fermentation.js     -- PDH, PDC, ADH, ALDH, ACS, fermentation
    betaoxidation.js    -- Beta oxidation + fatty acid synthesis (reverse)
    ros.js              -- SOD, catalase, GPx, batch ROS scavenging
```

Uses the shared design system from [a9lim.github.io](https://github.com/a9lim/a9lim.github.io) -- glass panels, tool buttons, intro screen, tab system, sidebar stats, info tips, keyboard shortcuts, and responsive breakpoints.

## Sibling Projects

- [Geon](https://github.com/a9lim/physsim) -- [a9l.im/physsim](https://a9l.im/physsim)
- [Redistricting](https://github.com/a9lim/gerry) -- [a9l.im/gerry](https://a9l.im/gerry)
- [Shoals](https://github.com/a9lim/finsim) -- [a9l.im/finsim](https://a9l.im/finsim)

## License

[AGPL-3.0](LICENSE)
