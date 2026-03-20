// Particle spawning and rendering — electrons, protons, and photons
// traversing the ETC membrane. All particles use progress-based
// interpolation (0..1) with splice-removal on completion.
import { _TWO_PI, Anim } from './anim.js';
import { EnzymeStyles } from './enzymes.js';

const _r = window._r;
let _photonFill, _photonGlow;
// Trapezoidal fade: ramp in over first 15%, full, ramp out over last 15%
const _fadeCurve = (t) => t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;

const Particles = {
    electrons: [],
    protons: [],
    photons: [],

    /** Spawn a single-hop electron between two ETC complexes (legacy path). */
    spawnElectron(etcComplexes, fk, tk, tp) {
        const f = etcComplexes[fk], t = etcComplexes[tk];
        if (!f || !t) return;
        const type = tp || 'resp';
        const hex = EnzymeStyles.roleColors.electron.stroke;
        this.electrons.push({
            x: f.cx, y: f.cy, tx: t.cx, ty: t.cy,
            progress: 0, speed: 0.012,
            type, trail: Anim.trail(16),
            _trailColor: _r(hex, 0.5)
        });
    },

    /**
     * Spawn a multi-hop electron that flows through waypoints continuously.
     * Replaces multiple single-hop spawns with one animation.
     * @param {Object} etcComplexes — position map from layout
     * @param {string[]} keys — complex keys in traversal order
     * @param {string} type — 'resp' | 'photo' | 'cyclic'
     * @param {Object} [callbacks] — { segmentIndex: fn } fired on entering each segment
     *   (used to trigger intermediate proton pumps at the right visual moment)
     */
    spawnElectronChain(etcComplexes, keys, type, callbacks) {
        const pts = [];
        for (const k of keys) {
            const c = etcComplexes[k];
            if (!c) return;
            pts.push({ x: c.cx, y: c.cy });
        }
        if (pts.length < 2) return;
        const hex = EnzymeStyles.roleColors.electron.stroke;
        const numSegs = pts.length - 1;
        this.electrons.push({
            waypoints: pts,
            progress: 0,
            // Speed inversely proportional to segment count so total transit time stays constant
            speed: 0.012 / numSegs,
            type: type || 'resp',
            trail: Anim.trail(16),
            _trailColor: _r(hex, 0.5),
            _callbacks: callbacks || {},
            _firedSegs: new Set(),
        });
    },

    /** Spawn a proton crossing the membrane. dir='up' for pumping, 'down' for consumption/leak. */
    spawnProton(membraneY, membraneH, cx, dir) {
        const memMid = membraneY + membraneH / 2;
        const sy = dir === 'up' ? memMid + 70 : memMid - 70;
        const ey = dir === 'up' ? memMid - 70 : memMid + 70;
        this.protons.push({ x: cx + (Math.random() - 0.5) * 5, y: sy, ty: ey, progress: 0, speed: 0.011 });
    },

    /** Spawn a photon converging onto a target complex from above. */
    spawnPhoton(etcComplexes, targetKey) {
        const t = etcComplexes[targetKey];
        if (!t) return;
        // Narrow cone centered above the target (~±17°)
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        const dist = 120;
        this.photons.push({
            x: t.cx + Math.cos(angle) * dist,
            y: t.cy + Math.sin(angle) * dist,
            tx: t.cx, ty: t.cy,
            progress: 0, speed: 0.02
        });
    },

    draw(ctx, state) {
        const spd = state.speed;

        // ── Electrons with glow trails ──
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            e.progress += e.speed * spd;
            if (e.progress >= 1) { this.electrons[i] = this.electrons[this.electrons.length - 1]; this.electrons.pop(); continue; }
            const t = e.progress;
            let px, py;

            if (e.waypoints) {
                // Multi-hop: map global progress to local segment
                const numSegs = e.waypoints.length - 1;
                const segProgress = t * numSegs;
                const seg = Math.min(Math.floor(segProgress), numSegs - 1);
                const localT = segProgress - seg;

                // Fire segment callbacks once (triggers proton pumps at intermediate complexes)
                if (e._callbacks) {
                    for (let s = 0; s <= seg; s++) {
                        if (e._callbacks[s] && !e._firedSegs.has(s)) {
                            e._firedSegs.add(s);
                            e._callbacks[s]();
                        }
                    }
                }

                const from = e.waypoints[seg];
                const to = e.waypoints[seg + 1];
                px = from.x + (to.x - from.x) * localT;
                // Sinusoidal y-offset gives electron a wave-like path
                py = from.y + (to.y - from.y) * localT + Math.sin(t * Math.PI * 3) * 3;
            } else {
                px = e.x + (e.tx - e.x) * t;
                py = e.y + (e.ty - e.y) * t + Math.sin(t * Math.PI * 3) * 3;
            }

            if (e.trail) {
                e.trail.push(px, py);
                e.trail.draw(ctx, 3, e._trailColor);
            }

            EnzymeStyles.drawElectron(ctx, px, py, 1 - Math.abs(t - 0.5) * 2, e.type, _fadeCurve(t));
        }

        // ── Protons ──
        for (let i = this.protons.length - 1; i >= 0; i--) {
            const p = this.protons[i];
            p.progress += p.speed * spd;
            if (p.progress >= 1) { this.protons[i] = this.protons[this.protons.length - 1]; this.protons.pop(); continue; }
            const t = p.progress;
            // Horizontal wobble via sine wave
            EnzymeStyles.drawProton(ctx,
                p.x + Math.sin(t * _TWO_PI) * 2,
                p.y + (p.ty - p.y) * t,
                1 - Math.abs(t - 0.5) * 2,
                _fadeCurve(t));
        }

        // ── Photons (manual alpha avoids save/restore per particle) ──
        if (!_photonFill) {
            _photonFill = _r(EnzymeStyles.roleColors.photon.stroke, 0.9);
            _photonGlow = _r(EnzymeStyles.roleColors.photon.stroke, 0.5);
        }
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const ph = this.photons[i];
            ph.progress += ph.speed * spd;
            if (ph.progress >= 1) { this.photons[i] = this.photons[this.photons.length - 1]; this.photons.pop(); continue; }
            const t = ph.progress;
            const fade = t < 0.3 ? t / 0.3 : (t > 0.7 ? (1 - t) / 0.3 : 1);
            ctx.globalAlpha = fade * 0.9;
            ctx.beginPath();
            ctx.arc(ph.x + (ph.tx - ph.x) * t, ph.y + (ph.ty - ph.y) * t, 3, 0, _TWO_PI);
            ctx.fillStyle = _photonFill;
            ctx.shadowColor = _photonGlow;
            ctx.shadowBlur = 12;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    },
};

export default Particles;
