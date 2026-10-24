# Lumen

An interactive cellular-metabolism simulator. Step through glycolysis, the Krebs and Calvin cycles, the pentose phosphate pathway, fermentation, beta-oxidation, and a membrane electron transport chain one enzyme at a time, and watch the shared cofactor pools, the proton gradient, and reactive oxygen species respond.

**[Open it](https://a9l.im/lumen)** · part of [a9l.im](https://a9l.im)

## What's in it

- Connected carbon pathways drawn as one transit map, with shared intermediates as interchanges and line weight and train speed showing flux: glycolysis and gluconeogenesis, the pentose phosphate pathway, the Calvin and Krebs cycles, pyruvate dehydrogenase, ethanol fermentation and aerobic ethanol salvage (PDC, ADH, ALDH, ACS), beta-oxidation, and a simplified fatty-acid synthesis. Reversible steps run backwards with their own cofactors.
- A 14-component membrane carrying respiratory, linear photosynthetic, and cyclic electron flow: PSII, NDH-1 (Complex I), SDH (Complex II), plastoquinone, cytochrome b6f, plastocyanin, cytochrome c oxidase, PSI, ferredoxin, FNR, ATP synthase, bacteriorhodopsin, NNT, and an uncoupling protein, drawn in cross-section at roughly true relative size, with electrons riding the carriers, one red proton per unit of gradient, and photons.
- Four conserved cofactor pools (ATP/ADP, NAD⁺/NADH, NADP⁺/NADPH, FAD/FADH₂) and a single proton gradient. ATP synthase spends four gradient units per ATP, and the gradient leaks faster with uncoupling on.
- Allosteric control at PFK, PK/PEPCK, citrate synthase, isocitrate dehydrogenase, PDH, G6PDH, RuBisCO activase, ACAD, and fatty-acid synthesis. A blocked enzyme carries a bar across its line, and a blocked click says why.
- Reactive oxygen species from electron leak at Complex I and the Q-cycle, cleared by SOD and catalase or by NADPH-consuming glutathione peroxidase. Uncleared ROS lowers cell health.
- Five stylized presets (cyanobacterium, animal cell, obligate anaerobe, plant chloroplast, archaeon) that set and lock pathways, set light and oxygen, reset the starting cofactor ratios, and put the organism's own membrane under the microscope: a thylakoid, a granum, a mitochondrial crista, a bare plasma membrane, a purple membrane. Custom unlocks everything on a composite membrane.
- Autoplay that runs the whole network under regulation; a margin with cofactor bars, 60-second sparklines, gas and water balances, ATP by source, ROS, and cell health; hover tooltips for enzymes and metabolites; and reference pages with the net equations.

## Controls

- Click an enzyme on the map, or a complex in the membrane, to run it the way its line runs; right-click runs it backward. Click a loop's name for a whole turn. On touch, tap, and pick the direction with the forward/backward button (X).
- Space autoplay · `,` / `.` particle speed · R reset · G / F add glucose / fatty acid
- L light · O oxygen · U uncoupling · 1–5 glycolysis, PPP, Calvin, Krebs, beta-oxidation
- T theme (light / dark / follows sunlight) · S margin · `[` / `]` margin tabs · `=` / `-` / `0` zoom; drag to pan, scroll to zoom
- Shift+click (or long-press) an info button for its reference page.

## Running locally

The project has no build step of its own; it loads the shared design system from
the parent site by absolute path. From a checkout of
[a9lim.github.io](https://github.com/a9lim/a9lim.github.io) with submodules:

    npm install && npm run build
    python3 -m http.server --directory dist 8000   # http://localhost:8000/lumen/

## How it's built

Vanilla JavaScript ES modules drawing on a Canvas 2D context, with no dependencies of its own; KaTeX renders the math on the reference pages. Every reaction mutates one shared store and passes through a single dispatcher that applies allosteric regulation first. A layout module places the membrane complexes and the metabolite grid, and the renderer redraws pathways, hitboxes, and particles each frame. [AGENTS.md](AGENTS.md) has the file map and the mechanics.

## License

[AGPL-3.0](LICENSE)
