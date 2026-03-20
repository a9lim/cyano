// Reaction dispatch — routes pathway/step keys to handler functions and
// enforces allosteric regulation before any substrate mutation.
import { _TWO_PI } from '../anim.js';
import { simState, store } from '../state.js';
import { showActiveStep, updateDashboard, markDashboardDirty } from '../dashboard.js';
import { getRegulationFactor, getRegulationReason } from '../regulation.js';
import { advanceGlycolysis, runGlycolysisUpper, runGlycolysisLower, runGlycolysisLowerReverse, runGlycolysisUpperReverse } from './glycolysis.js';
import { advanceKrebs, runKrebsCycle } from './krebs.js';
import { advanceCalvin, runCalvinCycle } from './calvin.js';
import { advancePPP, runPPPCycle } from './ppp.js';
import { advanceETC, advanceATPSynthase, advanceBacteriorhodopsin, advanceNNT } from './etc.js';
import { advancePDH, advancePDC, advanceADH, advanceALDH, advanceFermentation, advanceACS } from './fermentation.js';
import { advanceBetaOx, runBetaOxCycle, runBetaOxReverse } from './betaoxidation.js';
import { advanceSOD, advanceCatalase, advanceGPx, runROSScavenging } from './ros.js';

// ─── Handler Map ───
// Maps dispatch keys to (stepIndex, direction) => result handlers.
// Per-step keys receive both args; batch "run_*" keys typically ignore stepIndex.
const _dispatch = {
    glycolysis:             (i, d) => advanceGlycolysis(i, d),
    calvin:                 (i, d) => advanceCalvin(i, d),
    ppp:                    (i, d) => advancePPP(i, d),
    krebs:                  (i, d) => advanceKrebs(i, d),
    pdh:                    ()     => advancePDH(),
    pdc:                    ()     => advancePDC(),
    adh:                    (_i, d) => advanceADH(d),
    aldh:                   ()     => advanceALDH(),
    acs:                    ()     => advanceACS(),
    fermentation:           ()     => advanceFermentation(),
    etc_resp:               (i)    => advanceETC('etc_resp', i),
    etc_photo:              (i)    => advanceETC('etc_photo', i),
    etc_cyclic:             (i)    => advanceETC('etc_cyclic', i),
    run_krebs:              ()     => runKrebsCycle(),
    run_calvin:             ()     => runCalvinCycle(),
    run_ppp:                ()     => runPPPCycle(),
    run_glycolysis_upper:   (_i, d) => d === 'reverse' ? runGlycolysisUpperReverse() : runGlycolysisUpper(),
    run_glycolysis_lower:   (_i, d) => d === 'reverse' ? runGlycolysisLowerReverse() : runGlycolysisLower(),
    atp_syn:                ()     => advanceATPSynthase(),
    br:                     ()     => advanceBacteriorhodopsin(),
    nnt:                    ()     => advanceNNT(),
    betaox:                 (i, d) => advanceBetaOx(i, d),
    run_betaox:             (_i, d) => d === 'reverse' ? runBetaOxReverse() : runBetaOxCycle(),
    sod:                    ()     => advanceSOD(),
    catalase:               ()     => advanceCatalase(),
    gpx:                    ()     => advanceGPx(),
    run_ros_scavenge:       ()     => runROSScavenging(),
};

const _rosColor = '--pw-ros';

// ─── Reverse-Direction Color Map ───
// Shared glycolysis enzymes that serve a different pathway in reverse.
// Renderer uses this to color the active-step label by the alternate pathway.
const _reverseColorPathway = {
    'glycolysis:1':  'ppp',     // PGI reverse: F6P→G6P feeds PPP
    'glycolysis:2':  'calvin',  // FBPase: gluconeogenesis/Calvin
    'glycolysis:3':  'calvin',  // Aldolase reverse: Calvin direction
    'glycolysis:5':  'calvin',  // GAPDH reverse: uses NADPH (Calvin)
    'glycolysis:6':  'calvin',  // PGK reverse: Calvin direction
    'glycolysis:10': 'calvin',  // TK+SBPase: feeds Calvin
};

// ─── Cycle Rotation Nudges ───
// Each entry maps a dispatch key to the simState rotation accumulator
// and the angular delta to apply on successful reaction.
// Full-cycle "run_*" keys nudge a full turn; per-step keys nudge ~23 degrees.
const _rotNudge = {
    run_krebs:  { rot: 'krebsRot',  delta: -_TWO_PI },
    krebs:      { rot: 'krebsRot',  delta: -0.4 },
    run_calvin: { rot: 'calvinRot', delta:  _TWO_PI },
    calvin:     { rot: 'calvinRot', delta:  0.4 },
    run_ppp:    { rot: 'pppRot',    delta:  _TWO_PI },
    ppp:        { rot: 'pppRot',    delta:  0.4 },
    run_betaox: { rot: 'betaoxRot', delta:  _TWO_PI },
    betaox:     { rot: 'betaoxRot', delta:  0.4 },
};

/**
 * Central reaction dispatcher. Checks allosteric regulation, then delegates
 * to the appropriate handler. Returns true if the reaction fired.
 */
export function advanceStep(pathway, stepIndex, direction) {
    const handler = _dispatch[pathway];
    if (!handler) { markDashboardDirty(); return false; }

    // Allosteric gate — blocks fully inhibited reactions
    const regFactor = getRegulationFactor(pathway, stepIndex, store, direction);
    if (regFactor <= 0) {
        // Toast only on manual clicks, not autoplay (avoids notification spam)
        if (!simState.autoPlay) {
            const reason = getRegulationReason(pathway, stepIndex, store, regFactor);
            if (reason && typeof showToast === 'function') showToast(reason);
        }
        markDashboardDirty();
        return false;
    }

    // Partial inhibition in autoplay: probabilistic gate (e.g. 0.5 factor
    // means ~50% chance of proceeding, modeling reduced enzyme activity)
    if (regFactor < 1 && simState.autoPlay && Math.random() > regFactor) {
        markDashboardDirty();
        return false;
    }

    const result = handler(stepIndex, direction);

    if (result) {
        // Determine pathway color — reverse direction may belong to a different pathway
        let colorPw = pathway;
        if (direction === 'reverse' && stepIndex != null) {
            colorPw = _reverseColorPathway[pathway + ':' + stepIndex] || pathway;
        }
        if (result.enzyme) showActiveStep(result.enzyme, result.reaction, result.yields, colorPw);
        const nudge = _rotNudge[pathway];
        if (nudge) simState[nudge.rot].targetAngle += direction === 'reverse' ? -nudge.delta : nudge.delta;
    }

    markDashboardDirty();
    return !!result;
}

/**
 * Dry-run check: can this reaction fire (substrates available + regulation)?
 * Used by renderer to dim unavailable enzymes.
 */
export function canReact(pathway, stepIndex) {
    const regFactor = getRegulationFactor(pathway, stepIndex, store);
    return regFactor > 0;
}
