// Dashboard UI sync — updates sidebar stats, cofactor bars, sparklines,
// ROS/health indicators, and the active-step display.
import { store, counters, histories } from './state.js';


// Sparkline colors per theme; the gradient is the proton's, so the accent.
const _sparkColors = (T) => ({
    atp: T.atp, nadh: T.nadh, nadph: T.nadph, fadh2: T.fadh2, gradient: T.accent,
});

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

// ─── RAF-debounced dashboard update ───
// Coalesces multiple updateDashboard() calls within the same frame into one.
let _dashboardDirty = false;

export function markDashboardDirty() {
    if (_dashboardDirty) return;
    _dashboardDirty = true;
    requestAnimationFrame(() => {
        _dashboardDirty = false;
        updateDashboard();
    });
}

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

// Display names for the yield keys reactions return (acronyms stay upper-case, the rest is prose).
const _YIELD_NAME = { atp: 'ATP', nadh: 'NADH', nadph: 'NADPH', fadh2: 'FADH₂', co2Fixed: 'CO₂ fixed' };
const _yieldName = (k) => _YIELD_NAME[k] || k;

/** Update the active-step display with enzyme name, reaction, and yield summary. */
export function showActiveStep(enzyme, reaction, yields, pathway) {
    _dom.krebsEnzyme.textContent = enzyme;
    _dom.krebsEnzyme.style.color = pathway && _pwColor[pathway]
        ? 'var(' + _pwColor[pathway] + ')' : '';
    _dom.krebsReaction.textContent = reaction;
    if (!yields) {
        _dom.krebsYield.textContent = '—';
    } else {
        let text = '';
        for (const k in yields) {
            if (text) text += ' ';
            const v = yields[k];
            text += k.includes('Consume')
                ? `-${v} ${_yieldName(k.replace('Consume', ''))}`
                : `+${v} ${_yieldName(k)}`;
        }
        _dom.krebsYield.textContent = text;
    }
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
        _dom.healthBar.style.background = store.cellHealth > 50 ? 'var(--ink-viridian)' : store.cellHealth > 20 ? 'var(--ink-sienna)' : 'var(--accent)';
    }
    if (_dom.healthRatio) _dom.healthRatio.textContent = Math.round(store.cellHealth) + '%';

    // Sparklines (160x36 canvases in sidebar)
    const sparkW = 160, sparkH = 36;
    const sc = _sparkColors(_themePalette());
    const atpCtx = _getSparkCtx('spark-atp');
    if (atpCtx) drawSparkline(atpCtx, histories.atp, sparkW, sparkH, sc.atp, sc.atp + '66');
    const nadhCtx = _getSparkCtx('spark-nadh');
    if (nadhCtx) drawSparkline(nadhCtx, histories.nadh, sparkW, sparkH, sc.nadh, sc.nadh + '66');
    const nadphCtx = _getSparkCtx('spark-nadph');
    if (nadphCtx) drawSparkline(nadphCtx, histories.nadph, sparkW, sparkH, sc.nadph, sc.nadph + '66');
    const fadh2Ctx = _getSparkCtx('spark-fadh2');
    if (fadh2Ctx) drawSparkline(fadh2Ctx, histories.fadh2, sparkW, sparkH, sc.fadh2, sc.fadh2 + '66');
    const gradCtx = _getSparkCtx('spark-gradient');
    if (gradCtx) drawSparkline(gradCtx, histories.gradient, sparkW, sparkH, sc.gradient, sc.gradient + '66');
}
