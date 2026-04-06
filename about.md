# Cyano — Interactive Cellular Metabolism Simulator

Cyano simulates how cells produce and consume energy through biochemical pathways. It models twelve metabolic pathways with allosteric enzyme regulation, cofactor tracking, and reactive oxygen species.

## Pathways

The simulator covers glycolysis, gluconeogenesis, the pentose phosphate pathway, the Krebs (TCA) cycle, beta-oxidation, fatty acid synthesis, the Calvin cycle, the light reactions of photosynthesis, fermentation (both ethanol and lactate), the urea cycle, and amino acid catabolism. Each pathway is connected through shared metabolite pools — ATP, NADH, FADH2, acetyl-CoA, and others.

## Electron Transport Chain

A 14-complex electron transport chain model traces electrons from NADH and FADH2 through Complexes I-IV and ATP synthase. Proton motive force drives oxidative phosphorylation. The model includes uncoupling, proton leak, and reactive oxygen species (ROS) generation at Complexes I and III.

## Regulation

Allosteric regulation gates every reaction. Key control points include phosphofructokinase (inhibited by ATP and citrate), pyruvate dehydrogenase (inhibited by acetyl-CoA and NADH), and isocitrate dehydrogenase (activated by ADP). Students can observe how feedback inhibition maintains metabolic homeostasis.

## Organism Presets

Five organism presets configure different pathway availability: cyanobacteria (photosynthesis + respiration), animal cells (respiration only), plant cells (both with Calvin cycle), yeast (fermentation-capable), and obligate anaerobes. Each preset reflects real biochemical constraints.

## Educational Use

Designed for undergraduate biochemistry. Students can manipulate substrate concentrations, toggle pathways, and observe flux changes through the metabolic network in real time.
