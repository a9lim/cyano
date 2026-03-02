// ─── Allosteric Regulation ───

/**
 * Returns a regulation factor (0..1.5) for a given pathway step.
 * 0   = fully inhibited (blocked)
 * <1  = partially inhibited
 * 1   = normal (no regulation)
 * >1  = activated
 *
 * @param {string} pathway   Dispatch key (e.g. 'glycolysis', 'krebs', 'run_krebs')
 * @param {number} stepIndex Step index within pathway (if applicable)
 * @param {Object} store     The simulation store
 * @returns {number}
 */
export function getRegulationFactor(pathway, stepIndex, store) {
    const atpRatio = store.atp / store.totalAtpAdp;
    const nadhRatio = store.nadh / store.totalNad;
    const nadphRatio = store.nadph / store.totalNadp;

    switch (pathway) {
        // ─── Glycolysis ───
        case 'glycolysis':
        case 'run_glycolysis_upper':
        case 'run_glycolysis_lower':
            // PFK (step 3 in glycolysis) inhibited by high ATP
            if (stepIndex === 2 || pathway.startsWith('run_glycolysis')) {
                if (atpRatio > 0.8) return 0;
                if (atpRatio > 0.6) return 0.5;
            }
            return 1;

        // ─── Krebs Cycle ───
        case 'krebs':
        case 'run_krebs':
            // Citrate synthase (step 0) inhibited by high ATP
            if (stepIndex === 0 || pathway === 'run_krebs') {
                if (atpRatio > 0.85) return 0.3;
            }
            // Isocitrate DH (step 2) inhibited by high NADH
            if (stepIndex === 2 || pathway === 'run_krebs') {
                if (nadhRatio > 0.75) return 0;
                if (nadhRatio > 0.5) return 0.5;
            }
            return 1;

        // ─── PDH ───
        case 'pdh':
            if (nadhRatio > 0.7 && store.acetylCoA > 4) return 0;
            return 1;

        // ─── PPP ───
        case 'ppp':
        case 'run_ppp':
            // G6PDH (step 0) activated when NADPH is low
            if (stepIndex === 0 || pathway === 'run_ppp') {
                if (nadphRatio < 0.2) return 1.5;
            }
            return 1;

        default:
            return 1;
    }
}

/**
 * Human-readable reason for inhibition/activation.
 */
export function getRegulationReason(pathway, stepIndex, store) {
    const factor = getRegulationFactor(pathway, stepIndex, store);
    if (factor >= 1) return null;

    const atpRatio = store.atp / store.totalAtpAdp;
    const nadhRatio = store.nadh / store.totalNad;

    if ((pathway === 'glycolysis' || pathway.startsWith('run_glycolysis')) && atpRatio > 0.6) {
        return 'PFK inhibited by high ATP (' + Math.round(atpRatio * 100) + '%)';
    }
    if ((pathway === 'krebs' || pathway === 'run_krebs') && atpRatio > 0.85) {
        return 'Citrate synthase inhibited by high ATP';
    }
    if ((pathway === 'krebs' || pathway === 'run_krebs') && nadhRatio > 0.5) {
        return 'Isocitrate DH inhibited by high NADH (' + Math.round(nadhRatio * 100) + '%)';
    }
    if (pathway === 'pdh') {
        return 'PDH inhibited by high NADH + acetyl-CoA';
    }
    return 'Allosteric inhibition';
}
