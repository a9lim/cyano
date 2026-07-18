---
name: Cyano
title: Cyano — Interactive Cellular Metabolism Simulator
description: Trace connected carbon metabolism, electron transport, conserved cofactor pools, enzyme feedback, and reactive oxygen species across five stylized cell presets.
updated: 2026-07-17
---

# Cyano — Interactive Cellular Metabolism Simulator

Cyano is a browser-based cellular-metabolism model. Reactions share one mutable metabolite store, so carbon intermediates, redox cofactors, ATP, the proton gradient, and reactive oxygen species change together as the user advances enzymes or runs autoplay.

## Pathways

The carbon network covers glycolysis and its reverse path, the pentose phosphate pathway, the Calvin cycle, the Krebs cycle, pyruvate dehydrogenase, ethanol fermentation and salvage, beta-oxidation, and a simplified reverse fatty-acid-synthesis path. Respiratory, linear-photosynthetic, and cyclic-photosynthetic electron flow connect those reactions to ATP synthesis, bacteriorhodopsin, nicotinamide nucleotide transhydrogenase, and ROS scavenging.

## Electron Transport Chain

Fourteen rendered membrane components include photosystems, respiratory entry points, mobile carriers, cytochrome b6f, cytochrome c oxidase, ATP synthase, bacteriorhodopsin, NNT, and UCP. The model stores a single proton-gradient value rather than separate voltage and pH terms. ATP synthase consumes four gradient units per ATP; passive leak removes 2% every half-second, or 10% with uncoupling enabled.

## Regulation

The dispatcher applies explicit feedback gates before substrate mutation. High ATP inhibits phosphofructokinase and slows citrate synthase; high NADH inhibits isocitrate dehydrogenase and, together with accumulated acetyl-CoA, blocks pyruvate dehydrogenase. NADPH controls the pentose phosphate pathway, FADH2 controls beta-oxidation, and low ATP limits the Calvin cycle.

## Organism Presets

Five stylized presets configure different pathway and environment subsets: cyanobacterium, animal cell, obligate anaerobe, plant chloroplast, and archaeon. Selecting one resets the shared pools, applies preset-specific ATP/NADH/NADPH/FADH2 ratios, toggles light and oxygen, and locks pathways marked unavailable by that preset.

## Educational Use

Users can add glucose or fatty acid, toggle five pathway groups plus light, oxygen, and uncoupling, then compare step-by-step reactions with the autoplay schedule. Sidebar readouts expose cofactor ratios, gas and water balances, ATP sources, ROS, cell health, and sixty-second sparklines.

## Proton Gradient and Chemiosmotic Coupling

Respiratory NADH entry pumps four protons at NDH-1, the shared cytochrome-b6f step pumps four more, and the terminal oxidase pumps two. Photosynthetic flow starts at PSII and can run linearly to FNR or cycle back through the carrier chain. Electron leaks at NDH-1 and the Q-cycle produce ROS stochastically.

## Cofactor Conservation

Four closed cofactor pairs are conserved by fixed totals: ATP/ADP, NAD+/NADH, NADP+/NADPH, and FAD/FADH2. The model does not track AMP or a closed CoA pool. Reactions check their substrates and available cofactor capacity before mutating state, so depleted oxidized or reduced pools can stall a path.

## Accessibility

Cyano provides keyboard shortcuts, labeled controls, light/dark/simulation-following themes, and numerical sidebar readouts. Electron, proton, and photon particles create continuous motion during active reactions; step-by-step mode is available instead of autoplay.

## Fatty Acid Metabolism

The detailed beta-oxidation view advances four reaction stages. Its batch action models one palmitoyl-CoA-equivalent as eight acetyl-CoA, seven NADH, and seven FADH2; it does not store chain length or odd-chain intermediates. The simplified reverse batch consumes eight acetyl-CoA, fourteen NADPH, and fourteen ATP to restore one fatty-acid unit.
