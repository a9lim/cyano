---
name: Lumen
title: Lumen — Interactive Cellular Metabolism Simulator
description: Trace connected carbon metabolism, electron transport, conserved cofactor pools, enzyme feedback, and reactive oxygen species across five stylized cell presets.
updated: 2026-10-24
---

# Lumen — Interactive Cellular Metabolism Simulator

Lumen is a browser-based cellular-metabolism model. Reactions share one mutable metabolite store, so carbon intermediates, redox cofactors, ATP, the proton gradient, and reactive oxygen species change together as the user advances enzymes or runs autoplay.

## Pathways

The carbon network covers glycolysis and its reverse path, the pentose phosphate pathway, the Calvin cycle, the Krebs cycle, pyruvate dehydrogenase, ethanol fermentation and salvage, beta-oxidation, and a simplified reverse fatty-acid-synthesis path. Respiratory, linear-photosynthetic, and cyclic-photosynthetic electron flow connect those reactions to ATP synthesis, bacteriorhodopsin, nicotinamide nucleotide transhydrogenase, and ROS scavenging.

## Electron Transport Chain

The membrane is drawn in cross-section, with lipids, complexes, and carriers at roughly true relative size. The model knows fourteen membrane components: photosystems, respiratory entry points, mobile carriers, cytochrome b6f, cytochrome c oxidase, ATP synthase, bacteriorhodopsin, NNT, and UCP. The model stores a single proton-gradient value rather than separate voltage and pH terms, and the figure draws one proton for each unit of it. ATP synthase consumes four gradient units per ATP, drawn as a third of a turn of its twelve-subunit rotor; passive leak removes 2% every half-second, or 10% with uncoupling enabled.

## Regulation

The dispatcher applies explicit feedback gates before substrate mutation. High ATP inhibits phosphofructokinase and slows citrate synthase; high NADH inhibits isocitrate dehydrogenase and, together with accumulated acetyl-CoA, blocks pyruvate dehydrogenase. NADPH controls the pentose phosphate pathway, FADH2 controls beta-oxidation, and low ATP limits the Calvin cycle.

## Organism Presets

Five stylized presets configure different pathway and environment subsets: cyanobacterium, animal cell, obligate anaerobe, plant chloroplast, and archaeon. Selecting one resets the shared pools, applies preset-specific ATP/NADH/NADPH/FADH2 ratios, toggles light and oxygen, and locks pathways marked unavailable by that preset.

Each preset also shows its own membrane, which carries only the complexes that organism has: a cyanobacterial thylakoid with phycobilisomes, where respiration and photosynthesis share plastoquinone and plastocyanin; a chloroplast thylakoid with photosystem II in a stacked granum and photosystem I and ATP synthase in the stroma lamella; a mitochondrial crista with ATP synthase dimers at its tip; an anaerobe's plasma membrane under a peptidoglycan wall, with no chain at all; and a halophile's purple membrane, where bacteriorhodopsin pumps one proton per photon under autoplay. A membrane reaction runs only where its complexes are present, so mitochondria ignore light and the chloroplast has no respiratory chain. Custom shows a composite membrane with every complex.

## Educational Use

Users can add glucose or fatty acid, toggle five pathway groups plus light, oxygen, and uncoupling, then compare step-by-step reactions with the autoplay schedule. The carbon network is drawn as a transit map: clicking an enzyme's segment runs it, line weight and train speed show recent flux, and trains run backward when a pathway reverses. Readouts in the margin expose cofactor ratios, gas and water balances, ATP sources, ROS, cell health, and sixty-second sparklines.

## Proton Gradient and Chemiosmotic Coupling

Respiratory NADH entry pumps four protons at NDH-1, the shared cytochrome-b6f step pumps four more, and the terminal oxidase pumps two. Linear photosynthetic flow runs from PSII to FNR; cyclic flow starts at PSI and returns through ferredoxin and the carrier chain. Electron leaks at NDH-1 and the Q-cycle produce ROS stochastically.

## Cofactor Conservation

Four closed cofactor pairs are conserved by fixed totals: ATP/ADP, NAD+/NADH, NADP+/NADPH, and FAD/FADH2. The model does not track AMP or a closed CoA pool. Reactions check their substrates and available cofactor capacity before mutating state, so depleted oxidized or reduced pools can stall a path.

## Accessibility

Lumen provides keyboard shortcuts, labeled controls, light, dark, and sunlight-following themes, and numerical readouts in the margin. Line states carry patterns as well as color: switched-off lines are dashed, blocked enzymes carry a bar, and trains are chevrons that point the way carbon runs. Electron, proton, and photon particles create continuous motion during active reactions; with reduced motion requested, Lumen opens on a still frame and moves only after the first interaction, and step-by-step mode is available instead of autoplay.

## Fatty Acid Metabolism

The detailed beta-oxidation view advances four reaction stages. Its batch action models one palmitoyl-CoA-equivalent as eight acetyl-CoA, seven NADH, and seven FADH2; it does not store chain length or odd-chain intermediates. The simplified reverse batch consumes eight acetyl-CoA, fourteen NADPH, and fourteen ATP to restore one fatty-acid unit.
