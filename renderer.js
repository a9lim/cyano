/* ===================================================================
   renderer.js — Integrated Metabolic Network with Zoom/Pan
   Shared metabolite nodes, bidirectional arrows for shared enzymes,
   R5P shared between PPP and Calvin, Calvin in cytoplasm
   =================================================================== */

const Renderer = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, lastMX: 0, lastMY: 0,
    electrons: [], protons: [],
    membraneY: 0, membraneH: 0,
    etcComplexes: {}, metab: {},
    enzymeHitboxes: [],  // [{cx, cy, w, h, pathway, stepIndex}]
    onEnzymeClick: null, // callback set by sim.js

    pathwayColors: {
        glycolysis: '#fb923c',
        calvin: '#34d399',
        ppp: '#818cf8',
        krebs: '#38bdf8',
        link: '#64748b',
        fermentation: '#fbbf24',
        shared: '#e2e8f0',
    },

    krebsSteps: [
        { abbr: 'CS', product: 'Citrate' },
        { abbr: 'ACO', product: 'Isocitrate' },
        { abbr: 'IDH', product: 'α-KG' },
        { abbr: 'KGDH', product: 'Suc-CoA' },
        { abbr: 'SCS', product: 'Succinate' },
        { abbr: 'SDH', product: 'Fumarate' },
        { abbr: 'FUM', product: 'Malate' },
        { abbr: 'MDH', product: 'OAA' },
    ],

    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initZoomPan();
    },

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.W = Math.floor(rect.width);
        this.H = Math.floor(rect.height);
        this.canvas.width = this.W * this.dpr;
        this.canvas.height = this.H * this.dpr;
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.computeLayout();
    },

    initZoomPan() {
        const c = this.canvas;
        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = c.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const oldZ = this.zoom;
            this.zoom = Math.max(0.3, Math.min(5, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
            this.panX = mx - (mx - this.panX) * (this.zoom / oldZ);
            this.panY = my - (my - this.panY) * (this.zoom / oldZ);
            document.getElementById('zoom-indicator').textContent = Math.round(this.zoom * 100) + '%';
        }, { passive: false });
        c.addEventListener('mousedown', (e) => { this.isPanning = true; this.lastMX = e.clientX; this.lastMY = e.clientY; });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) {
                // Hover detection for cursor change
                const rect = c.getBoundingClientRect();
                const mx = (e.clientX - rect.left - this.panX) / this.zoom;
                const my = (e.clientY - rect.top - this.panY) / this.zoom;
                let hovering = false;
                for (const hb of this.enzymeHitboxes) {
                    if (Math.abs(mx - hb.cx) < hb.w / 2 && Math.abs(my - hb.cy) < hb.h / 2) {
                        hovering = true; break;
                    }
                }
                c.style.cursor = hovering ? 'pointer' : (this.isPanning ? 'grabbing' : 'grab');
                return;
            }
            this.panX += e.clientX - this.lastMX; this.panY += e.clientY - this.lastMY;
            this.lastMX = e.clientX; this.lastMY = e.clientY;
        });
        window.addEventListener('mouseup', () => { this.isPanning = false; });

        // Click-to-react
        c.addEventListener('click', (e) => {
            if (!this.onEnzymeClick) return;
            const rect = c.getBoundingClientRect();
            const mx = (e.clientX - rect.left - this.panX) / this.zoom;
            const my = (e.clientY - rect.top - this.panY) / this.zoom;
            for (const hb of this.enzymeHitboxes) {
                if (Math.abs(mx - hb.cx) < hb.w / 2 && Math.abs(my - hb.cy) < hb.h / 2) {
                    this.onEnzymeClick(hb.pathway, hb.stepIndex);
                    return;
                }
            }
        });
    },

    computeLayout() {
        const W = this.W, H = this.H;

        // ── MEMBRANE ──
        this.membraneY = H * 0.16;
        this.membraneH = 30; // Thinner membrane
        const memMid = this.membraneY + this.membraneH / 2;
        const mPad = W * 0.03, mW = W - mPad * 2;

        // Linearly distribute 12 complexes across the available membrane width
        const numComplexes = 12;
        const step = mW / (numComplexes + 1);
        const colW = (i) => mPad + step * i;

        this.etcComplexes = {
            psii: { cx: colW(1), cy: memMid },
            ndh1: { cx: colW(2), cy: memMid },
            sdh: { cx: colW(3), cy: memMid + this.membraneH * 0.3 },
            pq: { cx: colW(4), cy: memMid },
            cytb6f: { cx: colW(5), cy: memMid },
            cytOx: { cx: colW(6), cy: memMid + this.membraneH * 0.3 },
            pc: { cx: colW(7), cy: memMid },
            psi: { cx: colW(8), cy: memMid },
            fd: { cx: colW(9), cy: memMid },
            fnr: { cx: colW(10), cy: memMid },
            atpSyn: { cx: colW(11), cy: memMid },
            br: { cx: colW(12), cy: memMid },
        };

        // ── CYTOPLASM — Orthogonal Layout ──
        const top = this.membraneY + this.membraneH + 40;
        const rowH = (H - top - 60) / 5;
        const col = (i) => W * (0.05 + i * 0.095);
        const r = [top, top + rowH, top + rowH * 2, top + rowH * 3, top + rowH * 4, top + rowH * 5];

        this.metab = {
            // Row 0
            ethanol: { cx: col(10), cy: r[0], label: 'Ethanol' },
            pgl6: { cx: col(1), cy: r[0], label: '6-PGL' },
            pga6: { cx: col(2), cy: r[0], label: '6-PGA' },
            r5p: { cx: col(3), cy: r[0], label: 'R5P' },
            rubp: { cx: col(7), cy: r[0], label: 'RuBP' },

            // Row 1 (Glycolysis Backbone)
            glucose: { cx: col(0), cy: r[1], label: 'Glucose' },
            g6p: { cx: col(1), cy: r[1], label: 'G6P' },
            f6p: { cx: col(3), cy: r[1], label: 'F6P' },
            f16bp: { cx: col(4), cy: r[1], label: 'F1,6BP' },
            g3p: { cx: col(5), cy: r[1], label: 'G3P' },
            bpg: { cx: col(6), cy: r[1], label: '1,3-BPG' },
            pga3: { cx: col(7), cy: r[1], label: '3-PGA' },
            pga2: { cx: col(8), cy: r[1], label: '2-PGA' },
            pep: { cx: col(9), cy: r[1], label: 'PEP' },
            pyruvate: { cx: col(10), cy: r[1], label: 'Pyruvate' },

            // Row 2-4 (Krebs Cycle Orthogonal Loop under Pyruvate)
            acetylCoA: { cx: col(10), cy: r[2], label: 'Acetyl-CoA' },
            citrate: { cx: col(9), cy: r[2], label: 'Citrate' },
            isocitrate: { cx: col(8), cy: r[2], label: 'Isocitrate' },
            akg: { cx: col(7), cy: r[2], label: 'α-KG' },
            succoa: { cx: col(7), cy: r[3], label: 'Suc-CoA' },
            succinate: { cx: col(7), cy: r[4], label: 'Succinate' },
            fumarate: { cx: col(8), cy: r[4], label: 'Fumarate' },
            malate: { cx: col(9), cy: r[4], label: 'Malate' },
            oaa: { cx: col(9), cy: r[3], label: 'OAA' },
        };
    },

    /* ==== MAIN DRAW ==== */
    draw(state) {
        const ctx = this.ctx;
        const lm = state.lightOn; // lightMode flag
        this._currentLightMode = lm;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.W, this.H);
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this.enzymeHitboxes = []; // reset each frame
        this.drawMembrane(ctx, lm);
        this.drawETCChain(ctx, state, lm);
        this.drawCytoplasmNetwork(ctx, state, lm);
        this.drawKrebsCycle(ctx, state, lm);
        this.drawParticles(ctx, state);
        this.drawLabels(ctx, state, lm);

        ctx.restore();
    },

    drawMembrane(ctx, lm) {
        EnzymeStyles.drawMembrane(ctx, 0, this.membraneY, this.W, this.membraneH, lm);
    },

    drawLabels(ctx, state, lm) {
        ctx.font = '300 7px Outfit, sans-serif';
        ctx.fillStyle = lm ? 'rgba(30,41,59,0.3)' : 'rgba(148,163,184,0.3)';
        ctx.textAlign = 'center';

        if (state.lightOn) {
            ctx.save();
            ctx.font = '12px sans-serif'; ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = 'rgba(251,191,36,0.4)'; ctx.shadowBlur = 8;
            ctx.fillText('☀', this.W * 0.5, 12); ctx.shadowBlur = 0;
            ctx.font = '300 6px Outfit, sans-serif'; ctx.fillText('LIGHT', this.W * 0.5, 21);
            ctx.restore();
        } else {
            ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(148,163,184,0.2)';
            ctx.fillText('☾', this.W * 0.5, 12);
            ctx.font = '300 6px Outfit, sans-serif'; ctx.fillText('DARK', this.W * 0.5, 21);
        }
        if (!state.oxygenAvailable) {
            ctx.font = '600 7px JetBrains Mono, monospace'; ctx.fillStyle = '#fb7185';
            ctx.textAlign = 'right'; ctx.fillText('ANAEROBIC', this.W - 8, 12);
        }
    },

    /* ---- ETC CHAIN ---- */
    drawETCChain(ctx, state, lm) {
        const c = this.etcComplexes;
        const lightOn = state.lightOn, t = state.time;
        const pulse = 5 + 3 * Math.sin(t * 3);
        const photoPulse = lightOn ? pulse : 0;
        const respPulse = state.oxygenAvailable ? pulse * 0.7 : 0;
        const cxH = 80, cxW = 42, sR = 11; // Large proteins, thicker membrane

        if (!state.oxygenAvailable) ctx.globalAlpha = 0.25;
        // Respiratory lines
        EnzymeStyles.drawArrow(ctx, c.ndh1.cx + cxW / 2 + 2, c.ndh1.cy, c.pq.cx - 16, c.pq.cy, '#22d3ee', 0.85);
        EnzymeStyles.drawArrow(ctx, c.sdh.cx + 12, c.sdh.cy - 12, c.pq.cx - 10, c.pq.cy + 10, '#22d3ee', 0.85);
        EnzymeStyles.drawArrow(ctx, c.pq.cx + 16, c.pq.cy, c.cytb6f.cx - cxW / 2 - 2, c.cytb6f.cy, '#5eead4', 0.85);
        EnzymeStyles.drawArrow(ctx, c.cytb6f.cx + 10, c.cytb6f.cy + 10, c.cytOx.cx - 12, c.cytOx.cy - 10, '#22d3ee', 0.85);
        if (!state.oxygenAvailable) ctx.globalAlpha = 1;

        if (lightOn) {
            // Photosynthetic lines
            EnzymeStyles.drawArrow(ctx, c.psii.cx + cxW / 2 + 2, c.psii.cy, c.pq.cx - 16, c.pq.cy - 5, '#fbbf24', 0.85);
            EnzymeStyles.drawArrow(ctx, c.cytb6f.cx + 10, c.cytb6f.cy - 10, c.pc.cx - sR - 2, c.pc.cy + 5, '#fbbf24', 0.85);
            EnzymeStyles.drawArrow(ctx, c.pc.cx + sR + 2, c.pc.cy, c.psi.cx - cxW / 2 - 2, c.psi.cy - 5, '#fbbf24', 0.85);
            EnzymeStyles.drawArrow(ctx, c.psi.cx + cxW / 2 + 2, c.psi.cy - 5, c.fd.cx - sR - 2, c.fd.cy + 2, '#fbbf24', 0.85);
            if (state.linearLightEnabled) EnzymeStyles.drawArrow(ctx, c.fd.cx + sR + 2, c.fd.cy, c.fnr.cx - 16, c.fnr.cy, '#fbbf24', 0.85);
            if (state.cyclicLightEnabled) EnzymeStyles.drawCurvedArrow(ctx, c.fd.cx, c.fd.cy + sR + 2, c.pq.cx + 4, c.pq.cy - 12, '#c084fc', 0.85, -1);
            if (state.cyclicLightEnabled) {
                ctx.font = '600 4px JetBrains Mono, monospace'; ctx.fillStyle = '#c084fc'; ctx.textAlign = 'center';
                ctx.fillText('CYCLIC', (c.fd.cx + c.pq.cx) / 2 + 12, (c.fd.cy + c.pq.cy) / 2 - 12);
            }
        }

        if (state.oxygenAvailable) {
            this.drawSmallProtonArrow(ctx, c.ndh1.cx, c.ndh1.cy - cxH * 0.6 / 2 - 10, '4H⁺');
            this.drawSmallProtonArrow(ctx, c.cytb6f.cx, c.cytb6f.cy - cxH * 0.68 / 2 - 10, '2H⁺');
            this.drawSmallProtonArrow(ctx, c.cytOx.cx, c.cytOx.cy - cxH * 0.4 / 2 - 10, '2H⁺');
        }
        if (lightOn) this.drawSmallProtonArrow(ctx, c.psii.cx, c.psii.cy - cxH * 0.8 / 2 - 10, '4H⁺');

        ctx.beginPath(); ctx.setLineDash([2, 2]);
        ctx.moveTo(c.atpSyn.cx, this.membraneY - 2); ctx.lineTo(c.atpSyn.cx, this.membraneY + this.membraneH + 2);
        ctx.strokeStyle = 'rgba(251,113,133,0.15)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

        if (!state.oxygenAvailable || !state.oxphosEnabled) ctx.globalAlpha = 0.2;
        EnzymeStyles.drawNDH1(ctx, c.ndh1.cx, c.ndh1.cy, cxW, cxH * 0.6, respPulse, lm);
        EnzymeStyles.drawSDH(ctx, c.sdh.cx, c.sdh.cy, cxW * 0.6, respPulse * 0.3, lm);
        EnzymeStyles.drawCytOx(ctx, c.cytOx.cx, c.cytOx.cy, cxW, cxH * 0.4, respPulse, lm);
        if (!state.oxygenAvailable || !state.oxphosEnabled) ctx.globalAlpha = 1;

        EnzymeStyles.drawPQ(ctx, c.pq.cx, c.pq.cy, 36, 18, pulse * 0.35, lm);
        EnzymeStyles.drawCytB6f(ctx, c.cytb6f.cx, c.cytb6f.cy, cxW, cxH * 0.68, pulse * 0.4, lm);
        EnzymeStyles.drawPC(ctx, c.pc.cx, c.pc.cy, sR, lightOn ? photoPulse * 0.3 : 0, lm);

        if (!lightOn) ctx.globalAlpha = 0.15;
        if (!state.linearLightEnabled) ctx.globalAlpha = 0.15;
        EnzymeStyles.drawPSII(ctx, c.psii.cx, c.psii.cy, cxW, cxH * 0.8, photoPulse, lm);
        if (!lightOn) ctx.globalAlpha = 0.15; else ctx.globalAlpha = 1;

        EnzymeStyles.drawPSI(ctx, c.psi.cx, c.psi.cy, cxW, cxH * 0.7, photoPulse, lm);
        EnzymeStyles.drawFd(ctx, c.fd.cx, c.fd.cy, sR, photoPulse * 0.25, lm);

        if (!state.linearLightEnabled) ctx.globalAlpha = 0.15;
        EnzymeStyles.drawFNR(ctx, c.fnr.cx, c.fnr.cy, 32, 16, photoPulse * 0.35, lm);
        ctx.globalAlpha = 1;

        const atpGlow = state.protonGradient > 0 ? pulse : 0;
        EnzymeStyles.drawATPSynthase(ctx, c.atpSyn.cx, c.atpSyn.cy, cxW + 4, cxH * 0.8, state.time * 2, atpGlow, lm);

        if (!lightOn) ctx.globalAlpha = 0.15;
        EnzymeStyles.drawBR(ctx, c.br.cx, c.br.cy, cxW - 4, cxH * 0.6, lightOn ? 5 + 3 * Math.sin(t * 4) : 0, lm);
        if (!lightOn) ctx.globalAlpha = 1;
        if (lightOn) this.drawSmallProtonArrow(ctx, c.br.cx, c.br.cy - cxH * 0.6 / 2 - 10, '1H⁺');

        if (state.oxygenAvailable) {
            ctx.fillStyle = '#67e8f9';
            ctx.fillText('-NADH', c.ndh1.cx, c.ndh1.cy + cxH * 0.6 / 2 + 6);
            ctx.fillText('-FADH₂', c.sdh.cx, c.sdh.cy + cxH * 0.3 / 2 + 6); // SDH height is roughly cxW * 0.6 ~ 42*0.6 = 25.
            ctx.fillText('-½O₂', c.cytOx.cx, c.cytOx.cy + cxH * 0.4 / 2 + 6);
        }
        ctx.fillStyle = '#34d399'; ctx.fillText('+ATP', c.atpSyn.cx, c.atpSyn.cy + cxH * 0.8 / 2 + 6);

        // ETC hitboxes for click-to-react
        this.enzymeHitboxes.push({ cx: c.ndh1.cx, cy: c.ndh1.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_resp', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.psii.cx, cy: c.psii.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_photo', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.atpSyn.cx, cy: c.atpSyn.cy, w: cxW + 10, h: cxH + 10, pathway: 'atp_syn', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.br.cx, cy: c.br.cy, w: cxW + 10, h: cxH + 10, pathway: 'br', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.fd.cx, cy: c.fd.cy, w: sR * 2 + 10, h: sR * 2 + 10, pathway: 'etc_cyclic', stepIndex: 0 });
    },

    drawSmallProtonArrow(ctx, x, y, label) {
        ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, y);
        ctx.strokeStyle = '#fb7185'; ctx.globalAlpha = 0.4; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x - 2, y + 2); ctx.lineTo(x + 2, y + 2); ctx.closePath();
        ctx.fillStyle = '#fb7185'; ctx.fill(); ctx.globalAlpha = 1;
        ctx.font = '600 4px JetBrains Mono,monospace'; ctx.fillStyle = '#fb7185';
        ctx.textAlign = 'center'; ctx.fillText(label, x, y - 3);
    },

    /* ================================================================
       CYTOPLASM NETWORK — with bidirectional shared enzyme arrows
       ================================================================ */
    drawCytoplasmNetwork(ctx, state, lm) {
        const m = this.metab;
        const gS = state.glycolysisStep, cS = state.calvinStep, pS = state.pppStep;
        const gC = this.pathwayColors.glycolysis;
        const cC = this.pathwayColors.calvin;
        const pC = this.pathwayColors.ppp;
        const lC = this.pathwayColors.link;
        const fC = this.pathwayColors.fermentation;

        ctx.font = '300 6px Outfit, sans-serif';
        ctx.fillStyle = lm ? 'rgba(30,41,59,0.2)' : 'rgba(148,163,184,0.22)';
        ctx.textAlign = 'left';
        ctx.fillText('CYTOPLASMIC CARBON METABOLISM', 5, this.membraneY + this.membraneH + 16);

        // ══════════════════════════════════════════════════
        // SHARED / LINKING arrows (HK/PGI feeders)
        // ══════════════════════════════════════════════════
        if (state.glycolysisEnabled || state.pppEnabled || state.calvinEnabled) {
            this.drawBidirArrow(ctx, m.glucose, m.g6p, 'HK / G6Pase', gC, pC, gS === 0, 'glycolysis', 0);
            this.drawFloatLabel(ctx, (m.glucose.cx + m.g6p.cx) / 2, (m.glucose.cy + m.g6p.cy) / 2 + 12, '-ATP', gC);

            this.drawBidirArrow(ctx, m.g6p, m.f6p, 'PGI', gC, pC, gS === 1, 'glycolysis', 1);
        }

        // ══════════════════════════════════════════════════
        // GLYCOLYSIS-ONLY arrows (orange)
        // ══════════════════════════════════════════════════
        if (state.glycolysisEnabled) {
            this.drawBidirArrow(ctx, m.f6p, m.f16bp, 'PFK / FBPase', gC, cC, gS === 2 || cS === 5, 'glycolysis', 2);
            this.drawFloatLabel(ctx, (m.f6p.cx + m.f16bp.cx) / 2, (m.f6p.cy + m.f16bp.cy) / 2 + 12, '-ATP', gC);

            // Lower glycolysis
            this.drawBidirArrow(ctx, m.pga3, m.pga2, 'PGM', gC, gC, gS === 7, 'glycolysis', 7);
            this.drawBidirArrow(ctx, m.pga2, m.pep, 'ENO', gC, gC, gS === 8, 'glycolysis', 8);

            this.drawBidirArrow(ctx, m.pep, m.pyruvate, 'PK / PEPCK', gC, gC, gS === 9, 'glycolysis', 9);
            this.drawFloatLabel(ctx, (m.pep.cx + m.pyruvate.cx) / 2, (m.pep.cy + m.pyruvate.cy) / 2 + 12, '+ATP', gC);

            // Yield badges (kept for visual pulse on click)
            if (gS === 5) this.drawYieldBadge(ctx, m.bpg, true, '+NADH', gC);

            // Glycolysis run interaction arrow (Thick stylistic button)
            const runX1 = m.glucose.cx;
            const runX2 = m.pyruvate.cx;
            const runY = m.glucose.cy + 32; // Position below Row 1
            const midX = (runX1 + runX2) / 2;

            // Shorten for arrowhead
            const stopRunX = runX2 - 10;

            ctx.beginPath();
            ctx.moveTo(runX1, runY);
            ctx.lineTo(midX - 42, runY); // Left segment
            ctx.moveTo(midX + 42, runY); // Right segment
            ctx.lineTo(stopRunX, runY);
            ctx.strokeStyle = gC;
            ctx.lineWidth = 4.5;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            // Arrowhead at runX2
            ctx.beginPath();
            ctx.moveTo(runX2, runY);
            ctx.lineTo(runX2 - 12, runY - 6);
            ctx.lineTo(runX2 - 12, runY + 6);
            ctx.fillStyle = gC;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.font = '700 8px JetBrains Mono, monospace';
            ctx.fillStyle = gC;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RUN GLYCOLYSIS', midX, runY);

            this.enzymeHitboxes.push({ cx: midX, cy: runY, w: runX2 - runX1, h: 24, pathway: 'run_glycolysis', stepIndex: 0 });
        }

        // ══════════════════════════════════════════════════
        // SHARED BIDIRECTIONAL ARROWS (glycolysis ↔ Calvin)
        // ══════════════════════════════════════════════════
        if (state.glycolysisEnabled || state.calvinEnabled) {
            const sharedActive_aldo = (state.glycolysisEnabled && (gS === 3 || gS === 4)) || (state.calvinEnabled && (cS === 4 || cS === 5));
            const sharedActive_gapdh = (state.glycolysisEnabled && gS === 5) || (state.calvinEnabled && cS === 2);
            const sharedActive_pgk = (state.glycolysisEnabled && gS === 6) || (state.calvinEnabled && cS === 1);

            this.drawBidirArrow(ctx, m.f16bp, m.g3p, 'ALDO', gC, cC, sharedActive_aldo, 'glycolysis', 3);

            this.drawBidirArrow(ctx, m.g3p, m.bpg, 'GAPDH', gC, cC, sharedActive_gapdh, 'glycolysis', 5);
            this.drawFloatLabel(ctx, (m.g3p.cx + m.bpg.cx) / 2, (m.g3p.cy + m.bpg.cy) / 2 + 12, '+NADH / -NADPH', '#94a3b8');

            this.drawBidirArrow(ctx, m.bpg, m.pga3, 'PGK', gC, cC, sharedActive_pgk, 'glycolysis', 6);
            this.drawFloatLabel(ctx, (m.bpg.cx + m.pga3.cx) / 2, (m.bpg.cy + m.pga3.cy) / 2 + 12, '+ATP', '#94a3b8');
        }

        // ══════════════════════════════════════════════════
        // PPP / CALVIN SHARED ARROW (F6P <-> R5P)
        // ══════════════════════════════════════════════════
        if (state.pppEnabled || state.calvinEnabled) {
            const tkActive = (state.calvinEnabled && cS === 6) || (state.pppEnabled && pS === 3);
            this.drawBidirArrow(ctx, m.r5p, m.f6p, 'TKT/TAL // TK/SBP', pC, cC, tkActive, 'glycolysis', 10);
            this.drawFloatLabel(ctx, (m.r5p.cx + m.f6p.cx) / 2, (m.r5p.cy + m.f6p.cy) / 2 + 14, '6 R5P ⇌ 5 F6P (± Sugar)', '#94a3b8');
        }

        // ══════════════════════════════════════════════════
        // PYRUVATE → ACETYL-CoA or ETHANOL
        // ══════════════════════════════════════════════════
        if (state.glycolysisEnabled || state.krebsEnabled) {
            if (state.oxygenAvailable) {
                this.drawEnzymeArrow(ctx, m.pyruvate, m.acetylCoA, 'PDH', lC, false, 'pdh', 0);
                this.drawFloatLabel(ctx, m.pyruvate.cx + 18, (m.pyruvate.cy + m.acetylCoA.cy) / 2 + 4, '+NADH', lC);
            } else if (state.glycolysisEnabled) {
                this.drawEnzymeArrow(ctx, m.pyruvate, m.ethanol, 'PDC/ADH', fC, state.fermenting, 'fermentation', 0);
                this.drawFloatLabel(ctx, m.pyruvate.cx + 20, (m.pyruvate.cy + m.ethanol.cy) / 2 + 4, '-NADH', fC);
                this.drawYieldBadge(ctx, m.ethanol, state.fermenting, '+NAD⁺', fC);
                ctx.globalAlpha = 0.12;
                this.drawEnzymeArrow(ctx, m.pyruvate, m.acetylCoA, 'PDH', lC, false);
                ctx.globalAlpha = 1;
            }
        }

        // ══════════════════════════════════════════════════
        // CALVIN CYCLE-ONLY arrows (green)
        // ══════════════════════════════════════════════════
        if (state.lightOn && state.calvinEnabled) {
            this.drawEnzymeArrow(ctx, m.rubp, m.pga3, 'RuBisCO', cC, cS === 0, 'calvin', 0);
            this.drawFloatLabel(ctx, m.rubp.cx + 18, (m.rubp.cy + m.pga3.cy) / 2, '-CO₂', cC);

            // PRK: R5P → RuBP
            this.drawEnzymeArrow(ctx, m.r5p, m.rubp, 'PRK', cC, cS === 7, 'calvin', 7);
            this.drawFloatLabel(ctx, (m.r5p.cx + m.rubp.cx) / 2, (m.r5p.cy + m.rubp.cy) / 2 - 12, '-ATP', cC);

            // Calvin Cycle interaction target (Centered in the cycle mesh)
            const ccx = (m.r5p.cx + m.rubp.cx) / 2;
            const ccy = (m.r5p.cy + m.f6p.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, ccx, ccy, cC, 'CALVIN', 1);
            this.enzymeHitboxes.push({ cx: ccx, cy: ccy, w: 28, h: 28, pathway: 'run_calvin', stepIndex: 0 });
        }

        // ══════════════════════════════════════════════════
        // PPP (indigo) — uses shared R5P node
        // ══════════════════════════════════════════════════
        if (state.pppEnabled) {
            // Oxidative phase: G6P → 6-PGL → 6-PGA → R5P
            this.drawEnzymeArrow(ctx, m.g6p, m.pgl6, 'G6PDH', pC, pS === 0, 'ppp', 0);
            this.drawFloatLabel(ctx, m.g6p.cx + 18, (m.g6p.cy + m.pgl6.cy) / 2 + 4, '+NADPH', pC);

            this.drawEnzymeArrow(ctx, m.pgl6, m.pga6, '6PGL', pC, pS === 1, 'ppp', 1);

            this.drawEnzymeArrow(ctx, m.pga6, m.r5p, '6PGDH', pC, pS === 2, 'ppp', 2);
            this.drawFloatLabel(ctx, (m.pga6.cx + m.r5p.cx) / 2, m.pga6.cy + 14, '+NADPH, +CO₂', pC);

            // PPP Cycle interaction target (Centered in the oxidative -> r5p loop)
            const cx = (m.g6p.cx + m.r5p.cx) / 2;
            const cy = (m.g6p.cy + m.pga6.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, cx, cy, pC, 'PPP', 1);
            this.enzymeHitboxes.push({ cx, cy, w: 28, h: 28, pathway: 'run_ppp', stepIndex: 0 });
        }

        // ══════════════════════════════════════════════════
        // CONNECTING FLOWS
        // ══════════════════════════════════════════════════

        // ══════════════════════════════════════════════════
        // METABOLITE NODES (drawn last, on top)
        // ══════════════════════════════════════════════════
        ctx.font = '600 7px JetBrains Mono, monospace';
        const twoXMolecules = ['g3p', 'bpg', 'pga3', 'pga2', 'pep', 'pyruvate', 'acetylCoA', 'ethanol'];
        for (const key of Object.keys(m)) {
            if (this.shouldDrawMetab(key, state)) {
                EnzymeStyles.drawMetaboliteNode(ctx, m[key].cx, m[key].cy, m[key].label, this.isMetabActive(key, state), lm, twoXMolecules.includes(key));
            }
        }
    },

    shouldDrawMetab(key, state) {
        const gl = state.glycolysisEnabled, cv = state.calvinEnabled, pp = state.pppEnabled, kr = state.krebsEnabled;
        if (key === 'glucose') return gl;
        if (key === 'g6p') return gl || pp;
        if (key === 'f6p') return gl || cv || pp;
        if (key === 'f16bp') return gl || cv;
        if (key === 'g3p') return gl || cv;
        if (key === 'bpg') return gl || cv;
        if (key === 'pga3') return gl || cv || kr;
        if (key === 'pga2') return gl;
        if (key === 'pep') return gl;
        if (key === 'pyruvate') return gl || kr;
        if (key === 'ethanol') return gl && !state.oxygenAvailable;
        if (key === 'pgl6' || key === 'pga6') return pp;
        if (key === 'r5p') return pp || cv;
        if (key === 'rubp') return cv;
        if (['acetylCoA', 'citrate', 'isocitrate', 'akg', 'succoa', 'succinate', 'fumarate', 'malate', 'oaa'].includes(key)) {
            return kr && state.oxygenAvailable;
        }
        return true;
    },

    isMetabActive(key, state) {
        if (!state || !state.store) return false;
        // Don't highlight ethanol in aerobic mode
        if (key === 'ethanol' && state.oxygenAvailable) return false;
        return state.store[key] > 0;
    },

    /** Single unidirectional enzyme arrow — stores hitbox */
    drawEnzymeArrow(ctx, from, to, enzyme, color, active, pathway, stepIndex) {
        const a = active ? 1.0 : 0.25;
        const dx = to.cx - from.cx, dy = to.cy - from.cy;
        const len = Math.sqrt(dx * dx + dy * dy); if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const pad = Math.min(32, 1.0 / Math.sqrt((nx / 28) ** 2 + (ny / 14) ** 2) + 3);
        const x1 = from.cx + nx * pad, y1 = from.cy + ny * pad;
        const x2 = to.cx - nx * pad, y2 = to.cy - ny * pad;
        EnzymeStyles.drawArrow(ctx, x1, y1, x2, y2, color, a);
        const tagX = (x1 + x2) / 2, tagY = (y1 + y2) / 2 - 6;
        const lm = this._currentLightMode || false;
        EnzymeStyles.drawEnzymeTag(ctx, tagX, tagY, enzyme, color, active, lm);
        if (enzyme && pathway !== undefined) {
            this.enzymeHitboxes.push({ cx: tagX, cy: tagY, w: 40, h: 14, pathway, stepIndex });
        }
    },

    /** Curved unidirectional arrow — stores hitbox */
    drawEnzymeCurvedArrow(ctx, from, to, enzyme, color, active, dir, off, pathway, stepIndex) {
        const a = active ? 1.0 : 0.25;
        const dx = to.cx - from.cx, dy = to.cy - from.cy;
        const len = Math.sqrt(dx * dx + dy * dy); if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const pad = Math.min(32, 1.0 / Math.sqrt((nx / 28) ** 2 + (ny / 14) ** 2) + 3);
        const x1 = from.cx + nx * pad, y1 = from.cy + ny * pad;
        const x2 = to.cx - nx * pad, y2 = to.cy - ny * pad;
        EnzymeStyles.drawCurvedArrow(ctx, x1, y1, x2, y2, color, a, dir || 1);
        const o = off || 0;
        const tagX = (x1 + x2) / 2 + o * (dir || 1) * (-ny);
        const tagY = (y1 + y2) / 2 - 6 + o * (dir || 1) * nx;
        const lm = this._currentLightMode || false;
        EnzymeStyles.drawEnzymeTag(ctx, tagX, tagY, enzyme, color, active, lm);
        if (enzyme && pathway !== undefined) {
            this.enzymeHitboxes.push({ cx: tagX, cy: tagY, w: 40, h: 14, pathway, stepIndex });
        }
    },

    /** Bidirectional arrow for shared reversible enzymes — stores hitbox */
    drawBidirArrow(ctx, nodeA, nodeB, enzyme, colorA, colorB, active, pathway, stepIndex) {
        const a = active ? 1.0 : 0.25;
        const dx = nodeB.cx - nodeA.cx, dy = nodeB.cy - nodeA.cy;
        const len = Math.sqrt(dx * dx + dy * dy); if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const pad = Math.min(32, 1.0 / Math.sqrt((nx / 28) ** 2 + (ny / 14) ** 2) + 3);
        const x1 = nodeA.cx + nx * pad, y1 = nodeA.cy + ny * pad;
        const x2 = nodeB.cx - nx * pad, y2 = nodeB.cy - ny * pad;
        EnzymeStyles.drawBidirectionalArrow(ctx, x1, y1, x2, y2, colorA, colorB, a);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 6;
        const lm = this._currentLightMode || false;
        EnzymeStyles.drawEnzymeTag(ctx, mx, my, enzyme, active ? '#e2e8f0' : '#94a3b8', active, lm);
        if (enzyme && pathway !== undefined) {
            this.enzymeHitboxes.push({ cx: mx, cy: my, w: 40, h: 14, pathway, stepIndex });
        }
    },

    drawYieldBadge(ctx, node, active, text, color) {
        if (!active) return;
        ctx.font = '600 4px JetBrains Mono, monospace'; ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.fillText(text, node.cx, node.cy + 12);
    },

    drawKrebsBifurcatedArrow(ctx, acCoA, oaa, citrate, enzyme, color, active, pathway, stepIndex) {
        const a = active ? 1.0 : 0.25;
        const padAc = 32; // Wide pill horizontally
        const padO = 18;  // Medium pill vertically

        // We use a junction point
        const jx = citrate.cx + 20;
        const jy = citrate.cy + 20;

        ctx.beginPath();
        ctx.moveTo(acCoA.cx - padAc, acCoA.cy);
        ctx.quadraticCurveTo(jx + 10, acCoA.cy, jx, jy);

        ctx.moveTo(oaa.cx, oaa.cy - padO);
        ctx.quadraticCurveTo(oaa.cx, jy + 10, jx, jy);

        // Angle at target (Citrate)
        const aT = Math.atan2(citrate.cy - jy, citrate.cx - jx);
        const padC = Math.min(32, 1.0 / Math.sqrt((Math.cos(aT) / 28) ** 2 + (Math.sin(aT) / 14) ** 2) + 1);
        const tx = citrate.cx - Math.cos(aT) * padC;
        const ty = citrate.cy - Math.sin(aT) * padC;

        const stopTx = tx - 8 * Math.cos(aT);
        const stopTy = ty - 8 * Math.sin(aT);

        ctx.moveTo(jx, jy);
        ctx.lineTo(stopTx, stopTy);

        ctx.strokeStyle = color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3.0;
        ctx.stroke();
        ctx.globalAlpha = 1;

        this.fillArrowhead(ctx, tx, ty, aT, color, a);

        // Reverse arrowheads (Acetyl-CoA and OAA)
        this.fillArrowhead(ctx, acCoA.cx - padAc, acCoA.cy, 0, color, a);
        this.fillArrowhead(ctx, oaa.cx, oaa.cy - padO, Math.PI / 2, color, a);

        // Enzyme tag at jx, jy
        const lm = this._currentLightMode || false;
        EnzymeStyles.drawEnzymeTag(ctx, jx, jy, enzyme, color, active, lm);

        if (enzyme && pathway !== undefined) {
            this.enzymeHitboxes.push({ cx: jx, cy: jy, w: 40, h: 14, pathway, stepIndex });
        }
    },

    fillArrowhead(ctx, x, y, angle, color, alpha) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10 * Math.cos(angle - 0.4), y - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(x - 10 * Math.cos(angle + 0.4), y - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    },

    /* ---- KREBS CYCLE (UNROLLED) ---- */
    drawKrebsCycle(ctx, state, lm) {
        const m = this.metab;
        const kC = '#38bdf8';
        const kS = state.krebsStep;

        if (!state.oxygenAvailable || !state.krebsEnabled) return;

        ctx.font = '300 6px Outfit, sans-serif';
        ctx.fillStyle = lm ? 'rgba(14,116,144,0.3)' : 'rgba(56,189,248,0.25)'; ctx.textAlign = 'center';

        // Arrows in a sequential unrolled path
        // Citrate Synthase Synthesis Junction
        this.drawKrebsBifurcatedArrow(ctx, m.acetylCoA, m.oaa, m.citrate, 'CS', kC, kS === 0, 'krebs', 0);

        this.drawEnzymeArrow(ctx, m.citrate, m.isocitrate, 'ACO', kC, kS === 1, 'krebs', 1);

        this.drawEnzymeArrow(ctx, m.isocitrate, m.akg, 'IDH', kC, kS === 2, 'krebs', 2);
        this.drawFloatLabel(ctx, (m.isocitrate.cx + m.akg.cx) / 2, m.isocitrate.cy + 14, '+NADH +CO₂', kC);

        this.drawEnzymeArrow(ctx, m.akg, m.succoa, 'KGDH', kC, kS === 3, 'krebs', 3);
        this.drawFloatLabel(ctx, m.akg.cx - 24, (m.akg.cy + m.succoa.cy) / 2 + 4, '+NADH +CO₂', kC);

        this.drawBidirArrow(ctx, m.succoa, m.succinate, 'SCS', kC, kC, kS === 4, 'krebs', 4);
        this.drawFloatLabel(ctx, m.succoa.cx - 16, (m.succoa.cy + m.succinate.cy) / 2 + 4, '+GTP', kC);

        // Loop back
        this.drawBidirArrow(ctx, m.succinate, m.fumarate, 'SDH', kC, kC, kS === 5, 'krebs', 5);
        this.drawFloatLabel(ctx, (m.succinate.cx + m.fumarate.cx) / 2, m.succinate.cy + 14, '+FADH₂', kC);

        this.drawEnzymeArrow(ctx, m.fumarate, m.malate, 'FUM', kC, kS === 6, 'krebs', 6);

        this.drawBidirArrow(ctx, m.malate, m.oaa, 'MDH', kC, kC, kS === 7, 'krebs', 7);
        this.drawFloatLabel(ctx, m.malate.cx + 18, (m.malate.cy + m.oaa.cy) / 2 + 4, '+NADH', kC);

        // Krebs Cycle interaction target inside the loop
        const centerKx = (m.akg.cx + m.citrate.cx) / 2;
        const centerKy = m.oaa.cy;
        EnzymeStyles.drawCycleTarget(ctx, centerKx, centerKy, kC, 'KREBS', -1);
        this.enzymeHitboxes.push({ cx: centerKx, cy: centerKy, w: 28, h: 28, pathway: 'run_krebs', stepIndex: 0 });

        ctx.globalAlpha = 1;
    },

    getKrebsYield(s) { switch (s) { case 2: return '+NADH +CO₂'; case 3: return '+NADH +CO₂'; case 4: return '+GTP'; case 5: return '+FADH₂'; case 7: return '+NADH'; default: return null; } },

    drawFloatLabel(ctx, x, y, text, color) {
        ctx.save();
        ctx.font = '600 5px JetBrains Mono, monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y - 8);
        ctx.restore();
    },

    /* ---- PARTICLES ---- */
    spawnElectron(fk, tk, tp) { const f = this.etcComplexes[fk], t = this.etcComplexes[tk]; if (!f || !t) return; this.electrons.push({ x: f.cx, y: f.cy, tx: t.cx, ty: t.cy, progress: 0, speed: 0.012 + Math.random() * 0.008, type: tp || 'resp' }); },
    spawnProton(cx, dir) { const sy = dir === 'up' ? this.membraneY + this.membraneH * 0.6 : this.membraneY - 8; const ey = dir === 'up' ? this.membraneY - 12 : this.membraneY + this.membraneH + 16; this.protons.push({ x: cx + (Math.random() - 0.5) * 5, y: sy, ty: ey, progress: 0, speed: 0.015 + Math.random() * 0.01 }); },

    drawParticles(ctx, state) {
        for (let i = this.electrons.length - 1; i >= 0; i--) { const e = this.electrons[i]; e.progress += e.speed * state.speed; if (e.progress >= 1) { this.electrons.splice(i, 1); continue; } const t = e.progress; EnzymeStyles.drawElectron(ctx, e.x + (e.tx - e.x) * t, e.y + (e.ty - e.y) * t + Math.sin(t * Math.PI * 3) * 3, 1 - Math.abs(t - 0.5) * 2); }
        for (let i = this.protons.length - 1; i >= 0; i--) { const p = this.protons[i]; p.progress += p.speed * state.speed; if (p.progress >= 1) { this.protons.splice(i, 1); continue; } const t = p.progress; EnzymeStyles.drawProton(ctx, p.x + Math.sin(t * Math.PI * 2) * 2, p.y + (p.ty - p.y) * t, 1 - Math.abs(t - 0.5) * 2); }
    },
};
