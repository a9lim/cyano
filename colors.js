/* ═══════════════════════════════════════════════════════════════
   colors.js — Lumen project-specific color tokens.
   Extends _PALETTE (from shared/tokens.js) with pathway/cofactor
   colors, builds _BASE families for canvas use, and injects
   CSS custom properties (--pw-*, --co-*).
   ═══════════════════════════════════════════════════════════════ */

// ─── Pathway / Cofactor Colors ───
// Semantic keys on each theme, read through _themePalette() or the CSS vars.
// The proton is Lumen's red, so it takes the accent.
for (const T of [_PALETTE.light, _PALETTE.dark]) {
  T.atp   = T.inks.ochre;
  T.nadh  = T.inks.prussian;
  T.nadph = T.inks.viridian;
  T.fadh2 = T.inks.madder;
}

_freezeTokens();

// ─── Color Math Helpers ───
// (Uses shared _parseHex, _rgb2hsl, _hsl2hex from shared/tokens.js)

/** Derive a dark-mode fill: same hue as the stroke, fixed saturation, custom lightness. */
function _darkFill(base, lightness) {
  const [h] = _rgb2hsl(..._parseHex(base.stroke));
  return _hsl2hex(h, 0.55, lightness / 100);
}

/** Build a { stroke, strokeLight, fill? } family from an ink's two values:
 *  stroke is the dark-theme value, strokeLight the light-theme one. */
function _makeBase(dark, light, fillL) {
  const o = { stroke: dark, strokeLight: light };
  if (fillL != null) o.fill = _darkFill(o, fillL);
  return o;
}
const _ink = (name, fillL) => _makeBase(_PALETTE.dark.inks[name], _PALETTE.light.inks[name], fillL);

// ─── Base Color Families ───
// Used by enzymes.js _ROLE map to assign pathway semantics to colors.
// fillL values tuned per-hue so dark-mode fills have sufficient contrast.
const _BASE = {
  sienna:    _ink('sienna', 7),
  prussian:  _ink('prussian', 13),
  viridian:  _ink('viridian', 7),
  violet:    _ink('violet', 10),
  madder:    _ink('madder', 8),
  umber:     _ink('umber', 7),
  verdigris: _ink('verdigris'),
  ochre:     _ink('ochre'),
  accent:    _makeBase(_PALETTE.dark.accent, _PALETTE.light.accent),
  graphite:  _makeBase(_PALETTE.dark.textMuted, _PALETTE.light.textMuted),
};

// ─── CSS Custom Property Injection ───
(function injectProjectVars() {
  const P = _PALETTE, L = P.light, D = P.dark;

  // [CSS var name, ink or theme key]
  const shared = [
    ['pw-glyc',        'sienna'],
    ['pw-krebs',       'prussian'],
    ['pw-calvin',      'viridian'],
    ['pw-ppp',         'madder'],
    ['pw-cyclic',      'violet'],
    ['pw-ferment',     'umber'],
    ['co-atp',         'atp'],
    ['co-nadh',        'nadh'],
    ['co-nadph',       'nadph'],
    ['co-fadh2',       'fadh2'],
    ['pw-electron',    'verdigris'],
    ['pw-proton',      'accent'],
    ['pw-photon',      'ochre'],
    ['pw-betaox',      'ochre'],
    ['pw-ros',         'accent'],
  ];

  const genShared = (T) => shared.map(([name, key]) =>
    `  --${name}: ${T.inks[key] || T[key]};`
  ).join('\n');

  _injectProjectVars(
    genShared(L) + `\n  --bg-scrim: ${_r(D.text, 0.2)};
  --bg-track:         ${_r(L.text, 0.078)};
  --metab-card-bg:    ${_r(L.text, 0.02)};`,
    genShared(D) + `\n  --bg-scrim:         ${_r(L.text, 0.149)};
  --bg-track:         ${_r(D.text, 0.039)};
  --metab-card-bg:    transparent;`
  );
})();

// Expose on window so ES6 modules (strict mode) can access frozen objects
window._BASE = _BASE;
window._darkFill = _darkFill;
