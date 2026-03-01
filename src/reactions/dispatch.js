// ─── Reaction dispatch & advanceStep ───
import { _TWO_PI } from '../anim.js';
import { simState } from '../state.js';
import { showActiveStep, updateDashboard } from '../dashboard.js';
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
    const result = handler ? handler(stepIndex, direction) : false;

    if (result) {
        if (result.enzyme) showActiveStep(result.enzyme, result.reaction, result.yields);
        const nudge = _rotNudge[pathway];
        if (nudge) simState[nudge.rot].targetAngle += nudge.delta;
    }

    updateDashboard();
    return !!result;
}
