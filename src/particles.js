// ─── Particle spawning and rendering for biosim ───
import { _TWO_PI, Anim } from './anim.js';
import { EnzymeStyles } from './enzymes.js';

const _r = window._r;
const _fadeCurve = (t) => t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;

const Particles = {
    electrons: [],
    protons: [],
    photons: [],

    /** Spawn a single-hop electron (legacy — still works) */
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
     * Spawn a multi-hop electron that flows continuously through waypoints.
     * @param {Object} etcComplexes — position map
     * @param {string[]} keys — complex keys in order, e.g. ['ndh1','pq','cytb6f','pc','cytOx']
     * @param {string} type — 'resp' | 'photo' | 'cyclic'
     * @param {Object} [callbacks] — { segmentIndex: fn } fired when electron enters that segment
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
            speed: 0.012 / numSegs,
            type: type || 'resp',
            trail: Anim.trail(16),
            _trailColor: _r(hex, 0.5),
            _callbacks: callbacks || {},
            _firedSegs: new Set(),
        });
    },

    spawnProton(membraneY, membraneH, cx, dir) {
        const memMid = membraneY + membraneH / 2;
        const sy = dir === 'up' ? memMid + 70 : memMid - 70;
        const ey = dir === 'up' ? memMid - 70 : memMid + 70;
        this.protons.push({ x: cx + (Math.random() - 0.5) * 5, y: sy, ty: ey, progress: 0, speed: 0.011 });
    },

    spawnPhoton(etcComplexes, targetKey) {
        const t = etcComplexes[targetKey];
        if (!t) return;
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

        // Electrons with glow trails
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            e.progress += e.speed * spd;
            if (e.progress >= 1) { this.electrons.splice(i, 1); continue; }
            const t = e.progress;
            let px, py;

            if (e.waypoints) {
                // Multi-hop chain: interpolate through waypoints
                const numSegs = e.waypoints.length - 1;
                const segProgress = t * numSegs;
                const seg = Math.min(Math.floor(segProgress), numSegs - 1);
                const localT = segProgress - seg;

                // Fire callbacks when entering a new segment
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
                py = from.y + (to.y - from.y) * localT + Math.sin(t * Math.PI * 3) * 3;
            } else {
                // Single-hop (legacy)
                px = e.x + (e.tx - e.x) * t;
                py = e.y + (e.ty - e.y) * t + Math.sin(t * Math.PI * 3) * 3;
            }

            if (e.trail) {
                e.trail.push(px, py);
                e.trail.draw(ctx, 3, e._trailColor);
            }

            EnzymeStyles.drawElectron(ctx, px, py, 1 - Math.abs(t - 0.5) * 2, e.type, _fadeCurve(t));
        }
        // Protons
        for (let i = this.protons.length - 1; i >= 0; i--) {
            const p = this.protons[i];
            p.progress += p.speed * spd;
            if (p.progress >= 1) { this.protons.splice(i, 1); continue; }
            const t = p.progress;
            EnzymeStyles.drawProton(ctx,
                p.x + Math.sin(t * _TWO_PI) * 2,
                p.y + (p.ty - p.y) * t,
                1 - Math.abs(t - 0.5) * 2,
                _fadeCurve(t));
        }
        // Photons (manual alpha management avoids save/restore per particle)
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const ph = this.photons[i];
            ph.progress += ph.speed * spd;
            if (ph.progress >= 1) { this.photons.splice(i, 1); continue; }
            const t = ph.progress;
            const fade = t < 0.3 ? t / 0.3 : (t > 0.7 ? (1 - t) / 0.3 : 1);
            ctx.globalAlpha = fade * 0.9;
            ctx.beginPath();
            ctx.arc(ph.x + (ph.tx - ph.x) * t, ph.y + (ph.ty - ph.y) * t, 3, 0, _TWO_PI);
            ctx.fillStyle = _r(EnzymeStyles.roleColors.photon.stroke, 0.9);
            ctx.shadowColor = _r(EnzymeStyles.roleColors.photon.stroke, 0.5);
            ctx.shadowBlur = 12;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    },
};

export default Particles;
