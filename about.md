# Cyano — Interactive Cellular Metabolism Simulator

Cyano simulates how cells produce and consume energy through biochemical pathways. It models twelve metabolic pathways with allosteric enzyme regulation, cofactor tracking, and reactive oxygen species.

## Pathways

The simulator covers glycolysis, gluconeogenesis, the pentose phosphate pathway, the Krebs (TCA) cycle, beta-oxidation, fatty acid synthesis, the Calvin cycle, the light reactions of photosynthesis, fermentation (both ethanol and lactate), the urea cycle, and amino acid catabolism. Each pathway is connected through shared metabolite pools — ATP, NADH, FADH2, acetyl-CoA, and others.

## Electron Transport Chain

A 14-complex electron transport chain model traces electrons from NADH and FADH2 through Complexes I-IV and ATP synthase. Proton motive force drives oxidative phosphorylation. The model includes uncoupling, proton leak, and reactive oxygen species (ROS) generation at Complexes I and III.

## Regulation

Allosteric regulation gates every reaction. Key control points include phosphofructokinase (inhibited by ATP and citrate), pyruvate dehydrogenase (inhibited by acetyl-CoA and NADH), and isocitrate dehydrogenase (activated by ADP). Students can observe how feedback inhibition maintains metabolic homeostasis.

## Organism Presets

Five organism presets configure different pathway availability: cyanobacteria (photosynthesis + respiration), animal cells (respiration only), plant cells (both with Calvin cycle), yeast (fermentation-capable), and obligate anaerobes. A cancer cell preset demonstrates the Warburg effect — aerobic glycolysis where cells ferment glucose to lactate even when oxygen is available, producing ATP less efficiently but at a faster rate to support rapid proliferation. Each preset reflects real biochemical constraints.

## Educational Use

Designed for undergraduate biochemistry. Students can manipulate substrate concentrations, toggle pathways, and observe flux changes through the metabolic network in real time.

## Proton Gradient and Chemiosmotic Coupling

The electron transport chain model tracks the proton motive force (PMF) across the inner mitochondrial membrane as the sum of the membrane potential and the pH gradient. ATP synthase couples proton flow back through the membrane to ADP phosphorylation at a ratio of approximately 4 H+ per ATP. Uncoupling proteins dissipate the PMF as heat, reducing ATP yield. Proton leak occurs passively at a base rate of 2%, increasing to 10% when uncoupling is enabled, and is visible in real time through the dashboard.

## Cofactor Conservation

The model enforces strict conservation of NAD+/NADH, FAD/FADH2, CoA/acetyl-CoA, and ATP/ADP/AMP pools. Each reaction that consumes a cofactor must have a corresponding regeneration pathway active, or the pool depletes and the pathway stalls. This creates realistic metabolic bottlenecks.

## Fatty Acid Metabolism

Beta-oxidation cleaves two-carbon units from fatty acyl-CoA chains, producing acetyl-CoA, NADH, and FADH2 per cycle. The simulator models chain lengths from C4 to C22 and tracks odd-chain fatty acids that produce propionyl-CoA requiring the methylmalonyl pathway. The reverse direction (fatty acid synthesis) consumes NADPH and ATP, coupling lipogenesis to the pentose phosphate pathway.
