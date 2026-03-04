// Layout engine — computes membrane, ETC complex, and metabolite positions.
// Enforces minimum content dimensions so pathways remain readable at small viewports.

export const MIN_CONTENT_W = 900;
export const MIN_CONTENT_H = 600;

/**
 * Compute all layout positions. Called on resize and sidebar animation.
 * @param {number} zoom — when vertical zoom < 1, layout widens to fill viewport edge-to-edge
 */
export function computeLayout(W, H, sidebarInset, zoom = 1) {
    const rawLW = (W - sidebarInset) / zoom;
    const LW = Math.max(rawLW, MIN_CONTENT_W);
    const LH = Math.max(H, MIN_CONTENT_H);

    // ── Membrane ──
    // Positioned at 22% of content height; 60px tall phospholipid bilayer
    const membraneY = LH * 0.22;
    const membraneH = 60;
    const memMid = membraneY + membraneH / 2;
    const mPad = LW * 0.02, mW = LW - mPad * 2;

    // ── ETC Complexes ──
    // 14 complexes distributed linearly across membrane width
    const numComplexes = 14;
    const step = mW / (numComplexes + 1);
    const colW = (i) => mPad + step * i;

    // SDH and Fd/FNR offset vertically (SDH anchors into matrix, Fd/FNR sit below membrane)
    const etcComplexes = {
        psii:   { cx: colW(1),  cy: memMid },
        ndh1:   { cx: colW(2),  cy: memMid },
        sdh:    { cx: colW(3),  cy: memMid + membraneH * 0.3 },
        pq:     { cx: colW(4),  cy: memMid },
        cytb6f: { cx: colW(5),  cy: memMid },
        pc:     { cx: colW(6),  cy: memMid - membraneH * 0.3 },
        cytOx:  { cx: colW(7),  cy: memMid },
        psi:    { cx: colW(8),  cy: memMid },
        fd:     { cx: colW(9),  cy: memMid + membraneH * 0.3 },
        fnr:    { cx: colW(10), cy: memMid + membraneH * 0.3 },
        atpSyn: { cx: colW(11), cy: memMid },
        br:     { cx: colW(12), cy: memMid },
        nnt:    { cx: colW(13), cy: memMid },
        ucp:    { cx: colW(14), cy: memMid },
    };

    // ── Cytoplasm — Orthogonal Metabolite Grid ──
    const top = membraneY + membraneH + 120;
    const rowH = (LH - top + 200) / 5;
    const col = (i) => LW * (0.04 + i * 0.082);
    const r = [top, top + rowH, top + rowH * 2, top + rowH * 3, top + rowH * 4, top + rowH * 5];

    const metab = {
        // Row 0: PPP intermediates + RuBP
        pgl6: { cx: col(1), cy: r[0], label: '6-PGL' },
        pga6: { cx: col(2), cy: r[0], label: '6-PGA' },
        r5p:  { cx: col(3), cy: r[0], label: 'R5P' },
        rubp: { cx: col(7), cy: r[0], label: 'RuBP' },

        // Row 1: Glycolysis backbone (Glucose → Pyruvate)
        glucose:      { cx: col(0),  cy: r[1], label: 'Glucose' },
        g6p:          { cx: col(1),  cy: r[1], label: 'G6P' },
        f6p:          { cx: col(3),  cy: r[1], label: 'F6P' },
        f16bp:        { cx: col(4),  cy: r[1], label: 'F1,6BP' },
        g3p:          { cx: col(5),  cy: r[1], label: 'G3P' },
        bpg:          { cx: col(6),  cy: r[1], label: '1,3-BPG' },
        pga3:         { cx: col(7),  cy: r[1], label: '3-PGA' },
        pga2:         { cx: col(8),  cy: r[1], label: '2-PGA' },
        pep:          { cx: col(9),  cy: r[1], label: 'PEP' },
        pyruvate:     { cx: col(10), cy: r[1], label: 'Pyruvate' },
        ethanol:      { cx: col(11), cy: r[0], label: 'Ethanol' },
        acetaldehyde: { cx: col(11), cy: r[1], label: 'Acetaldehyde' },

        // Row 2-3: Krebs cycle (orthogonal loop under Pyruvate)
        acetylCoA:  { cx: col(10), cy: r[2], label: 'Acetyl-CoA' },
        aceticAcid: { cx: col(11), cy: r[2], label: 'Acetic Acid' },
        citrate:    { cx: col(9),  cy: r[2], label: 'Citrate' },
        isocitrate: { cx: col(8),  cy: r[2], label: 'Isocitrate' },
        akg:        { cx: col(7),  cy: r[2], label: 'α-KG' },
        succoa:     { cx: col(6),  cy: r[2], label: 'Suc-CoA' },
        succinate:  { cx: col(6),  cy: r[3], label: 'Succinate' },
        fumarate:   { cx: col(7),  cy: r[3], label: 'Fumarate' },
        malate:     { cx: col(8),  cy: r[3], label: 'Malate' },
        oaa:        { cx: col(9),  cy: r[3], label: 'OAA' },

        // Beta-oxidation: 2x2 grid below Acetyl-CoA
        fattyAcid:  { cx: col(10), cy: r[3], label: 'Fatty Acid' },
        enoylCoA:   { cx: col(11), cy: r[3], label: 'Enoyl-CoA' },
        hydroxyCoA: { cx: col(11), cy: r[3] + rowH * 0.85, label: 'OH-CoA' },
        ketoCoA:    { cx: col(10), cy: r[3] + rowH * 0.85, label: 'Keto-CoA' },
    };

    // Content height may exceed LH when bottom pathways extend beyond viewport
    let contentH = LH;
    for (const m of Object.values(metab)) {
        contentH = Math.max(contentH, m.cy + 80);
    }

    return { LW, contentH, membraneY, membraneH, etcComplexes, metab, metabKeys: Object.keys(metab) };
}
