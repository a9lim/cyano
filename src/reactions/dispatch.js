// ─── Reaction dispatch & advanceStep ───
import { _TWO_PI } from '../anim.js';
import { simState, store } from '../state.js';
import { showActiveStep, updateDashboard } from '../dashboard.js';
import { getRegulationFactor, getRegulationReason } from '../regulation.js';
import { advanceGlycolysis, runGlycolysisUpper, runGlycolysisLower } from './glycolysis.js';
import { advanceKrebs, runKrebsCycle } from './krebs.js';
import { advanceCalvin, runCalvinCycle } from './calvin.js';
import { advancePPP, runPPPCycle } from './ppp.js';
import { advanceETC, advanceATPSynthase, advanceBacteriorhodopsin, advanceNNT } from './etc.js';
import { advancePDH, advancePDC, advanceADH, advanceALDH, advanceFermentation, advanceACS } from './fermentation.js';

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
    run_glycolysis_upper:   ()     => runGlycolysisUpper(),
    run_glycolysis_lower:   ()     => runGlycolysisLower(),
    atp_syn:                ()     => advanceATPSynthase(),
    br:                     ()     => advanceBacteriorhodopsin(),
    nnt:                    ()     => advanceNNT(),
};

const _rotNudge = {
    run_krebs:  { rot: 'krebsRot',  delta: -_TWO_PI },
    krebs:      { rot: 'krebsRot',  delta: -0.4 },
    run_calvin: { rot: 'calvinRot', delta:  _TWO_PI },
    calvin:     { rot: 'calvinRot', delta:  0.4 },
    run_ppp:    { rot: 'pppRot',    delta:  _TWO_PI },
    ppp:        { rot: 'pppRot',    delta:  0.4 },
};

export function advanceStep(pathway, stepIndex, direction) {
    const handler = _dispatch[pathway];
    if (!handler) { updateDashboard(); return false; }

    // Check allosteric regulation
    const regFactor = getRegulationFactor(pathway, stepIndex, store);
    if (regFactor <= 0) {
        // Fully inhibited — show toast on manual clicks only (not autoplay)
        if (!simState.autoPlay) {
            const reason = getRegulationReason(pathway, stepIndex, store);
            if (reason && typeof showToast === 'function') showToast(reason);
        }
        updateDashboard();
        return false;
    }

    // Partial inhibition in autoplay: probabilistic gate
    if (regFactor < 1 && simState.autoPlay && Math.random() > regFactor) {
        updateDashboard();
        return false;
    }

    const result = handler(stepIndex, direction);

    if (result) {
        if (result.enzyme) showActiveStep(result.enzyme, result.reaction, result.yields);
        const nudge = _rotNudge[pathway];
        if (nudge) simState[nudge.rot].targetAngle += nudge.delta;
    }

    updateDashboard();
    return !!result;
}

/**
 * Dry-run check: can this reaction fire (substrates available + regulation)?
 */
export function canReact(pathway, stepIndex) {
    const regFactor = getRegulationFactor(pathway, stepIndex, store);
    return regFactor > 0;
}
