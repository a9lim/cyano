// ─── Reference Pages ───
// Extended content for each metabolism concept, shown via Shift+click on info buttons.
// KaTeX math: $$...$$ for display, $...$ for inline.

export const REFERENCE = {
    glycolysis: {
        title: 'Glycolysis',
        body: `
<p>Glycolysis ("sugar splitting") is the oldest and most universal metabolic pathway — present in virtually every living cell. It splits one 6-carbon glucose into two 3-carbon pyruvates, harvesting a small net yield of ATP and NADH without requiring oxygen.</p>

<h3>Investment Phase (Upper Glycolysis)</h3>
<p>The first five steps invest 2 ATP to activate and split glucose:</p>
<ol>
<li><b>Hexokinase (HK)</b>: $\\text{Glucose} + \\text{ATP} \\to \\text{G6P} + \\text{ADP}$ — traps glucose inside the cell by phosphorylation. Essentially irreversible under cellular conditions.</li>
<li><b>Phosphoglucose Isomerase (PGI)</b>: $\\text{G6P} \\rightleftharpoons \\text{F6P}$ — rearranges the aldose to a ketose. Freely reversible; shared with the pentose phosphate pathway.</li>
<li><b>Phosphofructokinase (PFK)</b>: $\\text{F6P} + \\text{ATP} \\to \\text{F1,6BP} + \\text{ADP}$ — <em>the</em> committed step of glycolysis and its primary control point.</li>
<li><b>Aldolase (ALDO)</b>: $\\text{F1,6BP} \\rightleftharpoons 2\\,\\text{G3P}$ — splits the 6-carbon sugar into two 3-carbon triose phosphates.</li>
</ol>
<p>The upper half consumes 2 ATP per glucose. Gluconeogenesis reverses this via bypass enzymes (G6Pase, FBPase, PC + PEPCK) that circumvent the irreversible kinase steps.</p>

<h3>Payoff Phase (Lower Glycolysis)</h3>
<p>The last five steps extract energy from each G3P (two per glucose):</p>
<ol start="5">
<li><b>G3P Dehydrogenase (GAPDH)</b>: $\\text{G3P} + \\text{NAD}^+ \\rightleftharpoons \\text{1,3-BPG} + \\text{NADH}$ — oxidizes the aldehyde, capturing energy as a high-energy acyl phosphate and NADH.</li>
<li><b>Phosphoglycerate Kinase (PGK)</b>: $\\text{1,3-BPG} + \\text{ADP} \\rightleftharpoons \\text{3-PGA} + \\text{ATP}$ — the first substrate-level phosphorylation.</li>
<li><b>Phosphoglycerate Mutase (PGM)</b>: $\\text{3-PGA} \\to \\text{2-PGA}$</li>
<li><b>Enolase (ENO)</b>: $\\text{2-PGA} \\to \\text{PEP} + \\text{H}_2\\text{O}$ — dehydration creates the high-energy enol phosphate.</li>
<li><b>Pyruvate Kinase (PK)</b>: $\\text{PEP} + \\text{ADP} \\to \\text{Pyruvate} + \\text{ATP}$ — the second substrate-level phosphorylation. Essentially irreversible; gluconeogenesis bypasses this with PC + PEPCK (2 ATP cost).</li>
</ol>

<h3>Net Equation</h3>
$$\\text{Glucose} + 2\\,\\text{NAD}^+ + 2\\,\\text{ADP} + 2\\,\\text{P}_i \\longrightarrow 2\\,\\text{Pyruvate} + 2\\,\\text{NADH} + 2\\,\\text{ATP} + 2\\,\\text{H}_2\\text{O}$$
<p>Only 2 ATP per glucose — about 5% of the energy available in glucose. The remaining ~95% is locked in pyruvate and NADH, awaiting the Krebs cycle and oxidative phosphorylation.</p>

<h3>Regulation</h3>
<p>PFK is the master switch. It is allosterically inhibited by ATP (the product of metabolism) and citrate (signals Krebs cycle saturation), and activated by AMP and fructose-2,6-bisphosphate (signals energy deficit). This creates a feedback loop: when ATP is abundant, glycolysis slows; when ATP drops, glycolysis accelerates.</p>
<p>In this simulation, PFK is blocked when $[\\text{ATP}]/[\\text{total adenylates}] > 0.8$ and partially inhibited above 0.6. Pyruvate kinase reverse (gluconeogenesis) is blocked below 0.3.</p>

<h3>Connections to Other Pathways</h3>
<ul>
<li><b>PPP</b>: G6P is the branch point — PGI diverts it toward glycolysis, while G6PDH diverts it toward the PPP. F6P and G3P from the PPP non-oxidative branch re-enter glycolysis.</li>
<li><b>Krebs cycle</b>: Pyruvate enters via $\\text{PDH} \\to \\text{Acetyl-CoA}$.</li>
<li><b>Fermentation</b>: Without oxygen, pyruvate is reduced to ethanol (or lactate in animals) to regenerate $\\text{NAD}^+$.</li>
<li><b>Calvin cycle</b>: Several glycolytic enzymes (GAPDH, PGK, ALDO, FBPase, PGI) operate in reverse during carbon fixation.</li>
</ul>

<h3>Historical Note</h3>
<p>Glycolysis was the first metabolic pathway to be fully elucidated, pieced together between 1897 (Buchner's cell-free fermentation) and 1940 (Embden, Meyerhof, and Parnas). It remains the canonical example of metabolic pathway analysis.</p>
`,
    },

    ppp: {
        title: 'Pentose Phosphate Pathway',
        body: `
<p>The pentose phosphate pathway (PPP) is the cell's primary source of NADPH — the reducing currency used for biosynthesis (fatty acids, cholesterol, nucleotides) and antioxidant defense (glutathione recycling). It branches from glycolysis at G6P and rejoins at F6P and G3P.</p>

<h3>Oxidative Phase</h3>
<p>Three irreversible steps produce NADPH and $\\text{CO}_2$:</p>
<ol>
<li><b>G6P Dehydrogenase (G6PDH)</b>: $\\text{G6P} + \\text{NADP}^+ \\to \\text{6-PGL} + \\text{NADPH}$ — the rate-limiting step and primary regulatory point.</li>
<li><b>6-Phosphogluconolactonase</b>: $\\text{6-PGL} \\to \\text{6-PGA}$ — hydrolyzes the unstable lactone ring.</li>
<li><b>6-Phosphogluconate Dehydrogenase (6PGDH)</b>: $\\text{6-PGA} + \\text{NADP}^+ \\to \\text{R5P} + \\text{NADPH} + \\text{CO}_2$ — oxidative decarboxylation yields the second NADPH and a pentose sugar.</li>
</ol>
<p>Each pass through the oxidative phase produces 2 NADPH and 1 $\\text{CO}_2$ from one G6P.</p>

<h3>Non-Oxidative Phase</h3>
<p>Carbon-shuffling enzymes (transketolase and transaldolase) interconvert 3-, 4-, 5-, 6-, and 7-carbon sugar phosphates. The net effect depends on the cell's needs:</p>
<ul>
<li><b>Need NADPH only</b>: $6\\,\\text{R5P} \\to 5\\,\\text{F6P}$ — pentoses are recycled back to hexoses, which re-enter the oxidative phase. This is the mode shown in the simulation.</li>
<li><b>Need R5P for nucleotides</b>: The oxidative phase runs, and R5P is siphoned off for DNA/RNA synthesis.</li>
<li><b>Need both</b>: A balanced flux through both phases.</li>
</ul>

<h3>Net Equation (Full Recycling Mode)</h3>
$$\\text{G6P} + 12\\,\\text{NADP}^+ + 6\\,\\text{H}_2\\text{O} \\longrightarrow 6\\,\\text{CO}_2 + 12\\,\\text{NADPH} + \\text{P}_i$$
<p>In this mode, one glucose-6-phosphate is completely oxidized to $\\text{CO}_2$, producing 12 NADPH. No ATP is directly produced or consumed.</p>

<h3>Regulation</h3>
<p>G6PDH is controlled by the $\\text{NADPH}/\\text{NADP}^+$ ratio. High NADPH inhibits the enzyme (product inhibition), while low NADPH activates it. This ensures the pathway runs only when NADPH is needed.</p>
<p>In the simulation: G6PDH is activated $1.5\\times$ when NADPH falls below 20%, blocked above 80%, and partially inhibited above 60%.</p>

<h3>Antioxidant Defense</h3>
<p>NADPH is essential for regenerating reduced glutathione (GSH) via glutathione reductase. GSH is then used by glutathione peroxidase (GPx) to neutralize reactive oxygen species ($\\text{H}_2\\text{O}_2$). This creates a direct metabolic link:</p>
$$\\text{PPP} \\xrightarrow{\\text{NADPH}} \\text{GR} \\xrightarrow{\\text{GSH}} \\text{GPx} \\xrightarrow{} \\text{H}_2\\text{O}$$
<p>Cells with high oxidative stress (like red blood cells) run the PPP continuously.</p>

<h3>G6PDH Deficiency</h3>
<p>The most common human enzyme deficiency (~400 million people worldwide). Reduced NADPH production impairs red blood cell antioxidant defense, causing hemolytic anemia under oxidative stress (certain drugs, fava beans, infections). The high prevalence in malaria-endemic regions suggests it confers partial malaria resistance.</p>
`,
    },

    calvin: {
        title: 'Calvin Cycle',
        body: `
<p>The Calvin cycle (Calvin-Benson-Bassham cycle) is the light-independent pathway of photosynthesis — it fixes atmospheric $\\text{CO}_2$ into organic carbon using ATP and NADPH generated by the light reactions. It is responsible for virtually all net carbon fixation on Earth.</p>

<h3>Phase 1: Carbon Fixation</h3>
<p><b>RuBisCO</b> (ribulose-1,5-bisphosphate carboxylase/oxygenase) catalyzes the key reaction:</p>
$$\\text{RuBP}\\,(5\\text{C}) + \\text{CO}_2 \\longrightarrow 2 \\times \\text{3-PGA}\\,(3\\text{C})$$
<p>RuBisCO is the most abundant enzyme on Earth (~0.7 gigatons), comprising up to 50% of leaf protein. Despite its abundance, it is remarkably slow (~3 reactions/second vs. ~1000/s for typical enzymes) and error-prone (it also fixes $\\text{O}_2$ in a wasteful side reaction called photorespiration).</p>

<h3>Phase 2: Reduction</h3>
<p>3-PGA is phosphorylated by ATP and then reduced by NADPH to form G3P:</p>
$$\\text{3-PGA} + \\text{ATP} \\to \\text{1,3-BPG} + \\text{ADP} \\quad (\\text{via PGK})$$
$$\\text{1,3-BPG} + \\text{NADPH} \\to \\text{G3P} + \\text{NADP}^+ \\quad (\\text{via GAPDH})$$
<p>These are the reverse of glycolytic steps 6 and 5, but using NADPH instead of NADH. For every 3 $\\text{CO}_2$ fixed, 6 G3P molecules are produced.</p>

<h3>Phase 3: Regeneration</h3>
<p>Five of the six G3P molecules are recycled to regenerate 3 RuBP, using a complex series of carbon-shuffling reactions plus ATP via phosphoribulokinase (PRK):</p>
$$5\\,\\text{G3P} + 3\\,\\text{ATP} \\longrightarrow 3\\,\\text{RuBP} + 3\\,\\text{ADP}$$
<p>The sixth G3P is the net output — it can be used to build glucose, sucrose, starch, or other organic molecules.</p>

<h3>Net Equation (per 3 $\\text{CO}_2$)</h3>
$$3\\,\\text{CO}_2 + 9\\,\\text{ATP} + 6\\,\\text{NADPH} \\longrightarrow \\text{G3P} + 9\\,\\text{ADP} + 6\\,\\text{NADP}^+ + 8\\,\\text{P}_i$$
<p>For one glucose (6 $\\text{CO}_2$): 18 ATP + 12 NADPH consumed. The simulation runs 6 turns per batch.</p>

<h3>Regulation</h3>
<p>RuBisCO activase requires ATP to maintain RuBisCO in its active form. When ATP drops (e.g. in the dark), RuBisCO deactivates. Several Calvin cycle enzymes (GAPDH, FBPase, PRK) are also redox-regulated via thioredoxin, linking their activity to the light reactions.</p>
<p>In the simulation: RuBisCO is blocked when $[\\text{ATP}]/[\\text{total}] < 0.15$ and partially inhibited below 0.3.</p>

<h3>Shared Enzymes with Glycolysis</h3>
<p>The Calvin cycle shares several enzymes with glycolysis running in reverse: PGK, GAPDH, aldolase, FBPase (bypassing PFK), and PGI. Transketolase and transaldolase are shared with the PPP. This deep interconnection reflects the evolutionary ancestry of carbon metabolism.</p>

<h3>C3 vs. C4 Photosynthesis</h3>
<p>The basic Calvin cycle (C3 photosynthesis) loses efficiency in hot, dry conditions because RuBisCO's oxygenase activity increases with temperature. C4 plants (corn, sugarcane) and CAM plants (cacti) have evolved $\\text{CO}_2$-concentrating mechanisms that suppress photorespiration, but the underlying Calvin cycle is the same.</p>
`,
    },

    krebs: {
        title: 'Krebs Cycle (TCA Cycle)',
        body: `
<p>The Krebs cycle (also called the citric acid cycle or TCA cycle) is the central metabolic hub of aerobic life. It completely oxidizes the 2-carbon acetyl group of acetyl-CoA to 2 $\\text{CO}_2$, harvesting energy as NADH, $\\text{FADH}_2$, and GTP. It also serves as a source and sink for biosynthetic precursors.</p>

<h3>Entry: PDH Complex</h3>
<p>Before the cycle proper, pyruvate dehydrogenase (PDH) links glycolysis to the Krebs cycle:</p>
$$\\text{Pyruvate} + \\text{NAD}^+ + \\text{CoA} \\longrightarrow \\text{Acetyl-CoA} + \\text{NADH} + \\text{CO}_2$$
<p>This is irreversible — animals cannot convert acetyl-CoA back to pyruvate (and thus cannot make glucose from fatty acids). PDH is inhibited when both NADH and acetyl-CoA accumulate.</p>

<h3>The Eight Steps</h3>
<ol>
<li><b>Citrate Synthase (CS)</b>: $\\text{Acetyl-CoA}\\,(2\\text{C}) + \\text{OAA}\\,(4\\text{C}) \\to \\text{Citrate}\\,(6\\text{C})$ — condensation reaction, irreversible.</li>
<li><b>Aconitase (ACO)</b>: $\\text{Citrate} \\to \\text{Isocitrate}$ — isomerization via dehydration/rehydration.</li>
<li><b>Isocitrate Dehydrogenase (IDH)</b>: $\\text{Isocitrate} + \\text{NAD}^+ \\to \\alpha\\text{-KG} + \\text{NADH} + \\text{CO}_2$ — first oxidative decarboxylation. Major regulatory point.</li>
<li><b>$\\alpha$-Ketoglutarate Dehydrogenase (KGDH)</b>: $\\alpha\\text{-KG} + \\text{NAD}^+ + \\text{CoA} \\to \\text{Suc-CoA} + \\text{NADH} + \\text{CO}_2$ — second oxidative decarboxylation. Mechanistically similar to PDH.</li>
<li><b>Succinyl-CoA Synthetase (SCS)</b>: $\\text{Suc-CoA} + \\text{GDP} \\to \\text{Succinate} + \\text{GTP}$ — substrate-level phosphorylation from the thioester bond energy.</li>
<li><b>Succinate Dehydrogenase (SDH/Complex II)</b>: $\\text{Succinate} + \\text{FAD} \\to \\text{Fumarate} + \\text{FADH}_2$ — the only membrane-embedded Krebs enzyme, feeding electrons directly into the ETC.</li>
<li><b>Fumarase (FUM)</b>: $\\text{Fumarate} + \\text{H}_2\\text{O} \\to \\text{Malate}$ — hydration of the trans double bond.</li>
<li><b>Malate Dehydrogenase (MDH)</b>: $\\text{Malate} + \\text{NAD}^+ \\to \\text{OAA} + \\text{NADH}$ — regenerates the 4C acceptor. Thermodynamically unfavorable ($\\Delta G'^\\circ > 0$) but pulled forward by the highly favorable citrate synthase step.</li>
</ol>

<h3>Net Equation (per turn)</h3>
$$\\text{Acetyl-CoA} + 3\\,\\text{NAD}^+ + \\text{FAD} + \\text{GDP} + \\text{P}_i + 2\\,\\text{H}_2\\text{O} \\longrightarrow 2\\,\\text{CO}_2 + 3\\,\\text{NADH} + \\text{FADH}_2 + \\text{GTP} + \\text{CoA}$$
<p>One glucose produces 2 acetyl-CoA (via glycolysis + PDH), so 2 turns per glucose. The NADH and $\\text{FADH}_2$ feed into the ETC for oxidative phosphorylation.</p>

<h3>Regulation</h3>
<p>Three irreversible steps are regulated:</p>
<ul>
<li><b>Citrate synthase</b>: inhibited by ATP, NADH, succinyl-CoA, citrate</li>
<li><b>Isocitrate DH</b>: activated by ADP, $\\text{Ca}^{2+}$; inhibited by ATP, NADH</li>
<li><b>$\\alpha$-KG DH</b>: inhibited by succinyl-CoA, NADH; activated by $\\text{Ca}^{2+}$</li>
</ul>
<p>In the simulation: CS is slowed above 85% ATP; IDH is blocked above 75% NADH and slowed above 50%.</p>

<h3>Amphibolic Nature</h3>
<p>The Krebs cycle is <em>amphibolic</em> — it participates in both catabolism and anabolism. Intermediates are siphoned off for biosynthesis:</p>
<ul>
<li>$\\alpha$-Ketoglutarate $\\to$ glutamate $\\to$ amino acids</li>
<li>Oxaloacetate $\\to$ aspartate $\\to$ amino acids, pyrimidines</li>
<li>Succinyl-CoA $\\to$ porphyrins (heme)</li>
<li>Citrate $\\to$ exported for fatty acid synthesis</li>
</ul>
<p>Anaplerotic reactions replenish drained intermediates, most notably pyruvate carboxylase ($\\text{Pyruvate} + \\text{CO}_2 + \\text{ATP} \\to \\text{OAA}$).</p>
`,
    },

    betaox: {
        title: 'Beta Oxidation & Fatty Acid Synthesis',
        body: `
<p>Beta oxidation is the mitochondrial pathway that breaks down fatty acids into acetyl-CoA units, generating large amounts of $\\text{FADH}_2$ and NADH. Fatty acid synthesis (the reverse direction in this simulation) builds fatty acids from acetyl-CoA using NADPH and ATP.</p>

<h3>Activation</h3>
<p>Before entering beta oxidation, a fatty acid must be activated to acyl-CoA by acyl-CoA synthetase, consuming 2 ATP equivalents ($\\text{ATP} \\to \\text{AMP} + \\text{PP}_i$). The acyl-CoA is then transported into the mitochondrial matrix via the carnitine shuttle.</p>

<h3>The Four-Step Spiral</h3>
<p>Each round of beta oxidation shortens the acyl chain by 2 carbons:</p>
<ol>
<li><b>Acyl-CoA Dehydrogenase (ACAD)</b>: $\\text{Acyl-CoA} + \\text{FAD} \\to \\text{Enoyl-CoA} + \\text{FADH}_2$ — introduces a trans double bond between $\\text{C}_\\alpha$ and $\\text{C}_\\beta$.</li>
<li><b>Enoyl-CoA Hydratase (ECH)</b>: $\\text{Enoyl-CoA} + \\text{H}_2\\text{O} \\to \\text{3-OH-Acyl-CoA}$ — hydrates the double bond.</li>
<li><b>3-Hydroxyacyl-CoA Dehydrogenase (HACD)</b>: $\\text{OH-Acyl-CoA} + \\text{NAD}^+ \\to \\text{3-Keto-CoA} + \\text{NADH}$ — oxidizes the hydroxyl to a ketone.</li>
<li><b>Thiolase (ACAT)</b>: $\\text{Keto-CoA} + \\text{CoA} \\to \\text{Acyl-CoA}_{(n-2)} + \\text{Acetyl-CoA}$ — cleaves off a 2-carbon acetyl-CoA.</li>
</ol>
<p>The shortened acyl-CoA re-enters at step 1 for another round.</p>

<h3>Yield (Palmitate, C16)</h3>
$$\\text{Palmitoyl-CoA} + 7\\,\\text{FAD} + 7\\,\\text{NAD}^+ + 7\\,\\text{CoA} + 7\\,\\text{H}_2\\text{O} \\longrightarrow 8\\,\\text{Acetyl-CoA} + 7\\,\\text{FADH}_2 + 7\\,\\text{NADH}$$
<p>Seven rounds produce 8 acetyl-CoA. If all products enter the Krebs cycle and ETC: approximately 106 ATP per palmitate (minus 2 for activation = 104 net). This is why fats are such energy-dense fuel — roughly $2.5\\times$ the energy per gram compared to carbohydrates.</p>

<h3>Fatty Acid Synthesis (Reverse)</h3>
<p>Biosynthesis uses different enzymes, a different cellular compartment (cytoplasm), and different cofactors:</p>
<ul>
<li>Uses NADPH (not NADH/$\\text{FADH}_2$) as the reductant</li>
<li>Uses ATP for each elongation cycle</li>
<li>Catalyzed by fatty acid synthase (FAS), a large multi-enzyme complex</li>
<li>Malonyl-CoA (from $\\text{Acetyl-CoA} + \\text{CO}_2$ via ACC) provides 2-carbon units</li>
</ul>
$$8\\,\\text{Acetyl-CoA} + 14\\,\\text{NADPH} + 7\\,\\text{ATP} \\longrightarrow \\text{Palmitoyl-CoA} + 14\\,\\text{NADP}^+ + 7\\,\\text{ADP}$$

<h3>Regulation</h3>
<p>ACAD is inhibited by high $\\text{FADH}_2/\\text{FAD}$ ratio (product feedback). Fatty acid synthesis is regulated by the NADPH supply — blocked when NADPH is depleted below 20%, slowed below 40%. Malonyl-CoA (the first committed intermediate of synthesis) also inhibits the carnitine shuttle, preventing simultaneous synthesis and degradation.</p>

<h3>Medical Relevance</h3>
<p>Defects in beta oxidation enzymes (especially medium-chain ACAD deficiency, MCADD) cause inability to mobilize fat stores during fasting, leading to hypoglycemia and metabolic crisis. Newborn screening for MCADD has dramatically reduced infant mortality from this condition.</p>
`,
    },

    sunlight: {
        title: 'Light Reactions (Photosynthesis)',
        body: `
<p>The light reactions of photosynthesis capture solar energy to split water, release oxygen, and generate the ATP and NADPH that power the Calvin cycle. Two modes of electron flow are modeled: linear (Z-scheme) and cyclic.</p>

<h3>Linear Electron Flow (Z-Scheme)</h3>
<p>Named for its Z-shaped energy diagram, linear electron flow passes electrons through two photosystems in series:</p>
<ol>
<li><b>Photosystem II (PSII)</b>: Absorbs a photon (~680 nm). The excited electron is passed to plastoquinone (PQ). The electron hole is filled by splitting water:</li>
</ol>
$$\\text{H}_2\\text{O} \\xrightarrow{h\\nu} \\tfrac{1}{2}\\text{O}_2 + 2\\text{H}^+ + 2e^-$$
<p>This is the source of virtually all atmospheric oxygen.</p>
<ol start="2">
<li><b>Plastoquinone (PQ)</b>: Mobile carrier that shuttles electrons from PSII to the Cyt $b_6f$ complex.</li>
<li><b>Cytochrome $b_6f$</b>: Transfers electrons from PQ to plastocyanin (PC) while pumping $4\\,\\text{H}^+$ across the membrane via the Q-cycle. Shared between photosynthetic and respiratory chains.</li>
<li><b>Plastocyanin (PC)</b>: Small copper protein that shuttles electrons to PSI.</li>
<li><b>Photosystem I (PSI)</b>: Absorbs a second photon (~700 nm), re-energizing the electron to a very negative redox potential.</li>
<li><b>Ferredoxin (Fd)</b>: Iron-sulfur protein carrying high-energy electrons from PSI.</li>
<li><b>Ferredoxin-NADP$^+$ Reductase (FNR)</b>: Transfers electrons from Fd to $\\text{NADP}^+$, producing NADPH.</li>
</ol>
$$\\text{H}_2\\text{O} + \\text{NADP}^+ + {\\sim}1.5\\,\\text{ADP} \\longrightarrow \\tfrac{1}{2}\\text{O}_2 + \\text{NADPH} + {\\sim}1.5\\,\\text{ATP}$$

<h3>Cyclic Electron Flow</h3>
<p>Electrons from PSI are routed back to the Cyt $b_6f$ complex via ferredoxin $\\to$ PQ, bypassing PSII and FNR entirely. No water is split, no $\\text{O}_2$ is released, and no NADPH is produced — only protons are pumped for ATP synthesis.</p>
<p>Cyclic flow supplements ATP production when the Calvin cycle demands a higher ATP/NADPH ratio than linear flow provides (the cycle needs 3 ATP per 2 NADPH, but linear flow produces roughly equal amounts).</p>

<h3>Proton Budget</h3>
<p>Linear flow: PSII releases $2\\,\\text{H}^+$ from water splitting + Cyt $b_6f$ pumps $4\\,\\text{H}^+$ = $6\\,\\text{H}^+$ per pair of electrons. At $4\\,\\text{H}^+$ per ATP (via ATP synthase), this yields ~1.5 ATP per NADPH.</p>
<p>Cyclic flow: Cyt $b_6f$ pumps $4\\,\\text{H}^+$ per cycle = 1 ATP per cycle.</p>

<h3>Photoinhibition and Photoprotection</h3>
<p>Excess light can damage PSII by generating reactive oxygen species. Plants protect themselves via non-photochemical quenching (NPQ), which dissipates excess excitation energy as heat. The D1 protein of PSII is the most rapidly turned-over protein in nature, replaced every 30 minutes under high light.</p>

<h3>Bacteriorhodopsin (BR)</h3>
<p>An alternative light-harvesting system found in halophilic archaea. Unlike photosystems, BR is a single protein (not an electron transport chain) that directly pumps protons across the membrane using a retinal chromophore. It generates a proton gradient for ATP synthesis but does not produce NADPH or split water. The simulation models BR as a light-dependent proton pump active in the Archaeon preset.</p>
`,
    },

    oxygen: {
        title: 'Ambient O₂ & Aerobic Respiration',
        body: `
<p>Molecular oxygen is the terminal electron acceptor of aerobic respiration. Its presence enables the full oxidative pathway (glycolysis $\\to$ Krebs $\\to$ ETC), while its absence forces cells to rely on fermentation for $\\text{NAD}^+$ regeneration.</p>

<h3>Why Oxygen Matters</h3>
<p>Oxygen has an exceptionally high electron affinity (reduction potential $+0.82$ V at pH 7), making it the most thermodynamically favorable electron sink available to biology. The large potential difference between NADH ($-0.32$ V) and $\\text{O}_2$ ($+0.82$ V) — a span of $\\Delta E = 1.14$ V — drives the entire electron transport chain. The free energy released:</p>
$$\\Delta G'^\\circ = -nF\\Delta E = -2 \\times 96{,}485 \\times 1.14 \\approx -220\\;\\text{kJ/mol}$$
<p>This is ultimately what makes oxidative phosphorylation so much more efficient than fermentation.</p>

<h3>Aerobic vs. Anaerobic Yield</h3>
<table>
<tr><th style="text-align:left;padding:4px 8px">Mode</th><th style="text-align:left;padding:4px 8px">ATP per glucose</th></tr>
<tr><td style="padding:4px 8px">Fermentation only</td><td style="padding:4px 8px">2 (glycolysis)</td></tr>
<tr><td style="padding:4px 8px">Full aerobic oxidation</td><td style="padding:4px 8px">~30–32</td></tr>
</table>
<p>Aerobic respiration extracts roughly $15\\times$ more ATP per glucose. This is why aerobic organisms dominate multicellular life — the energy budget for complex tissues requires oxidative phosphorylation.</p>

<h3>The Electron Transport Chain</h3>
<p>With $\\text{O}_2$ available, NADH and $\\text{FADH}_2$ from glycolysis and the Krebs cycle donate electrons to the ETC:</p>
<ol>
<li><b>Complex I (NDH-1)</b>: $\\text{NADH} \\to \\text{NAD}^+ + 2e^-$, pumps $4\\,\\text{H}^+$</li>
<li><b>Complex II (SDH)</b>: $\\text{FADH}_2 \\to \\text{FAD} + 2e^-$, no $\\text{H}^+$ pumped (electrons enter at a lower energy)</li>
<li><b>Cyt $b_6f$</b>: $\\text{PQH}_2 \\to \\text{PC}$, pumps $4\\,\\text{H}^+$</li>
<li><b>Cytochrome c Oxidase</b>: $2e^- + \\tfrac{1}{2}\\text{O}_2 + 2\\text{H}^+ \\to \\text{H}_2\\text{O}$, pumps $2\\,\\text{H}^+$</li>
</ol>
<p>Total: $10\\,\\text{H}^+$ pumped per NADH (4+4+2), 6 per $\\text{FADH}_2$ (bypasses Complex I). At $4\\,\\text{H}^+$ per ATP: ~2.5 ATP/NADH, ~1.5 ATP/$\\text{FADH}_2$.</p>

<h3>Pasteur Effect</h3>
<p>When oxygen is removed, glycolysis accelerates dramatically (up to $20\\times$) to compensate for the $15\\times$ drop in ATP yield per glucose. This was first observed by Pasteur in yeast: anaerobic cultures consumed glucose far faster than aerobic ones. In the simulation, turning off $\\text{O}_2$ activates fermentation to regenerate $\\text{NAD}^+$.</p>

<h3>ROS Production</h3>
<p>The flip side of using $\\text{O}_2$ as an electron acceptor: electrons occasionally "leak" from the ETC (primarily at Complex I and the Q-cycle) and reduce $\\text{O}_2$ to superoxide ($\\text{O}_2^{\\bullet-}$). This is the unavoidable cost of aerobic life and the origin of oxidative stress.</p>

<h3>Evolutionary Context</h3>
<p>For the first ~2 billion years of life, Earth's atmosphere was anoxic. Oxygen began accumulating after cyanobacteria evolved oxygenic photosynthesis (~2.4 Ga, the Great Oxidation Event). The rise of atmospheric $\\text{O}_2$ was initially catastrophic for anaerobic life ("oxygen catastrophe") but ultimately enabled the evolution of aerobic metabolism and complex multicellular organisms.</p>
`,
    },

    autoplay: {
        title: 'Auto-Play Mode',
        body: `
<p>Auto-play continuously advances metabolic reactions in a prioritized sequence, simulating the steady-state flux of a living cell. It replaces manual clicking with automated reaction firing, subject to the same substrate checks and allosteric regulation.</p>

<h3>Tick Rates</h3>
<table>
<tr><th style="text-align:left;padding:4px 8px">Category</th><th style="text-align:left;padding:4px 8px">Interval</th><th style="text-align:left;padding:4px 8px">Reactions</th></tr>
<tr><td style="padding:4px 8px">ETC (fast)</td><td style="padding:4px 8px">400 ms</td><td style="padding:4px 8px">ATP Synthase $\\times 3$, respiratory ETC, photosynthetic ETC, NNT</td></tr>
<tr><td style="padding:4px 8px">Metabolic</td><td style="padding:4px 8px">800 ms</td><td style="padding:4px 8px">Krebs, PDH, glycolysis (upper + lower), Calvin, PPP, fermentation/ADH, beta-ox/FA synthesis, gluconeogenesis</td></tr>
<tr><td style="padding:4px 8px">Passive drain</td><td style="padding:4px 8px">1600 ms</td><td style="padding:4px 8px">3 ATP consumed (cellular maintenance)</td></tr>
<tr><td style="padding:4px 8px">Proton leak</td><td style="padding:4px 8px">500 ms</td><td style="padding:4px 8px">2% base leak, 10% with uncoupling; ROS damage; auto-scavenging</td></tr>
</table>

<h3>Priority and Direction</h3>
<p>The ETC runs at double speed because membrane reactions in real cells (~milliseconds) are faster than matrix/cytoplasmic reactions (~seconds). ATP synthase fires $3\\times$ per ETC tick to reflect its high throughput.</p>
<p>Metabolic reactions are direction-aware: when sunlight is on, glycolysis upper half and beta oxidation run in reverse (gluconeogenesis and FA synthesis) to reflect anabolic conditions. When off, they run forward (catabolic).</p>

<h3>Regulation Gating</h3>
<p>Each auto-fired reaction checks its allosteric regulation factor $f \\in [0, 1.5]$. If $f = 0$ (fully blocked), the reaction is silently skipped. If $0 < f < 1$ (partial inhibition), the reaction fires probabilistically:</p>
$$P(\\text{skip}) = 1 - f$$
<p>This produces realistic flux modulation — partially inhibited pathways slow down rather than stopping completely.</p>

<h3>Passive Drains</h3>
<p>The 3 ATP/tick passive drain models the ~30% of cellular ATP that is continuously consumed by housekeeping processes (ion pumps, protein turnover, DNA repair). Without substrate input, ATP will gradually deplete, mimicking starvation.</p>
<p>The proton leak tick models the inherent leakiness of biological membranes. Even without uncoupling proteins, ~2% of the gradient dissipates per tick. This drives ROS scavenging checks and cell health updates.</p>
`,
    },

    protons: {
        title: 'Proton Gradient & Chemiosmosis',
        body: `
<p>The proton motive force (PMF) — a gradient of $\\text{H}^+$ ions across the membrane — is the universal energy currency that links electron transport to ATP synthesis. This is Peter Mitchell's chemiosmotic hypothesis (Nobel Prize, 1978), one of the most important unifying concepts in bioenergetics.</p>

<h3>Building the Gradient</h3>
<p>ETC complexes pump protons from the matrix/stroma into the lumen/intermembrane space:</p>
<table>
<tr><th style="text-align:left;padding:4px 8px">Complex</th><th style="text-align:left;padding:4px 8px">$\\text{H}^+$ pumped</th><th style="text-align:left;padding:4px 8px">Source</th></tr>
<tr><td style="padding:4px 8px">NDH-1 (Complex I)</td><td style="padding:4px 8px">4</td><td style="padding:4px 8px">NADH oxidation</td></tr>
<tr><td style="padding:4px 8px">Cyt $b_6f$</td><td style="padding:4px 8px">4</td><td style="padding:4px 8px">PQ $\\to$ PC (Q-cycle)</td></tr>
<tr><td style="padding:4px 8px">Cyt c Oxidase</td><td style="padding:4px 8px">2</td><td style="padding:4px 8px">$\\text{O}_2$ reduction</td></tr>
<tr><td style="padding:4px 8px">PSII</td><td style="padding:4px 8px">2</td><td style="padding:4px 8px">Water splitting</td></tr>
<tr><td style="padding:4px 8px">Bacteriorhodopsin</td><td style="padding:4px 8px">1</td><td style="padding:4px 8px">Light-driven</td></tr>
</table>
<p>Note: SDH (Complex II) does not pump protons — it feeds electrons into PQ at a lower energy level.</p>

<h3>ATP Synthase</h3>
<p>ATP synthase is a rotary molecular motor. Protons flowing down the gradient through the $\\text{F}_0$ channel drive rotation of the c-ring, which in turn rotates the $\\gamma$-shaft inside the $\\text{F}_1$ headpiece, causing conformational changes that catalyze ATP synthesis:</p>
$$4\\,\\text{H}^+ + \\text{ADP} + \\text{P}_i \\longrightarrow \\text{ATP}$$
<p>The $\\text{H}^+$/ATP ratio of ~4 is determined by the number of c-subunits in the ring (varies by species: 8–15). Mammalian mitochondria have 8 c-subunits with 3 catalytic sites, giving $8/3 \\approx 2.7\\;\\text{H}^+/\\text{ATP}$; the simulation uses 4 for simplicity.</p>
<p>ATP synthase is one of the most efficient enzymes known, converting ~80% of the PMF energy into chemical bond energy. It rotates at ~130 revolutions per second, producing ~400 ATP molecules per second.</p>

<h3>Nicotinamide Nucleotide Transhydrogenase (NNT)</h3>
$$\\text{NADH} + \\text{NADP}^+ + \\text{H}^+_{\\text{in}} \\longrightarrow \\text{NAD}^+ + \\text{NADPH}$$
<p>NNT uses the proton gradient to drive the thermodynamically unfavorable transfer of a hydride from NADH to $\\text{NADP}^+$, producing NADPH. This links the respiratory chain to biosynthetic and antioxidant NADPH demands.</p>

<h3>Components of the PMF</h3>
<p>In real cells, the PMF has two components:</p>
$$\\Delta p = \\Delta\\psi - \\frac{2.3\\,RT}{F}\\,\\Delta\\text{pH}$$
<ul>
<li>$\\Delta\\psi$: membrane potential (~150–180 mV in mitochondria, inside negative)</li>
<li>$\\Delta\\text{pH}$: pH difference (~0.5–1.0 units in mitochondria, ~3 units in chloroplasts)</li>
</ul>
<p>The simulation tracks only a single "proton gradient" value (analogous to $\\Delta\\text{pH}$) for simplicity.</p>

<h3>The Chemiosmotic Revolution</h3>
<p>Before Mitchell's hypothesis (1961), the prevailing model assumed a "high-energy chemical intermediate" directly linking the ETC to ATP synthesis (the chemical coupling hypothesis). Mitchell's radical idea — that the intermediate was a proton gradient, not a molecule — was initially met with fierce resistance but was vindicated by decades of experimental evidence. It unified photosynthetic and respiratory ATP synthesis under a single mechanism.</p>
`,
    },

    uncoupling: {
        title: 'Uncoupling Proteins & Thermogenesis',
        body: `
<p>Uncoupling proteins (UCPs) are mitochondrial inner membrane channels that allow protons to flow back into the matrix without passing through ATP synthase. The energy of the proton gradient is dissipated as heat instead of being captured as ATP.</p>

<h3>Mechanism</h3>
<p>Normally, the inner membrane is highly impermeable to protons, forcing them through ATP synthase. UCPs create an alternative return path, "short-circuiting" the gradient:</p>
$$\\text{H}^+_{\\text{lumen}} \\xrightarrow{\\text{UCP}} \\text{H}^+_{\\text{matrix}} + \\text{heat}$$
<p>The electron transport chain continues pumping protons and consuming $\\text{O}_2$, but no ATP is produced — all the energy goes to heat. Oxygen consumption increases (the ETC runs faster to maintain the gradient) while ATP synthesis decreases.</p>

<h3>UCP1 and Brown Adipose Tissue</h3>
<p>The best-characterized UCP is UCP1 (thermogenin), found exclusively in brown adipose tissue (BAT). Brown fat is specialized for non-shivering thermogenesis — heat production without muscle contraction. It is:</p>
<ul>
<li>Rich in mitochondria (the "brown" color comes from cytochromes)</li>
<li>Activated by norepinephrine (cold stress signal)</li>
<li>Critical for thermoregulation in newborns and hibernating mammals</li>
<li>Present in adult humans (rediscovered via PET/CT imaging in 2009)</li>
</ul>

<h3>Other UCPs</h3>
<p>UCP2 and UCP3 are expressed in many tissues but their functions remain debated. Proposed roles include:</p>
<ul>
<li>Mild uncoupling to reduce ROS production (lowering $\\Delta\\psi$ reduces electron leak)</li>
<li>Fatty acid export from the mitochondrial matrix</li>
<li>Calcium handling</li>
</ul>

<h3>Pharmacological Uncoupling</h3>
<p>Chemical uncouplers like 2,4-dinitrophenol (DNP) are lipid-soluble weak acids that shuttle protons across the membrane. DNP was briefly used as a weight-loss drug in the 1930s (it works — the body burns more fuel to compensate for the wasted gradient) but was banned after causing hyperthermia, cataracts, and deaths. It remains a cautionary tale about the dangers of tampering with bioenergetics.</p>

<h3>Simulation Model</h3>
<p>With uncoupling disabled, a basal 2% proton leak per tick occurs (reflecting real membrane leakiness). Enabling uncoupling increases this to 10% per tick. Each leaked proton is visible as a downward-moving particle through the UCP channel. The UCP complex glows when uncoupling is active and gradient is available.</p>
`,
    },

    oxStress: {
        title: 'Oxidative Stress & ROS Scavenging',
        body: `
<p>Reactive oxygen species (ROS) are inevitable byproducts of aerobic metabolism. They damage DNA, proteins, and lipids, contributing to aging and disease. Cells maintain an elaborate antioxidant defense system to keep ROS levels in check.</p>

<h3>ROS Sources</h3>
<p>The primary source is electron "leak" from the ETC. About 0.1–2% of electrons passing through the chain (primarily at Complex I and the Q-cycle of Cyt $b_6f$) prematurely reduce $\\text{O}_2$ to superoxide:</p>
$$\\text{O}_2 + e^- \\longrightarrow \\text{O}_2^{\\bullet-}$$
<p>Superoxide is moderately reactive but generates more dangerous species:</p>
<ul>
<li>$2\\,\\text{O}_2^{\\bullet-} + 2\\text{H}^+ \\to \\text{H}_2\\text{O}_2 + \\text{O}_2$ (spontaneous or via SOD)</li>
<li>$\\text{H}_2\\text{O}_2 + \\text{Fe}^{2+} \\to \\text{OH}^\\bullet + \\text{OH}^- + \\text{Fe}^{3+}$ (Fenton reaction — produces the most damaging radical)</li>
</ul>
<p>The simulation models a 2% electron leak rate, tracked as ROS production.</p>

<h3>Scavenging Cascade</h3>
<p>Three enzymes form the primary defense, modeled in the simulation:</p>
<ol>
<li><b>Superoxide Dismutase (SOD)</b>:</li>
</ol>
$$2\\,\\text{O}_2^{\\bullet-} + 2\\text{H}^+ \\longrightarrow \\text{H}_2\\text{O}_2 + \\text{O}_2$$
<p>Converts superoxide to the less reactive hydrogen peroxide. Free (no cofactor cost). SOD is one of the fastest enzymes known ($k \\sim 10^9\\;\\text{M}^{-1}\\text{s}^{-1}$).</p>
<ol start="2">
<li><b>Catalase</b>:</li>
</ol>
$$2\\,\\text{H}_2\\text{O}_2 \\longrightarrow 2\\,\\text{H}_2\\text{O} + \\text{O}_2$$
<p>Rapidly decomposes peroxide. Also free; produces $0.5\\,\\text{O}_2$ per reaction. Found primarily in peroxisomes.</p>
<ol start="3">
<li><b>Glutathione Peroxidase (GPx)</b>:</li>
</ol>
$$\\text{H}_2\\text{O}_2 + 2\\,\\text{GSH} \\longrightarrow 2\\,\\text{H}_2\\text{O} + \\text{GSSG}$$
<p>Uses reduced glutathione, which must be regenerated from NADPH by glutathione reductase. This is the key NADPH-consuming step.</p>

<h3>The GSH/NADPH Connection</h3>
<p>Glutathione (GSH) is the cell's master antioxidant buffer (~5 mM concentration). The cycle is:</p>
$$\\text{PPP} \\xrightarrow{\\text{NADPH}} \\text{GR} \\xrightarrow{\\text{GSH}} \\text{GPx} \\xrightarrow{} \\text{H}_2\\text{O}$$
<p>Cells under oxidative stress increase PPP flux (via G6PDH activation) to supply more NADPH. This is why the simulation links NADPH depletion to impaired ROS scavenging.</p>

<h3>Oxidative Damage</h3>
<p>Unscavenged ROS cause:</p>
<ul>
<li><b>DNA damage</b>: 8-oxoguanine lesions, strand breaks (~10,000 per cell per day, repaired by base excision repair)</li>
<li><b>Protein oxidation</b>: carbonylation, disulfide cross-links, loss of enzymatic function</li>
<li><b>Lipid peroxidation</b>: chain reaction in membranes, producing toxic aldehydes (malondialdehyde, 4-HNE)</li>
</ul>
<p>In the simulation, each active ROS reduces cell health by 0.3 per leak tick. Health regenerates at 0.5/tick when active ROS reaches zero. Critical health ($< 20$) triggers a warning toast.</p>

<h3>ROS as Signaling Molecules</h3>
<p>Despite their destructive potential, ROS at low concentrations serve essential signaling roles: activating transcription factors (NF-$\\kappa$B, Nrf2), regulating cell proliferation, and mediating immune responses (the "oxidative burst" of neutrophils deliberately produces ROS to kill pathogens). The cell's challenge is maintaining ROS within this narrow "beneficial" window.</p>

<h3>Disease Connections</h3>
<p>Chronic oxidative stress is implicated in aging, neurodegenerative diseases (Alzheimer's, Parkinson's), cardiovascular disease, cancer, and diabetes. However, clinical trials of antioxidant supplements have generally failed to show benefit — suggesting that the relationship between ROS and disease is more complex than simple "damage accumulation."</p>
`,
    },
};
