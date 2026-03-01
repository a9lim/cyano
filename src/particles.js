// ─── Particle spawning and rendering for biosim ───
import { _TWO_PI, Anim } from './anim.js';
import { EnzymeStyles } from './enzymes.js';

const _r = window._r;
const _fadeCurve = (t) => t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;

const Particles = {
    electrons: [],
    protons: [],
    photons: [],

    spawnElectron(etcComplexes, fk, tk, tp) {
        const f = etcComplexes[fk], t = etcComplexes[tk];
        if (!f || !t) return;
        const type = tp || 'resp';
        const hex = EnzymeStyles.roleColors.electron.stroke;
        this.electrons.push({
            x: f.cx, y: f.cy, tx: t.cx, ty: t.cy,
            progress: 0, speed: 0.025,
            type, trail: Anim.trail(10),
            _trailColor: _r(hex, 0.5)
        });
    },

    spawnProton(membraneY, membraneH, cx, dir) {
        const memMid = membraneY + membraneH / 2;
        const sy = dir === 'up' ? memMid + 70 : memMid - 70;
        const ey = dir === 'up' ? memMid - 70 : memMid + 70;
        this.protons.push({ x: cx + (Math.random() - 0.5) * 5, y: sy, ty: ey, progress: 0, speed: 0.022 });
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
            progress: 0, speed: 0.04
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
            const px = e.x + (e.tx - e.x) * t;
            const py = e.y + (e.ty - e.y) * t + Math.sin(t * Math.PI * 3) * 3;

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
