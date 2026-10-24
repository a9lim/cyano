// Particles — what moves in the cross-section, each bound to the model.
// Electrons ride the chains the engine spawns (and fire its segment
// callbacks as they enter each segment), on plastoquinone, plastocyanin and
// ferredoxin where the chain passes a mobile carrier. Lumen protons are a
// pool kept equal to store.protonGradient: pumped protons cross up into it,
// ATP synthase and NNT draw theirs out of it, and any excess leaks back
// across the bilayer (or through UCP while uncoupling is on). Photons are
// Feynman wiggles. Time advances by dt × simState.speed.
import { simState, store } from './state.js';
import { Membrane } from './membrane.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const MAXP = 600;           // protons drawn at most; the caption gives the count
const CHAIN_TIME = 1.39;    // s for a whole chain at speed 1 (as before the rebuild)

const Particles = {
    electrons: [],
    protons: [],
    photons: [],
    mols: [],
    tags: [],
    _short: 0, _qa: 0, _ql: 0, _atpOx: 0, _leaked: 0,

    /** Spawn an electron through the given complexes (keys into Membrane.pos). */
    spawnElectronChain(keys, type, callbacks) {
        const pts = [];
        for (const k of keys) {
            const p = Membrane.pos[k];
            if (!p) return false;
            pts.push({ x: p.x, y: p.y, key: k });
        }
        if (pts.length < 2) return false;
        this.electrons.push({ pts, keys, progress: 0, type, cb: callbacks || {}, fired: 0 });
        return true;
    },

    /** A proton crossing at x: 'up' into the lumen pool, 'down' out of it. */
    spawnProton(x, dir) {
        const s = Membrane.s;
        if (dir === 'up') {
            this.protons.push({ x: x + (Math.random() - 0.5) * 3 * s, y: Membrane.memBot + 3 * s, mode: 'up', a: 0, vx: 0, vy: 0 });
            return;
        }
        // Protons leave the pool by the store's tallies (see update), not by these calls
    },

    spawnPhoton(key) {
        const t = Membrane.pos[key];
        if (!t) return;
        const s = Membrane.s, a = -Math.PI / 2 - 0.55 + (Math.random() - 0.5) * 0.5;
        const tx = t.x + (Math.random() - 0.5) * 6 * s, ty = Membrane.mid;
        const d = Math.max(60, ty - Membrane.top + 30);
        const sx = tx + Math.cos(a) * d / Math.abs(Math.sin(a)) * 0.6, sy = ty - d;
        const L = Math.hypot(tx - sx, ty - sy);
        this.photons.push({ x: sx, y: sy, dx: (tx - sx) / L, dy: (ty - sy) / L, left: L, ph: Math.random() * TAU });
    },

    /** Emit a small molecule: 'atp', 'o2out', 'o2in', or a text tag. */
    emit(type, x, y) {
        const s = Membrane.s, r = Math.random;
        if (type === 'atp') this.mols.push({ type, x: x + (r() - 0.5) * 3 * s, y, vx: (r() - 0.5) * 6 * s, vy: (2 + r() * 2) * s, rot: r() * TAU, age: 0, life: 2.2 });
        else if (type === 'o2out') this.mols.push({ type: 'o2', x: x + (r() - 0.5) * 4 * s, y, vx: (r() - 0.5) * 2 * s, vy: -(1.6 + r()) * s, rot: r() * TAU, age: 0, life: 2.6 });
        else if (type === 'o2in') this.mols.push({ type: 'o2', x: x + (r() - 0.5) * 10 * s, y: y + 9 * s, tx: x, vx: 0, vy: -3.2 * s, rot: r() * TAU, age: 0, life: 2.4, sink: true });
    },

    tag(text, x, y, color) { this.tags.push({ text, x, y, color, age: 0, life: 1.6 }); },

    /** A representative instant for the first frame: photons and electrons already in transit. */
    seed() {
        const can = Membrane.spec.can, pos = Membrane.pos;
        const chains = [];
        if (simState.lightOn && can.photo) chains.push(['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr'], ['psii', 'pq', 'cytb6f', 'pc', 'psi', 'fd', 'fnr']);
        if (simState.oxygenAvailable && can.resp) chains.push(['ndh1', 'pq', 'cytb6f', 'pc', 'cytOx']);
        chains.forEach((keys, i) => { if (this.spawnElectronChain(keys, 'seed', {})) { const e = this.electrons[this.electrons.length - 1]; e.progress = 0.15 + 0.6 * ((i * 0.37) % 1); e.fired = 99; } });
        const targets = simState.lightOn ? ['psii', 'psi', 'br'].filter(k => pos[k] && (k === 'br' ? can.brAuto : can.photo)) : [];
        for (let i = 0; i < targets.length * 2; i++) { this.spawnPhoton(targets[i % targets.length]); const p = this.photons[this.photons.length - 1]; const f = 0.25 + 0.5 * Math.random(); p.x += p.dx * p.left * f; p.y += p.dy * p.left * f; p.left *= 1 - f; }
    },

    clear() { this._atpOx = store.atpOxidative; this._leaked = store.protonsLeaked; this._qa = 0; this._ql = 0; this.electrons.length = 0; this.protons.length = 0; this.photons.length = 0; this.mols.length = 0; this.tags.length = 0; },

    /** Lumen protons to start with, at rest, matching the gradient. */
    fill() {
        this.protons = this.protons.filter(p => p.mode !== 'lumen');
        this._atpOx = store.atpOxidative; this._leaked = store.protonsLeaked; this._qa = 0; this._ql = 0;
        const n = Math.min(MAXP, store.protonGradient);
        for (let i = 0; i < n; i++) this.protons.push(poolProton());
    },

    update(dt) {
        const sp = dt * simState.speed, s = Membrane.s, L = Membrane.lumen;
        // Electrons: callbacks fire as the electron enters each segment
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            e.progress += sp / CHAIN_TIME;
            const n = e.pts.length - 1, seg = Math.min(n - 1, Math.floor(e.progress * n));
            while (e.fired <= seg) { const f = e.cb[e.fired]; e.fired++; if (f) f(); }
            if (e.progress >= 1) { this.electrons.splice(i, 1); if (e.type === 'photo' && Membrane.pos.fnr && !this.tags.length) this.tag('NADPH', Membrane.pos.fnr.x, Membrane.mid + 15 * s + 12, K.ink('viridian')); }
        }
        // Protons
        let inPool = 0, up = 0;
        for (const p of this.protons) {
            if (p.mode === 'lumen') {
                inPool++;
                p.vx += (Math.random() - 0.5) * 900 * dt; p.vy += (Math.random() - 0.5) * 700 * dt;
                p.vx *= 0.94; p.vy *= 0.94;
                p.x += p.vx * dt; p.y += p.vy * dt;
                confine(p, L);
            } else if (p.mode === 'up') {
                up++;
                p.a = Math.min(1, p.a + sp * 4);
                p.y -= 22 * s * sp;
                if (p.y < Membrane.memTop - 1.5 * s) { p.mode = 'lumen'; p.vy = -60; }
            } else if (p.mode === 'site') {
                const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = Math.max(60 * s, d * 5) * sp;
                if (d <= v) { p.x = p.tx; p.y = p.ty; p.mode = 'down'; }
                else { p.x += dx / d * v; p.y += dy / d * v; }
            } else if (p.mode === 'down') {
                p.y += 14 * s * sp;
                if (p.y > Membrane.memBot + 1 * s) p.a -= sp * 3;
            }
        }
        this.protons = this.protons.filter(p => p.a > 0);
        // Keep the pool equal to the gradient. Protons still crossing up count as
        // pooled; protons the store has spent leave the pool at once, for ATP
        // synthase (four per ATP made), the leak (through UCP while uncoupling),
        // and the rest for NNT, as the store's own tallies say.
        const target = Math.min(MAXP, Math.max(0, store.protonGradient - up));
        this._qa = Math.min(400, this._qa + Math.max(0, store.atpOxidative - this._atpOx) * 4);
        this._ql = Math.min(400, this._ql + Math.max(0, store.protonsLeaked - this._leaked));
        this._atpOx = store.atpOxidative; this._leaked = store.protonsLeaked;
        if (inPool > target) {
            let n = inPool - target;
            const a = Math.min(n, this._qa); this._qa -= a; n -= a; send(this, a, 'atpSyn');
            const l = Math.min(n, this._ql); this._ql -= l; n -= l; send(this, l, simState.uncouplingEnabled && Membrane.pos.ucp ? 'ucp' : null);
            send(this, n, Membrane.pos.nnt ? 'nnt' : null);
            this._short = 0;
        } else if (inPool < target) {
            this._short += dt;
            if (this._short > 1.0) { for (let k = 0; k < Math.min(8, target - inPool); k++) this.protons.push(poolProton()); }
        } else { this._short = 0; this._qa = Math.min(this._qa, 8); this._ql = Math.min(this._ql, 8); }
        // Photons
        for (const p of this.photons) { const m = 300 * Math.max(0.6, s / 6) * sp; p.x += p.dx * m; p.y += p.dy * m; p.left -= m; p.ph += sp * 30; }
        this.photons = this.photons.filter(p => p.left > 0);
        // Molecules and tags
        for (const m of this.mols) {
            m.age += sp;
            if (m.sink) m.x += (m.tx - m.x) * Math.min(1, sp * 1.5);
            m.x += m.vx * sp; m.y += m.vy * sp; m.rot += sp * 0.5;
        }
        this.mols = this.mols.filter(m => m.age < m.life);
        for (const t of this.tags) { t.age += sp; t.y += 9 * sp; }
        this.tags = this.tags.filter(t => t.age < t.life);
    },

    draw(c) {
        const s = Membrane.s, pos = Membrane.pos, P = K.P;
        // Idle carriers at home, then the ones carrying an electron
        const busy = { pq: 0, pc: 0, fd: 0 };
        for (const e of this.electrons) {
            const n = e.pts.length - 1, t = Math.min(0.9999, e.progress) * n, i = Math.floor(t), f = t - i;
            const a = e.pts[i], b = e.pts[i + 1];
            const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
            const ride = carrierOf(a.key, b.key);
            if (ride) { busy[ride]++; drawCarrier(c, ride, x, y, s, true); }
            else { c.beginPath(); c.arc(x, y, Math.max(1.6, 0.36 * s), 0, TAU); c.lineWidth = 1.2; c.strokeStyle = P.text; c.fillStyle = P.canvas; c.fill(); c.stroke(); }
        }
        const idle = { pq: 3, pc: 2, fd: 1 };
        for (const k in idle) {
            if (!pos[k]) continue;
            for (let j = busy[k]; j < idle[k]; j++) {
                const ph = j * 2.1 + k.length;
                drawCarrier(c, k, pos[k].x + (j - (idle[k] - 1) / 2) * 3.2 * s + Math.sin(simState.time * 0.4 + ph) * 0.6 * s, pos[k].y + (k === 'pq' ? (j % 2 ? 0.7 : -0.7) * s : 0), s, false);
            }
        }
        // Lumen protons: the red, one per unit of gradient
        c.fillStyle = P.accent;
        const r = Math.max(1.5, 0.4 * s);
        for (const p of this.protons) {
            // Pooled protons are the gradient; those crossing are drawn paler
            c.globalAlpha = Math.max(0, Math.min(1, p.a)) * (p.mode === 'lumen' ? 1 : 0.42);
            c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
        // Photons as Feynman wiggles
        c.strokeStyle = K.ink('ochre'); c.lineWidth = Math.max(1, 0.2 * s); c.lineCap = 'round';
        for (const p of this.photons) {
            c.beginPath();
            const len = 5 * s, nx = -p.dy, ny = p.dx;
            for (let k = 0; k <= 16; k++) {
                const t = k / 16, al = -len * (1 - t), off = 0.55 * s * Math.sin(p.ph + t * 9) * Math.sin(Math.PI * t);
                const x = p.x + p.dx * al + nx * off, y = p.y + p.dy * al + ny * off;
                k ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.stroke();
        }
        for (const m of this.mols) {
            c.globalAlpha = Math.max(0, Math.min(1, m.age * 3, (m.life - m.age) * 1.5));
            if (m.type === 'atp') K.atp(c, s, m.x, m.y, m.rot); else K.o2(c, s, m.x, m.y, m.rot);
        }
        c.globalAlpha = 1;
        if (this.tags.length) {
            c.font = `italic ${Membrane.narrow ? 10 : 11}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            for (const t of this.tags) { c.globalAlpha = Math.max(0, Math.min(1, (t.life - t.age) * 1.5)); c.fillStyle = t.color; c.fillText(t.text, t.x, t.y); }
            c.globalAlpha = 1;
        }
    },
};

function poolProton() {
    const L = Membrane.lumen;
    return { x: L.x0 + Math.random() * (L.x1 - L.x0), y: L.y0 + Math.random() * (L.y1 - L.y0), mode: 'lumen', a: 1, vx: 0, vy: 0 };
}

function confine(p, L) {
    const n = L.neck;
    const inNeck = n && p.x > n.x0 && p.x < n.x1 && p.y < L.y0;
    if (!inNeck) {
        if (p.x < L.x0) { p.x = L.x0; p.vx = Math.abs(p.vx); }
        if (p.x > L.x1) { p.x = L.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < L.y0 && !(n && p.x > n.x0 && p.x < n.x1)) { p.y = L.y0; p.vy = Math.abs(p.vy); }
    } else {
        if (p.x < n.x0) { p.x = n.x0; p.vx = Math.abs(p.vx); }
        if (p.x > n.x1) { p.x = n.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < n.y0) { p.y = n.y0; p.vy = Math.abs(p.vy); }
    }
    if (p.y > L.y1) { p.y = L.y1; p.vy = -Math.abs(p.vy); }
}

/** Where a proton enters a complex from the lumen side. */
function entry(siteKey) {
    const s = Membrane.s, p = Membrane.pos[siteKey];
    if (siteKey === 'atpSyn' && p) {
        if (p.rot !== undefined) { const c = Math.cos(p.rot), sn = Math.sin(p.rot); return [p.x + 3.4 * s * c + 2.5 * s * sn, p.y + 3.4 * s * sn - 2.5 * s * c]; }
        return [p.x + 3.4 * s, Membrane.memTop];
    }
    return [p ? p.x : Membrane.x0, Membrane.memTop];
}

/** Send n pool protons out: to a complex's entry (nearest first), or across the bilayer where they are. */
function send(P, n, site) {
    if (n <= 0) return;
    const [ex, ey] = site ? entry(site) : [0, 0];
    for (let k = 0; k < n; k++) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < P.protons.length; i++) {
            const p = P.protons[i];
            if (p.mode !== 'lumen') continue;
            const d = site ? Math.abs(p.x - ex) + Math.abs(p.y - ey) * 0.5 : Math.random();
            if (d < bd) { bd = d; best = i; }
        }
        if (best < 0) return;
        const p = P.protons[best];
        p.mode = 'site';
        if (site) { p.tx = ex; p.ty = ey; } else { p.tx = p.x; p.ty = Membrane.memTop; }
    }
}

function carrierOf(a, b) {
    for (const k of ['pq', 'pc', 'fd']) if (a === k || b === k) return k;
    return null;
}

function drawCarrier(c, k, x, y, s, loaded) {
    if (k === 'pq') { c.save(); c.translate(x, y); K.quinone(c, s, loaded); c.restore(); }
    else if (k === 'pc') K.carrier(c, s, x, y, 1.7, 19, loaded ? K.ink('prussian') : K.mix(K.ink('prussian'), K.P.canvas, 0.3));
    else K.carrier(c, s, x, y, 1.4, 22, loaded ? K.ink('sienna') : K.mix(K.ink('sienna'), K.P.canvas, 0.3));
}

export default Particles;
