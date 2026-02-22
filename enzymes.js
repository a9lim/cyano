/* ===================================================================
   enzymes.js — Stylized enzyme and complex drawing functions
   =================================================================== */

const EnzymeStyles = {
  // ---------- Color Palettes ----------
  colors: {
    respiratory: { fill: '#164e63', stroke: '#22d3ee', glow: 'rgba(34,211,238,0.35)' },
    photosynthetic: { fill: '#422006', stroke: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },
    shared: { fill: '#1e3a5f', stroke: '#5eead4', glow: 'rgba(94,234,212,0.3)' },
    atpSynthase: { fill: '#14532d', stroke: '#34d399', glow: 'rgba(52,211,153,0.35)' },
    krebs: { fill: '#1e293b', stroke: '#38bdf8', glow: 'rgba(56,189,248,0.25)' },
    krebsActive: { fill: '#0c4a6e', stroke: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
    calvin: { fill: '#052e16', stroke: '#34d399', glow: 'rgba(52,211,153,0.3)' },
    calvinActive: { fill: '#064e3b', stroke: '#6ee7b7', glow: 'rgba(110,231,183,0.5)' },
    glycolysis: { fill: '#431407', stroke: '#fb923c', glow: 'rgba(251,146,60,0.3)' },
    glycolysisActive: { fill: '#7c2d12', stroke: '#fdba74', glow: 'rgba(253,186,116,0.5)' },
    bacteriorhodopsin: { fill: '#4a1942', stroke: '#e879f9', glow: 'rgba(232,121,249,0.35)' },
    cyclic: { fill: '#3b0764', stroke: '#c084fc', glow: 'rgba(192,132,252,0.35)' },
    ppp: { fill: '#1e1b4b', stroke: '#818cf8', glow: 'rgba(129,140,248,0.25)' },
    pppActive: { fill: '#312e81', stroke: '#a5b4fc', glow: 'rgba(165,180,252,0.5)' },
    membrane: { fill: 'rgba(30,58,95,0.6)', stroke: 'rgba(56,189,248,0.15)' },
  },

  /* ---- Generic shape helpers ---- */
  roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  hexagon(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  },

  diamond(ctx, cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
  },

  octagon(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  },

  pill(ctx, cx, cy, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
  },

  /* ---- Style + glow ---- */
  applyStyle(ctx, palette, glowAmount) {
    if (glowAmount > 0) {
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glowAmount;
    }
    ctx.fillStyle = palette.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },

  drawLabel(ctx, text, cx, cy, color, fontSize) {
    ctx.font = `600 ${fontSize || 11}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = color || '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  },

  /* ====================================================================
     ETC Complex Drawers — enzyme shapes that span/sit inside membrane
     ==================================================================== */

  drawNDH1(ctx, cx, cy, w, h, glow, lightMode) {
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0369a1', glow: glow > 0 ? `rgba(14,165,233,${glow * 0.05})` : '' }
      : this.colors.respiratory;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'NDH-1', cx, cy - 6, p.stroke, 9);
    this.drawLabel(ctx, '4H⁺', cx, cy + 7, lightMode ? '#be123c' : '#fb7185', 8);
  },

  drawSDH(ctx, cx, cy, size, glow, lightMode) {
    this.diamond(ctx, cx, cy, size, size);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0369a1', glow: glow > 0 ? `rgba(14,165,233,${glow * 0.05})` : '' }
      : this.colors.respiratory;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'SDH', cx, cy - 4, p.stroke, 9);
    this.drawLabel(ctx, 'CII', cx, cy + 7, lightMode ? '#0c4a6e' : '#67e8f9', 7);
  },

  drawPSII(ctx, cx, cy, w, h, glow, lightMode) {
    // Tall rectangle spanning membrane
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#b45309', glow: glow > 0 ? `rgba(245,158,11,${glow * 0.05})` : '' }
      : this.colors.photosynthetic;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PSII', cx, cy - 8, p.stroke, 9);
    this.drawLabel(ctx, 'P680', cx, cy + 3, lightMode ? '#92400e' : '#fcd34d', 7);
    this.drawLabel(ctx, '4H⁺', cx, cy + 14, lightMode ? '#be123c' : '#fb7185', 7);
  },

  drawPSI(ctx, cx, cy, w, h, glow, lightMode) {
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#b45309', glow: glow > 0 ? `rgba(245,158,11,${glow * 0.05})` : '' }
      : this.colors.photosynthetic;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PSI', cx, cy - 5, p.stroke, 9);
    this.drawLabel(ctx, 'P700', cx, cy + 6, lightMode ? '#92400e' : '#fcd34d', 7);
  },

  drawCytB6f(ctx, cx, cy, w, h, glow, lightMode) {
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0d9488', glow: glow > 0 ? `rgba(20,184,166,${glow * 0.05})` : '' }
      : this.colors.shared;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Cyt', cx, cy - 8, p.stroke, 9);
    this.drawLabel(ctx, 'b6f', cx, cy + 2, p.stroke, 9);
    this.drawLabel(ctx, '2H⁺', cx, cy + 14, lightMode ? '#be123c' : '#fb7185', 7);
  },

  drawCytOx(ctx, cx, cy, w, h, glow, lightMode) {
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0891b2', glow: glow > 0 ? `rgba(6,182,212,${glow * 0.05})` : '' }
      : this.colors.respiratory;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Cyt c', cx, cy - 8, p.stroke, 8);
    this.drawLabel(ctx, 'Ox', cx, cy + 2, p.stroke, 8);
    this.drawLabel(ctx, '2H⁺', cx, cy + 14, lightMode ? '#be123c' : '#fb7185', 7);
  },

  drawPC(ctx, cx, cy, radius, glow, lightMode) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0891b2', glow: glow > 0 ? `rgba(6,182,212,${glow * 0.05})` : '' }
      : this.colors.shared;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PC', cx, cy, p.stroke, 8);
  },

  drawFd(ctx, cx, cy, radius, glow, lightMode) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#ca8a04', glow: glow > 0 ? `rgba(234,179,8,${glow * 0.05})` : '' }
      : this.colors.photosynthetic;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Fd', cx, cy, p.stroke, 8);
  },

  drawFNR(ctx, cx, cy, w, h, glow, lightMode) {
    this.pill(ctx, cx, cy, w, h);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#ca8a04', glow: glow > 0 ? `rgba(234,179,8,${glow * 0.05})` : '' }
      : this.colors.photosynthetic;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'FNR', cx, cy, p.stroke, 9);
  },

  drawPQ(ctx, cx, cy, w, h, glow, lightMode) {
    this.pill(ctx, cx, cy, w, h);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#0284c7', glow: glow > 0 ? `rgba(14,165,233,${glow * 0.05})` : '' }
      : this.colors.shared;
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PQ', cx, cy, p.stroke, 9);
  },

  drawATPSynthase(ctx, cx, cy, w, h, rotation, glow, lightMode) {
    // Tall shape spanning membrane with spinning rotor
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 5);
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#059669', glow: glow > 0 ? `rgba(16,185,129,${glow * 0.05})` : '' }
      : this.colors.atpSynthase;
    this.applyStyle(ctx, p, glow);

    // Rotor blades inside
    ctx.save();
    ctx.translate(cx, cy + 4);
    ctx.rotate(rotation);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 / 6) * i;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 7, Math.sin(a) * 7, 5, 2, a, 0, Math.PI * 2);
      ctx.fillStyle = lightMode ? 'rgba(16,185,129,0.3)' : 'rgba(52,211,153,0.3)';
      ctx.fill();
    }
    ctx.restore();

    this.drawLabel(ctx, 'ATP', cx, cy - 10, p.stroke, 9);
    this.drawLabel(ctx, 'Syn', cx, cy + 1, p.stroke, 8);
  },

  /** Bacteriorhodopsin — 7-helix bundle (distinctive heptagon shape) */
  drawBR(ctx, cx, cy, w, h, glow, lightMode) {
    // Draw 7-helix bundle as a heptagon
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 / 7) * i - Math.PI / 2;
      const px = cx + (w / 2) * Math.cos(angle);
      const py = cy + (h / 2) * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const p = lightMode
      ? { fill: 'rgba(255,255,255,0.95)', stroke: '#9333ea', glow: glow > 0 ? `rgba(168,85,247,${glow * 0.05})` : '' }
      : this.colors.bacteriorhodopsin;
    this.applyStyle(ctx, p, glow);
    // Retinal chromophore — small inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = lightMode ? 'rgba(168,85,247,0.35)' : 'rgba(232,121,249,0.35)';
    ctx.fill();
    this.drawLabel(ctx, 'BR', cx, cy - 7, p.stroke, 9);
    this.drawLabel(ctx, '1H⁺', cx, cy + 6, lightMode ? '#be123c' : '#fb7185', 7);
  },

  /* ==== Krebs Cycle ==== */
  drawKrebsEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.krebsActive : this.colors.krebs;
    this.hexagon(ctx, cx, cy, radius);
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 8);
  },

  /* ==== Calvin Cycle ==== */
  drawCalvinEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.calvinActive : this.colors.calvin;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 8);
  },

  /* ==== Pentose Phosphate Pathway ==== */
  drawPPPEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.pppActive : this.colors.ppp;
    // Pentagon shape for PPP (pentose = 5)
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 7);
  },

  /* ==== Glycolysis ==== */
  drawGlycolysisEnzyme(ctx, cx, cy, w, h, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.glycolysisActive : this.colors.glycolysis;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 4);
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 7);
  },

  /* ==== Shared Metabolite Node ==== */
  drawMetaboliteNode(ctx, cx, cy, label, active, lightMode) {
    const w = Math.max(ctx.measureText(label).width + 14, 30);
    const h = 16;
    this.pill(ctx, cx, cy, w, h);
    let palette;
    if (lightMode) {
      palette = active
        ? { fill: 'rgba(255,255,255,0.95)', stroke: '#1e293b', glow: 'rgba(30,41,59,0.2)' }
        : { fill: 'rgba(241,245,249,0.9)', stroke: '#475569', glow: '' };
    } else {
      palette = active
        ? { fill: 'rgba(51,65,85,0.9)', stroke: '#e2e8f0', glow: 'rgba(226,232,240,0.3)' }
        : { fill: 'rgba(30,41,59,0.7)', stroke: 'rgba(148,163,184,0.5)', glow: '' };
    }
    this.applyStyle(ctx, palette, active ? 6 : 0);
    ctx.font = '600 7px JetBrains Mono, monospace';
    ctx.fillStyle = lightMode
      ? (active ? '#0f172a' : '#334155')
      : (active ? '#f1f5f9' : '#94a3b8');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /** Small enzyme label badge drawn on an arrow midpoint */
  drawEnzymeTag(ctx, cx, cy, label, color, active, lightMode) {
    const pad = 3;
    ctx.font = `${active ? 700 : 400} 6px JetBrains Mono, monospace`;
    const tw = ctx.measureText(label).width;
    const w = tw + pad * 2;
    const h = 11;

    // Background pill
    ctx.beginPath();
    const r = h / 2;
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    if (lightMode) {
      ctx.fillStyle = active ? 'rgba(255,255,255,0.95)' : 'rgba(241,245,249,0.85)';
    } else {
      ctx.fillStyle = active ? 'rgba(15,23,42,0.85)' : 'rgba(15,23,42,0.6)';
    }
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = active ? 0.8 : 0.3;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = lightMode ? (active ? '#0f172a' : '#475569') : color;
    ctx.globalAlpha = active ? 1 : 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.globalAlpha = 1;
  },

  /* ---- Membrane band ---- */
  drawMembrane(ctx, x, y, w, h, lightMode) {
    // Phospholipid bilayer look
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (lightMode) {
      grad.addColorStop(0, 'rgba(200,220,230,0.1)');
      grad.addColorStop(0.08, 'rgba(180,210,230,0.4)');
      grad.addColorStop(0.2, 'rgba(170,200,220,0.55)');
      grad.addColorStop(0.5, 'rgba(160,195,215,0.65)');
      grad.addColorStop(0.8, 'rgba(170,200,220,0.55)');
      grad.addColorStop(0.92, 'rgba(180,210,230,0.4)');
      grad.addColorStop(1, 'rgba(200,220,230,0.1)');
    } else {
      grad.addColorStop(0, 'rgba(20,40,70,0.15)');
      grad.addColorStop(0.08, 'rgba(30,58,95,0.55)');
      grad.addColorStop(0.2, 'rgba(25,50,85,0.7)');
      grad.addColorStop(0.5, 'rgba(20,40,70,0.8)');
      grad.addColorStop(0.8, 'rgba(25,50,85,0.7)');
      grad.addColorStop(0.92, 'rgba(30,58,95,0.55)');
      grad.addColorStop(1, 'rgba(20,40,70,0.15)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Lipid bilayer border lines
    ctx.strokeStyle = lightMode ? 'rgba(20,120,140,0.3)' : 'rgba(56,189,248,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    // Inner leaflet lines
    ctx.strokeStyle = lightMode ? 'rgba(20,120,140,0.12)' : 'rgba(56,189,248,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    const inner1 = y + h * 0.3;
    const inner2 = y + h * 0.7;
    ctx.beginPath(); ctx.moveTo(x, inner1); ctx.lineTo(x + w, inner1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, inner2); ctx.lineTo(x + w, inner2); ctx.stroke();
    ctx.setLineDash([]);
  },

  /* ---- Particles ---- */
  drawElectron(ctx, x, y, intensity) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(103,232,249,${0.7 + 0.3 * intensity})`;
    ctx.shadowColor = 'rgba(103,232,249,0.8)';
    ctx.shadowBlur = 8 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
  },

  drawProton(ctx, x, y, intensity) {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251,113,133,${0.6 + 0.4 * intensity})`;
    ctx.shadowColor = 'rgba(251,113,133,0.7)';
    ctx.shadowBlur = 5 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '600 6px JetBrains Mono, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y);
  },

  /* ---- Arrows ---- */
  drawCurvedArrow(ctx, x1, y1, x2, y2, color, alpha, curveDir) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * 18 * (curveDir || 1);
    const ny = dx / len * 18 * (curveDir || 1);
    const cpx = mx + nx, cpy = my + ny;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    ctx.strokeStyle = color || '#38bdf8';
    ctx.globalAlpha = alpha != null ? alpha : 0.6;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const angle = Math.atan2(y2 - cpy, x2 - cpx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5 * Math.cos(angle - 0.4), y2 - 5 * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - 5 * Math.cos(angle + 0.4), y2 - 5 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color || '#38bdf8';
    ctx.globalAlpha = alpha != null ? alpha : 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  drawArrow(ctx, x1, y1, x2, y2, color, alpha) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || '#38bdf8';
    ctx.globalAlpha = alpha != null ? alpha : 0.6;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5 * Math.cos(angle - 0.4), y2 - 5 * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - 5 * Math.cos(angle + 0.4), y2 - 5 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color || '#38bdf8';
    ctx.globalAlpha = alpha != null ? alpha : 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  /** Bidirectional arrow — arrowheads on both ends */
  drawBidirectionalArrow(ctx, x1, y1, x2, y2, color1, color2, alpha) {
    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color1 || '#e2e8f0';
    ctx.globalAlpha = alpha != null ? alpha : 0.5;
    ctx.lineWidth = 1.4;
    ctx.stroke(); ctx.globalAlpha = 1;

    // Arrowhead at end (color1)
    const a1 = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5 * Math.cos(a1 - 0.4), y2 - 5 * Math.sin(a1 - 0.4));
    ctx.lineTo(x2 - 5 * Math.cos(a1 + 0.4), y2 - 5 * Math.sin(a1 + 0.4));
    ctx.closePath();
    ctx.fillStyle = color1; ctx.globalAlpha = alpha || 0.5; ctx.fill(); ctx.globalAlpha = 1;

    // Arrowhead at start (color2)
    const a2 = Math.atan2(y1 - y2, x1 - x2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - 5 * Math.cos(a2 - 0.4), y1 - 5 * Math.sin(a2 - 0.4));
    ctx.lineTo(x1 - 5 * Math.cos(a2 + 0.4), y1 - 5 * Math.sin(a2 + 0.4));
    ctx.closePath();
    ctx.fillStyle = color2; ctx.globalAlpha = alpha || 0.5; ctx.fill(); ctx.globalAlpha = 1;
  },

  /** Dashed arrow for metabolic flow connections */
  drawDashedArrow(ctx, x1, y1, x2, y2, color, alpha) {
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || '#94a3b8';
    ctx.globalAlpha = alpha != null ? alpha : 0.5;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 5 * Math.cos(angle - 0.35), y2 - 5 * Math.sin(angle - 0.35));
    ctx.lineTo(x2 - 5 * Math.cos(angle + 0.35), y2 - 5 * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fillStyle = color || '#94a3b8';
    ctx.globalAlpha = alpha != null ? alpha : 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  },
};
