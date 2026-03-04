// ─── Enzyme & Metabolite Info Data ───
// Used by info tips and hover popups.

export const ENZYMES = {
    // Glycolysis
    HK:     { name: 'Hexokinase', pathway: 'Glycolysis', eq: 'Glucose + ATP \u2192 G6P + ADP', desc: 'Traps glucose inside the cell by adding a phosphate group, committing it to metabolism.' },
    G6Pase: { name: 'Glucose-6-Phosphatase', pathway: 'Gluconeogenesis', eq: 'G6P \u2192 Glucose + P\u1d62', desc: 'Removes the phosphate from G6P, releasing free glucose back into the cell.' },
    PGI:    { name: 'Phosphoglucose Isomerase', pathway: 'Glycolysis / PPP', eq: 'G6P \u2194 F6P', desc: 'Rearranges G6P into F6P. Shared between glycolysis and the pentose phosphate pathway.' },
    PFK:    { name: 'Phosphofructokinase', pathway: 'Glycolysis', eq: 'F6P + ATP \u2192 F1,6BP + ADP', desc: 'The main control point of glycolysis \u2014 once this step fires, the cell is committed to breaking down the sugar.', regulation: 'Blocked when ATP is above 80%; slowed above 60%.' },
    FBPase: { name: 'Fructose-1,6-Bisphosphatase', pathway: 'Gluconeogenesis / Calvin', eq: 'F1,6BP \u2192 F6P + P\u1d62', desc: 'Reverses the PFK step during gluconeogenesis or the Calvin cycle by removing a phosphate.' },
    ALDO:   { name: 'Aldolase', pathway: 'Glycolysis / Calvin', eq: 'F1,6BP \u2194 2 G3P', desc: 'Splits a 6-carbon sugar into two 3-carbon G3P molecules. Works in both glycolysis and the Calvin cycle.' },
    GAPDH:  { name: 'G3P Dehydrogenase', pathway: 'Glycolysis / Calvin', eq: 'G3P + NAD\u207A \u2194 1,3-BPG + NADH', desc: 'Oxidizes G3P while capturing energy as NADH. The reverse direction in the Calvin cycle uses NADPH instead.' },
    PGK:    { name: 'Phosphoglycerate Kinase', pathway: 'Glycolysis / Calvin', eq: '1,3-BPG + ADP \u2194 3-PGA + ATP', desc: 'Transfers a phosphate directly to ADP, producing ATP without the electron transport chain.' },
    PGM:    { name: 'Phosphoglycerate Mutase', pathway: 'Glycolysis', eq: '3-PGA \u2192 2-PGA', desc: 'Moves the phosphate group from carbon 3 to carbon 2, preparing the molecule for the next step.' },
    ENO:    { name: 'Enolase', pathway: 'Glycolysis', eq: '2-PGA \u2192 PEP + H\u2082O', desc: 'Removes water from 2-PGA, creating the high-energy molecule PEP.' },
    PK:     { name: 'Pyruvate Kinase', pathway: 'Glycolysis', eq: 'PEP + ADP \u2192 Pyruvate + ATP', desc: 'The final step of glycolysis, producing ATP. In gluconeogenesis, the reverse bypass (PC + PEPCK) converts pyruvate back to PEP using ATP.' },

    // PPP / Calvin shared step
    'TKT+TAL': { name: 'Transketolase + Transaldolase', pathway: 'PPP / Calvin', eq: '6 R5P \u2194 5 F6P', desc: 'Carbon-shuffling enzymes that rearrange pentoses into hexoses (or vice versa), linking the PPP non-oxidative branch to glycolysis and the Calvin cycle.' },

    // PDH Complex
    PDH:    { name: 'Pyruvate Dehydrogenase', pathway: 'Link reaction', eq: 'Pyruvate + NAD\u207A + CoA \u2192 Acetyl-CoA + NADH + CO\u2082', desc: 'The gateway to the Krebs cycle \u2014 irreversibly converts pyruvate into acetyl-CoA, releasing CO\u2082 and capturing NADH.', regulation: 'Blocked when both NADH and acetyl-CoA are high.' },

    // Krebs Cycle
    CS:     { name: 'Citrate Synthase', pathway: 'Krebs', eq: 'Acetyl-CoA + OAA \u2192 Citrate', desc: 'Kicks off the Krebs cycle by joining acetyl-CoA (2C) with oxaloacetate (4C) to form citrate (6C).', regulation: 'Slowed when ATP is above 85%.' },
    ACO:    { name: 'Aconitase', pathway: 'Krebs', eq: 'Citrate \u2192 Isocitrate', desc: 'Rearranges citrate into its isomer isocitrate, passing through cis-aconitate along the way.' },
    IDH:    { name: 'Isocitrate Dehydrogenase', pathway: 'Krebs', eq: 'Isocitrate + NAD\u207A \u2192 \u03B1-KG + NADH + CO\u2082', desc: 'A key regulatory step that releases the first CO\u2082 of the Krebs cycle and captures energy as NADH.', regulation: 'Blocked when NADH is above 75%; slowed above 50%.' },
    KGDH:   { name: '\u03B1-Ketoglutarate Dehydrogenase', pathway: 'Krebs', eq: '\u03B1-KG + NAD\u207A + CoA \u2192 Suc-CoA + NADH + CO\u2082', desc: 'Releases the second CO\u2082 of the cycle and produces another NADH. Works by a similar mechanism to PDH.' },
    SCS:    { name: 'Succinyl-CoA Synthetase', pathway: 'Krebs', eq: 'Suc-CoA + GDP \u2192 Succinate + GTP', desc: 'The only substrate-level phosphorylation in the Krebs cycle, generating GTP (equivalent to ATP) from the energy in the thioester bond.' },
    SDH:    { name: 'Succinate Dehydrogenase', pathway: 'Krebs / ETC', eq: 'Succinate + FAD \u2192 Fumarate + FADH\u2082', desc: 'Unique among Krebs enzymes \u2014 it is embedded in the membrane and doubles as Complex II of the electron transport chain.' },
    FUM:    { name: 'Fumarase', pathway: 'Krebs', eq: 'Fumarate + H\u2082O \u2192 Malate', desc: 'Adds water across the double bond of fumarate to produce malate.' },
    MDH:    { name: 'Malate Dehydrogenase', pathway: 'Krebs', eq: 'Malate + NAD\u207A \u2192 OAA + NADH', desc: 'Completes the cycle by oxidizing malate back to oxaloacetate, producing the final NADH of each turn.' },

    // PPP
    G6PDH:  { name: 'Glucose-6-P Dehydrogenase', pathway: 'PPP', eq: 'G6P + NADP\u207A \u2192 6-PGL + NADPH', desc: 'The rate-limiting step of the pentose phosphate pathway and the cell\u2019s primary source of NADPH for biosynthesis and antioxidant defense.', regulation: 'Activated (1.5\u00D7) when NADPH is below 20%; blocked above 80%; slowed above 60%.' },
    '6PGL': { name: '6-Phosphogluconolactonase', pathway: 'PPP', eq: '6-PGL \u2192 6-PGA', desc: 'Hydrolyzes the unstable lactone ring, opening it into the linear 6-phosphogluconate.' },
    '6PGDH':{ name: '6-Phosphogluconate Dehydrogenase', pathway: 'PPP', eq: '6-PGA + NADP\u207A \u2192 R5P + NADPH + CO\u2082', desc: 'The second NADPH-producing step of the PPP. Also releases CO\u2082 and yields ribose-5-phosphate for nucleotide synthesis.' },
    TKT:    { name: 'Transketolase', pathway: 'PPP / Calvin', eq: 'R5P + Xu5P \u2194 G3P + S7P', desc: 'Transfers 2-carbon units between sugar phosphates in the non-oxidative branch of the PPP and the Calvin cycle.' },
    TAL:    { name: 'Transaldolase', pathway: 'PPP / Calvin', eq: 'S7P + G3P \u2194 F6P + E4P', desc: 'Transfers 3-carbon units between sugar phosphates, routing carbons back toward glycolysis.' },

    // Calvin Cycle
    RuBisCO:{ name: 'RuBisCO', pathway: 'Calvin', eq: 'RuBP + CO\u2082 \u2192 2\u00D7 3-PGA', desc: 'The most abundant enzyme on Earth. Fixes atmospheric CO\u2082 by attaching it to the 5-carbon sugar RuBP, yielding two molecules of 3-PGA.', regulation: 'Blocked when ATP is below 15%; slowed below 30% (activase requires ATP).' },
    PRK:    { name: 'Phosphoribulokinase', pathway: 'Calvin', eq: 'R5P + ATP \u2192 RuBP + ADP', desc: 'Uses ATP to regenerate RuBP, the CO\u2082 acceptor, keeping the Calvin cycle turning.' },

    // Fermentation
    PDC:    { name: 'Pyruvate Decarboxylase', pathway: 'Fermentation', eq: 'Pyruvate \u2192 Acetaldehyde + CO\u2082', desc: 'Removes CO\u2082 from pyruvate under anaerobic conditions, producing acetaldehyde for alcoholic fermentation.' },
    ADH:    { name: 'Alcohol Dehydrogenase', pathway: 'Fermentation', eq: 'Acetaldehyde + NADH \u2194 Ethanol + NAD\u207A', desc: 'Bidirectional: reduces acetaldehyde to ethanol during fermentation (regenerating NAD\u207A), or oxidizes ethanol back to acetaldehyde during catabolism.' },
    ALDH:   { name: 'Aldehyde Dehydrogenase', pathway: 'Ethanol catabolism', eq: 'Acetaldehyde + NAD\u207A \u2192 Acetic Acid + NADH', desc: 'Oxidizes acetaldehyde to acetic acid during ethanol breakdown, producing NADH.' },
    ACS:    { name: 'Acetyl-CoA Synthetase', pathway: 'Ethanol catabolism', eq: 'Acetic Acid + ATP + CoA \u2192 Acetyl-CoA + AMP', desc: 'Activates acetic acid to acetyl-CoA so it can enter the Krebs cycle, consuming ATP in the process.' },

    // Beta Oxidation
    ACAD:   { name: 'Acyl-CoA Dehydrogenase', pathway: 'Beta Oxidation', eq: 'Acyl-CoA + FAD \u2192 Enoyl-CoA + FADH\u2082', desc: 'The first step of each beta-oxidation round, introducing a double bond into the fatty acid chain while capturing energy as FADH\u2082.', regulation: 'Blocked when FADH\u2082 is above 80%; slowed above 60%.' },
    ECH:    { name: 'Enoyl-CoA Hydratase', pathway: 'Beta Oxidation', eq: 'Enoyl-CoA + H\u2082O \u2192 OH-Acyl-CoA', desc: 'Adds water across the double bond created by ACAD.' },
    HACD:   { name: '3-Hydroxyacyl-CoA Dehydrogenase', pathway: 'Beta Oxidation', eq: 'OH-Acyl-CoA + NAD\u207A \u2192 Keto-CoA + NADH', desc: 'Oxidizes the hydroxyl group to a ketone, producing NADH.' },
    ACAT:   { name: 'Thiolase (Acetyl-CoA Acetyltransferase)', pathway: 'Beta Oxidation', eq: 'Keto-CoA + CoA \u2192 Acyl-CoA(n\u22122) + Acetyl-CoA', desc: 'Cleaves off a 2-carbon acetyl-CoA from the chain, leaving a shortened acyl-CoA ready for another round.' },

    // ETC Complexes
    PSII:   { name: 'Photosystem II', pathway: 'Light reactions', eq: 'H\u2082O + light \u2192 \u00BDO\u2082 + 2H\u207A + 2e\u207B', desc: 'Splits water using sunlight energy, releasing oxygen and feeding electrons into the photosynthetic chain. Pumps 2 H\u207A per reaction.' },
    PSI:    { name: 'Photosystem I', pathway: 'Light reactions', eq: 'PC(red) + light \u2192 Fd(red)', desc: 'Re-energizes electrons with a second photon, boosting them to a high enough energy level to reduce NADP\u207A.' },
    Cytb6f: { name: 'Cytochrome b\u2086f', pathway: 'ETC (shared)', eq: 'PQH\u2082 \u2192 PC(red) + 4H\u207A pumped', desc: 'A proton pump shared by both photosynthetic and respiratory chains. Transfers electrons from PQ to PC while pumping 4 H\u207A across the membrane.' },
    CytOx:  { name: 'Cytochrome c Oxidase', pathway: 'Respiratory ETC', eq: '2e\u207B + \u00BDO\u2082 + 2H\u207A \u2192 H\u2082O', desc: 'The final electron acceptor in respiration. Combines electrons with oxygen and protons to produce water, pumping 2 H\u207A in the process.' },
    NDH1:   { name: 'NADH Dehydrogenase', pathway: 'Respiratory ETC', eq: 'NADH \u2192 NAD\u207A + 2e\u207B + 4H\u207A pumped', desc: 'Complex I of the respiratory chain. Oxidizes NADH, feeds electrons to PQ, and pumps 4 H\u207A across the membrane.' },
    ATPSyn: { name: 'ATP Synthase', pathway: 'Chemiosmosis', eq: '4H\u207A + ADP + P\u1d62 \u2192 ATP', desc: 'A molecular turbine that uses the proton gradient to spin and synthesize ATP from ADP. Requires 4 H\u207A per ATP.' },
    NNT:    { name: 'Nicotinamide Nucleotide Transhydrogenase', pathway: 'Membrane', eq: 'NADH + NADP\u207A + H\u207A\u2093\u2099 \u2192 NAD\u207A + NADPH', desc: 'Converts NADH into NADPH using the proton gradient. Important for supplying NADPH for biosynthesis and antioxidant defense.' },
    BR:     { name: 'Bacteriorhodopsin', pathway: 'Light-driven', eq: 'light \u2192 H\u207A pumped', desc: 'A light-driven proton pump found in archaea. Uses light energy directly (no electron transport) to build the proton gradient.' },
    UCP:    { name: 'Uncoupling Protein', pathway: 'Membrane', eq: 'H\u207A gradient \u2192 heat', desc: 'Lets protons leak back across the membrane without making ATP, dissipating the gradient as heat. Active when uncoupling is enabled.' },
    FNR:    { name: 'Ferredoxin-NADP\u207A Reductase', pathway: 'Light reactions', eq: 'Fd(red) + NADP\u207A \u2192 NADPH', desc: 'The last step of linear electron flow in photosynthesis, using energized electrons from ferredoxin to produce NADPH.' },
    PQ:     { name: 'Plastoquinone', pathway: 'ETC (shared)', eq: 'PQ + 2e\u207B + 2H\u207A \u2192 PQH\u2082', desc: 'A mobile, lipid-soluble electron carrier that shuttles electrons from PSII (or Complex I) to the Cyt b\u2086f complex.' },
    PC:     { name: 'Plastocyanin', pathway: 'ETC (shared)', eq: 'PC(ox) + e\u207B \u2192 PC(red)', desc: 'A small copper protein that shuttles electrons from Cyt b\u2086f to PSI (photosynthetic) or to Cyt c Oxidase (respiratory).' },
    Fd:     { name: 'Ferredoxin', pathway: 'Light reactions', eq: 'Fd(ox) + e\u207B \u2192 Fd(red)', desc: 'An iron-sulfur protein that carries high-energy electrons from PSI to FNR (linear flow) or back to PQ (cyclic flow).' },

    // Antioxidant enzymes
    SOD:    { name: 'Superoxide Dismutase', pathway: 'Antioxidant', eq: '2 O\u2082\u207B + 2 H\u207A \u2192 O\u2082 + H\u2082O\u2082', desc: 'First line of antioxidant defense. Converts toxic superoxide radicals into hydrogen peroxide, which is less reactive.' },
    Catalase: { name: 'Catalase', pathway: 'Antioxidant', eq: '2 H\u2082O\u2082 \u2192 2 H\u2082O + O\u2082', desc: 'Rapidly breaks down hydrogen peroxide into water and oxygen. One of the fastest enzymes known.' },
    GPx:    { name: 'Glutathione Peroxidase', pathway: 'Antioxidant', eq: 'H\u2082O\u2082 + NADPH \u2192 2 H\u2082O + NADP\u207A', desc: 'Neutralizes peroxides using NADPH (via glutathione), linking the PPP\u2019s NADPH production to antioxidant defense.' },

    // Batch cycle targets
    run_krebs:    { name: 'Krebs Cycle \u00D72', pathway: 'Krebs Cycle', eq: '2 Acetyl-CoA + 6 NAD\u207A + 2 FAD + 2 GDP \u2192 4 CO\u2082 + 6 NADH + 2 FADH\u2082 + 2 GTP', desc: 'Runs two full turns of the citric acid cycle, completely oxidizing two acetyl-CoA (from one glucose) and harvesting energy carriers.' },
    run_calvin:   { name: 'Calvin Cycle \u00D76', pathway: 'Calvin Cycle', eq: '6 CO\u2082 + 18 ATP + 12 NADPH \u2192 2 G3P', desc: 'Six turns of carbon fixation use 6 CO\u2082 plus light-generated ATP and NADPH to build two molecules of G3P.' },
    run_ppp:      { name: 'Pentose Phosphate \u00D76', pathway: 'PPP', eq: 'G6P \u2192 12 NADPH + 6 CO\u2082', desc: 'Six rounds of the oxidative PPP produce 12 NADPH for biosynthesis and antioxidant defense, releasing 6 CO\u2082.' },
    run_betaox:   { name: 'Beta Oxidation \u00D77 / FA Synthesis', pathway: 'Beta Oxidation', eq: 'Palmitoyl-CoA \u2194 8 Acetyl-CoA', desc: 'Forward: seven rounds break a C16 fatty acid into 8 acetyl-CoA, yielding 7 FADH\u2082 + 7 NADH. Reverse (FA synthesis): consumes 14 NADPH + 14 ATP to build one fatty acid from 8 acetyl-CoA.' },
    run_glyc_upper: { name: 'Glycolysis Upper / Gluconeogenesis', pathway: 'Glycolysis', eq: 'Glucose + 2 ATP \u2194 2 G3P', desc: 'Upper glycolysis: phosphorylates and splits glucose into two G3P, investing 2 ATP. Reverse: gluconeogenesis reassembles glucose from 2 G3P.' },
    run_glyc_lower: { name: 'Glycolysis Lower / Gluconeogenesis', pathway: 'Glycolysis', eq: '2 G3P + 2 NAD\u207A + 4 ADP \u2194 2 Pyruvate + 4 ATP + 2 NADH', desc: 'Lower glycolysis: oxidizes G3P to pyruvate, netting 4 ATP and 2 NADH. Reverse (via PC + PEPCK): converts pyruvate back to PEP using 2 ATP.' },
};

export const METABOLITES = {
    glucose:      { name: 'Glucose', full: 'D-Glucose (C\u2086H\u2081\u2082O\u2086)', desc: 'The primary fuel molecule of metabolism. This 6-carbon sugar is the starting point for glycolysis.' },
    g6p:          { name: 'G6P', full: 'Glucose-6-Phosphate', desc: 'Phosphorylated glucose trapped inside the cell. A branch point that can enter glycolysis, the PPP, or glycogen storage.' },
    f6p:          { name: 'F6P', full: 'Fructose-6-Phosphate', desc: 'An isomer of G6P shared by glycolysis, the PPP non-oxidative branch, and the Calvin cycle.' },
    f16bp:        { name: 'F1,6BP', full: 'Fructose-1,6-Bisphosphate', desc: 'Doubly phosphorylated sugar formed by PFK. Its presence commits the cell to completing glycolysis.' },
    g3p:          { name: 'G3P', full: 'Glyceraldehyde-3-Phosphate', desc: 'A 3-carbon sugar at the crossroads of glycolysis and the Calvin cycle. Two are made from each glucose.' },
    bpg:          { name: '1,3-BPG', full: '1,3-Bisphosphoglycerate', desc: 'A high-energy intermediate whose phosphate group is transferred directly to ADP to make ATP.' },
    pga3:         { name: '3-PGA', full: '3-Phosphoglycerate', desc: 'The first stable product of CO\u2082 fixation by RuBisCO, and an intermediate in the payoff phase of glycolysis.' },
    pga2:         { name: '2-PGA', full: '2-Phosphoglycerate', desc: 'A short-lived glycolytic intermediate between 3-PGA and PEP.' },
    pep:          { name: 'PEP', full: 'Phosphoenolpyruvate', desc: 'The highest-energy phosphorylated compound in glycolysis. Its phosphate transfer to ADP is highly favorable.' },
    pyruvate:     { name: 'Pyruvate', full: 'Pyruvic Acid (C\u2083H\u2084O\u2083)', desc: 'The end product of glycolysis. With oxygen, it enters the Krebs cycle via PDH; without, it is fermented to ethanol.' },
    acetylCoA:    { name: 'Acetyl-CoA', full: 'Acetyl Coenzyme A', desc: 'A universal 2-carbon carrier that feeds into the Krebs cycle. Produced from pyruvate (via PDH), fatty acids (via beta-oxidation), or ethanol catabolism.' },
    citrate:      { name: 'Citrate', full: 'Citric Acid (C\u2086H\u2088O\u2087)', desc: 'The first intermediate of the Krebs cycle, formed by joining acetyl-CoA (2C) with oxaloacetate (4C).' },
    isocitrate:   { name: 'Isocitrate', full: 'Isocitric Acid', desc: 'An isomer of citrate and the substrate for IDH, where the first CO\u2082 of the Krebs cycle is released.' },
    akg:          { name: '\u03B1-KG', full: '\u03B1-Ketoglutarate', desc: 'A 5-carbon Krebs cycle intermediate. Also a key link between carbon metabolism and amino acid synthesis.' },
    succoa:       { name: 'Suc-CoA', full: 'Succinyl-CoA', desc: 'A high-energy thioester bond powers the only substrate-level phosphorylation in the Krebs cycle.' },
    succinate:    { name: 'Succinate', full: 'Succinic Acid', desc: 'A 4-carbon Krebs intermediate oxidized by SDH (Complex II), directly feeding electrons into the ETC.' },
    fumarate:     { name: 'Fumarate', full: 'Fumaric Acid', desc: 'A 4-carbon intermediate with a trans double bond, produced by SDH and hydrated by fumarase.' },
    malate:       { name: 'Malate', full: 'Malic Acid', desc: 'The last intermediate before the Krebs cycle restarts. Its oxidation to OAA produces the final NADH of each turn.' },
    oaa:          { name: 'OAA', full: 'Oxaloacetate', desc: 'The 4-carbon acceptor that combines with acetyl-CoA to start each turn of the Krebs cycle.' },
    rubp:         { name: 'RuBP', full: 'Ribulose-1,5-Bisphosphate', desc: 'The 5-carbon CO\u2082 acceptor in the Calvin cycle. Regenerated from R5P by PRK using ATP.' },
    r5p:          { name: 'R5P', full: 'Ribose-5-Phosphate', desc: 'A product of the PPP used for nucleotide and coenzyme synthesis. Also a Calvin cycle intermediate.' },
    pgl6:         { name: '6-PGL', full: '6-Phosphoglucono-\u03B4-Lactone', desc: 'The first product of the PPP oxidative branch, an unstable lactone ring quickly opened by lactonase.' },
    pga6:         { name: '6-PGA', full: '6-Phosphogluconate', desc: 'An intermediate of the PPP oxidative phase, decarboxylated to yield R5P and NADPH.' },
    ethanol:      { name: 'Ethanol', full: 'Ethyl Alcohol (C\u2082H\u2086O)', desc: 'The end product of alcoholic fermentation. Can be catabolized back to acetyl-CoA via ADH, ALDH, and ACS.' },
    acetaldehyde: { name: 'Acetaldehyde', full: 'Ethanal (C\u2082H\u2084O)', desc: 'A toxic intermediate formed during both alcoholic fermentation (from pyruvate) and ethanol catabolism (from ethanol).' },
    aceticAcid:   { name: 'Acetic Acid', full: 'Acetic Acid (C\u2082H\u2084O\u2082)', desc: 'Produced from acetaldehyde by ALDH during ethanol breakdown. Activated to acetyl-CoA by ACS for Krebs cycle entry.' },
    fattyAcid:    { name: 'Fatty Acid', full: 'Palmitoyl-CoA (C\u2081\u2086)', desc: 'A 16-carbon fatty acid activated with CoA. Broken down by beta-oxidation into 8 acetyl-CoA, or built up from them via fatty acid synthesis.' },
    enoylCoA:     { name: 'Enoyl-CoA', full: 'trans-\u0394\u00B2-Enoyl-CoA', desc: 'A beta-oxidation intermediate with a trans double bond introduced by ACAD.' },
    hydroxyCoA:   { name: 'OH-CoA', full: 'L-3-Hydroxyacyl-CoA', desc: 'A beta-oxidation intermediate formed by hydrating the double bond of enoyl-CoA.' },
    ketoCoA:      { name: 'Keto-CoA', full: '3-Ketoacyl-CoA', desc: 'The final beta-oxidation intermediate before thiolase cleaves off an acetyl-CoA.' },
};
