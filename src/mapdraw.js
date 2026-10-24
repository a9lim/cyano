// Map drawing — the transit map in the manner of Beck: one ink per line,
// ticks for single stations, rings and capsules for interchanges. Line
// weight and train speed read flux; trains are chevrons cut out of the line,
// pointing the way carbon runs, so a still frame still shows direction.
// Switched-off lines are dashed hairlines; an enzyme its regulation blocks
// carries a buffer bar across the track.
import { MapView, FLIP } from './map.js';
import { LINES, CO2, KEY_BOX, KC, PAIR } from './maplayout.js';
import { flux } from './flux.js';
import { store } from './state.js';
import { getRegulationFactor } from './regulation.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const FREF = 0.55;   // events per second drawn at full weight

export const mapTags = [];   // yield labels: { text, x, y, color, age, life }

const weight = (f, us) => 1.25 + (6.2 * us - 1.25) * Math.pow(Math.min(1, Math.abs(f) / FREF), 0.7);
/** Idle lines are a paler hairline of their ink; running ones take the full ink. */
function idleInk(base) { return K.mix(base, K.P.canvas, K.P.dark ? 0.32 : 0.5); }
function inkOf(seg, f) {
    const base = K.ink(seg.ink);
    return K.mix(idleInk(base), base, Math.min(1, Math.abs(f) * 6));
}
function trace(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }

export function drawMap(c, hover, dt) {
    const M = MapView, G = M.G, us = G.us, P = K.P;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const segs = Object.values(M.segs).filter(s => !M.vis[s.id].hidden);
    // CO₂ spurs, only while their enzyme carries flux
    c.font = `italic ${Math.max(10, 11.5 * us)}px ${_FONT.text}`;
    for (const [id, a0, b0, a1, b1] of CO2) {
        const f = Math.abs(flux[id] || 0), v = M.vis[id];
        if (f < 0.04 || !v || v.hidden) continue;
        const a = M.G.rot && a1 ? a1 : a0, b = M.G.rot && b1 ? b1 : b0;
        const A = M.T(...a), B = M.T(...b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        c.globalAlpha = Math.min(1, f * 8) * v.a;
        c.strokeStyle = K.rgba(P.text, 0.45); c.lineWidth = 1; c.setLineDash([2.5, 2.5]);
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.setLineDash([]);
        c.fillStyle = P.muted;
        c.textAlign = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : 'center';
        c.textBaseline = Math.abs(dx) > Math.abs(dy) ? 'middle' : (dy > 0 ? 'top' : 'alphabetic');
        c.fillText('CO₂', B[0] + dx / L * 3, B[1] + dy / L * 3);
    }
    c.globalAlpha = 1;
    // Switched-off lines: dashed hairlines
    c.setLineDash([3, 3.5]); c.lineWidth = 1;
    for (const s of segs) {
        const a = M.vis[s.id].a;
        if (a > 0.98) continue;
        c.globalAlpha = 1 - a; c.strokeStyle = K.mix(K.ink(s.ink), P.canvas, 0.35);
        trace(c, s.pts); c.stroke();
    }
    c.setLineDash([]);
    // Running lines, the busiest on top
    const live = segs.filter(s => M.vis[s.id].a > 0.02).sort((a, b) => Math.abs(flux[a.id] || 0) - Math.abs(flux[b.id] || 0));
    for (const s of live) {
        const f = flux[s.id] || 0;
        c.globalAlpha = M.vis[s.id].a;
        c.strokeStyle = hover === s ? K.ink(s.ink) : inkOf(s, f); c.lineWidth = weight(f, us);
        trace(c, s.pts); c.stroke();
    }
    // Trains: chevrons in the ground colour, spaced along each line
    c.strokeStyle = P.canvas; c.lineCap = 'butt';
    for (const s of live) {
        const f = flux[s.id] || 0;
        if (Math.abs(f) < 0.02 || s.len < 6) continue;
        const w = weight(f, us), gapPx = 34 * us, n = Math.max(1, Math.round(s.len / gapPx)), step = s.len / n;
        const dir = f > 0 ? 1 : -1, h = Math.max(1.1, w / 2 - 0.4), d = Math.min(h * 0.9, 3.2 * us);
        c.globalAlpha = M.vis[s.id].a * Math.min(1, Math.abs(f) * 10); c.lineWidth = Math.max(1, 0.32 * w);
        for (let i = 0; i < n; i++) {
            let v = ((M.phase[s.id] + i * step) % s.len + s.len) % s.len;
            if (v < 4 || v > s.len - 4) continue;
            const [x, y, ang] = at(s, v), cs = Math.cos(ang), sn = Math.sin(ang);
            const tx = cs * dir, ty = sn * dir, nx = -sn, ny = cs;
            c.beginPath();
            c.moveTo(x - tx * d + nx * h, y - ty * d + ny * h); c.lineTo(x, y); c.lineTo(x - tx * d - nx * h, y - ty * d - ny * h);
            c.stroke();
        }
    }
    c.globalAlpha = 1; c.lineCap = 'round';
    // Buffer bars where regulation blocks an enzyme in its running direction
    for (const s of live) {
        if (!s.label || M.vis[s.id].a < 0.5) continue;
        const dir = FLIP.has(s.id) ? 'reverse' : 'forward';
        const r = getRegulationFactor(s.key, s.step, store, dir);
        if (r > 0) continue;
        const [x, y, ang] = at(s, s.len / 2), nx = -Math.sin(ang), ny = Math.cos(ang), h = weight(0, us) / 2 + 4.5 * us;
        c.strokeStyle = P.text; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(x + nx * h, y + ny * h); c.lineTo(x - nx * h, y - ny * h); c.stroke();
    }
    drawStations(c, us);
    drawLabels(c, hover, us);
    drawLoops(c, us, hover);
    drawTags(c, dt, us);
    drawKey(c, us);
}

function at(s, v) {
    const { pts, L } = s; let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= v) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (v - L[lo]) / ((L[hi] - L[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

function sideDir(S) {
    let v;
    if (S.side === 'in') { const c0 = MapView.T(...KC); v = [c0[0] - S.pos[0], c0[1] - S.pos[1]]; }
    else v = MapView.Tdir(...({ t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], tr: [0.6, -0.8], tl: [-0.7, -0.7], br: [0.7, 0.7], bl: [-0.7, 0.7] })[S.side]);
    const L = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / L, v[1] / L];
}

function drawStations(c, us) {
    const M = MapView, P = K.P, sw = Math.max(1.3, 1.7 * us), rr = Math.max(3.4, 5 * us);
    for (const S of Object.values(M.st)) {
        if (S.hidden) continue;
        const [x, y] = S.pos;
        if (S.kind === 'corr') {
            c.save(); c.translate(x, y); c.rotate(M.G.rot ? 0 : Math.PI / 2);
            const len = M.G.gap + 2 * rr;
            c.beginPath(); c.roundRect(-len / 2, -rr, len, 2 * rr, rr); c.fillStyle = P.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = P.text; c.stroke();
            c.restore();
        } else if (S.kind === 'hub') {
            c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fillStyle = P.canvas; c.fill(); c.lineWidth = sw; c.strokeStyle = P.text; c.stroke();
        } else if (S.anchor) {
            const seg = M.segs[S.seg], f = flux[S.seg] || 0, w = weight(f, us);
            const [dx, dy] = sideDir(S), nx = -Math.sin(S.ang), ny = Math.cos(S.ang), sg = nx * dx + ny * dy >= 0 ? 1 : -1;
            const a0 = w / 2 - 0.5, a1 = w / 2 + 5 * us;
            c.globalAlpha = Math.max(0.35, M.vis[S.seg].a);
            c.strokeStyle = inkOf(seg, f); c.lineWidth = Math.max(1.5, 2.4 * us); c.lineCap = 'butt';
            c.beginPath(); c.moveTo(S.anchor[0] + nx * sg * a0, S.anchor[1] + ny * sg * a0); c.lineTo(S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1); c.stroke();
            c.lineCap = 'round'; c.globalAlpha = 1;
            S.tickEnd = [S.anchor[0] + nx * sg * a1, S.anchor[1] + ny * sg * a1];
        }
    }
    // Names, with the pool's count after them when there is one
    const fs = Math.max(10.5, 13.5 * us);
    for (const S of Object.values(M.st)) {
        if (S.hidden) continue;
        const [dx, dy] = sideDir(S);
        let bx, by, d;
        if (S.kind === 'tick') { [bx, by] = S.tickEnd || S.pos; d = 3; } else { [bx, by] = S.pos; d = rr + (S.kind === 'corr' ? M.G.gap / 2 : 0) + 3; }
        let x = bx + dx * d, y = by + dy * d, align, base;
        if (Math.abs(dx) > 0.75) { align = dx > 0 ? 'left' : 'right'; base = 'middle'; }
        else if (S.side.length === 2 || S.side === 'in') { align = dx >= 0.2 ? 'left' : dx <= -0.2 ? 'right' : 'center'; base = dy < 0 ? 'alphabetic' : 'top'; }
        else { align = 'center'; base = dy > 0 ? 'top' : 'alphabetic'; }
        const n = store[S.id] || 0, name = S.label, cnt = n > 0 ? ' ' + n : '';
        c.font = `${fs}px ${_FONT.text}`;
        const wName = c.measureText(name).width;
        c.font = `${fs * 0.86}px ${_FONT.text}`;
        const wCnt = cnt ? c.measureText(cnt).width : 0, W = wName + wCnt;
        const left = align === 'left' ? x : align === 'right' ? x - W : x - W / 2;
        const yy = y + (base === 'top' ? 1 : 0);
        c.textAlign = 'left'; c.textBaseline = base;
        c.font = `${fs}px ${_FONT.text}`; c.fillStyle = n > 0 ? P.text : P.muted; c.fillText(name, left, yy);
        if (cnt) { c.font = `${fs * 0.86}px ${_FONT.text}`; c.fillStyle = P.accent === P.text ? P.text : P.text2; c.fillText(cnt, left + wName, yy); }
        const top = base === 'top' ? yy : base === 'middle' ? yy - fs / 2 : yy - fs;
        S.box = [left - 2, top - 2, left + W + 2, top + fs + 2];
    }
}

// Corridor enzymes serve two tracks; each is labelled once, named for the way it runs

function drawLabels(c, hover, us) {
    const P = K.P, M = MapView, fs = Math.max(10, 11.5 * us);
    const isLive = (id) => id && M.vis[id] && !M.vis[id].hidden && M.vis[id].a > 0.02;
    c.font = `italic ${fs}px ${_FONT.text}`; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = P.canvas;
    for (const s of Object.values(M.segs)) {
        if (!s.lab) continue;
        const pair = PAIR[s.id];
        if (!isLive(s.id) && !isLive(pair)) { s.lab.box = null; continue; }
        const fa = flux[s.id] || 0, fb = pair ? flux[pair] || 0 : 0;
        const f = fa - fb, other = Math.abs(fb) > Math.abs(fa) + 0.005 || !isLive(s.id);
        const text = (f < -0.02 || (!isLive(s.id) && isLive(pair))) && s.rev ? s.rev : s.label;
        c.globalAlpha = Math.max(0.4, Math.max(isLive(s.id) ? M.vis[s.id].a : 0, isLive(pair) ? M.vis[pair].a : 0));
        c.textAlign = s.lab.align;
        c.fillStyle = hover === s ? P.text : K.ink(other ? M.segs[pair].ink : s.ink);
        c.strokeText(text, s.lab.x, s.lab.y); c.fillText(text, s.lab.x, s.lab.y);
        const w = c.measureText(text).width, x0 = s.lab.align === 'left' ? s.lab.x : s.lab.align === 'right' ? s.lab.x - w : s.lab.x - w / 2;
        s.lab.box = [x0 - 3, s.lab.y - fs / 2 - 3, x0 + w + 3, s.lab.y + fs / 2 + 3];
    }
    c.globalAlpha = 1;
}

function drawLoops(c, us, hover) {
    const M = MapView, P = K.P, fs = Math.max(11, 14 * us);
    for (const L of M.loops) {
        const segIds = M.tracks[L.line === 'glyc' ? 'glyc' : L.line === 'box' ? 'box' : L.line]?.segs || [];
        const vis = segIds.map(id => M.vis[id]).filter(Boolean);
        L.hidden = !vis.length || vis.every(v => v.hidden) || Math.max(...vis.map(v => v.a)) < 0.35;
        if (L.hidden) continue;
        const name = M.G.rot ? L.short : L.name, base = K.ink(LINES[L.line].ink);
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const w = c.measureText(name).width;
        c.font = `${fs * 0.82}px ${_FONT.text}`;
        const wt = L.times ? c.measureText(' ' + L.times).width : 0;
        L.hw = (w + wt) / 2;
        const x0 = L.pos[0] - L.hw;
        if (L.span && !M.G.rot) {
            // A bracket under the corridor for the half-glycolysis services
            const [a, b] = L.span, o = M.G.rot ? [-5 * us, 0] : [0, -5 * us];
            c.strokeStyle = K.mix(base, P.canvas, 0.4); c.lineWidth = 1;
            c.beginPath(); c.moveTo(a[0] + o[0], a[1] + o[1]); c.lineTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0] + o[0], b[1] + o[1]); c.stroke();
        }
        c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.canvas;
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'left'; c.fillStyle = hover === L ? P.text : base;
        c.strokeText(name, x0, L.pos[1]); c.fillText(name, x0, L.pos[1]);
        if (L.times) { c.font = `${fs * 0.82}px ${_FONT.text}`; c.fillStyle = P.muted; c.strokeText(' ' + L.times, x0 + w, L.pos[1]); c.fillText(' ' + L.times, x0 + w, L.pos[1]); }
    }
}

function drawTags(c, dt, us) {
    const fs = Math.max(10, 11.5 * us);
    c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = K.P.canvas;
    for (let i = mapTags.length - 1; i >= 0; i--) {
        const t = mapTags[i];
        t.age += dt; t.y -= 10 * dt;
        if (t.age > t.life) { mapTags.splice(i, 1); continue; }
        c.globalAlpha = Math.min(1, (t.life - t.age) * 1.6, t.age * 8);
        c.fillStyle = t.color; c.strokeText(t.text, t.x, t.y); c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
}

const SHORT = { 'Pentose phosphate': 'Pentose P', 'Pyruvate dehydrogenase': 'PDH', 'Gluconeogenesis': 'Gluconeogen.', 'Fatty-acid synthesis': 'FA synthesis', 'Ethanol salvage': 'Salvage' };

/** Line name, renamed when its trains run backward. */
export function lineState(id) {
    const M = MapView, segs = Object.values(M.segs).filter(s => s.line === id && !M.vis[s.id]?.hidden);
    if (!segs.length) return null;
    let mx = 0, sum = 0;
    for (const s of segs) { const f = flux[s.id] || 0; mx = Math.max(mx, Math.abs(f)); sum += f; }
    const L = LINES[id];
    let rev = sum < -0.02;
    if (id === 'ferm') rev = Math.abs(flux.aldh || 0) + Math.abs(flux.acs || 0) > Math.abs(flux.pdc || 0) + 0.01 || (flux.adh || 0) < -0.02;
    const on = Math.max(...segs.map(s => M.vis[s.id].a)) > 0.5;
    return { id, name: rev && L.rev ? L.rev : L.name, flux: mx, on, ink: L.ink };
}

function drawKey(c, us) {
    const M = MapView, P = K.P, [gx0, gy0, gx1, gy1] = KEY_BOX;
    const a = M.T(gx0, gy0), b = M.T(gx1, gy1);
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
    const fs = Math.max(10.5, 13 * us), narrow = M.G.rot;
    const colW = narrow ? x1 - x0 : (x1 - x0) * 0.47;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted;
    c.fillText('Lines, by flux', x0, y0 + fs);
    const rows = Object.keys(LINES).map(lineState).filter(Boolean);
    const rowH = Math.min(22 * us + 4, (narrow ? (y1 - y0) * 0.45 : y1 - y0 - fs - 34) / 7);
    rows.forEach((r, i) => {
        const y = y0 + fs + 8 + rowH * (i + 0.5);
        c.globalAlpha = r.on ? 1 : 0.55;
        if (r.on) { c.strokeStyle = K.mix(idleInk(K.ink(r.ink)), K.ink(r.ink), Math.min(1, r.flux * 6)); c.lineWidth = weight(r.flux, us); c.setLineDash([]); }
        else { c.strokeStyle = K.ink(r.ink); c.lineWidth = 1; c.setLineDash([3, 3.5]); }
        c.beginPath(); c.moveTo(x0 + 3, y); c.lineTo(x0 + 22 * us, y); c.stroke(); c.setLineDash([]);
        c.font = `${fs}px ${_FONT.text}`; c.textBaseline = 'middle';
        let name = r.name;
        if (c.measureText(name).width > colW - 30 * us - c.measureText('00/min').width - 8) name = SHORT[name] || name;
        c.fillStyle = r.flux > 0.02 ? P.text : P.muted; c.fillText(name, x0 + 30 * us, y);
        c.textAlign = 'right'; c.fillStyle = P.text2;
        c.fillText(r.on ? Math.round(r.flux * 60) + '/min' : 'off', x0 + colW, y);
        c.textAlign = 'left';
    });
    c.globalAlpha = 1;
    // Pools: the four conserved pairs and the gradient
    const px0 = narrow ? x0 : x0 + (x1 - x0) * 0.55, py0 = narrow ? y0 + fs + 16 + rowH * 7 : y0, pw = narrow ? colW : x1 - px0;
    c.font = `italic ${fs}px ${_FONT.text}`; c.fillStyle = P.muted; c.textBaseline = 'alphabetic';
    c.fillText('Pools', px0, py0 + fs);
    const pools = [
        ['ATP', 'ADP', store.atp, store.totalAtpAdp, K.ink('ochre')], ['NADH', 'NAD⁺', store.nadh, store.totalNad, K.ink('prussian')],
        ['NADPH', 'NADP⁺', store.nadph, store.totalNadp, K.ink('viridian')], ['FADH₂', 'FAD', store.fadh2, store.totalFad, K.ink('madder')],
    ];
    const ph = (narrow ? y1 - py0 - fs - 8 : y1 - y0 - fs - 8) / 5.4, bh = Math.max(3, 4.5 * us);
    pools.forEach(([a1, b1, v, tot, col], i) => {
        const y = py0 + fs + 8 + ph * i + ph * 0.5;
        c.font = `${fs}px ${_FONT.text}`; c.fillStyle = P.text2; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.fillText(narrow || pw < 190 ? a1 : `${a1} of ${a1} + ${b1}`, px0, y);
        c.fillStyle = P.text; c.textAlign = 'right'; c.fillText(`${v} / ${tot}`, px0 + pw, y);
        c.fillStyle = col; c.fillRect(px0, y + 4, pw * v / tot, bh);
        c.strokeStyle = K.rgba(P.text, 0.3); c.lineWidth = 1; c.strokeRect(px0 + 0.5, y + 4.5, pw - 1, bh - 1);
    });
    // The gradient, in protons: Lumen's red
    const y = py0 + fs + 8 + ph * 4 + ph * 0.5, g = store.protonGradient;
    c.font = `${fs}px ${_FONT.text}`; c.fillStyle = P.text2; c.textAlign = 'left'; c.fillText(narrow ? 'H⁺ gradient' : 'Proton gradient', px0, y);
    c.fillStyle = P.text; c.textAlign = 'right'; c.fillText(String(g), px0 + pw, y);
    const n = Math.min(60, g), step = (pw - 2) / 60;
    c.fillStyle = P.accent;
    for (let k = 0; k < n; k++) { c.beginPath(); c.arc(px0 + 1.5 + step * (k + 0.5), y + 4 + bh / 2, Math.min(step * 0.42, bh * 0.55), 0, TAU); c.fill(); }
}
