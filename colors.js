/* ===================================================================
   colors.js — Single source of truth for shared hex values
   Loads in <head> before body renders. Injects CSS custom properties.
   =================================================================== */

// ---------- Alpha helper (used by both CSS injection and enzymes.js) ----------
const _r = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

// ---------- Font Constants ----------
// Shared by canvas drawing (enzymes.js / renderer.js) and injected as CSS vars
const _FONT = Object.freeze({
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  mono:    "'Geist Mono', 'SF Mono', 'Menlo', monospace",
  body:    "'Geist', system-ui, -apple-system, sans-serif",
  emoji:   "sans-serif",
});

// ---------- Palette ----------
const _PALETTE = Object.freeze({
  // Pathway / particle base hues
  orange: '#fb923c',
  blue:   '#38bdf8',
  green:  '#10b981',
  purple: '#c084fc',
  rose:   '#f43f5e',
  brown:  '#a0694a',
  red:    '#ef4444',
  cyan:   '#67e8f9',
  yellow: '#fde68a',
  slate:  '#7c859c',

  // Cofactor bar colors
  atp:   '#fbbf24',
  nadh:  '#22d3ee',
  nadph: '#14b8a6',
  fadh2: '#fb7185',

  // Mode-independent accent & text-on-accent
  accent:      '#FE3B01',
  accentLight: '#FF6B3D',
  textOnAccent:'#FDFBF5',

  // Mode-dependent surfaces & text
  dark: Object.freeze({
    canvas:        '#0C0B09',
    panelSolid:    '#181612',
    elevated:      '#1E1C18',
    text:          '#E8E2D4',
    textSecondary: '#8A8278',
    textMuted:     '#5A544C',
  }),

  light: Object.freeze({
    canvas:        '#F0EDE4',
    panelSolid:    '#FCFAF4',
    elevated:      '#FDFBF5',
    text:          '#1A1612',
    textSecondary: '#78706A',
    textMuted:     '#A8A098',
  }),
});

// ---------- CSS Custom Property Injection ----------
(function injectPaletteVars() {
  const P = _PALETTE, D = P.dark, L = P.light;

  const style = document.createElement('style');
  style.id = 'palette-vars';
  style.textContent =
`:root {
  --font-display:     ${_FONT.display};
  --font-body:        ${_FONT.body};
  --font-mono:        ${_FONT.mono};

  --bg-canvas:        ${D.canvas};
  --bg-panel:         ${_r(D.panelSolid, 0.878)};
  --bg-panel-solid:   ${D.panelSolid};
  --bg-elevated:      ${D.elevated};
  --bg-hover:         ${_r(D.text, 0.051)};

  --border:           ${_r(D.text, 0.059)};
  --border-strong:    ${_r(D.text, 0.122)};

  --text:             ${D.text};
  --text-secondary:   ${D.textSecondary};
  --text-muted:       ${D.textMuted};
  --text-on-accent:   ${P.textOnAccent};

  --accent:           ${P.accent};
  --accent-light:     ${P.accentLight};
  --accent-glow:      ${_r(P.accent, 0.18)};
  --accent-subtle:    ${_r(P.accent, 0.078)};

  --pw-glyc:          ${P.orange};
  --pw-krebs:         ${P.blue};
  --pw-calvin:        ${P.green};
  --pw-ppp:           ${P.rose};
  --pw-cyclic:        ${P.purple};
  --pw-ferment:       ${P.brown};

  --co-atp:           ${P.atp};
  --co-nadh:          ${P.nadh};
  --co-nadph:         ${P.nadph};
  --co-fadh2:         ${P.fadh2};

  --pw-electron:      ${P.cyan};
  --pw-proton:        ${P.red};
  --pw-photon:        ${P.yellow};
}
body.light-mode {
  --bg-canvas:        ${L.canvas};
  --bg-panel:         ${_r(L.panelSolid, 0.82)};
  --bg-panel-solid:   ${L.panelSolid};
  --bg-elevated:      ${L.elevated};
  --bg-hover:         ${_r(L.text, 0.039)};

  --border:           ${_r(L.text, 0.078)};
  --border-strong:    ${_r(L.text, 0.141)};

  --text:             ${L.text};
  --text-secondary:   ${L.textSecondary};
  --text-muted:       ${L.textMuted};
}`;
  document.head.appendChild(style);
})();
