// ─── Dashboard UI sync ───
import { store, counters } from './state.js';

let _dom;

export function initDashboard(dom) { _dom = dom; }

const _pwColor = {
    glycolysis: '--pw-glyc', run_glycolysis_upper: '--pw-glyc', run_glycolysis_lower: '--pw-glyc',
    krebs: '--pw-krebs', run_krebs: '--pw-krebs',
    calvin: '--pw-calvin', run_calvin: '--pw-calvin',
    ppp: '--pw-ppp', run_ppp: '--pw-ppp',
    pdh: '--pw-ferment', pdc: '--pw-ferment', adh: '--pw-ferment',
    aldh: '--pw-ferment', acs: '--pw-ferment', fermentation: '--pw-ferment',
    betaox: '--pw-betaox', run_betaox: '--pw-betaox',
};

export function showActiveStep(enzyme, reaction, yields, pathway) {
    _dom.krebsEnzyme.textContent = enzyme;
    _dom.krebsEnzyme.style.color = pathway && _pwColor[pathway]
        ? 'var(' + _pwColor[pathway] + ')' : '';
    _dom.krebsReaction.textContent = reaction;
    _dom.krebsYield.textContent = yields
        ? Object.entries(yields).map(([k, v]) => k.includes('Consume') ? `-${v} ${k.replace('Consume', '').toUpperCase()}` : `+${v} ${k.toUpperCase()}`).join(' ')
        : '—';
}

export function applyYields(y) {
    if (!y) return;
    if (y.atpConsume && store.atp >= y.atpConsume) store.atp -= y.atpConsume;
    if (y.atp && store.atp < store.totalAtpAdp) store.atp = Math.min(store.atp + y.atp, store.totalAtpAdp);
    if (y.nadh && store.nadh < store.totalNad) store.nadh = Math.min(store.nadh + y.nadh, store.totalNad);
    if (y.nadph && store.nadph < store.totalNadp) store.nadph = Math.min(store.nadph + y.nadph, store.totalNadp);
    if (y.nadphConsume && store.nadph >= y.nadphConsume) store.nadph -= y.nadphConsume;
    if (y.fadh2 && store.fadh2 < store.totalFad) store.fadh2 = Math.min(store.fadh2 + y.fadh2, store.totalFad);
    if (y.co2Fixed) store.co2Fixed += y.co2Fixed;
}

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

export function updateDashboard() {
    updateBar(_dom.atpBar, _dom.atpRatio, store.atp, store.totalAtpAdp);
    updateBar(_dom.nadhBar, _dom.nadhRatio, store.nadh, store.totalNad);
    updateBar(_dom.nadphBar, _dom.nadphRatio, store.nadph, store.totalNadp);
    updateBar(_dom.fadh2Bar, _dom.fadh2Ratio, store.fadh2, store.totalFad);

    animateStatEl(_dom.protonGradient, '' + store.protonGradient);
    animateStatEl(_dom.co2Net, '' + (store.co2Produced - store.co2Fixed));
    animateStatEl(_dom.o2Net, (store.o2Produced - store.o2Consumed).toFixed(1));
    animateStatEl(_dom.h2oNet, '' + (store.h2oProduced - store.h2oSplit));

    // Sync turn/run counters
    _dom.krebsTurn.textContent = counters.krebsTurns;
    _dom.calvinTurn.textContent = counters.calvinTurns;
    _dom.glycolysisRun.textContent = counters.glycRuns;
    if (_dom.pppRun) _dom.pppRun.textContent = counters.pppRuns;
    if (_dom.betaoxRun) _dom.betaoxRun.textContent = counters.betaoxRuns;
}
