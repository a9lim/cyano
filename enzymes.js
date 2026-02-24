/* ===================================================================
   enzymes.js — Stylized enzyme and complex drawing functions
   =================================================================== */

// ---------- Drawing Constants ----------
const CFG = {
  arrowHeadLen: 9,
  arrowHeadAngle: 0.4,
  arrowLineWidth: 3,
  arrowStopGap: 6,
  cycleTargetRadius: 42,
  cycleStrokeWidth: 7,
  cycleTipLen: 22,
  cycleFinLen: 14,
  enzymeTagPad: 4,
  enzymeTagFont: 8,
  metabNodeHeight: 20,
  metabBadgeRadius: 8,
  electronRadius: 4,
  protonRadius: 3.5,
  trailMaxLen: 10,
};

// ---------- Base Color Groups ----------
// Single source of truth — all pathway palettes derive from these five families
const _BASE = {
  orange: { stroke: '#fb923c', strokeLight: '#ea580c', rgb: '251,146,60' },
  blue:   { stroke: '#38bdf8', strokeLight: '#0284c7', rgb: '56,189,248' },
  green:  { stroke: '#10b981', strokeLight: '#059669', rgb: '16,185,129' },
  purple: { stroke: '#c084fc', strokeLight: '#9333ea', rgb: '192,132,252' },
  rose:   { stroke: '#f43f5e', strokeLight: '#e11d48', rgb: '244,63,94' },
};

function _pal(b, fill, glowA) {
  return { fill, stroke: b.stroke, glow: `rgba(${b.rgb},${glowA})`, strokeLight: b.strokeLight, glowRgba: b.rgb };
}

const EnzymeStyles = {
  baseColors: _BASE,

  colors: {
    respiratory:        _pal(_BASE.blue,   '#164e63', 0.35),
    photosynthetic:     _pal(_BASE.green,  '#064e3b', 0.35),
    shared:             _pal(_BASE.orange, '#431407', 0.3),
    atpSynthase:        _pal(_BASE.orange, '#431407', 0.35),
    glycolysis:         _pal(_BASE.orange, '#431407', 0.3),
    glycolysisActive:   _pal(_BASE.orange, '#7c2d12', 0.5),
    krebs:              _pal(_BASE.blue,   '#082f49', 0.25),
    krebsActive:        _pal(_BASE.blue,   '#0c4a6e', 0.5),
    calvin:             _pal(_BASE.green,  '#052e16', 0.3),
    calvinActive:       _pal(_BASE.green,  '#064e3b', 0.5),
    ppp:                _pal(_BASE.purple, '#1e1b4b', 0.25),
    pppActive:          _pal(_BASE.purple, '#312e81', 0.5),
    bacteriorhodopsin:  _pal(_BASE.purple, '#4a1942', 0.35),
    cyclic:             _pal(_BASE.purple, '#3b0764', 0.35),
    fermentation:       _pal(_BASE.rose,   '#4c0519', 0.3),
    membrane:           { fill: 'rgba(30,58,95,0.6)', stroke: 'rgba(56,189,248,0.15)' },
  },

  getPalette(key, lightMode, glowIntensity = 0) {
    const p = this.colors[key];
    if (!lightMode) return p;
    return {
      fill: 'rgba(255,255,255,0.95)',
      stroke: p.strokeLight || p.stroke,
      glow: glowIntensity > 0 ? `rgba(${p.glowRgba || '148,163,184'},${glowIntensity * 0.05})` : ''
    };
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

  /* ---- Cofactor detail helpers ---- */

  /** Iron-sulfur cluster: two overlapping circles with Fe-S coloring */
  drawFeS(ctx, x, y, radius) {
    ctx.beginPath(); ctx.arc(x - 2, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180,120,60,0.5)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,200,60,0.4)'; ctx.fill();
  },

  /** Heme group: ring with colored center */
  drawHeme(ctx, x, y, radius, hemeColor) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hemeColor || 'rgba(220,60,60,0.5)';
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = hemeColor || 'rgba(220,60,60,0.35)'; ctx.fill();
  },

  /** Quinone / cofactor indicator dot */
  drawCofactorDot(ctx, x, y, color) {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = color || 'rgba(251,191,36,0.5)'; ctx.fill();
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
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },

  drawLabel(ctx, text, cx, cy, color, fontSize) {
    ctx.font = `700 ${fontSize || 13}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = color || '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  },

  /* ====================================================================
     ETC Complex Drawers — enzyme shapes that span/sit inside membrane
     ==================================================================== */

  /** Generic ETC complex — consistent rounded rect with label */
  _drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, paletteKey, label1, label2) {
    const p = this.getPalette(paletteKey, lightMode, glow);
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.3);
    this.applyStyle(ctx, p, glow);
    if (label2) {
      this.drawLabel(ctx, label1, cx, cy - 7, p.stroke, 13);
      this.drawLabel(ctx, label2, cx, cy + 8, p.stroke, 11);
    } else {
      this.drawLabel(ctx, label1, cx, cy, p.stroke, 13);
    }
  },

  drawNDH1(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'respiratory', 'NDH-1', 'CI');
  },

  drawSDH(ctx, cx, cy, size, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, size * 1.3, size * 1.3, glow, lightMode, 'respiratory', 'SDH', 'CII');
  },

  drawPSII(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'photosynthetic', 'PSII', 'P680');
    // Chlorophyll P680 chromophore (centered in protein)
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = lightMode ? `rgba(${_BASE.green.rgb},0.5)` : `rgba(${_BASE.green.rgb},0.4)`;
    ctx.fill();
  },

  drawPSI(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'photosynthetic', 'PSI', 'P700');
    // Chlorophyll P700 chromophore (centered in protein)
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = lightMode ? `rgba(${_BASE.green.rgb},0.5)` : `rgba(${_BASE.green.rgb},0.4)`;
    ctx.fill();
  },

  drawCytB6f(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'shared', 'Cyt', 'b6f');
  },

  drawCytOx(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'respiratory', 'Cyt c', 'Ox');
  },

  drawPC(ctx, cx, cy, radius, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, radius * 2, radius * 2, glow, lightMode, 'photosynthetic', 'PC');
  },

  drawFd(ctx, cx, cy, radius, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, radius * 2, radius * 2, glow, lightMode, 'photosynthetic', 'Fd');
  },

  drawFNR(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'photosynthetic', 'FNR');
  },

  drawPQ(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'shared', 'PQ');
  },

  drawATPSynthase(ctx, cx, cy, w, h, rotation, glow, lightMode, protonGradient) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'atpSynthase', 'ATP', 'Syn');
  },

  drawBR(ctx, cx, cy, w, h, glow, lightMode) {
    this._drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, 'bacteriorhodopsin', 'BR');
    // Retinal chromophore (centered in protein)
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = lightMode ? `rgba(${_BASE.purple.rgb},0.5)` : `rgba(${_BASE.purple.rgb},0.4)`;
    ctx.fill();
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
  drawMetaboliteNode(ctx, cx, cy, label, active, lightMode, show2x, count) {
    const w = Math.max(ctx.measureText(label).width + 14, 30);
    const h = CFG.metabNodeHeight;
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
    ctx.lineWidth = 1.0;
    this.applyStyle(ctx, palette, active ? 6 : 0);
    ctx.font = '600 9px IBM Plex Mono, monospace';
    ctx.fillStyle = lightMode
      ? (active ? '#0f172a' : '#334155')
      : (active ? '#f1f5f9' : '#94a3b8');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    // Count badge above node
    if (count > 0) {
      const badgeR = CFG.metabBadgeRadius;
      const bx = cx + w / 2 - 2, by = cy - h / 2 - 4;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = lightMode ? 'rgba(30,41,59,0.85)' : `rgba(${_BASE.orange.rgb},0.9)`;
      ctx.fill();
      ctx.font = '700 9px IBM Plex Mono, monospace';
      ctx.fillStyle = lightMode ? '#f1f5f9' : '#0f172a';
      ctx.fillText(count, bx, by);
    }
    if (show2x) {
      ctx.font = '700 9px IBM Plex Mono, monospace';
      ctx.fillStyle = lightMode ? _BASE.rose.strokeLight : _BASE.rose.stroke;
      ctx.fillText('2x', cx, cy + 17);
    }
  },

  /** Small enzyme label badge drawn on an arrow midpoint.
   *  color2 (optional) — when provided and different from color,
   *  the pill border and text use a left→right gradient of both pathway colors. */
  drawEnzymeTag(ctx, cx, cy, label, color, active, lightMode, color2) {
    const pad = CFG.enzymeTagPad;
    ctx.font = `${active ? 700 : 400} ${CFG.enzymeTagFont}px IBM Plex Mono, monospace`;
    const tw = ctx.measureText(label).width;
    const w = tw + pad * 2;
    const h = 14;

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

    const useDual = color2 && color2 !== color;
    if (useDual) {
      // Match arrow body: color2 on left (backward), color on right (forward)
      const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = 1.0;
    ctx.stroke();

    if (useDual) {
      const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = color;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /* ---- Membrane band ---- */
  drawMembrane(ctx, x, y, w, h, lightMode, time) {
    const t = time || 0;
    const headSpacing = 6;
    const headRadius = 2.5;
    const tailLen = h * 0.32;

    // Colors
    const headColor = lightMode ? 'rgba(20,120,140,0.35)' : 'rgba(56,189,248,0.22)';
    const tailColor = lightMode ? 'rgba(20,120,140,0.18)' : 'rgba(56,189,248,0.1)';
    const midColor  = lightMode ? 'rgba(160,195,215,0.12)' : 'rgba(20,40,70,0.15)';

    // Subtle interior tint (very faint — just enough to define the membrane zone)
    ctx.fillStyle = midColor;
    ctx.fillRect(x, y + h * 0.25, w, h * 0.5);

    // Draw phospholipid bilayer as the primary visual
    for (let lx = x + 6; lx < x + w; lx += headSpacing) {
      const wobble = Math.sin(t * 2 + lx * 0.1) * 1.2;

      // ── Outer leaflet (top) ──
      const topHeadY = y + 3 + wobble;
      // Head
      ctx.beginPath();
      ctx.arc(lx, topHeadY, headRadius, 0, Math.PI * 2);
      ctx.fillStyle = headColor; ctx.fill();
      // Twin tails pointing inward
      ctx.beginPath();
      ctx.moveTo(lx - 1, topHeadY + headRadius);
      ctx.lineTo(lx - 1.5, topHeadY + headRadius + tailLen);
      ctx.moveTo(lx + 1, topHeadY + headRadius);
      ctx.lineTo(lx + 1.5, topHeadY + headRadius + tailLen);
      ctx.strokeStyle = tailColor; ctx.lineWidth = 0.7; ctx.stroke();

      // ── Inner leaflet (bottom) ──
      const botHeadY = y + h - 3 - wobble;
      const bx = lx + headSpacing / 2;
      // Head
      ctx.beginPath();
      ctx.arc(bx, botHeadY, headRadius, 0, Math.PI * 2);
      ctx.fillStyle = headColor; ctx.fill();
      // Twin tails pointing inward
      ctx.beginPath();
      ctx.moveTo(bx - 1, botHeadY - headRadius);
      ctx.lineTo(bx - 1.5, botHeadY - headRadius - tailLen);
      ctx.moveTo(bx + 1, botHeadY - headRadius);
      ctx.lineTo(bx + 1.5, botHeadY - headRadius - tailLen);
      ctx.strokeStyle = tailColor; ctx.lineWidth = 0.7; ctx.stroke();
    }
  },

  /* ---- Particles ---- */
  drawElectron(ctx, x, y, intensity, type, fade) {
    const rgb = type === 'photo' ? _BASE.green.rgb
              : type === 'cyclic' ? _BASE.purple.rgb
              : _BASE.blue.rgb;
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.electronRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${0.7 + 0.3 * intensity})`;
    ctx.shadowColor = `rgba(${rgb},0.8)`;
    ctx.shadowBlur = 8 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawProton(ctx, x, y, intensity, fade) {
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.protonRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${_BASE.rose.rgb},${0.6 + 0.4 * intensity})`;
    ctx.shadowColor = `rgba(${_BASE.rose.rgb},0.7)`;
    ctx.shadowBlur = 5 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '600 8px IBM Plex Mono, monospace';
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y);
    ctx.restore();
  },

  /* ---- Arrows ---- */

  /** Core arrow renderer — all arrow variants delegate here */
  _drawArrowCore(ctx, x1, y1, x2, y2, opts) {
    ctx.save();
    const o = opts || {};
    const a = o.alpha != null ? o.alpha : 1.0;
    const c = o.color || _BASE.blue.stroke;
    const hl = CFG.arrowHeadLen, ha = CFG.arrowHeadAngle, gap = CFG.arrowStopGap;

    let angle;
    if (o.curved) {
      angle = Math.atan2(y2 - o.cpy, x2 - o.cpx);
    } else {
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
    const stopX = x2 - gap * Math.cos(angle);
    const stopY = y2 - gap * Math.sin(angle);

    // For bidir arrows, shorten start so line doesn't extend past backward arrowhead
    const startX = o.bidir ? x1 + gap * Math.cos(angle) : x1;
    const startY = o.bidir ? y1 + gap * Math.sin(angle) : y1;

    // Line
    ctx.beginPath();
    if (o.dashed) ctx.setLineDash([6, 5]);
    ctx.moveTo(startX, startY);
    if (o.curved) ctx.quadraticCurveTo(o.cpx, o.cpy, stopX, stopY);
    else ctx.lineTo(stopX, stopY);

    if (o.bidir && o.color2 && o.color2 !== c) {
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, o.color2); grad.addColorStop(1, c);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = c;
    }
    ctx.globalAlpha = a;
    ctx.lineWidth = CFG.arrowLineWidth;
    ctx.stroke();
    if (o.dashed) ctx.setLineDash([]);

    // Forward arrowhead
    this._arrowhead(ctx, x2, y2, angle, c, a);

    // Backward arrowhead (bidirectional)
    if (o.bidir) {
      const rAngle = Math.atan2(y1 - y2, x1 - x2);
      this._arrowhead(ctx, x1, y1, rAngle, o.color2 || c, a);
    }
    ctx.restore();
  },

  _arrowhead(ctx, x, y, angle, color, alpha) {
    const hl = CFG.arrowHeadLen, ha = CFG.arrowHeadAngle;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - hl * Math.cos(angle - ha), y - hl * Math.sin(angle - ha));
    ctx.lineTo(x - hl * Math.cos(angle + ha), y - hl * Math.sin(angle + ha));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  drawCurvedArrow(ctx, x1, y1, x2, y2, color, alpha, curveDir) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * 18 * (curveDir || 1);
    const ny = dx / len * 18 * (curveDir || 1);
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, curved: true, cpx: mx + nx, cpy: my + ny });
  },

  drawArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha });
  },

  drawCycleTarget(ctx, cx, cy, color, label, dir = 1, rotation = 0) {
    const radius = CFG.cycleTargetRadius;
    const parentAlpha = ctx.globalAlpha;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    ctx.beginPath();
    if (dir === 1) {
      ctx.arc(cx, cy, radius, 0.4, Math.PI * 2 - 0.4, false);
    } else {
      ctx.arc(cx, cy, radius, Math.PI * 2 - 0.4, 0.4, true);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = CFG.cycleStrokeWidth;
    ctx.globalAlpha = 0.8 * parentAlpha;
    ctx.stroke();

    // Tangential arrowhead
    ctx.beginPath();
    let tangentAngle, endAngle;
    if (dir === 1) {
      endAngle = Math.PI * 2 - 0.4;
      tangentAngle = endAngle + Math.PI / 2;
    } else {
      endAngle = 0.4;
      tangentAngle = endAngle - Math.PI / 2;
    }
    const ax = cx + radius * Math.cos(endAngle);
    const ay = cy + radius * Math.sin(endAngle);

    const tipX = ax + CFG.cycleTipLen * Math.cos(tangentAngle);
    const tipY = ay + CFG.cycleTipLen * Math.sin(tangentAngle);

    const pAngle = tangentAngle + Math.PI / 2;
    const fin1X = ax + CFG.cycleFinLen * Math.cos(pAngle);
    const fin1Y = ay + CFG.cycleFinLen * Math.sin(pAngle);
    const fin2X = ax - CFG.cycleFinLen * Math.cos(pAngle);
    const fin2Y = ay - CFG.cycleFinLen * Math.sin(pAngle);

    ctx.moveTo(tipX, tipY);
    ctx.lineTo(fin1X, fin1Y);
    ctx.lineTo(fin2X, fin2Y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = parentAlpha;
    ctx.fill();

    ctx.restore();

    // Label in the middle (drawn outside rotation so text stays upright)
    ctx.font = '700 13px IBM Plex Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /** Thick Bidirectional arrow for metabolic flow connections */
  drawBidirectionalArrow(ctx, x1, y1, x2, y2, color1, color2, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color: color1, color2, alpha, bidir: true });
  },

  /** Thick Dashed arrow for metabolic flow connections */
  drawDashedArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, dashed: true });
  },
};
