# Cellular Metabolism

An interactive HTML5 Canvas simulation of cellular carbon metabolism and electron transport chains.

**[Live Demo →](https://a9l.im/biosim)** · Part of the [a9l.im](https://a9l.im) portfolio

## Overview

Visualizes the interconnected nature of 8 major biochemical systems within a photosynthetic cell. Users trace the flow of carbon, electrons, and energy (ATP/NADH/NADPH) by clicking on enzymatic reactions to advance the simulation step-by-step.

Rather than treating pathways as isolated diagrams, the simulator uses **shared metabolite nodes** (e.g., Fructose-6-Phosphate) in an orthogonal grid layout, demonstrating how pathways like Glycolysis, the Calvin Cycle, and the Pentose Phosphate Pathway naturally intersect.

## Features

- **Click-to-React** — Manually advance metabolic flux by clicking enzymatic arrows. Available reactions are highlighted based on current metabolite, ATP, and redox coenzyme levels.
- **Biochemical Accuracy** — Reversible enzymes (Aldolase, PGI, etc.) calculate substrate/product availability dynamically. Clicking in reverse consumes the product and returns the substrate.
- **Orthogonal Grid Layout** — Cytoplasmic carbon architecture (Glycolysis, Calvin, PPP, Krebs) mapped to a strict column-and-row system.
- **Unrolled Krebs Block** — The citric acid cycle integrated as a 3×3 logical circuit beneath Glycolysis.
- **Dynamic Shared Reactions** — Enzymes shared between pathways (TKT/TAL, TK/SBP) adapt colors based on which pathways are active.
- **Live Bioenergetic Tracking** — Global cellular pools of ATP/ADP, NADH/NAD+, NADPH/NADP+, FADH2/FAD shown as real-time percentage bars.
- **Three-State Theme Toggle** — Simulation (follows sunlight), Light, Dark.

### Pathways

1. Glycolysis
2. Pentose Phosphate Pathway (PPP)
3. Calvin Cycle (Carbon Fixation)
4. Krebs Cycle (Citric Acid Cycle)
5. Linear Light-Dependent Reactions (Z-scheme)
6. Cyclic Light-Dependent Reactions (PSI cyclic flow)
7. Oxidative Phosphorylation (Respiratory ETC)
8. Fermentation (Ethanol pathway when anoxic)

## Running Locally

```bash
npx serve .
# or: python -m http.server
```

No build step, no dependencies. Shared design system files (`shared-tokens.js`, `shared-base.css`) load from the root site — serve from the parent `a9lim.github.io/` directory for full functionality.

## Architecture

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~350 | Application shell, DOM controls, dashboard UI |
| `styles.css` | ~660 | Visual styling, toggle switches, responsive layout |
| `colors.js` | ~125 | Extends shared palette with pathway colors, `_BASE` families, CSS vars |
| `anim.js` | ~85 | Easing functions, fade trackers, trail ring-buffers |
| `enzymes.js` | ~775 | Drawing routines for membrane proteins, shared nodes, labels |
| `renderer.js` | ~1055 | Canvas 2D engine — layout, zoom/pan, hit detection, draw pipeline |
| `sim.js` | ~855 | Simulation engine — metabolite store, reaction logic, autoplay loop |

Uses the shared design system from [a9lim.github.io](https://github.com/a9lim/a9lim.github.io) — glass panels, tool buttons, intro screen, tab system, sidebar stats, and responsive breakpoints.

## Sibling Projects

- [Relativistic N-Body](https://github.com/a9lim/physsim) — [a9l.im/physsim](https://a9l.im/physsim)
- [Redistricting Simulator](https://github.com/a9lim/gerry) — [a9l.im/gerry](https://a9l.im/gerry)

## License

[AGPL-3.0](LICENSE)
