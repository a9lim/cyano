# Cyano

An interactive cellular metabolism simulator. Step through biochemical reactions one at a time, watch cofactor pools shift in real time, and see how glycolysis, the Krebs cycle, photosynthesis, and the electron transport chain all connect through shared metabolites.

**[Try it](https://a9l.im/cyano)** | Part of the [a9l.im](https://a9l.im) portfolio

## What it covers

Ten interconnected pathways mapped onto a shared metabolite grid: glycolysis/gluconeogenesis, the pentose phosphate pathway, the Calvin cycle, the Krebs cycle, beta-oxidation/fatty acid synthesis, linear and cyclic light reactions, oxidative phosphorylation, fermentation, and NNT transhydrogenation. Bidirectional pathways (glycolysis, beta-oxidation) reverse direction with distinct cofactor requirements.

A 14-complex electron transport chain (PSII, NDH-1, SDH, PQ, Cyt b6f, PC, PSI, Fd, FNR, ATP synthase, Cyt c oxidase, bacteriorhodopsin, NNT, UCP) renders each complex with a unique visual silhouette.

Eleven allosteric control points (PFK, PDH, citrate synthase, isocitrate DH, G6PDH, RuBisCO, ACAD, and others) gate reactions based on ATP/ADP ratio, NADH/NAD+ balance, and cofactor availability. Reactive oxygen species accumulate from electron leak at Complex I and the Q-cycle; SOD, catalase, and GPx scavenge them.

## How to use it

Click highlighted enzyme labels on the canvas to advance reactions. Available reactions depend on substrate levels and regulation state. Right-click bidirectional enzymes to run the reverse direction.

Toggle sunlight and oxygen to shift the cell between photosynthesis, aerobic respiration, and fermentation. Choose from five organism presets -- cyanobacterium, animal cell, obligate anaerobe, plant chloroplast, archaeon -- each locking pathways and environment to match real biology.

Auto-play mode runs the full metabolic program with allosteric regulation gating reaction rates. Real-time sparklines track ATP, NADH, NADPH, FADH2 ratios and the proton gradient over a 60-second window.

Keyboard shortcuts: Space (auto-play), G (glucose), F (fatty acid), L (light), O (oxygen), 1-5 (pathway toggles), T (theme), ? (help).

## Running locally

```bash
cd path/to/a9lim.github.io && python -m http.server
```

No build step, no dependencies. Shared design system files load from the root site via absolute paths, so serve from the parent directory.

## Architecture

Zero-dependency vanilla JavaScript. ES6 modules loaded via `<script type="module">`. Canvas 2D rendering with `requestAnimationFrame`. Cofactor pools (ATP+ADP, NAD+NADH, NADP+NADPH, FAD+FADH2) are strictly conserved closed systems.

```
main.js                 -- Entry point, render loop, sparkline sampling
colors.js               -- Pathway color palette extending shared tokens
src/
  state.js              -- Simulation state, conserved cofactor pools
  renderer.js           -- Canvas 2D engine: layout, zoom, hit detection
  enzymes.js            -- ETC complex shapes, metabolite nodes, enzyme tags
  layout.js             -- Membrane and metabolite position computation
  dashboard.js          -- Stat bars, sparklines, active step display
  particles.js          -- Electron, proton, and photon animations
  autoplay.js           -- Automated pathway cycling, proton leak, ROS damage
  regulation.js         -- Allosteric regulation factors
  organisms.js          -- Five organism preset configurations
  reactions/
    dispatch.js         -- Unified reaction dispatcher
    glycolysis.js       -- Glycolysis and gluconeogenesis
    krebs.js            -- Krebs cycle
    calvin.js           -- Calvin cycle
    ppp.js              -- Pentose phosphate pathway
    etc.js              -- ETC complexes, ATP synthase, NNT
    fermentation.js     -- Fermentation pathway
    betaoxidation.js    -- Beta-oxidation and fatty acid synthesis
    ros.js              -- ROS production and scavenging
```

## Sibling projects

- [Geon](https://github.com/a9lim/geon) -- [a9l.im/geon](https://a9l.im/geon)
- [Gerry](https://github.com/a9lim/gerry) -- [a9l.im/gerry](https://a9l.im/gerry)
- [Shoals](https://github.com/a9lim/shoals) -- [a9l.im/shoals](https://a9l.im/shoals)
- [Scripture](https://github.com/a9lim/scripture) -- [a9l.im/scripture](https://a9l.im/scripture)

## License

[AGPL-3.0](LICENSE)
