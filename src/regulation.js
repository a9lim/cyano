// Allosteric regulation — cofactor-ratio gates on enzyme activity.
// Models real regulatory feedback: high product inhibits, low product activates.
// Per-step and batch keys have separate cases; batch keys return the minimum
// factor across all regulated steps in the pathway.

/**
 * Returns a regulation factor (0..1.5) for a given pathway step.
 * 0   = fully inhibited (blocked)
 * <1  = partially inhibited
 * 1   = normal (no regulation)
 * >1  = activated (e.g. G6PDH under NADPH deficit)
 *
 * @param {string} pathway   Dispatch key (e.g. 'glycolysis', 'krebs', 'run_krebs')
 * @param {number} stepIndex Step index within pathway (if applicable)
 * @param {Object} store     The simulation store (cofactor pools)
 * @param {string} direction 'forward' | 'reverse' — some enzymes only regulate in one direction
 * @returns {number}
 */
export function getRegulationFactor(pathway, stepIndex, store, direction) {
    const atpRatio = store.atp / store.totalAtpAdp;
    const nadhRatio = store.nadh / store.totalNad;
    const nadphRatio = store.nadph / store.totalNadp;

    switch (pathway) {
        // ─── Glycolysis (per-step) ───
        case 'glycolysis':
            // PFK (step 2): committed step — ATP feedback inhibition prevents wasteful glucose consumption
            if (stepIndex === 2 && direction !== 'reverse') {
                if (atpRatio > 0.8) return 0;
                if (atpRatio > 0.6) return 0.5;
            }
            // PK reverse (step 9): gluconeogenesis bypass requires sufficient ATP to run backwards
            if (stepIndex === 9) {
                if (atpRatio < 0.3) return 0;
                if (atpRatio < 0.5) return 0.5;
            }
            return 1;

        // ─── Glycolysis (batch) ───
        case 'run_glycolysis_upper':
            // Upper half includes PFK (forward only)
            if (direction !== 'reverse') {
                if (atpRatio > 0.8) return 0;
                if (atpRatio > 0.6) return 0.5;
            }
            return 1;
        case 'run_glycolysis_lower':
            return 1;

        // ─── Krebs Cycle (per-step) ───
        case 'krebs':
            // Citrate synthase: high ATP signals energy sufficiency, slows cycle entry
            if (stepIndex === 0 && atpRatio > 0.85) return 0.3;
            // IDH: high NADH signals downstream bottleneck (ETC saturated)
            if (stepIndex === 2) {
                if (nadhRatio > 0.75) return 0;
                if (nadhRatio > 0.5) return 0.5;
            }
            return 1;

        // ─── Krebs Cycle (batch) — minimum factor across regulated steps ───
        case 'run_krebs': {
            let factor = 1;
            if (atpRatio > 0.85) factor = Math.min(factor, 0.3);
            if (nadhRatio > 0.75) factor = Math.min(factor, 0);
            else if (nadhRatio > 0.5) factor = Math.min(factor, 0.5);
            return factor;
        }

        // ─── PDH ───
        case 'pdh':
            // Product inhibition: high NADH + acetyl-CoA signals Krebs is backed up
            if (nadhRatio > 0.7 && store.acetylCoA > 4) return 0;
            return 1;

        // ─── PPP (per-step) ───
        case 'ppp':
            // G6PDH (step 0): rate-limiting. NADPH is both product and allosteric effector.
            // Low NADPH activates (cell needs reducing power); high NADPH inhibits.
            if (stepIndex === 0) {
                if (nadphRatio < 0.2) return 1.5;
                if (nadphRatio > 0.8) return 0;
                if (nadphRatio > 0.6) return 0.5;
            }
            return 1;

        // ─── PPP (batch) ───
        case 'run_ppp':
            if (nadphRatio < 0.2) return 1.5;
            if (nadphRatio > 0.8) return 0;
            if (nadphRatio > 0.6) return 0.5;
            return 1;

        // ─── Calvin Cycle (per-step) ───
        case 'calvin':
            // RuBisCO activase requires ATP; low ATP = inactive RuBisCO
            if (stepIndex === 0) {
                if (atpRatio < 0.15) return 0;
                if (atpRatio < 0.3) return 0.5;
            }
            return 1;

        // ─── Calvin Cycle (batch) ───
        case 'run_calvin':
            if (atpRatio < 0.15) return 0;
            if (atpRatio < 0.3) return 0.5;
            return 1;

        // ─── Beta Oxidation (per-step) ───
        case 'betaox':
            // ACAD (step 0, forward): FAD-linked — product inhibition by FADH2
            if (stepIndex === 0 && direction !== 'reverse') {
                const fadh2Ratio = store.fadh2 / store.totalFad;
                if (fadh2Ratio > 0.8) return 0;
                if (fadh2Ratio > 0.6) return 0.5;
            }
            return 1;

        // ─── Beta Oxidation (batch) ───
        case 'run_betaox': {
            if (direction === 'reverse') {
                // FA synthesis requires NADPH (reductive biosynthesis)
                if (nadphRatio < 0.2) return 0;
                if (nadphRatio < 0.4) return 0.5;
            } else {
                const fadh2Ratio = store.fadh2 / store.totalFad;
                if (fadh2Ratio > 0.8) return 0;
                if (fadh2Ratio > 0.6) return 0.5;
            }
            return 1;
        }

        default:
            return 1;
    }
}

/**
 * Human-readable reason for current inhibition. Returns null when not inhibited.
 * Used for toast messages on blocked manual clicks.
 */
export function getRegulationReason(pathway, stepIndex, store, precomputedFactor, direction) {
    const factor = precomputedFactor !== undefined ? precomputedFactor : getRegulationFactor(pathway, stepIndex, store, direction);
    if (factor >= 1) return null;

    const atpRatio = store.atp / store.totalAtpAdp;
    const nadhRatio = store.nadh / store.totalNad;
    const nadphRatio = store.nadph / store.totalNadp;

    if ((pathway === 'glycolysis' || pathway === 'run_glycolysis_upper') && atpRatio > 0.6) {
        return 'PFK inhibited by high ATP (' + Math.round(atpRatio * 100) + '%)';
    }
    if (pathway === 'krebs' || pathway === 'run_krebs') {
        // Report most restrictive inhibitor first
        if (nadhRatio > 0.75) return 'Isocitrate DH inhibited by high NADH (' + Math.round(nadhRatio * 100) + '%)';
        if (atpRatio > 0.85) return 'Citrate synthase inhibited by high ATP';
        if (nadhRatio > 0.5) return 'Isocitrate DH inhibited by high NADH (' + Math.round(nadhRatio * 100) + '%)';
    }
    if (pathway === 'pdh') {
        return 'PDH inhibited by high NADH + acetyl-CoA';
    }
    if ((pathway === 'ppp' || pathway === 'run_ppp') && nadphRatio > 0.6) {
        return 'G6PDH inhibited by high NADPH (' + Math.round(nadphRatio * 100) + '%)';
    }
    if (pathway === 'calvin' || pathway === 'run_calvin') {
        return 'RuBisCO activase limited by low ATP (' + Math.round(atpRatio * 100) + '%)';
    }
    if (pathway === 'betaox' || pathway === 'run_betaox') {
        if (direction === 'reverse') {
            return 'FA synthesis limited by low NADPH (' + Math.round(nadphRatio * 100) + '%)';
        }
        const fadh2Ratio = store.fadh2 / store.totalFad;
        return 'ACAD inhibited by high FADH₂ (' + Math.round(fadh2Ratio * 100) + '%)';
    }
    return 'Allosteric inhibition';
}
