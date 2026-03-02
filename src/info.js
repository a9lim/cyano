// ─── Enzyme & Metabolite Info Data ───
// Used by info tips and hover popups.

export const ENZYMES = {
    // Glycolysis
    HK:     { name: 'Hexokinase', pathway: 'Glycolysis', eq: 'Glucose + ATP \u2192 G6P + ADP', desc: 'Phosphorylates glucose to trap it inside the cell.' },
    G6Pase: { name: 'Glucose-6-Phosphatase', pathway: 'Gluconeogenesis', eq: 'G6P \u2192 Glucose + Pi', desc: 'Removes phosphate from G6P to release free glucose.' },
    PGI:    { name: 'Phosphoglucose Isomerase', pathway: 'Glycolysis / PPP', eq: 'G6P \u2194 F6P', desc: 'Isomerizes G6P to F6P. Shared by glycolysis and PPP.' },
    PFK:    { name: 'Phosphofructokinase', pathway: 'Glycolysis', eq: 'F6P + ATP \u2192 F1,6BP + ADP', desc: 'Major regulatory enzyme. Inhibited by high ATP.', regulation: 'Inhibited by ATP; activated by AMP, ADP.' },
    FBPase: { name: 'Fructose-1,6-Bisphosphatase', pathway: 'Gluconeogenesis / Calvin', eq: 'F1,6BP \u2192 F6P + Pi', desc: 'Bypass enzyme in gluconeogenesis; also used by the Calvin cycle.' },
    ALDO:   { name: 'Aldolase', pathway: 'Glycolysis / Calvin', eq: 'F1,6BP \u2194 G3P + DHAP', desc: 'Splits 6-carbon sugar into two 3-carbon units.' },
    GAPDH:  { name: 'G3P Dehydrogenase', pathway: 'Glycolysis / Calvin', eq: 'G3P + NAD\u207A \u2194 1,3-BPG + NADH', desc: 'Oxidizes G3P and couples it to phosphorylation.' },
    PGK:    { name: 'Phosphoglycerate Kinase', pathway: 'Glycolysis / Calvin', eq: '1,3-BPG + ADP \u2194 3-PGA + ATP', desc: 'Substrate-level phosphorylation producing ATP.' },
    PGM:    { name: 'Phosphoglycerate Mutase', pathway: 'Glycolysis', eq: '3-PGA \u2192 2-PGA', desc: 'Shifts the phosphate group from C3 to C2.' },
    ENO:    { name: 'Enolase', pathway: 'Glycolysis', eq: '2-PGA \u2192 PEP + H\u2082O', desc: 'Dehydrates 2-PGA to form PEP.' },
    PK:     { name: 'Pyruvate Kinase', pathway: 'Glycolysis', eq: 'PEP + ADP \u2194 Pyruvate + ATP', desc: 'Final step of glycolysis. Substrate-level phosphorylation. Reverse direction (gluconeogenesis bypass) converts pyruvate back to PEP.' },

    // PDH Complex
    PDH:    { name: 'Pyruvate Dehydrogenase', pathway: 'Link reaction', eq: 'Pyruvate + NAD\u207A + CoA \u2192 Acetyl-CoA + NADH + CO\u2082', desc: 'Irreversible oxidative decarboxylation linking glycolysis to Krebs.', regulation: 'Inhibited by NADH and acetyl-CoA.' },

    // Krebs Cycle
    CS:     { name: 'Citrate Synthase', pathway: 'Krebs', eq: 'Acetyl-CoA + OAA \u2192 Citrate', desc: 'Condenses acetyl-CoA with OAA to form citrate.', regulation: 'Inhibited by high ATP and citrate.' },
    ACO:    { name: 'Aconitase', pathway: 'Krebs', eq: 'Citrate \u2192 Isocitrate', desc: 'Isomerizes citrate to isocitrate via cis-aconitate.' },
    IDH:    { name: 'Isocitrate Dehydrogenase', pathway: 'Krebs', eq: 'Isocitrate + NAD\u207A \u2192 \u03B1-KG + NADH + CO\u2082', desc: 'Oxidative decarboxylation producing NADH.', regulation: 'Inhibited by NADH; activated by ADP.' },
    KGDH:   { name: '\u03B1-Ketoglutarate Dehydrogenase', pathway: 'Krebs', eq: '\u03B1-KG + NAD\u207A + CoA \u2192 Suc-CoA + NADH + CO\u2082', desc: 'Similar mechanism to PDH. Produces succinyl-CoA.' },
    SCS:    { name: 'Succinyl-CoA Synthetase', pathway: 'Krebs', eq: 'Suc-CoA + GDP \u2192 Succinate + GTP', desc: 'Substrate-level phosphorylation (GTP \u2248 ATP).' },
    SDH:    { name: 'Succinate Dehydrogenase', pathway: 'Krebs / ETC', eq: 'Succinate + FAD \u2192 Fumarate + FADH\u2082', desc: 'Only membrane-bound Krebs enzyme. Also Complex II of the ETC.' },
    FUM:    { name: 'Fumarase', pathway: 'Krebs', eq: 'Fumarate + H\u2082O \u2192 Malate', desc: 'Hydrates fumarate to malate.' },
    MDH:    { name: 'Malate Dehydrogenase', pathway: 'Krebs', eq: 'Malate + NAD\u207A \u2192 OAA + NADH', desc: 'Regenerates OAA to restart the cycle.' },

    // PPP
    G6PDH:  { name: 'Glucose-6-P Dehydrogenase', pathway: 'PPP', eq: 'G6P + NADP\u207A \u2192 6-PGL + NADPH', desc: 'Rate-limiting step of PPP. Major NADPH source.', regulation: 'Activated when NADPH is low; inhibited when NADPH is high.' },
    '6PGL': { name: '6-Phosphogluconolactonase', pathway: 'PPP', eq: '6-PGL \u2192 6-PGA', desc: 'Hydrolyzes the lactone to 6-phosphogluconate.' },
    '6PGDH':{ name: '6-Phosphogluconate Dehydrogenase', pathway: 'PPP', eq: '6-PGA + NADP\u207A \u2192 R5P + NADPH + CO\u2082', desc: 'Oxidative decarboxylation producing NADPH and R5P.' },
    TKT:    { name: 'Transketolase', pathway: 'PPP / Calvin', eq: 'R5P + Xu5P \u2194 G3P + S7P', desc: 'Transfers 2-carbon units between sugar phosphates.' },
    TAL:    { name: 'Transaldolase', pathway: 'PPP / Calvin', eq: 'S7P + G3P \u2194 F6P + E4P', desc: 'Transfers 3-carbon units. Links PPP back to glycolysis.' },

    // Calvin Cycle
    RuBisCO:{ name: 'RuBisCO', pathway: 'Calvin', eq: 'RuBP + CO\u2082 \u2192 2\u00D7 3-PGA', desc: 'The most abundant enzyme on Earth. Fixes atmospheric CO\u2082.', regulation: 'Activase requires ATP; less active when ATP is scarce.' },
    PRK:    { name: 'Phosphoribulokinase', pathway: 'Calvin', eq: 'R5P + ATP \u2192 RuBP + ADP', desc: 'Regenerates RuBP to continue CO\u2082 fixation.' },

    // Fermentation
    PDC:    { name: 'Pyruvate Decarboxylase', pathway: 'Fermentation', eq: 'Pyruvate \u2192 Acetaldehyde + CO\u2082', desc: 'Decarboxylates pyruvate in alcoholic fermentation.' },
    ADH:    { name: 'Alcohol Dehydrogenase', pathway: 'Fermentation', eq: 'Acetaldehyde + NADH \u2194 Ethanol + NAD\u207A', desc: 'Bidirectional. Reduces acetaldehyde in fermentation; oxidizes ethanol in catabolism.' },
    ALDH:   { name: 'Aldehyde Dehydrogenase', pathway: 'Ethanol catabolism', eq: 'Acetaldehyde + NAD\u207A \u2192 Acetic Acid + NADH', desc: 'Oxidizes acetaldehyde to acetic acid.' },
    ACS:    { name: 'Acetyl-CoA Synthetase', pathway: 'Ethanol catabolism', eq: 'Acetic Acid + ATP + CoA \u2192 Acetyl-CoA + AMP', desc: 'Activates acetate to acetyl-CoA for Krebs cycle entry.' },

    // Beta Oxidation
    ACAD:   { name: 'Acyl-CoA Dehydrogenase', pathway: 'Beta Oxidation', eq: 'Acyl-CoA + FAD \u2192 Enoyl-CoA + FADH\u2082', desc: 'First step of beta oxidation. Oxidizes acyl-CoA using FAD.', regulation: 'Inhibited by high FADH\u2082.' },
    ECH:    { name: 'Enoyl-CoA Hydratase', pathway: 'Beta Oxidation', eq: 'Enoyl-CoA + H\u2082O \u2192 OH-Acyl-CoA', desc: 'Hydrates the double bond of enoyl-CoA.' },
    HACD:   { name: '3-Hydroxyacyl-CoA Dehydrogenase', pathway: 'Beta Oxidation', eq: 'OH-Acyl-CoA + NAD\u207A \u2192 Keto-CoA + NADH', desc: 'Oxidizes the hydroxyl group using NAD\u207A.' },
    ACAT:   { name: 'Thiolase (Acetyl-CoA Acetyltransferase)', pathway: 'Beta Oxidation', eq: 'Keto-CoA + CoA \u2192 Acyl-CoA(n\u22122) + Acetyl-CoA', desc: 'Cleaves the 3-ketoacyl-CoA, releasing acetyl-CoA and a shortened acyl-CoA.' },

    // ETC Complexes
    PSII:   { name: 'Photosystem II', pathway: 'Light reactions', eq: 'H\u2082O + light \u2192 O\u2082 + 4H\u207A + 4e\u207B', desc: 'Splits water using light energy. Initial electron donor in Z-scheme.' },
    PSI:    { name: 'Photosystem I', pathway: 'Light reactions', eq: 'PC(red) + light \u2192 Fd(red)', desc: 'Re-energizes electrons for NADP\u207A reduction.' },
    Cytb6f: { name: 'Cytochrome b6f', pathway: 'ETC (shared)', eq: 'PQH\u2082 \u2192 PC + 2H\u207A pumped', desc: 'Proton pump connecting PSII to PSI or Complex I to Cyt c oxidase.' },
    CytOx:  { name: 'Cytochrome c Oxidase', pathway: 'Respiratory ETC', eq: '4e\u207B + O\u2082 + 4H\u207A \u2192 2H\u2082O', desc: 'Terminal electron acceptor. Reduces O\u2082 to water.' },
    NDH1:   { name: 'NADH Dehydrogenase', pathway: 'Respiratory ETC', eq: 'NADH \u2192 NAD\u207A + 2e\u207B + 4H\u207A pumped', desc: 'Complex I. Oxidizes NADH and pumps protons.' },
    ATPSyn: { name: 'ATP Synthase', pathway: 'Chemiosmosis', eq: '4H\u207A + ADP + Pi \u2192 ATP', desc: 'Molecular turbine driven by the proton gradient.' },
    NNT:    { name: 'Nicotinamide Nucleotide Transhydrogenase', pathway: 'Membrane', eq: 'NADH + NADP\u207A + H\u207A \u2192 NAD\u207A + NADPH', desc: 'Converts NADH to NADPH using the proton gradient.' },
    BR:     { name: 'Bacteriorhodopsin', pathway: 'Light-driven', eq: 'light \u2192 H\u207A pumped', desc: 'Light-driven proton pump found in archaea.' },
    FNR:    { name: 'Ferredoxin-NADP\u207A Reductase', pathway: 'Light reactions', eq: 'Fd(red) + NADP\u207A \u2192 NADPH', desc: 'Final step of linear electron flow. Produces NADPH.' },
    PQ:     { name: 'Plastoquinone', pathway: 'ETC (shared)', eq: 'PQ + 2e\u207B + 2H\u207A \u2192 PQH\u2082', desc: 'Mobile lipid-soluble electron carrier in the membrane. Shuttles electrons to Cyt b6f.' },
    PC:     { name: 'Plastocyanin', pathway: 'ETC (shared)', eq: 'PC(ox) + e\u207B \u2192 PC(red)', desc: 'Small copper protein. Shuttles electrons from Cyt b6f to PSI or Cyt c oxidase.' },
    Fd:     { name: 'Ferredoxin', pathway: 'Light reactions', eq: 'Fd(ox) + e\u207B \u2192 Fd(red)', desc: 'Iron-sulfur protein. Carries electrons from PSI to FNR or back to PQ in cyclic flow.' },

    // Batch cycle targets
    run_krebs:    { name: 'Krebs Cycle \u00D72', pathway: 'Krebs Cycle', eq: '2 Acetyl-CoA \u2192 4 CO\u2082 + 6 NADH + 2 FADH\u2082 + 2 ATP', desc: 'Runs two full turns of the citric acid cycle, fully oxidizing two acetyl-CoA from one glucose.' },
    run_calvin:   { name: 'Calvin Cycle \u00D76', pathway: 'Calvin Cycle', eq: '6 CO\u2082 + 18 ATP + 12 NADPH \u2192 2 G3P', desc: 'Six turns fix 6 CO\u2082 into two G3P using light-generated ATP and NADPH.' },
    run_ppp:      { name: 'Pentose Phosphate \u00D76', pathway: 'PPP', eq: 'G6P \u2192 12 NADPH + 6 CO\u2082', desc: 'Oxidative branch produces NADPH for biosynthesis; non-oxidative branch recycles carbon skeletons.' },
    run_betaox:   { name: 'Beta Oxidation \u00D77 / FA Synthesis', pathway: 'Beta Oxidation', eq: 'Palmitoyl-CoA \u2194 8 Acetyl-CoA', desc: 'Forward: seven rounds of \u03B2-oxidation break down a C16 fatty acid into 8 acetyl-CoA, producing 7 FADH\u2082 + 7 NADH. Reverse: fatty acid synthesis consumes 14 NADPH + 14 ATP.' },
    run_glyc_upper: { name: 'Glycolysis Upper / Gluconeogenesis', pathway: 'Glycolysis', eq: 'Glucose + 2 ATP \u2194 2 G3P', desc: 'Upper glycolysis: glucose is phosphorylated and split into two G3P. Reverse: gluconeogenesis reassembles glucose from G3P.' },
    run_glyc_lower: { name: 'Glycolysis Lower / Gluconeogenesis', pathway: 'Glycolysis', eq: '2 G3P + 4 ADP + 2 NAD\u207A \u2194 2 Pyruvate + 4 ATP + 2 NADH', desc: 'Lower glycolysis: G3P is oxidized to pyruvate with net ATP and NADH production. Reverse via PC+PEPCK: pyruvate returns to PEP.' },
};

export const METABOLITES = {
    glucose:      { name: 'Glucose', full: 'D-Glucose (C\u2086H\u2081\u2082O\u2086)', desc: 'Primary fuel molecule. 6-carbon sugar.' },
    g6p:          { name: 'G6P', full: 'Glucose-6-Phosphate', desc: 'Phosphorylated glucose. Branch point for glycolysis, PPP, and glycogen synthesis.' },
    f6p:          { name: 'F6P', full: 'Fructose-6-Phosphate', desc: 'Isomer of G6P. Shared intermediate of glycolysis, PPP, and Calvin cycle.' },
    f16bp:        { name: 'F1,6BP', full: 'Fructose-1,6-Bisphosphate', desc: 'Committed glycolytic intermediate after PFK.' },
    g3p:          { name: 'G3P', full: 'Glyceraldehyde-3-Phosphate', desc: '3-carbon sugar. Central intermediate shared by glycolysis and Calvin cycle.' },
    bpg:          { name: '1,3-BPG', full: '1,3-Bisphosphoglycerate', desc: 'High-energy intermediate for substrate-level phosphorylation.' },
    pga3:         { name: '3-PGA', full: '3-Phosphoglycerate', desc: 'First stable product of CO\u2082 fixation by RuBisCO.' },
    pga2:         { name: '2-PGA', full: '2-Phosphoglycerate', desc: 'Glycolytic intermediate between 3-PGA and PEP.' },
    pep:          { name: 'PEP', full: 'Phosphoenolpyruvate', desc: 'Highest-energy phosphorylated intermediate in glycolysis.' },
    pyruvate:     { name: 'Pyruvate', full: 'Pyruvic Acid (C\u2083H\u2084O\u2083)', desc: 'End product of glycolysis. Feeds into Krebs (aerobic) or fermentation (anaerobic).' },
    acetylCoA:    { name: 'Acetyl-CoA', full: 'Acetyl Coenzyme A', desc: '2-carbon unit carrier. Enters the Krebs cycle.' },
    citrate:      { name: 'Citrate', full: 'Citric Acid (C\u2086H\u2088O\u2087)', desc: 'First Krebs cycle intermediate. 6-carbon tricarboxylic acid.' },
    isocitrate:   { name: 'Isocitrate', full: 'Isocitric Acid', desc: 'Isomer of citrate, substrate for IDH.' },
    akg:          { name: '\u03B1-KG', full: '\u03B1-Ketoglutarate', desc: '5-carbon Krebs intermediate. Also links to amino acid metabolism.' },
    succoa:       { name: 'Suc-CoA', full: 'Succinyl-CoA', desc: 'High-energy thioester. Substrate for GTP synthesis.' },
    succinate:    { name: 'Succinate', full: 'Succinic Acid', desc: '4-carbon intermediate. Oxidized by SDH (Complex II).' },
    fumarate:     { name: 'Fumarate', full: 'Fumaric Acid', desc: 'Trans double-bond intermediate. Hydrated by fumarase.' },
    malate:       { name: 'Malate', full: 'Malic Acid', desc: '4-carbon intermediate oxidized to regenerate OAA.' },
    oaa:          { name: 'OAA', full: 'Oxaloacetate', desc: 'Krebs cycle acceptor. Condenses with acetyl-CoA to form citrate.' },
    rubp:         { name: 'RuBP', full: 'Ribulose-1,5-Bisphosphate', desc: 'CO\u2082 acceptor in the Calvin cycle. Regenerated by PRK.' },
    r5p:          { name: 'R5P', full: 'Ribose-5-Phosphate', desc: 'PPP product used for nucleotide synthesis. Also Calvin cycle intermediate.' },
    pgl6:         { name: '6-PGL', full: '6-Phosphoglucono-\u03B4-Lactone', desc: 'First PPP intermediate. Hydrolyzed to 6-PGA.' },
    pga6:         { name: '6-PGA', full: '6-Phosphogluconate', desc: 'PPP oxidative phase intermediate.' },
    ethanol:      { name: 'Ethanol', full: 'Ethyl Alcohol (C\u2082H\u2086O)', desc: 'Fermentation end product. Can be catabolized back to acetyl-CoA.' },
    acetaldehyde: { name: 'Acetaldehyde', full: 'Ethanal (C\u2082H\u2084O)', desc: 'Intermediate in alcoholic fermentation and ethanol catabolism.' },
    aceticAcid:   { name: 'Acetic Acid', full: 'Acetic Acid (C\u2082H\u2084O\u2082)', desc: 'Oxidized form of acetaldehyde. Activated to acetyl-CoA by ACS.' },
    fattyAcid:    { name: 'Fatty Acid', full: 'Palmitoyl-CoA (C\u2081\u2086)', desc: 'Long-chain fatty acid activated with CoA. Entry point for beta oxidation.' },
    enoylCoA:     { name: 'Enoyl-CoA', full: 'trans-\u0394\u00B2-Enoyl-CoA', desc: 'Beta oxidation intermediate with a trans double bond.' },
    hydroxyCoA:   { name: 'OH-CoA', full: 'L-3-Hydroxyacyl-CoA', desc: 'Hydrated beta oxidation intermediate.' },
    ketoCoA:      { name: 'Keto-CoA', full: '3-Ketoacyl-CoA', desc: 'Beta oxidation intermediate ready for thiolytic cleavage.' },
};
