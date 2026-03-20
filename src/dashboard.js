// Dashboard UI sync — updates sidebar stats, cofactor bars, sparklines,
// ROS/health indicators, and the active-step display.
import { store, counters, histories } from './state.js';
import { drawSparkline } from './sparkline.js';

const _PAL = window._PALETTE;

let _dom;
// Lazy-initialized canvas contexts for sparkline canvases
const _sparkCtx = {};
function _getSparkCtx(id) {
    if (!_sparkCtx[id]) {
        const c = document.getElementById(id);
        if (c) _sparkCtx[id] = c.getContext('2d');
    }
    return _sparkCtx[id];
}

export function initDashboard(dom) { _dom = dom; }

// ─── Pathway → CSS Variable Map ───
// Used to color the active-step enzyme name by its owning pathway.
const _pwColor = {
    glycolysis: '--pw-glyc', run_glycolysis_upper: '--pw-glyc', run_glycolysis_lower: '--pw-glyc',
    krebs: '--pw-krebs', run_krebs: '--pw-krebs',
    calvin: '--pw-calvin', run_calvin: '--pw-calvin',
    ppp: '--pw-ppp', run_ppp: '--pw-ppp',
    pdh: '--pw-ferment', pdc: '--pw-ferment', adh: '--pw-ferment',
    aldh: '--pw-ferment', acs: '--pw-ferment', fermentation: '--pw-ferment',
    betaox: '--pw-betaox', run_betaox: '--pw-betaox',
    ros: '--pw-ros', sod: '--pw-ros', catalase: '--pw-ros', gpx: '--pw-ros', run_ros_scavenge: '--pw-ros',
};

/** Update the active-step display with enzyme name, reaction, and yield summary. */
export function showActiveStep(enzyme, reaction, yields, pathway) {
    _dom.krebsEnzyme.textContent = enzyme;
    _dom.krebsEnzyme.style.color = pathway && _pwColor[pathway]
        ? 'var(' + _pwColor[pathway] + ')' : '';
    _dom.krebsReaction.textContent = reaction;
    _dom.krebsYield.textContent = yields
        ? Object.entries(yields).map(([k, v]) => k.includes('Consume') ? `-${v} ${k.replace('Consume', '').toUpperCase()}` : `+${v} ${k.toUpperCase()}`).join(' ')
        : '—';
}

/** Micro-animation: scale-bump a stat element when its text changes. */
function animateStatEl(el, newText) {
    if (!el) return;
    if (el.textContent !== newText) {
        el.textContent = newText;
        el.classList.add('bump');
        setTimeout(() => el.classList.remove('bump'), 150);
    }
}

function updateBar(bar, ratio, val, total) {
    const pct = Math.round((val / total) * 100) + '%';
    if (bar) { bar.style.width = pct; ratio.textContent = pct; }
}

/** Full dashboard refresh — called after every reaction and on timer ticks. */
export function updateDashboard() {
    // Cofactor ratio bars
    updateBar(_dom.atpBar, _dom.atpRatio, store.atp, store.totalAtpAdp);
    updateBar(_dom.nadhBar, _dom.nadhRatio, store.nadh, store.totalNad);
    updateBar(_dom.nadphBar, _dom.nadphRatio, store.nadph, store.totalNadp);
    updateBar(_dom.fadh2Bar, _dom.fadh2Ratio, store.fadh2, store.totalFad);

    // Proton gradient + gas exchange
    animateStatEl(_dom.protonGradient, '' + store.protonGradient);
    if (_dom.protonsLeaked) _dom.protonsLeaked.textContent = store.protonsLeaked;
    animateStatEl(_dom.co2Net, '' + (store.co2Produced - store.co2Fixed));
    animateStatEl(_dom.o2Net, (store.o2Produced - store.o2Consumed).toFixed(1));
    animateStatEl(_dom.h2oNet, '' + (store.h2oProduced - store.h2oSplit));

    // Turn/run counters
    _dom.krebsTurn.textContent = counters.krebsTurns;
    _dom.calvinTurn.textContent = counters.calvinTurns;
    _dom.glycolysisRun.textContent = counters.glycRuns;
    if (_dom.pppRun) _dom.pppRun.textContent = counters.pppRuns;
    if (_dom.betaoxRun) _dom.betaoxRun.textContent = counters.betaoxRuns;

    // ATP source breakdown (substrate-level vs oxidative phosphorylation)
    if (_dom.atpSubstrate) _dom.atpSubstrate.textContent = store.atpSubstrate;
    if (_dom.atpOxidative) _dom.atpOxidative.textContent = store.atpOxidative;
    const totalAtpProduced = store.atpSubstrate + store.atpOxidative;
    if (totalAtpProduced > 0 && _dom.atpSourceSub && _dom.atpSourceOx) {
        _dom.atpSourceSub.style.width = (store.atpSubstrate / totalAtpProduced * 100) + '%';
        _dom.atpSourceOx.style.width = (store.atpOxidative / totalAtpProduced * 100) + '%';
    }

    // ROS / oxidative stress
    const activeROS = store.rosProduced - store.rosScavenged;
    if (_dom.rosProduced) _dom.rosProduced.textContent = store.rosProduced;
    if (_dom.rosScavenged) _dom.rosScavenged.textContent = store.rosScavenged;
    if (_dom.activeROS) _dom.activeROS.textContent = activeROS;
    if (_dom.healthBar) {
        _dom.healthBar.style.width = store.cellHealth + '%';
        _dom.healthBar.style.background = store.cellHealth > 50 ? 'var(--ext-green)' : store.cellHealth > 20 ? 'var(--ext-orange)' : 'var(--ext-red)';
    }
    if (_dom.healthRatio) _dom.healthRatio.textContent = Math.round(store.cellHealth) + '%';

    // Sparklines (160x36 canvases in sidebar)
    const sparkW = 160, sparkH = 36;
    const atpCtx = _getSparkCtx('spark-atp');
    if (atpCtx) drawSparkline(atpCtx, histories.atp, sparkW, sparkH, _PAL.atp);
    const nadhCtx = _getSparkCtx('spark-nadh');
    if (nadhCtx) drawSparkline(nadhCtx, histories.nadh, sparkW, sparkH, _PAL.nadh);
    const nadphCtx = _getSparkCtx('spark-nadph');
    if (nadphCtx) drawSparkline(nadphCtx, histories.nadph, sparkW, sparkH, _PAL.nadph);
    const fadh2Ctx = _getSparkCtx('spark-fadh2');
    if (fadh2Ctx) drawSparkline(fadh2Ctx, histories.fadh2, sparkW, sparkH, _PAL.fadh2);
    const gradCtx = _getSparkCtx('spark-gradient');
    if (gradCtx) drawSparkline(gradCtx, histories.gradient, sparkW, sparkH, _PAL.extended.red);
}
